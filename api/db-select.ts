
import { createClient } from "@supabase/supabase-js";
import { logDbRequest, getClientIp, getUserAgent } from "./_logger.js";
import { verifyCredentials, applyCors, safeDbError, DbAuthError } from "./_auth.js";
import { checkSelectLimit } from "./_ratelimit.js";

const READABLE_TABLES = new Set<string>([
  "users","license_applications","car_plates","faction_applications",
  "admin_applications","admin_perms","house_purchase_requests","city_voice",
  "sos_signals","wanted","factions","faction_leaders","faction_overrides",
  "mayor_election","nft_gifts","nft_owners","news","houses","documents",
  "bans","house_families","recruitment_settings","house_confiscations",
  "mayor_candidate_applications","notifications","db_logs","maintenance_mode",
  "battlepass_slots","battlepass_rewards","battlepass_config",
]);

const ALLOWED_FILTERS = new Set(["eq", "ilike", "in", "or", "is"]);
const ALLOWED_ORDERS  = new Set(["asc", "desc"]);
const SUPER_ADMIN_NICK = "t1kron1x";

const STRIP_FIELDS = new Set(["password","password_hash","secret_key","secret_token","service_key"]);

const PUBLIC_USER_COLUMNS =
  "id, username, role, balance, avatar_url, owned_themes, theme, active_theme, registered_at, owned_gifts, favorites";

type FilterOp = "eq" | "ilike" | "in" | "or" | "is";
type Filter = { col?: string; op: FilterOp; value: unknown };

