/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  /api/db.ts — єдина точка доступу до БД                          ║
 * ║                                                                  ║
 * ║  Працює ТІЛЬКИ якщо у Vercel заданi:                             ║
 * ║     • SUPABASE_URL                                               ║
 * ║     • SUPABASE_SERVICE_ROLE_KEY  (server-only, не VITE_*)        ║
 * ║                                                                  ║
 * ║  Анонімний ключ більше не використовується у фронтенді —         ║
 * ║  усі SELECT/INSERT/UPDATE/DELETE/UPSERT йдуть через цей роут     ║
 * ║  з service_role_key, який ніколи не потрапляє у браузер.         ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import { createClient } from "@supabase/supabase-js";

/* ───────────── whitelists ───────────── */

const ALLOWED_TABLES = new Set<string>([
  "users","license_applications","car_plates","faction_applications",
  "admin_applications","admin_perms","house_purchase_requests","city_voice",
  "sos_signals","wanted","factions","faction_leaders","faction_overrides",
  "mayor_election","nft_gifts","nft_owners","news","houses","documents",
  "bans","house_families","recruitment_settings","house_confiscations",
  "mayor_candidate_applications","notifications",
]);

const MUTATION_OPS = new Set(["insert", "update", "delete", "upsert"]);
const FILTER_OPS   = new Set([
  "eq","neq","gt","gte","lt","lte","ilike","like","is","in","or",
]);

// Таблиці тільки для адмінів/супер-адміна (для мутацій)
const ADMIN_ONLY_TABLES = new Set<string>([
  "admin_perms","bans","news","houses","documents","factions","faction_leaders",
  "faction_overrides","mayor_election","recruitment_settings","house_confiscations",
]);

const SUPER_ADMIN_NICK = "t1kron1x";

// Поля, які НЕ можна повертати клієнту навіть авторизованому.
// (захист від випадкового витоку повного hash-паролю іншого юзера).
const SENSITIVE_COLUMNS: Record<string, Set<string>> = {
  users: new Set(["password"]),
};

/* ───────────── types ───────────── */

type FilterCond = { op: string; col?: string; value: unknown };
type LegacyMatch = Record<string, { op: "eq" | "ilike"; value: unknown }>;

interface Body {
  nick?: string;
  password?: string;
  op: string;
  table?: string;
  // select
  columns?: string;
  filters?: FilterCond[];
  match?: LegacyMatch;
  order?: { column: string; ascending?: boolean };
  limit?: number;
  single?: boolean;
  maybeSingle?: boolean;
  // mutations
  values?: unknown;
  onConflict?: string;
  returning?: boolean;
  // auth helpers
  telegram_id?: string | null;
  avatar_url?: string | null;
}

