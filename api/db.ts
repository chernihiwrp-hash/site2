// /api/db.ts — захищений проксі для INSERT/UPDATE/DELETE/UPSERT.
// v3: bcrypt-пароли, узкий CORS, нейтрализация текста ошибок, rate limiting.

import { createClient } from "@supabase/supabase-js";
import { logDbRequest, getClientIp, getUserAgent, keysOf } from "./_logger.js";
import { verifyCredentials, applyCors, safeDbError } from "./_auth.js";
import { checkMutationLimit } from "./_ratelimit.js";

const ALLOWED_TABLES = new Set<string>([
  "users","license_applications","car_plates","faction_applications",
  "admin_applications","admin_perms","house_purchase_requests","city_voice",
  "sos_signals","wanted","factions","faction_leaders","faction_overrides",
  "mayor_election","nft_gifts","nft_owners","news","houses","documents",
  "bans","house_families","recruitment_settings","house_confiscations",
  "mayor_candidate_applications","notifications",
  "db_logs",
]);

const ALLOWED_OPS  = new Set(["insert", "update", "delete", "upsert"]);
const ALLOWED_FILTERS = new Set(["eq", "ilike"]);

const ADMIN_ONLY_TABLES = new Set<string>([
  "admin_perms","bans","news","houses","documents","factions","faction_leaders",
  "faction_overrides","mayor_election","recruitment_settings","house_confiscations",
]);

const SUPER_ADMIN_NICK = "t1kron1x";

const STATUS_PROTECTED_TABLES = new Set([
  "admin_applications", "license_applications", "faction_applications",
  "house_purchase_requests", "mayor_candidate_applications",
]);
const FORBIDDEN_STATUS_FIELDS = new Set(["status", "approved", "rejected", "approved_by"]);
const APPROVED_INSERT_STATUSES = new Set(["pending", "review"]);

const OWN_RECORD_TABLES = new Set(["wanted", "sos_signals", "city_voice", "notifications"]);

// Таблицы, где delete/update обязаны адресовать ОДНУ строку (id/slug).
const SINGLE_ROW_REQUIRED = new Set([
  "factions","faction_leaders","faction_overrides","houses","news","documents",
  "bans","recruitment_settings","house_confiscations","mayor_election",
]);

// Доп. защита для самых критичных таблиц: insert/upsert этих таблиц
// разрешён ТОЛЬКО админам с соответствующим пермом или супер-админу.
// Без этого обычный игрок мог бы заINSERT'ить "свой" дом/фракцию/розыск.
const ADMIN_INSERT_REQUIRED = new Set([
  "factions","faction_leaders","faction_overrides","houses","news","documents",
  "bans","recruitment_settings","house_confiscations","mayor_election","wanted",
]);

const SAFE_COL = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

type Match = Record<string, { op: "eq" | "ilike"; value: unknown }> | undefined;

interface Body {
  nick: string; password: string; table: string;
  op: "insert" | "update" | "delete" | "upsert";
  values?: unknown; match?: Match;
  onConflict?: string; returning?: boolean;
}

function valueHasWildcard(v: unknown): boolean {
  const s = String(v ?? "");
  return s.includes("%") || s.includes("_");
}

