// /api/db-public.ts — публічний SELECT без авторизації.
// Тільки для таблиць які ПОВИННІ бути доступні всім (список фракцій, будинків, новин тощо).
// Використовує SERVICE_ROLE_KEY на сервері — RLS не заважає.
// НЕ повертає чутливі поля (password, telegram_id тощо).

import { createClient } from "@supabase/supabase-js";
import { applyCors } from "./_auth.js";

// Таблиці дозволені для публічного читання — тільки те що справді потрібно без авторизації
const PUBLIC_TABLES = new Set<string>([
  "factions",
  "faction_overrides",
  "faction_applications",  // тільки count/статуси — для лічильника учасників
  "faction_leaders",
  "houses",
  "news",
  "city_voice",
  "bans",                  // для перевірки бану при старті
  "users",                 // тільки публічні поля (обмежено нижче)
  "notifications",         // для лічильника непрочитаних
  "maintenance_mode",
  "nft_gifts",
  "wanted",
  "admin_applications",    // тільки для тесту з'єднання в адмінці
]);

// Поля які НЕ повертаємо навіть в публічних запитах
const STRIP_FIELDS = new Set([
  "password", "password_hash", "secret_key", "secret_token", "service_key",
  "telegram_id", "is_banned", "rare_balance", "vip_expires_at", "vip_duration",
  "referral_code", "referred_by",
]);

// Для таблиці users — тільки ці поля дозволені
const PUBLIC_USER_COLUMNS = "id, username, role, balance, avatar_url, owned_themes, theme, active_theme, registered_at, owned_gifts, favorites";

const ALLOWED_FILTER_OPS = new Set(["eq", "ilike", "in", "or", "is"]);
const ALLOWED_ORDERS = new Set(["asc", "desc"]);

type FilterOp = "eq" | "ilike" | "in" | "or" | "is";
type Filter = { col?: string; op: FilterOp; value: unknown };

interface PublicSelectBody {
  table: string;
  columns?: string;
  filters?: Filter[];
  order?: { col: string; dir?: "asc" | "desc" };
  limit?: number;
  single?: boolean;
  count?: boolean;
}

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
  applyCors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) return res.status(500).json({ error: "Server not configured" });

  let body: PublicSelectBody;
  try { body = typeof req.body === "string" ? JSON.parse(req.body) : req.body; }
  catch { return res.status(400).json({ error: "Invalid JSON" }); }

  const table = String(body?.table || "").trim();
  const { filters, order, single, count } = body || {} as PublicSelectBody;
  const limit = typeof body?.limit === "number" ? Math.min(body.limit, 500) : undefined;

  if (!table || !PUBLIC_TABLES.has(table)) {
    return res.status(400).json({ error: `Table not allowed: ${table || "empty"}` });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Для users — завжди обмежуємо колонки публічними
  let columns: string;
  if (table === "users") {
    columns = PUBLIC_USER_COLUMNS;
  } else {
    columns = String(body?.columns || "*").trim();
  }

  try {
    if (count) {
      let q: any = supabaseAdmin.from(table).select(columns, { count: "exact", head: true });
      if (filters) for (const f of filters) {
        if (!f?.op || !ALLOWED_FILTER_OPS.has(f.op)) continue;
        if (f.op === "or") { q = q.or(String(f.value)); continue; }
        if (!f.col) continue;
        if (f.op === "in") { q = q.in(f.col, f.value as any[]); continue; }
        q = q[f.op](f.col, f.value as any);
      }
      const { count: cnt, error } = await q;
      if (error) return res.status(400).json({ error: "Database error" });
      return res.status(200).json({ data: null, count: cnt ?? 0 });
    }

    let q: any = supabaseAdmin.from(table).select(columns);
    if (filters) for (const f of filters) {
      if (!f?.op || !ALLOWED_FILTER_OPS.has(f.op)) continue;
      if (f.op === "or") { q = q.or(String(f.value)); continue; }
      if (!f.col) continue;
      if (f.op === "in") { q = q.in(f.col, f.value as any[]); continue; }
      q = q[f.op](f.col, f.value as any);
    }
    if (order?.col && ALLOWED_ORDERS.has(order.dir ?? "")) {
      q = q.order(order.col, { ascending: order.dir === "asc" });
    } else if (order?.col) {
      q = q.order(order.col, { ascending: true });
    }
    if (limit) q = q.limit(limit);
    if (single) q = q.maybeSingle();

    const { data, error } = await q;
    if (error) return res.status(400).json({ error: "Database error" });

    return res.status(200).json({ data: stripSensitive(data) ?? null });
  } catch {
    return res.status(500).json({ error: "Server error" });
  }
}
