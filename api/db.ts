/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  /api/db.ts — серверный прокси к Supabase                        ║
 * ║                                                                  ║
 * ║  ВСЁ (insert/update/delete/upsert + SELECT) идёт через           ║
 * ║  SUPABASE_SERVICE_ROLE_KEY на сервере. На клиенте сервисного     ║
 * ║  ключа НЕТ — даже anon ключа больше не нужно.                    ║
 * ║                                                                  ║
 * ║  Пароли пользователей НИКОГДА не уходят клиенту — колонка        ║
 * ║  `password` вырезается из любой выдачи, а селект её колонки      ║
 * ║  явно запрещён. Логин делается через op:"verify".                ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import { createClient } from "@supabase/supabase-js";

const ALLOWED_TABLES = new Set<string>([
  "users","license_applications","car_plates","faction_applications",
  "admin_applications","admin_perms","house_purchase_requests","city_voice",
  "sos_signals","wanted","factions","faction_leaders","faction_overrides",
  "mayor_election","nft_gifts","nft_owners","news","houses","documents",
  "bans","house_families","recruitment_settings","house_confiscations",
  "mayor_candidate_applications","notifications",
]);

const ALLOWED_MUTATIONS = new Set(["insert","update","delete","upsert"]);
const ALLOWED_FILTERS   = new Set(["eq","ilike","in","or","filter"]);
const ALLOWED_FILTER_OPS = new Set([
  "eq","neq","gt","gte","lt","lte","like","ilike","is","in",
]);

const PLAYER_TABLES = new Set<string>([
  "users","license_applications","car_plates","faction_applications",
  "admin_applications","house_purchase_requests","city_voice","sos_signals",
  "wanted","nft_gifts","nft_owners","house_families","mayor_candidate_applications",
  "notifications",
]);

const ADMIN_ONLY_TABLES = new Set<string>([
  "admin_perms","bans","news","houses","documents","factions","faction_leaders",
  "faction_overrides","mayor_election","recruitment_settings","house_confiscations",
]);

const SUPER_ADMIN_NICK = "t1kron1x";

type FilterEntry =
  | { op: "eq" | "ilike"; col: string; val: unknown }
  | { op: "in"; col: string; val: unknown[] }
  | { op: "or"; expr: string }
  | { op: "filter"; col: string; operator: string; val: unknown };

interface SelectPayload {
  op: "select";
  table: string;
  columns?: string;
  filters?: FilterEntry[];
  order?: { col: string; ascending?: boolean }[];
  limit?: number;
  range?: { from: number; to: number };
  single?: boolean;
  maybeSingle?: boolean;
  count?: "exact" | "planned" | "estimated";
  head?: boolean;
  nick: string;
  password: string;
}

interface MutationPayload {
  op: "insert" | "update" | "delete" | "upsert";
  table: string;
  values?: unknown;
  match?: Record<string, { op: "eq" | "ilike"; value: unknown }>;
  onConflict?: string;
  returning?: boolean;
  nick: string;
  password: string;
}

interface VerifyPayload   { op: "verify";   nick: string; password: string; }
interface CheckUserPayload     { op: "check_user";     nick: string; }
interface CheckTelegramPayload { op: "check_telegram"; telegram_id: string | number; }
interface RegisterPayload {
  op: "register";
  nick: string;
  password: string;
  telegram_id?: string | null;
  avatar_url?: string | null;
}

type AnyPayload =
  | SelectPayload | MutationPayload | VerifyPayload
  | CheckUserPayload | CheckTelegramPayload | RegisterPayload;

function stripPassword<T>(rows: T): T {
  if (!rows) return rows;
  if (Array.isArray(rows)) {
    return rows.map((r) => {
      if (r && typeof r === "object" && "password" in (r as any)) {
        const { password: _p, ...rest } = r as any;
        return rest;
      }
      return r;
    }) as unknown as T;
  }
  if (typeof rows === "object" && rows && "password" in (rows as any)) {
    const { password: _p, ...rest } = rows as any;
    return rest as T;
  }
  return rows;
}

