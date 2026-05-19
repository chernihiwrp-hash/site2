/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  /api/db.ts — захищений проксі для мутацій І SELECT-запитів    ║
 * ║                                                                  ║
 * ║  Аутентифікація: nick + password (перевіряються у Supabase)     ║
 * ║  Ключ до БД: SECRET_ROLE_KEY (Vercel env, ніколи не в браузері) ║
 * ║  Поле "password" завжди вирізається з усіх відповідей           ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * VERCEL ENV VARS (обов'язкові):
 *   SUPABASE_URL       — URL вашого проєкту Supabase
 *   SECRET_ROLE_KEY    — Supabase service_role key (НЕ додавайте VITE_ префікс!)
 */

import { createClient } from "@supabase/supabase-js";

// ── Дозволені таблиці ───────────────────────────────────────────────────────
const ALLOWED_TABLES = new Set<string>([
  "users", "license_applications", "car_plates", "faction_applications",
  "admin_applications", "admin_perms", "house_purchase_requests", "city_voice",
  "sos_signals", "wanted", "factions", "faction_leaders", "faction_overrides",
  "mayor_election", "nft_gifts", "nft_owners", "news", "houses", "documents",
  "bans", "house_families", "recruitment_settings", "house_confiscations",
  "mayor_candidate_applications", "notifications",
]);

// ── Дозволені операції ──────────────────────────────────────────────────────
const ALLOWED_OPS = new Set(["insert", "update", "delete", "upsert", "select"]);

// ── Дозволені фільтри ───────────────────────────────────────────────────────
const ALLOWED_FILTERS = new Set([
  "eq", "neq", "ilike", "like", "gt", "gte", "lt", "lte", "in",
]);

// ── Колонки, які НІКОЛИ не повертаються (навіть адмінам) ───────────────────
const FORBIDDEN_COLUMNS = new Set<string>(["password"]);

// ── Таблиці для звичайних гравців (мутації) ─────────────────────────────────
const PLAYER_TABLES = new Set<string>([
  "users", "license_applications", "car_plates", "faction_applications",
  "admin_applications", "house_purchase_requests", "city_voice", "sos_signals",
  "wanted", "nft_gifts", "nft_owners", "house_families",
  "mayor_candidate_applications", "notifications",
]);

// ── Таблиці тільки для адмінів (мутації) ───────────────────────────────────
const ADMIN_ONLY_TABLES = new Set<string>([
  "admin_perms", "bans", "news", "houses", "documents", "factions",
  "faction_leaders", "faction_overrides", "mayor_election",
  "recruitment_settings", "house_confiscations",
]);

// ── Таблиці, дозволені для SELECT гравцям ──────────────────────────────────
const SELECT_PLAYER_TABLES = new Set<string>([
  "users", "license_applications", "car_plates", "faction_applications",
  "admin_applications", "house_purchase_requests", "city_voice", "sos_signals",
  "wanted", "nft_gifts", "nft_owners", "news", "houses", "documents",
  "factions", "faction_leaders", "mayor_election", "recruitment_settings",
  "house_families", "mayor_candidate_applications", "notifications",
]);

// ── Таблиці для SELECT тільки адмінам ──────────────────────────────────────
const SELECT_ADMIN_ONLY_TABLES = new Set<string>([
  "admin_perms", "bans", "faction_overrides", "house_confiscations",
]);

const SUPER_ADMIN_NICK = "t1kron1x";

// ── Типи ────────────────────────────────────────────────────────────────────
type FilterOp = "eq" | "neq" | "ilike" | "like" | "gt" | "gte" | "lt" | "lte" | "in";
type Match = Record<string, { op: FilterOp; value: unknown }> | undefined;

interface Body {
  nick:         string;
  password:     string;
  table:        string;
  op:           "insert" | "update" | "delete" | "upsert" | "select";
  values?:      unknown;
  match?:       Match;
  onConflict?:  string;
  returning?:   boolean;
  // Select-specific
  columns?:     string;
  order?:       { column: string; ascending?: boolean };
  limit?:       number;
  single?:      boolean;
  maybeSingle?: boolean;
  count?:       "exact" | "planned" | "estimated";
  head?:        boolean;
}

/**
 * Рекурсивно видаляє заборонені колонки (зокрема "password") з відповіді.
 * Навіть якщо хтось спробує SELECT password — поле зникне з результату.
 */
function stripForbidden(data: unknown): unknown {
  if (data === null || data === undefined) return data;
  if (Array.isArray(data)) return data.map(stripForbidden);
  if (typeof data === "object") {
    const obj = data as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (!FORBIDDEN_COLUMNS.has(k)) out[k] = v;
    }
    return out;
  }
  return data;
}