/* ───────────── handler ───────────── */

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")    return res.status(405).json({ error: "Method not allowed" });

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) {
    // Жодних запитів без service_role_key
    return res.status(500).json({
      error: "Server not configured: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing",
    });
  }

  let body: Body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: "Invalid JSON" });
  }
  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "Empty body" });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    /* ── публічні auth-ендпоінти (до логіну) ─────────────────────── */
    switch (body.op) {
      case "auth_check": {
        const nick = String(body.nick || "").trim();
        if (!nick) return res.status(400).json({ error: "nick required" });
        const { data } = await admin
          .from("users").select("password, telegram_id, role")
          .ilike("username", nick).maybeSingle();
        return res.status(200).json({
          data: {
            exists: !!data,
            hasPassword: !!(data && data.password),
            telegram_id: data?.telegram_id ?? null,
            role: data?.role ?? null,
          },
        });
      }
      case "auth_login": {
        const nick = String(body.nick || "").trim();
        const password = String(body.password || "");
        if (!nick || !password) return res.status(400).json({ error: "nick+password required" });
        const { data } = await admin
          .from("users").select("password, role")
          .ilike("username", nick).maybeSingle();
        if (!data)               return res.status(404).json({ error: "user not found" });
        if (!data.password)      return res.status(200).json({ data: { ok: true, role: data.role, hasPassword: false } });
        if (data.password !== password)
          return res.status(401).json({ error: "wrong password" });
        return res.status(200).json({ data: { ok: true, role: data.role, hasPassword: true } });
      }
      case "auth_telegram_lookup": {
        const tg = String(body.telegram_id || "").trim();
        if (!tg) return res.status(400).json({ error: "telegram_id required" });
        const { data } = await admin
          .from("users").select("username, telegram_id")
          .eq("telegram_id", tg).maybeSingle();
        return res.status(200).json({ data: data || null });
      }
      case "auth_user_lookup": {
        const nick = String(body.nick || "").trim();
        if (!nick) return res.status(400).json({ error: "nick required" });
        const { data } = await admin
          .from("users").select("id, username, telegram_id")
          .ilike("username", nick).maybeSingle();
        return res.status(200).json({ data: data || null });
      }
      case "auth_register": {
        const nick = String(body.nick || "").trim();
        const password = String(body.password || "");
        if (!nick || nick.length < 2) return res.status(400).json({ error: "bad nick" });
        if (password.length < 6)      return res.status(400).json({ error: "weak password" });
        const tg = body.telegram_id ? String(body.telegram_id) : null;

        // Перевірка зайнятості ніку чужим telegram_id
        const { data: existingNick } = await admin
          .from("users").select("username, telegram_id")
          .ilike("username", nick).maybeSingle();
        if (existingNick && tg && existingNick.telegram_id && String(existingNick.telegram_id) !== tg) {
          return res.status(409).json({ error: "nick taken" });
        }
        // Перевірка зайнятості Telegram іншим ніком
        if (tg) {
          const { data: tgBound } = await admin
            .from("users").select("username")
            .eq("telegram_id", tg).maybeSingle();
          if (tgBound?.username && tgBound.username.toLowerCase() !== nick.toLowerCase()) {
            return res.status(409).json({ error: "telegram bound", username: tgBound.username });
          }
        }

        const { error } = await admin.from("users").upsert({
          username: nick,
          telegram_id: tg,
          avatar_url: body.avatar_url ?? null,
          role: "player",
          balance: 0,
          password,
        }, { onConflict: "username" });
        if (error) return res.status(400).json({ error: error.message });
        return res.status(200).json({ data: { ok: true } });
      }
      case "auth_ban_check": {
        const nick = String(body.nick || "").trim();
        const tg   = String(body.telegram_id || "").trim();
        if (!nick && !tg) return res.status(200).json({ data: null });
        let q: any = admin.from("bans").select("reason, expires_at, is_permanent");
        if (tg && nick) q = q.or(`identifier.eq.${tg},identifier.ilike.${nick}`);
        else if (tg)    q = q.eq("identifier", tg);
        else            q = q.ilike("identifier", nick);
        const { data } = await q.limit(1);
        const ban = (data && data[0]) || null;
        return res.status(200).json({ data: ban });
      }
    }

    /* ── далі — операції, що вимагають логіну ────────────────────── */
    const nick     = String(body.nick || "").trim();
    const password = String(body.password || "");
    if (!nick || !password) {
      return res.status(401).json({ error: "Unauthorized: no credentials" });
    }

    const table = String(body.table || "").trim();
    if (!table || !ALLOWED_TABLES.has(table)) {
      return res.status(400).json({ error: `Table not allowed: ${table || "empty"}` });
    }

    // Verify creds
    const { data: userRow, error: userErr } = await admin
      .from("users").select("username, password, role")
      .ilike("username", nick).maybeSingle();
    if (userErr || !userRow) return res.status(401).json({ error: "Unauthorized: user not found" });
    if (userRow.password && userRow.password !== password) {
      return res.status(401).json({ error: "Unauthorized: wrong password" });
    }

    const isSuperAdmin = userRow.username.toLowerCase() === SUPER_ADMIN_NICK;
    const isAdmin = isSuperAdmin || userRow.role === "admin";

    /* ── SELECT ─────────────────────────────────────────────────── */
    if (body.op === "select") {
      // sanitize columns — заборонити пароль для звичайних користувачів
      let columns = (body.columns && String(body.columns).trim()) || "*";
      const sensitive = SENSITIVE_COLUMNS[table];
      if (sensitive && !isAdmin) {
        if (columns === "*") {
          // нехай повертає все, але потім зачистимо
        } else {
          const parts = columns.split(",").map((s) => s.trim()).filter(Boolean);
          const filtered = parts.filter((c) => !sensitive.has(c.split(/\s+/)[0]));
          if (filtered.length === 0) {
            return res.status(403).json({ error: "Forbidden columns" });
          }
          columns = filtered.join(", ");
        }
      }

      let q: any = admin.from(table).select(columns);

      // filters[]
      if (Array.isArray(body.filters)) {
        for (const f of body.filters) {
          if (!f || !FILTER_OPS.has(f.op)) continue;
          if (f.op === "or") {
            q = q.or(String(f.value));
          } else if (f.op === "in") {
            q = q.in(String(f.col), f.value as any[]);
          } else if (f.op === "is") {
            q = q.is(String(f.col), f.value as any);
          } else {
            q = (q as any)[f.op](String(f.col), f.value as any);
          }
        }
      }
      // legacy match
      if (body.match && typeof body.match === "object") {
        for (const [col, cond] of Object.entries(body.match)) {
          if (!cond || !FILTER_OPS.has(cond.op)) continue;
          q = (q as any)[cond.op](col, cond.value);
        }
      }
      if (body.order?.column) {
        q = q.order(body.order.column, { ascending: body.order.ascending !== false });
      }
      if (typeof body.limit === "number") q = q.limit(body.limit);

      let result;
      if (body.single)            result = await q.single();
      else if (body.maybeSingle)  result = await q.maybeSingle();
      else                        result = await q;

      if (result.error) return res.status(400).json({ error: result.error.message });

      // post-filter sensitive колонки (для * select)
      let data: any = result.data;
      if (sensitive && !isAdmin && data) {
        const strip = (row: any) => {
          if (!row || typeof row !== "object") return row;
          const o: any = { ...row };
          for (const k of sensitive) delete o[k];
          return o;
        };
        data = Array.isArray(data) ? data.map(strip) : strip(data);
      }
      return res.status(200).json({ data: data ?? null });
    }

    /* ── MUTATIONS ──────────────────────────────────────────────── */
    if (!MUTATION_OPS.has(body.op)) {
      return res.status(400).json({ error: `Op not allowed: ${body.op}` });
    }
    if (ADMIN_ONLY_TABLES.has(table) && !isAdmin) {
      const { data: permRow } = await admin
        .from("admin_perms").select("perms")
        .ilike("nick", nick).maybeSingle();
      if (!permRow) return res.status(403).json({ error: "Forbidden: admin access required" });
    }

    let q: any = admin.from(table);
    if      (body.op === "insert") q = q.insert(body.values as any);
    else if (body.op === "upsert") q = q.upsert(body.values as any, body.onConflict ? { onConflict: body.onConflict } : undefined);
    else if (body.op === "update") q = q.update(body.values as any);
    else                            q = q.delete();

    if (body.match && typeof body.match === "object") {
      for (const [col, cond] of Object.entries(body.match)) {
        if (!cond || !FILTER_OPS.has(cond.op)) continue;
        q = (q as any)[cond.op](col, cond.value);
      }
    }
    if (Array.isArray(body.filters)) {
      for (const f of body.filters) {
        if (!f || !FILTER_OPS.has(f.op)) continue;
        if (f.op === "in")      q = q.in(String(f.col), f.value as any[]);
        else if (f.op === "or") q = q.or(String(f.value));
        else                    q = (q as any)[f.op](String(f.col), f.value as any);
      }
    }
    if (body.returning) q = q.select();

    const { data, error } = await q;
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ data: data ?? null });
  } catch (e: any) {
    console.error("[api/db] exception:", e?.message);
    return res.status(500).json({ error: e?.message || "Server error" });
  }
}