interface SelectBody {
  nick: string; password: string; table: string;
  columns?: string; filters?: Filter[];
  order?: { col: string; dir?: "asc" | "desc" };
  limit?: number; single?: boolean; count?: boolean;
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
  if (req.method !== "POST")   return res.status(405).json({ error: "Method not allowed" });

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) return res.status(500).json({ error: "Server not configured" });

  let body: SelectBody;
  try { body = typeof req.body === "string" ? JSON.parse(req.body) : req.body; }
  catch { return res.status(400).json({ error: "Invalid JSON" }); }

  const { nick, password, filters, order, single, count } = body || {} as SelectBody;
  const table = String(body?.table || "").trim();
  const limit = typeof body?.limit === "number" ? Math.min(body.limit, 1000) : undefined;

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const ip = getClientIp(req);
  const ua = getUserAgent(req);

  // Rate limiting
  const rawNick = nick ? String(nick).toLowerCase().trim() : null;
  if (checkSelectLimit(rawNick, ip)) {
    console.warn(`[db-select] rate limit: nick=${rawNick} ip=${ip}`);
    return res.status(429).json({ error: "Too many requests" });
  }

  const deny = async (status: number, error: string, role: string | null = null) => {
    await logDbRequest(supabaseAdmin, {
      endpoint: "db-select", username: nick ? String(nick).toLowerCase().trim() : null,
      role, table_name: table || null, op: "select",
      match_keys: null, value_keys: null,
      match_snapshot: null, value_snapshot: null, telegram_id: null,
      status, allowed: false, error, ip, user_agent: ua,
    });
    return res.status(status).json({ error });
  };

  if (!nick || !password) return deny(401, "Unauthorized: no credentials");
  if (!table || !READABLE_TABLES.has(table)) return deny(400, `Table not allowed: ${table || "empty"}`);

  let user;
  try {
    user = await verifyCredentials(supabaseAdmin, nick, password);
  } catch (e: any) {
    // Збій самої бази (напр. невірний SERVICE_ROLE_KEY або проєкт на паузі).
    // НЕ маскуємо під 401 — віддаємо чесну 503 з причиною.
    if (e instanceof DbAuthError) {
      return deny(503, `Service unavailable (DB): ${e.message}`, null);
    }
    return deny(503, "Service unavailable (DB)", null);
  }
  if (!user) return deny(401, "Unauthorized");

  const { normalizedNick } = user;
  const isSuperAdmin   = normalizedNick === SUPER_ADMIN_NICK.toLowerCase();
  const isAdmin = isSuperAdmin || user.role === "admin" || user.role === "superadmin" || user.role === "moderator";
  const role = isSuperAdmin ? "superadmin" : (user.role || "player");

  if (table === "db_logs") {
    if (!isAdmin) {
      const { data: permRow } = await supabaseAdmin
        .from("admin_perms").select("perms").ilike("username", normalizedNick).maybeSingle();
      const has = !!(permRow?.perms as any)?.db_logs;
      if (!has) return deny(403, "Forbidden: missing permission \"db_logs\"");
    } else if (!isSuperAdmin) {
      const { data: permRow } = await supabaseAdmin
        .from("admin_perms").select("perms").ilike("username", normalizedNick).maybeSingle();
      const has = permRow ? !!(permRow.perms as any)?.db_logs : true;
      if (permRow && !has) return deny(403, "Forbidden: missing permission \"db_logs\"");
    }
  }

  // columns
  let columns: string;
  if (table === "users" && !isAdmin) {
    const isSelfQuery = filters && filters.some(f =>
      f.col === "username" && f.op === "eq" &&
      String(f.value).toLowerCase().trim() === normalizedNick
    );
    columns = isSelfQuery
      ? PUBLIC_USER_COLUMNS + ", telegram_id, is_banned, rare_balance, vip_expires_at, vip_duration, referral_code, referred_by"
      : PUBLIC_USER_COLUMNS;
  } else {
    columns = String(body?.columns || "*").trim();
  }

  try {
    if (count) {
      let q: any = supabaseAdmin.from(table).select(columns, { count: "exact", head: true });
      if (filters) for (const f of filters) {
        if (!f?.op || !ALLOWED_FILTERS.has(f.op)) continue;
        if (f.op === "or") { q = q.or(String(f.value)); continue; }
        if (!f.col) continue;
        if (f.op === "in") { q = q.in(f.col, f.value as any[]); continue; }
        q = q[f.op](f.col, f.value as any);
      }
      const { count: cnt, error } = await q;
      if (error) return deny(400, safeDbError(error), role);
      await logDbRequest(supabaseAdmin, {
        endpoint: "db-select", username: normalizedNick, role,
        table_name: table, op: "select.count", match_keys: null, value_keys: null,
        match_snapshot: null, value_snapshot: null, telegram_id: null,
        status: 200, allowed: true, error: null, ip, user_agent: ua,
      });
      return res.status(200).json({ data: null, count: cnt ?? 0 });
    }

    let q: any = supabaseAdmin.from(table).select(columns);
    if (filters) for (const f of filters) {
      if (!f?.op || !ALLOWED_FILTERS.has(f.op)) continue;
      if (f.op === "or") { q = q.or(String(f.value)); continue; }
      if (!f.col) continue;
      if (f.op === "in") { q = q.in(f.col, f.value as any[]); continue; }
      q = q[f.op](f.col, f.value as any);
    }
    if (order?.col) {
      const dir = ALLOWED_ORDERS.has(order.dir ?? "") ? order.dir : "asc";
      q = q.order(order.col, { ascending: dir === "asc" });
    }
    if (limit) q = q.limit(limit);
    if (single) q = q.maybeSingle();

    const { data, error } = await q;
    if (error) return deny(400, safeDbError(error), role);

    await logDbRequest(supabaseAdmin, {
      endpoint: "db-select", username: normalizedNick, role,
      table_name: table, op: "select", match_keys: null, value_keys: null,
      match_snapshot: null, value_snapshot: null, telegram_id: null,
      status: 200, allowed: true, error: null, ip, user_agent: ua,
    });
    return res.status(200).json({ data: stripSensitive(data) ?? null });
  } catch (e: any) {
    return deny(500, "Server error", role);
  }
}