function columnsRequestPassword(columns?: string): boolean {
  if (!columns) return false;
  if (columns.trim() === "*") return false; // мы вырежем сами
  return columns
    .split(",")
    .map((c) => c.trim().toLowerCase())
    .some((c) => c === "password" || c.endsWith(".password"));
}

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")    return res.status(405).json({ error: "Method not allowed" });

  // ── 0. Сервер обязан иметь SERVICE_ROLE_KEY. Без него — отказ. ───────────
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({
      error:
        "Server not configured: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY " +
        "must be set in Vercel Environment Variables.",
    });
  }

  let body: AnyPayload;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: "Invalid JSON" });
  }
  if (!body || typeof body !== "object" || !("op" in body)) {
    return res.status(400).json({ error: "Bad payload" });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ── Хелпер: проверка нік+пароль ──────────────────────────────────────────
  async function authUser(nick: string, password: string) {
    if (!nick || !password) return { ok: false as const, code: 401, msg: "no credentials" };
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("username, password, role")
      .ilike("username", nick.trim())
      .maybeSingle();
    if (error || !data) return { ok: false as const, code: 401, msg: "user not found" };
    if (data.password !== password) return { ok: false as const, code: 401, msg: "wrong password" };
    return { ok: true as const, user: data };
  }

  try {
    // ── verify: проверка логина (без авторизации, это и есть авторизация)
    if (body.op === "verify") {
      const { nick, password } = body;
      if (!nick) return res.status(400).json({ error: "nick required" });
      const { data, error } = await supabaseAdmin
        .from("users")
        .select("username, password, role")
        .ilike("username", String(nick).trim())
        .maybeSingle();
      if (error) return res.status(500).json({ error: error.message });
      if (!data) return res.status(200).json({ data: { ok: false, exists: false, hasPassword: false, role: null } });
      const hasPassword = !!data.password;
      const ok = !hasPassword || data.password === password;
      return res.status(200).json({
        data: { ok, exists: true, hasPassword, role: ok ? data.role ?? null : null },
      });
    }

    // ── check_user: занят ли ник (для регистрации) ──────────────────────────
    if (body.op === "check_user") {
      const nick = String((body as CheckUserPayload).nick || "").trim();
      if (!nick) return res.status(400).json({ error: "nick required" });
      const { data, error } = await supabaseAdmin
        .from("users")
        .select("id, username, telegram_id")
        .ilike("username", nick)
        .maybeSingle();
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({
        data: data
          ? { exists: true, telegram_id: data.telegram_id ?? null, username: data.username }
          : { exists: false, telegram_id: null, username: null },
      });
    }

    // ── check_telegram: есть ли уже аккаунт с этим телеграмом ───────────────
    if (body.op === "check_telegram") {
      const tg = (body as CheckTelegramPayload).telegram_id;
      if (tg === undefined || tg === null || tg === "") {
        return res.status(400).json({ error: "telegram_id required" });
      }
      const { data, error } = await supabaseAdmin
        .from("users")
        .select("username")
        .eq("telegram_id", String(tg))
        .maybeSingle();
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ data: { username: data?.username ?? null } });
    }

    // ── register: создание аккаунта (без авторизации) ───────────────────────
    if (body.op === "register") {
      const p = body as RegisterPayload;
      const nick = String(p.nick || "").trim();
      const password = String(p.password || "");
      if (nick.length < 2)      return res.status(400).json({ error: "nick too short" });
      if (password.length < 6)  return res.status(400).json({ error: "password too short" });
      const { error } = await supabaseAdmin.from("users").upsert(
        {
          username: nick,
          telegram_id: p.telegram_id ? String(p.telegram_id) : null,
          avatar_url:  p.avatar_url ?? null,
          role: "player",
          balance: 0,
          password,
        },
        { onConflict: "username" }
      );
      if (error) return res.status(400).json({ error: error.message });
      return res.status(200).json({ data: { ok: true } });
    }

    // ── Дальше: select и мутации — требуют авторизации ──────────────────────
    const { nick, password } = body as { nick: string; password: string };
    const auth = await authUser(nick, password);
    if (!auth.ok) return res.status(auth.code).json({ error: `Unauthorized: ${auth.msg}` });

    const isSuperAdmin = auth.user.username.toLowerCase().trim() === SUPER_ADMIN_NICK.toLowerCase();
    const isAdmin = isSuperAdmin || auth.user.role === "admin";

    // ── SELECT ──────────────────────────────────────────────────────────────
    if (body.op === "select") {
      const s = body as SelectPayload;
      const table = String(s.table || "").trim();
      if (!table || !ALLOWED_TABLES.has(table)) {
        return res.status(400).json({ error: `Table not allowed: ${table || "empty"}` });
      }

      // Нельзя запрашивать колонку password ни при каких условиях
      if (columnsRequestPassword(s.columns)) {
        return res.status(403).json({ error: "Column 'password' is not selectable" });
      }

      // Жесткое ограничение: админские таблицы читают только админы
      if (ADMIN_ONLY_TABLES.has(table) && !isAdmin) {
        const { data: permRow } = await supabaseAdmin
          .from("admin_perms").select("perms").ilike("nick", nick.trim()).maybeSingle();
        if (!permRow) return res.status(403).json({ error: "Forbidden: admin read required" });
      }

      const columns = s.columns && s.columns.trim() ? s.columns : "*";
      const opts: any = {};
      if (s.count) opts.count = s.count;
      if (s.head)  opts.head  = true;

      let q: any = supabaseAdmin.from(table).select(columns, opts);

      if (Array.isArray(s.filters)) {
        for (const f of s.filters) {
          if (!f || typeof f !== "object") continue;
          if (f.op === "eq"    && typeof f.col === "string") q = q.eq(f.col, (f as any).val);
          else if (f.op === "ilike" && typeof f.col === "string") q = q.ilike(f.col, (f as any).val);
          else if (f.op === "in"    && typeof f.col === "string" && Array.isArray((f as any).val)) q = q.in(f.col, (f as any).val);
          else if (f.op === "or"    && typeof (f as any).expr === "string") q = q.or((f as any).expr);
          else if (f.op === "filter" && typeof f.col === "string" && ALLOWED_FILTER_OPS.has((f as any).operator)) {
            q = q.filter(f.col, (f as any).operator, (f as any).val);
          }
        }
      }

      if (Array.isArray(s.order)) {
        for (const o of s.order) {
          if (o && typeof o.col === "string") q = q.order(o.col, { ascending: o.ascending !== false });
        }
      }
      if (typeof s.limit === "number") q = q.limit(s.limit);
      if (s.range && typeof s.range.from === "number" && typeof s.range.to === "number") {
        q = q.range(s.range.from, s.range.to);
      }
      if (s.single)      q = q.single();
      if (s.maybeSingle) q = q.maybeSingle();

      const { data, error, count } = await q;
      if (error) {
        // .maybeSingle на нескольких строках и т.п. — пробрасываем как 400
        return res.status(400).json({ error: error.message });
      }
      const safe = table === "users" ? stripPassword(data) : data;
      return res.status(200).json({ data: safe ?? null, count: count ?? null });
    }

    // ── Мутации ─────────────────────────────────────────────────────────────
    if (ALLOWED_MUTATIONS.has(body.op as string)) {
      const m = body as MutationPayload;
      const table = String(m.table || "").trim();
      if (!table || !ALLOWED_TABLES.has(table)) {
        return res.status(400).json({ error: `Table not allowed: ${table || "empty"}` });
      }
      if (ADMIN_ONLY_TABLES.has(table) && !isAdmin) {
        const { data: permRow } = await supabaseAdmin
          .from("admin_perms").select("perms").ilike("nick", nick.trim()).maybeSingle();
        if (!permRow) return res.status(403).json({ error: "Forbidden: admin write required" });
      }

      let q: any = supabaseAdmin.from(table);
      if      (m.op === "insert") q = q.insert(m.values as any);
      else if (m.op === "upsert") q = q.upsert(m.values as any, m.onConflict ? { onConflict: m.onConflict } : undefined);
      else if (m.op === "update") q = q.update(m.values as any);
      else if (m.op === "delete") q = q.delete();

      if (m.match && typeof m.match === "object") {
        for (const [col, cond] of Object.entries(m.match)) {
          if (!cond || !ALLOWED_FILTERS.has(cond.op)) continue;
          q = (q as any)[cond.op](col, cond.value as any);
        }
      }
      if (m.returning) q = q.select();

      const { data, error } = await q;
      if (error) return res.status(400).json({ error: error.message });
      const safe = table === "users" ? stripPassword(data) : data;
      return res.status(200).json({ data: safe ?? null });
    }

    return res.status(400).json({ error: `Unknown op: ${(body as any).op}` });
  } catch (e: any) {
    console.error("[api/db] exception:", e?.message);
    return res.status(500).json({ error: e?.message || "Server error" });
  }
}
