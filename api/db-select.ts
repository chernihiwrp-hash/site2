/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  /api/db-select.ts — захищений проксі для SELECT-запитів        ║
 * ║                                                                  ║
 * ║  ВИМАГАЄ заголовок x-role-key = SECRET_ROLE_KEY (Vercel env)   ║
 * ║  Виконується через SERVICE_ROLE_KEY — RLS обходиться на сервері ║
 * ║  Поля password, secret_* автоматично вирізаються з відповіді    ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import { createClient } from "@supabase/supabase-js";

// Таблиці, дозволені для читання
const READABLE_TABLES = new Set<string>([
  "users","license_applications","car_plates","faction_applications",
  "admin_applications","admin_perms","house_purchase_requests","city_voice",
  "sos_signals","wanted","factions","faction_leaders","faction_overrides",
  "mayor_election","nft_gifts","nft_owners","news","houses","documents",
  "bans","house_families","recruitment_settings","house_confiscations",
  "mayor_candidate_applications","notifications",
]);

const ALLOWED_FILTERS  = new Set(["eq", "ilike", "in", "or", "is"]);
const ALLOWED_ORDERS   = new Set(["asc", "desc"]);

// Поля, які НІКОЛИ не повертаються клієнту незалежно від запиту
const STRIP_FIELDS = new Set(["password", "secret_key", "secret_token", "service_key"]);

type FilterOp = "eq" | "ilike" | "in" | "or" | "is";
type Filter = { col?: string; op: FilterOp; value: unknown };

interface SelectBody {
  nick:       string;
  password:   string;
  table:      string;
  columns?:   string;          // "id, username, balance" або "*"
  filters?:   Filter[];
  order?:     { col: string; dir?: "asc" | "desc" };
  limit?:     number;
  single?:    boolean;         // maybeSingle()
  count?:     boolean;         // head-only count
}

/** Видаляє заборонені поля з об'єкта або масиву об'єктів */
function stripSensitive(data: unknown): unknown {
  if (Array.isArray(data)) return data.map(stripSensitive);
  if (data && typeof data === "object") {
    return Object.fromEntries(
      Object.entries(data as Record<string, unknown>)
        .filter(([k]) => !STRIP_FIELDS.has(k.toLowerCase()))
    );
  }
  return data;
}

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")   return res.status(405).json({ error: "Method not allowed" });

  const SUPABASE_URL    = process.env.SUPABASE_URL;
  const SERVICE_KEY     = process.env.SUPABASE_SERVICE_ROLE_KEY;
  );
  }

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({ error: "Server not configured" });
  }

  let body: SelectBody;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  const { nick, password, filters, order, single, count } = body || {} as SelectBody;
  const table   = String(body?.table || "").trim();
  const columns = String(body?.columns || "*").trim();
  const limit   = typeof body?.limit === "number" ? Math.min(body.limit, 1000) : undefined;

  // ── 1. Базова валідація ────────────────────────────────────────────────────
  if (!nick || !password) {
    return res.status(401).json({ error: "Unauthorized: no credentials" });
  }
  if (!table || !READABLE_TABLES.has(table)) {
    return res.status(400).json({ error: `Table not allowed: ${table || "empty"}` });
  }

  // ── 2. Перевірка нік/пароль ────────────────────────────────────────────────
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

  // ── 3. Виконання SELECT ────────────────────────────────────────────────────
  try {
    // Якщо count-only — повертаємо лише count
    if (count) {
      let q: any = supabaseAdmin.from(table).select(columns, { count: "exact", head: true });
      if (filters) {
        for (const f of filters) {
          if (!f?.op || !ALLOWED_FILTERS.has(f.op)) continue;
          if (f.op === "or") { q = q.or(String(f.value)); continue; }
          if (!f.col) continue;
          if (f.op === "in") { q = q.in(f.col, f.value as any[]); continue; }
          q = q[f.op](f.col, f.value as any);
        }
      }
      const { count: cnt, error } = await q;
      if (error) return res.status(400).json({ error: error.message });
      return res.status(200).json({ data: null, count: cnt ?? 0 });
    }

    let q: any = supabaseAdmin.from(table).select(columns);

    if (filters) {
      for (const f of filters) {
        if (!f?.op || !ALLOWED_FILTERS.has(f.op)) continue;
        if (f.op === "or") { q = q.or(String(f.value)); continue; }
        if (!f.col) continue;
        if (f.op === "in") { q = q.in(f.col, f.value as any[]); continue; }
        q = q[f.op](f.col, f.value as any);
      }
    }

    if (order?.col) {
      const dir = ALLOWED_ORDERS.has(order.dir ?? "") ? order.dir : "asc";
      q = q.order(order.col, { ascending: dir === "asc" });
    }

    if (limit) q = q.limit(limit);
    if (single) q = q.maybeSingle();

    const { data, error } = await q;
    if (error) {
      console.error("[api/db-select] error:", error.message);
      return res.status(400).json({ error: error.message });
    }

    // Завжди вирізаємо чутливі поля перед відповіддю
    return res.status(200).json({ data: stripSensitive(data) ?? null });
  } catch (e: any) {
    console.error("[api/db-select] exception:", e?.message);
    return res.status(500).json({ error: e?.message || "Server error" });
  }
}