export default async function handler(req: any, res: any) {
  // ── CORS ─────────────────────────────────────────────────────────────────
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")   return res.status(405).json({ error: "Method not allowed" });

  // ── Перевірка серверних змінних ──────────────────────────────────────────
  const SUPABASE_URL = process.env.SUPABASE_URL;
  // SECRET_ROLE_KEY — це ваш Supabase service_role key.
  // Зберігайте ТІЛЬКИ в Vercel як server-side змінну (без VITE_ префіксу).
  // Він НІКОЛИ не передається в браузер.
  const SERVICE_KEY  = process.env.SECRET_ROLE_KEY;

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({ error: "Server not configured" });
  }

  // ── Парсинг тіла ─────────────────────────────────────────────────────────
  let body: Body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  const { nick, password, op, values, match, onConflict, returning } = body || ({} as Body);
  const table = String(body?.table || "").trim();

  // ── 1. Базова валідація ───────────────────────────────────────────────────
  if (!nick || !password) {
    return res.status(401).json({ error: "Unauthorized: no credentials" });
  }
  if (!table || !ALLOWED_TABLES.has(table)) {
    return res.status(400).json({ error: `Table not allowed: ${table || "empty"}` });
  }
  if (!op || !ALLOWED_OPS.has(op)) {
    return res.status(400).json({ error: "Op not allowed" });
  }

  // ── 2. Захист колонок для SELECT ─────────────────────────────────────────
  if (op === "select" && body.columns && body.columns !== "*") {
    const requested = body.columns
      .split(",")
      .map((c: string) => c.trim().split(":")[0].trim().split("(")[0].trim());
    for (const col of requested) {
      if (FORBIDDEN_COLUMNS.has(col)) {
        return res.status(403).json({ error: `Column not allowed in SELECT: ${col}` });
      }
    }
  }

  // ── 3. Аутентифікація nick + password через Supabase ─────────────────────
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

  // ── 4. Перевірка прав ─────────────────────────────────────────────────────
  const normalizedNick = userRow.username.toLowerCase().trim();
  const isSuperAdmin   = normalizedNick === SUPER_ADMIN_NICK.toLowerCase();
  const isAdmin        = isSuperAdmin || userRow.role === "admin";

  if (op === "select") {
    if (SELECT_ADMIN_ONLY_TABLES.has(table) && !isAdmin) {
      return res.status(403).json({ error: "Forbidden: admin access required for this table" });
    }
    if (!SELECT_PLAYER_TABLES.has(table) && !SELECT_ADMIN_ONLY_TABLES.has(table)) {
      return res.status(403).json({ error: "Forbidden: table not available for SELECT" });
    }
  } else {
    if (ADMIN_ONLY_TABLES.has(table) && !isAdmin) {
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

  // ── 5. Виконання запиту ───────────────────────────────────────────────────
  try {
    let q: any = supabaseAdmin.from(table);

    if (op === "insert") {
      q = q.insert(values as any);
    } else if (op === "upsert") {
      q = q.upsert(values as any, onConflict ? { onConflict } : undefined);
    } else if (op === "update") {
      q = q.update(values as any);
    } else if (op === "delete") {
      q = q.delete();
    } else if (op === "select") {
      const cols = body.columns || "*";
      if (body.count) {
        q = q.select(cols, { count: body.count, head: body.head ?? false });
      } else {
        q = q.select(cols);
      }
    }

    // Фільтри
    if (match && typeof match === "object") {
      for (const [col, cond] of Object.entries(match)) {
        if (!cond || !ALLOWED_FILTERS.has(cond.op)) continue;
        if (cond.op === "in") {
          q = q.in(col, cond.value as any[]);
        } else {
          q = q[cond.op](col, cond.value as any);
        }
      }
    }

    // Сортування (тільки SELECT)
    if (op === "select" && body.order) {
      q = q.order(body.order.column, { ascending: body.order.ascending ?? false });
    }

    // Ліміт (тільки SELECT)
    if (op === "select" && body.limit) {
      q = q.limit(body.limit);
    }

    // Single / maybeSingle (тільки SELECT)
    if (op === "select" && body.single)       q = q.single();
    else if (op === "select" && body.maybeSingle) q = q.maybeSingle();

    // Returning для мутацій
    if (op !== "select" && returning) q = q.select();

    const { data, error, count } = await q;
    if (error) {
      console.error("[api/db] error:", error.message);
      return res.status(400).json({ error: error.message });
    }

    // ЗАВЖДИ видаляємо заборонені поля з відповіді (зокрема "password")
    const safeData = stripForbidden(data);
    return res.status(200).json({
      data: safeData ?? null,
      ...(count !== undefined && count !== null ? { count } : {}),
    });
  } catch (e: any) {
    console.error("[api/db] exception:", e?.message);
    return res.status(500).json({ error: e?.message || "Server error" });
  }
}
