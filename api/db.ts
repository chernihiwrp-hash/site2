// /api/db.ts — захищений проксі для INSERT/UPDATE/DELETE/UPSERT.
// v4: переписана логіка пермів — тепер адміни з потрібним пермом завжди проходять,
//     зайві дублюючі перевірки видалено, додана пряма карта оп → перм.

import { createClient } from "@supabase/supabase-js";
import { logDbRequest, getClientIp, getUserAgent, keysOf } from "./_logger.js";
import { verifyCredentials, applyCors, safeDbError } from "./_auth.js";
import { checkMutationLimit } from "./_ratelimit.js";

// ─── Які таблиці взагалі доступні через цей endpoint ────────────────────────
const ALLOWED_TABLES = new Set<string>([
  "users","license_applications","car_plates","faction_applications",
  "admin_applications","admin_perms","house_purchase_requests","city_voice",
  "sos_signals","wanted","factions","faction_leaders","faction_overrides",
  "mayor_election","nft_gifts","nft_owners","news","houses","documents",
  "bans","house_families","recruitment_settings","house_confiscations",
  "mayor_candidate_applications","notifications","db_logs",
]);

const ALLOWED_OPS     = new Set(["insert", "update", "delete", "upsert"]);
const ALLOWED_FILTERS = new Set(["eq", "ilike"]);
const SAFE_COL        = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const SUPER_ADMIN_NICK = "t1kron1x";

// ─── Карта таблиця → який пермісіон потрібен ────────────────────────────────
// Для таблиць яких тут немає — потрібен повний isAdmin або isSuperAdmin.
const TABLE_PERM: Record<string, string> = {
  factions:                    "manage_factions",
  faction_leaders:             "manage_factions",
  faction_overrides:           "manage_factions",
  news:                        "news",
  houses:                      "houses",
  house_confiscations:         "houses",
  house_families:              "houses",
  bans:                        "bans",
  documents:                   "documents",
  recruitment_settings:        "recruitment",
  mayor_election:              "election",
  nft_gifts:                   "nft",
  nft_owners:                  "nft",
  wanted:                      "wanted",
  sos_signals:                 "sos",
  notifications:               "sos",
  admin_perms:                 "__superadmin__", // тільки superadmin
  db_logs:                     "__readonly__",    // тільки читати
};

// Таблиці де потрібен id/slug у match для delete/update
const SINGLE_ROW_REQUIRED = new Set([
  "factions","faction_leaders","faction_overrides","houses","news","documents",
  "bans","recruitment_settings","house_confiscations","mayor_election",
]);

// Таблиці де гравець (без будь-яких пермів) може insert тільки свій рядок
const OWN_RECORD_TABLES = new Set(["wanted", "sos_signals", "city_voice", "notifications"]);

// Таблиці де гравець може тільки insert з pending/review статусом
const APPLICATION_TABLES = new Set([
  "admin_applications","license_applications","faction_applications",
  "house_purchase_requests","mayor_candidate_applications",
]);

type Match = Record<string, { op: "eq" | "ilike"; value: unknown }> | undefined;
interface Body {
  nick: string; password: string; table: string;
  op: "insert"|"update"|"delete"|"upsert";
  values?: unknown; match?: Match;
  onConflict?: string; returning?: boolean;
}