export default async function handler(req: any, res: any) {
  applyCors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")   return res.status(405).json({ error: "Method not allowed" });

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) return res.status(500).json({ error: "Server not configured" });

  let body: Body;
  try { body = typeof req.body === "string" ? JSON.parse(req.body) : req.body; }
  catch { return res.status(400).json({ error: "Invalid JSON" }); }

  const { nick, password, op, values, match, onConflict, returning } = body || {} as Body;
  const table = String(body?.table || "").trim();
  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const ip = getClientIp(req);
  const ua = getUserAgent(req);

  // Rate limiting
  const rawNick = nick ? String(nick).toLowerCase().trim() : null;
  if (checkMutationLimit(rawNick, ip)) {
    console.warn(`[db] rate limit: nick=${rawNick} ip=${ip}`);
    return res.status(429).json({ error: "Too many requests" });
  }

  const deny = async (status: number, error: string, role: string | null = null) => {
    await logDbRequest(supabaseAdmin, {
      endpoint: "db", username: nick ? String(nick).toLowerCase().trim() : null,
      role, table_name: table || null, op: op || null,
      match_keys: keysOf(match), value_keys: keysOf(values),
      status, allowed: false, error, ip, user_agent: ua,
    });
    return res.status(status).json({ error });
  };
  const allow = async (status: number, role: string, payload: any) => {
    await logDbRequest(supabaseAdmin, {
      endpoint: "db", username: String(nick).toLowerCase().trim(),
      role, table_name: table, op,
      match_keys: keysOf(match), value_keys: keysOf(values),
      status, allowed: true, error: null, ip, user_agent: ua,
    });
    return res.status(status).json(payload);
  };

  // ── 1. Базова валидация ──────────────────────────────────────────────────
  if (!nick || !password) return deny(401, "Unauthorized: no credentials");
  if (!table || !ALLOWED_TABLES.has(table)) return deny(400, `Table not allowed: ${table || "empty"}`);
  if (!op || !ALLOWED_OPS.has(op)) return deny(400, "Op not allowed");

  if (table === "db_logs") return deny(403, "db_logs is read-only");

  if ((op === "delete" || op === "update" || op === "upsert") && (!match || Object.keys(match).length === 0)) {
    return deny(400, `match is required for "${op}" operation`);
  }

  if (match) {
    for (const col of Object.keys(match)) {
      if (!SAFE_COL.test(col)) return deny(400, `Invalid match column: ${col}`);
      const cond = (match as any)[col];
      if (!cond || !ALLOWED_FILTERS.has(cond.op)) return deny(400, `Invalid filter on ${col}`);
    }
  }

  // ── 2. Перевірка користувача (bcrypt) ────────────────────────────────────
  const user = await verifyCredentials(supabaseAdmin, nick, password);
  if (!user) return deny(401, "Unauthorized");

  const { normalizedNick } = user;
  const isSuperAdmin   = normalizedNick === SUPER_ADMIN_NICK.toLowerCase();
  const isAdmin        = isSuperAdmin || user.role === "admin";
  const role           = isSuperAdmin ? "superadmin" : (user.role || "player");

  // ── 3. Permission map ────────────────────────────────────────────────────
  const TABLE_PERM_MAP: Record<string, string> = {
    "sos_signals":"sos","news":"news","houses":"houses",
    "house_confiscations":"houses","house_purchase_requests":"house_requests",
    "wanted":"wanted","bans":"bans","nft_gifts":"nft","nft_owners":"nft",
    "recruitment_settings":"recruitment","factions":"manage_factions",
    "faction_leaders":"manage_factions","faction_overrides":"manage_factions",
    "faction_applications":"factions","mayor_election":"election",
    "mayor_candidate_applications":"mayor_apps","documents":"documents",
    "admin_perms":"debug","admin_applications":"applications",
    "license_applications":"licenses","car_plates":"plates",
    "city_voice":"voice","house_families":"houses","notifications":"sos",
  };

  let adminPermsGlobal: Record<string, boolean> = {};
  if (!isAdmin) {
    const { data: permRow } = await supabaseAdmin
      .from("admin_perms").select("perms").ilike("username", normalizedNick).maybeSingle();
    adminPermsGlobal = (permRow?.perms as Record<string, boolean>) || {};
  }
  const hasAnyAdminPerm = isAdmin || Object.values(adminPermsGlobal).some(Boolean);

  if (ADMIN_ONLY_TABLES.has(table) && !isAdmin) {
    const requiredPerm = TABLE_PERM_MAP[table];
    if (!requiredPerm || !adminPermsGlobal[requiredPerm]) {
      return deny(403, `Forbidden: missing permission "${requiredPerm || table}"`);
    }
  }

  // ── 3.0 Жёсткий запрет INSERT/UPSERT в admin-таблицы для обычных игроков ─
  // Закрывает дыру, когда у игрока нет ни одного перма и он пытается
  // создать "свой" дом/фракцию/розыск через insert (delete/update уже
  // прикрыты ADMIN_ONLY_TABLES + SINGLE_ROW_REQUIRED выше).
  if (ADMIN_INSERT_REQUIRED.has(table) && (op === "insert" || op === "upsert") && !isSuperAdmin) {
    const requiredPerm = TABLE_PERM_MAP[table];
    const hasPerm = isAdmin || (requiredPerm ? !!adminPermsGlobal[requiredPerm] : false);
    if (!hasPerm) {
      return deny(403, `Forbidden: missing permission "${requiredPerm || table}" for ${op}`);
    }
  }

  // ── 3.1 «Один ряд» для критичных таблиц ──────────────────────────────────
  if (SINGLE_ROW_REQUIRED.has(table) && (op === "delete" || op === "update" || op === "upsert") && !isSuperAdmin) {
    const hasIdOrSlug = match && Object.entries(match).some(([k, c]) =>
      (k === "id" || k === "slug") && c.op === "eq" && !valueHasWildcard(c.value)
    );
    if (!hasIdOrSlug) {
      return deny(400, `Operation on "${table}" requires explicit id/slug match`);
    }
  }

  // ── 3.5 users ────────────────────────────────────────────────────────────
  if (table === "users") {
    const ADMIN_USER_FIELDS = ["role","telegram_id","is_banned","balance","rare_balance","vip_expires_at","vip_duration","password_hash"];
    if (!hasAnyAdminPerm) {
      if (values && typeof values === "object") {
        for (const field of ADMIN_USER_FIELDS) {
          if (field in (values as any)) return deny(403, `Forbidden: cannot modify field "${field}"`);
        }
      }
      if (op === "update" || op === "delete" || op === "upsert") {
        if (!match) return deny(403, "Forbidden: match is required");
        const hasOwnFilter = Object.entries(match).some(([k, cond]) => {
          if (k !== "username") return false;
          if (cond.op === "ilike" && valueHasWildcard(cond.value)) return false;
          return String(cond.value).toLowerCase().trim() === normalizedNick;
        });
        if (!hasOwnFilter) return deny(403, "Forbidden: can only modify your own user record");
      }
    }
  }

  // ── 3.6 Статусы заявок ───────────────────────────────────────────────────
  if (STATUS_PROTECTED_TABLES.has(table) && !hasAnyAdminPerm) {
    if (values && typeof values === "object") {
      if (op === "insert") {
        const statusVal = String((values as any)["status"] || "").toLowerCase().trim();
        if ("status" in (values as any) && !APPROVED_INSERT_STATUSES.has(statusVal)) {
          return deny(403, `Forbidden: cannot insert with status="${statusVal}"`);
        }
        for (const field of ["approved","rejected","approved_by"]) {
          if (field in (values as any)) return deny(403, `Forbidden: cannot set "${field}" field`);
        }
      } else {
        for (const field of FORBIDDEN_STATUS_FIELDS) {
          if (field in (values as any)) return deny(403, `Forbidden: cannot change "${field}" field`);
        }
      }
    }
    if ((op === "update" || op === "delete" || op === "upsert") && match) {
      const ownerFields = ["username","nick","player_nick","author"];
      const hasOwnFilter = Object.entries(match).some(([k, cond]) => {
        if (!ownerFields.includes(k)) return false;
        if (cond.op === "ilike" && valueHasWildcard(cond.value)) return false;
        return String(cond.value).toLowerCase().trim() === normalizedNick;
      });
      if (!hasOwnFilter) return deny(403, "Forbidden: can only modify your own application");
    }
  }

  // ── 3.65 bans ────────────────────────────────────────────────────────────
  if (table === "bans" && !isSuperAdmin) {
    if ((op === "insert" || op === "update" || op === "upsert") && values && typeof values === "object") {
      const targetNick = String((values as any).username || (values as any).nick || "").toLowerCase().trim();
      if (targetNick) {
        const { data: targetRow } = await supabaseAdmin
          .from("users").select("role, username").ilike("username", targetNick).maybeSingle();
        if (targetRow?.role === "admin" || targetRow?.username?.toLowerCase().trim() === SUPER_ADMIN_NICK.toLowerCase()) {
          return deny(403, "Forbidden: cannot ban an admin");
        }
      }
    }
  }

  // ── 3.66 admin_perms ─────────────────────────────────────────────────────
  if (table === "admin_perms" && !isSuperAdmin) {
    return deny(403, "Forbidden: only super-admin can manage admin permissions");
  }

  // ── 3.68 users + change role/ban ─────────────────────────────────────────
  if (table === "users" && !isSuperAdmin && hasAnyAdminPerm) {
    if ((op === "update" || op === "upsert") && values && typeof values === "object") {
      const hasRoleChange = "role" in (values as any) || "is_banned" in (values as any);
      if (hasRoleChange && match) {
        const targetNick = String((match as any)["username"]?.value || "").toLowerCase().trim();
        if (targetNick && targetNick !== normalizedNick) {
          const { data: targetRow } = await supabaseAdmin
            .from("users").select("role, username").ilike("username", targetNick).maybeSingle();
          if (targetRow?.role === "admin" ||
              targetRow?.username?.toLowerCase().trim() === SUPER_ADMIN_NICK.toLowerCase()) {
            return deny(403, "Forbidden: cannot change role or ban status of an admin");
          }
        }
      }
    }
  }

  // ── 3.7 NFT ──────────────────────────────────────────────────────────────
  // Менять/создавать/удалять записи NFT может только админ с пермом "nft"
  // (или супер-админ). Раньше проверялся `hasAnyAdminPerm` — этого мало,
  // потому что любой админ с любым пермом мог пометить чужой NFT как SOLD.
  const isNftAdmin = isSuperAdmin || isAdmin || !!adminPermsGlobal["nft"];
  if ((table === "nft_owners" || table === "nft_gifts") && !isNftAdmin) {
    if (op === "update" || op === "delete") return deny(403, "Forbidden: cannot modify NFT records");
    if (op === "upsert") return deny(403, "Forbidden: cannot upsert NFT records");
    if (op === "insert" && values && typeof values === "object") {
      // Обычный игрок может вставить только запись на свой ник и без
      // прямой подмены полей `sold` / `status` (это делает только /api/balance buy_nft).
      const owner = (values as any).owner_nick || (values as any).recipient_nick;
      if (owner && String(owner).toLowerCase().trim() !== normalizedNick) {
        return deny(403, "Forbidden: cannot assign NFT to another user");
      }
      for (const f of ["sold","status","price"]) {
        if (f in (values as any)) return deny(403, `Forbidden: cannot set "${f}" on NFT insert`);
      }
    }
  }

  // ── 3.8 OWN_RECORD_TABLES ────────────────────────────────────────────────
  if (OWN_RECORD_TABLES.has(table) && !hasAnyAdminPerm) {
    if (op === "delete" || op === "update" || op === "upsert") {
      if (!match) return deny(403, "Forbidden: match required");
      const hasOwnFilter = Object.entries(match).some(([k, cond]) => {
        if (!(k === "username" || k === "nick" || k === "author")) return false;
        if (cond.op === "ilike" && valueHasWildcard(cond.value)) return false;
        return String(cond.value).toLowerCase().trim() === normalizedNick;
      });
      if (!hasOwnFilter) return deny(403, "Forbidden: can only modify your own records");
    }
  }

  // ── 4. Выполнение ────────────────────────────────────────────────────────
  try {
    let q: any = supabaseAdmin.from(table);
    if      (op === "insert") q = q.insert(values as any);
    else if (op === "upsert") q = q.upsert(values as any, onConflict ? { onConflict } : undefined);
    else if (op === "update") q = q.update(values as any);
    else if (op === "delete") q = q.delete();
    if (match) {
      for (const [col, cond] of Object.entries(match)) {
        if (!cond || !ALLOWED_FILTERS.has(cond.op)) continue;
        q = q[cond.op](col, cond.value as any);
      }
    }
    if (returning) q = q.select();
    const { data, error } = await q;
    if (error) {
      await logDbRequest(supabaseAdmin, {
        endpoint: "db", username: normalizedNick, role,
        table_name: table, op, match_keys: keysOf(match), value_keys: keysOf(values),
        status: 400, allowed: false, error: error.message, ip, user_agent: ua,
      });
      // Не отдаём наружу текст ошибки Supabase — может утечь схема.
      return res.status(400).json({ error: safeDbError(error) });
    }
    return allow(200, role, { data: data ?? null });
  } catch (e: any) {
    // Логируем подробности, наружу — общий текст.
    await logDbRequest(supabaseAdmin, {
      endpoint: "db", username: normalizedNick, role,
      table_name: table, op, match_keys: keysOf(match), value_keys: keysOf(values),
      status: 500, allowed: false, error: e?.message || "server error", ip, user_agent: ua,
    });
    return res.status(500).json({ error: "Server error" });
  }
}
