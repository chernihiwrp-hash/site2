/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  /api/db.ts — захищений проксі для мутацій БД                  ║
 * ║                                                                  ║
 * ║  ВИМАГАЄ заголовок x-role-key = SECRET_ROLE_KEY (Vercel env)   ║
 * ║  Без нього — 403. Ключ ніколи не потрапляє у браузер.           ║
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

const ALLOWED_OPS  = new Set(["insert", "update", "delete", "upsert"]);
const ALLOWED_FILTERS = new Set(["eq", "ilike"]);

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

type Match = Record<string, { op: "eq" | "ilike"; value: unknown }> | undefined;

interface Body {
  nick:     string;
  password: string;
  table:    string;
  op:       "insert" | "update" | "delete" | "upsert";
  values?:  unknown;
  match?:   Match;
  onConflict?: string;
  returning?:  boolean;
}

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-role-key");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")   return res.status(405).json({ error: "Method not allowed" });

  const SUPABASE_URL    = process.env.SUPABASE_URL;
  const SERVICE_KEY     = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const SECRET_ROLE_KEY = process.env.SECRET_ROLE_KEY;

  // ── 0. Перевірка SECRET_ROLE_KEY ──────────────────────────────────────────
  // Ключ живе лише у Vercel Environment Variables — у браузері його немає.
  // Фронтенд не викликає /api/db напряму; це робить тільки src/lib/db.ts
  // через fetch з сервера (або api/db-select.ts).
  if (!SECRET_ROLE_KEY) {
    return res.status(500).json({ error: "Server not configured (SECRET_ROLE_KEY missing)" });
  }
  const incomingKey = req.headers["x-role-key"];
  if (!incomingKey || incomingKey !== SECRET_ROLE_KEY) {
    return res.status(403).json({ error: "Forbidden" });
  }

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({ error: "Server not configured" });
  }

  let body: Body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  const { nick, password, op, values, match, onConflict, returning } = body || {} as Body;
  const table = String(body?.table || "").trim();

  // ── 1. Перевірка вхідних даних ─────────────────────────────────────────────
  if (!nick || !password) {
    return res.status(401).json({ error: "Unauthorized: no credentials" });
  }
  if (!table || !ALLOWED_TABLES.has(table)) {
    return res.status(400).json({ error: `Table not allowed: ${table || "empty"}` });
  }
  if (!op || !ALLOWED_OPS.has(op)) {
    return res.status(400).json({ error: "Op not allowed" });
  }

  // ── 2. Перевірка нік/пароль у Supabase ────────────────────────────────────
  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userRow, error: userErr } = await supabaseAdmin
    .from("users")
    .select("username, password, role")
    .ilike("username", nick.trim())
    .maybeSingle();

  if (userErr || !userRow) {
    return res.status(401).json({ error: "Unauthorized: user not found" });
  }
  if (userRow.password !== password) {
    return res.status(401).json({ error: "Unauthorized: wrong password" });
  }

  // ── 3. Перевірка прав доступу до таблиці ──────────────────────────────────
  const normalizedNick = userRow.username.toLowerCase().trim();
  const isSuperAdmin   = normalizedNick === SUPER_ADMIN_NICK.toLowerCase();

  if (ADMIN_ONLY_TABLES.has(table)) {
    if (!isSuperAdmin && userRow.role !== "admin") {
      const { data: permRow } = await supabaseAdmin
        .from("admin_perms")
        .select("perms")
        .ilike("nick", nick.trim())
        .maybeSingle();

      if (!permRow) {
        return res.status(403).json({ error: "Forbidden: admin access required" });
      }
    }
  }

  // ── 4. Виконання запиту ────────────────────────────────────────────────────
  try {
    let q: any = supabaseAdmin.from(table);

    if      (op === "insert") q = q.insert(values as any);
    else if (op === "upsert") q = q.upsert(values as any, onConflict ? { onConflict } : undefined);
    else if (op === "update") q = q.update(values as any);
    else if (op === "delete") q = q.delete();

    if (match && typeof match === "object") {
      for (const [col, cond] of Object.entries(match)) {
        if (!cond || !ALLOWED_FILTERS.has(cond.op)) continue;
        q = q[cond.op](col, cond.value as any);
      }
    }

    if (returning) q = q.select();

    const { data, error } = await q;
    if (error) {
      console.error("[api/db] error:", error.message);
      return res.status(400).json({ error: error.message });
    }
    return res.status(200).json({ data: data ?? null });
  } catch (e: any) {
    console.error("[api/db] exception:", e?.message);
    return res.status(500).json({ error: e?.message || "Server error" });
  }
}