function hasWildcard(v: unknown): boolean {
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

  // ── Rate limiting ────────────────────────────────────────────────────────
  const rawNick = nick ? String(nick).toLowerCase().trim() : null;
  if (checkMutationLimit(rawNick, ip)) {
    console.warn(`[db] rate limit: nick=${rawNick} ip=${ip}`);
    return res.status(429).json({ error: "Too many requests" });
  }

  const deny = async (status: number, error: string, role: string | null = null) => {
    await logDbRequest(supabaseAdmin, {
      endpoint: "db", username: rawNick,
      role, table_name: table || null, op: op || null,
      match_keys: keysOf(match), value_keys: keysOf(values),
      status, allowed: false, error, ip, user_agent: ua,
    });
    return res.status(status).json({ error });
  };
  const allow = async (status: number, role: string, payload: any) => {
    await logDbRequest(supabaseAdmin, {
      endpoint: "db", username: rawNick ?? "",
      role, table_name: table, op,
      match_keys: keysOf(match), value_keys: keysOf(values),
      status, allowed: true, error: null, ip, user_agent: ua,
    });
    return res.status(status).json(payload);
  };

  // ── 1. Базова валідація ──────────────────────────────────────────────────
  if (!nick || !password)             return deny(401, "Unauthorized: no credentials");
  if (!table || !ALLOWED_TABLES.has(table)) return deny(400, `Table not allowed: ${table || "empty"}`);
  if (!op || !ALLOWED_OPS.has(op))    return deny(400, "Op not allowed");
  if (table === "db_logs")            return deny(403, "db_logs is read-only via this endpoint");

  if ((op === "delete" || op === "update" || op === "upsert") && (!match || !Object.keys(match).length)) {
    return deny(400, `match is required for "${op}"`);
  }
  if (match) {
    for (const col of Object.keys(match)) {
      if (!SAFE_COL.test(col)) return deny(400, `Invalid match column: ${col}`);
      const cond = (match as any)[col];
      if (!cond || !ALLOWED_FILTERS.has(cond.op)) return deny(400, `Invalid filter on ${col}`);
    }
  }

  // ── 2. Аутентифікація ────────────────────────────────────────────────────
  const user = await verifyCredentials(supabaseAdmin, nick, password);
  if (!user) return deny(401, "Unauthorized");

  const { normalizedNick } = user;
  const isSuperAdmin = normalizedNick === SUPER_ADMIN_NICK.toLowerCase();
  const isAdmin      = isSuperAdmin || user.role === "admin";
  const role         = isSuperAdmin ? "superadmin" : (user.role || "player");

  // ── 3. Завантажуємо перміссіони (тільки для не-повних адмінів) ───────────
  let adminPerms: Record<string, boolean> = {};
  if (!isAdmin) {
    const { data: permRow } = await supabaseAdmin
      .from("admin_perms").select("perms").ilike("username", normalizedNick).maybeSingle();
    adminPerms = (permRow?.perms as Record<string, boolean>) || {};
  }

  // Допоміжна: чи є у юзера конкретний пермісіон
  const hasPerm = (perm: string): boolean => {
    if (isSuperAdmin) return true;
    if (isAdmin) return true;
    return !!adminPerms[perm];
  };

  // Допоміжна: чи є хоча б якийсь адмін-пермісіон
  const hasAnyPerm = isAdmin || Object.values(adminPerms).some(Boolean);

  // ── 4. Перевірка пермісіону для цієї таблиці ────────────────────────────
  const requiredPerm = TABLE_PERM[table];

  if (requiredPerm === "__superadmin__") {
    if (!isSuperAdmin) return deny(403, "Forbidden: superadmin only");
  } else if (requiredPerm) {
    // Таблиця захищена — потрібен конкретний пермісіон
    if (!hasPerm(requiredPerm)) {
      return deny(403, `Forbidden: missing permission "${requiredPerm}"`);
    }
  } else {
    // Таблиця без perm у карті — потрібен будь-який адмін або власний запис
    // (обробляється нижче для OWN_RECORD_TABLES і APPLICATION_TABLES)
  }

  // ── 5. Обмеження по типу операції ───────────────────────────────────────

  // 5.1 SINGLE_ROW_REQUIRED — delete/update потребує id або slug
  if (SINGLE_ROW_REQUIRED.has(table) && (op === "delete" || op === "update" || op === "upsert") && !isSuperAdmin) {
    const hasIdOrSlug = match && Object.entries(match).some(([k, c]) =>
      (k === "id" || k === "slug") && c.op === "eq" && !hasWildcard(c.value)
    );
    if (!hasIdOrSlug) {
      return deny(400, `"${op}" on "${table}" requires explicit id/slug match`);
    }
  }

  // 5.2 OWN_RECORD_TABLES — гравець без пермів може тільки insert свій запис
  if (OWN_RECORD_TABLES.has(table) && !hasAnyPerm) {
    if (op === "delete" || op === "update" || op === "upsert") {
      // Перевіряємо що match вказує на власний рядок
      const ownFields = ["username", "nick", "author"];
      const isOwn = match && Object.entries(match).some(([k, c]) =>
        ownFields.includes(k) && !hasWildcard(c.value) &&
        String(c.value).toLowerCase().trim() === normalizedNick
      );
      if (!isOwn) return deny(403, "Forbidden: can only modify your own records");
    }
    // insert — дозволяємо (будь-який гравець може відправити SOS)
  }

  // 5.3 APPLICATION_TABLES — гравець може тільки вставляти pending заявки
  if (APPLICATION_TABLES.has(table) && !hasAnyPerm) {
    if (op === "update" || op === "delete" || op === "upsert") {
      // Тільки своя заявка
      const ownFields = ["username", "nick", "author"];
      const isOwn = match && Object.entries(match).some(([k, c]) =>
        ownFields.includes(k) && !hasWildcard(c.value) &&
        String(c.value).toLowerCase().trim() === normalizedNick
      );
      if (!isOwn) return deny(403, "Forbidden: can only modify your own application");
    }
    if (op === "insert" && values && typeof values === "object") {
      // Не можна вставити зі статусом approved/rejected
      const FORBIDDEN_STATUSES = new Set(["approved", "rejected", "banned"]);
      const statusVal = String((values as any)["status"] || "").toLowerCase().trim();
      if (statusVal && FORBIDDEN_STATUSES.has(statusVal)) {
        return deny(403, `Forbidden: cannot insert with status="${statusVal}"`);
      }
      for (const f of ["approved", "rejected", "approved_by"]) {
        if (f in (values as any)) return deny(403, `Forbidden: cannot set "${f}"`);
      }
    }
  }

  // 5.4 users — особлива таблиця
  if (table === "users") {
    const ADMIN_ONLY_FIELDS = ["role","is_banned","balance","rare_balance","vip_expires_at","vip_duration","password_hash"];
    if (!hasAnyPerm) {
      // Звичайний гравець
      if (values && typeof values === "object") {
        for (const f of ADMIN_ONLY_FIELDS) {
          if (f in (values as any)) return deny(403, `Forbidden: cannot modify field "${f}"`);
        }
      }
      // Може тільки свій рядок
      if (op === "update" || op === "delete" || op === "upsert") {
        const isOwn = match && Object.entries(match).some(([k, c]) =>
          k === "username" && !hasWildcard(c.value) &&
          String(c.value).toLowerCase().trim() === normalizedNick
        );
        if (!isOwn) return deny(403, "Forbidden: can only modify your own user record");
      }
    } else if (!isSuperAdmin) {
      // Адмін — не може змінити роль/бан іншого адміна
      if ((op === "update" || op === "upsert") && values && typeof values === "object") {
        if ("role" in (values as any) || "is_banned" in (values as any)) {
          const targetNick = String((match as any)?.["username"]?.value || "").toLowerCase().trim();
          if (targetNick && targetNick !== normalizedNick) {
            const { data: t } = await supabaseAdmin
              .from("users").select("role").ilike("username", targetNick).maybeSingle();
            if (t?.role === "admin" || targetNick === SUPER_ADMIN_NICK.toLowerCase()) {
              return deny(403, "Forbidden: cannot change role/ban of another admin");
            }
          }
        }
      }
    }
  }

  // 5.5 bans — не можна забанити адміна
  if (table === "bans" && !isSuperAdmin) {
    if ((op === "insert" || op === "update" || op === "upsert") && values && typeof values === "object") {
      const targetNick = String((values as any).username || (values as any).nick || "").toLowerCase().trim();
      if (targetNick) {
        const { data: t } = await supabaseAdmin
          .from("users").select("role").ilike("username", targetNick).maybeSingle();
        if (t?.role === "admin" || targetNick === SUPER_ADMIN_NICK.toLowerCase()) {
          return deny(403, "Forbidden: cannot ban an admin");
        }
      }
    }
  }

  // 5.6 nft — тільки відповідний insert без підміни полів
  if ((table === "nft_owners" || table === "nft_gifts") && !hasPerm("nft")) {
    // Доступно тільки адмінам з perm="nft". Звичайний гравець — заборонено.
    // (Купівля NFT йде через /api/balance, не через цей endpoint)
    return deny(403, "Forbidden: NFT management requires nft permission");
  }

  // ── 6. Виконання ─────────────────────────────────────────────────────────
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
      return res.status(400).json({ error: safeDbError(error) });
    }
    return allow(200, role, { data: data ?? null });
  } catch (e: any) {
    await logDbRequest(supabaseAdmin, {
      endpoint: "db", username: normalizedNick, role,
      table_name: table, op, match_keys: keysOf(match), value_keys: keysOf(values),
      status: 500, allowed: false, error: e?.message || "server error", ip, user_agent: ua,
    });
    return res.status(500).json({ error: "Server error" });
  }
}
