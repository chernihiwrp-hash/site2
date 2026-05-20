

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

// ── Таблиці заявок — гравець може тільки insert свою заявку ──────────────────
// update/delete/upsert статусних полів — тільки адміни
const STATUS_PROTECTED_TABLES = new Set([
  "admin_applications", "license_applications", "faction_applications",
  "house_purchase_requests", "mayor_candidate_applications",
]);

// Поля у заявках, які може змінювати тільки адмін
const FORBIDDEN_STATUS_FIELDS = new Set(["status", "approved", "rejected", "approved_by"]);

// Таблиці де гравець може видаляти тільки свій запис
const OWN_RECORD_TABLES = new Set(["wanted", "sos_signals", "city_voice", "notifications"]);

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
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")   return res.status(405).json({ error: "Method not allowed" });

  const SUPABASE_URL    = process.env.SUPABASE_URL;
  const SERVICE_KEY     = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

  // ── ПАТЧ: delete/update БЕЗ match — забороняємо завжди ───────────────────
  // Без цього будь-який гравець міг передати delete без match і стерти всю таблицю
  if ((op === "delete" || op === "update") && (!match || Object.keys(match).length === 0)) {
    return res.status(400).json({ error: `match is required for "${op}" operation` });
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
  const isAdmin        = isSuperAdmin || userRow.role === "admin";

  const TABLE_PERM_MAP: Record<string, string> = {
    "sos_signals":                  "sos",
    "news":                         "news",
    "houses":                       "houses",
    "house_confiscations":          "houses",
    "house_purchase_requests":      "house_requests",
    "wanted":                       "wanted",
    "bans":                         "bans",
    "nft_gifts":                    "nft",
    "nft_owners":                   "nft",
    "recruitment_settings":         "recruitment",
    "factions":                     "manage_factions",
    "faction_leaders":              "manage_factions",
    "faction_overrides":            "manage_factions",
    "faction_applications":         "factions",
    "mayor_election":               "election",
    "mayor_candidate_applications": "mayor_apps",
    "documents":                    "documents",
    "admin_perms":                  "debug",
    "admin_applications":           "applications",
    "license_applications":         "licenses",
    "car_plates":                   "plates",
    "city_voice":                   "voice",
    "house_families":               "houses",
    "notifications":                "sos",
  };

  if (ADMIN_ONLY_TABLES.has(table) && !isAdmin) {
    const requiredPerm = TABLE_PERM_MAP[table];
    const { data: permRow } = await supabaseAdmin
      .from("admin_perms")
      .select("perms")
      .eq("username", normalizedNick)
      .maybeSingle();
    const adminPerms = (permRow?.perms as Record<string, boolean>) || {};
    if (!requiredPerm || !adminPerms[requiredPerm]) {
      return res.status(403).json({ error: `Forbidden: missing permission "${requiredPerm || table}"` });
    }
  }

  let adminPermsGlobal: Record<string, boolean> = {};
  if (!isAdmin) {
    const { data: permRow } = await supabaseAdmin
      .from("admin_perms")
      .select("perms")
      .eq("username", normalizedNick)
      .maybeSingle();
    adminPermsGlobal = (permRow?.perms as Record<string, boolean>) || {};
  }
  const hasAnyAdminPerm = isAdmin || Object.values(adminPermsGlobal).some(Boolean);

  // ── 3.5. Захист таблиці users ────────────────────────────────────────────
  if (table === "users") {
    const ADMIN_USER_FIELDS = ["role", "telegram_id", "is_banned", "balance", "rare_balance", "vip_expires_at", "vip_duration"];

    if (!hasAnyAdminPerm) {
      if (values && typeof values === "object") {
        for (const field of ADMIN_USER_FIELDS) {
          if (field in (values as any)) {
            return res.status(403).json({ error: `Forbidden: cannot modify field "${field}"` });
          }
        }
      }
      // Гравець може update/delete/upsert тільки свій запис
      // ПАТЧ: перевіряємо match навіть якщо він є — раніше при відсутності match перевірка пропускалась
      if (op === "update" || op === "delete" || op === "upsert") {
        if (!match || Object.keys(match).length === 0) {
          return res.status(403).json({ error: "Forbidden: match with own username is required" });
        }
        const hasOwnFilter = Object.entries(match).some(([k, cond]) =>
          k === "username" &&
          String((cond as any).value).toLowerCase().trim() === normalizedNick
        );
        if (!hasOwnFilter) {
          return res.status(403).json({ error: "Forbidden: can only modify your own user record" });
        }
      }
    }
  }

  // ── 3.6. Захист статусів заявок ───────────────────────────────────────────
  // ПАТЧ: додано "upsert" — раніше гравець міг зробити upsert зі status=approved
  if (STATUS_PROTECTED_TABLES.has(table) && !hasAnyAdminPerm) {
    if ((op === "update" || op === "delete" || op === "upsert") && values && typeof values === "object") {
      for (const field of FORBIDDEN_STATUS_FIELDS) {
        if (field in (values as any)) {
          return res.status(403).json({ error: `Forbidden: cannot change "${field}" field` });
        }
      }
    }

    // ПАТЧ: гравець може тільки insert свою заявку — не може змінювати чужі
    if ((op === "update" || op === "delete" || op === "upsert") && match) {
      const ownerFields = ["username", "nick", "player_nick", "author"];
      const hasOwnFilter = Object.entries(match).some(([k, cond]) =>
        ownerFields.includes(k) &&
        String((cond as any).value).toLowerCase().trim() === normalizedNick
      );
      if (!hasOwnFilter) {
        return res.status(403).json({ error: "Forbidden: can only modify your own application" });
      }
    }
  }

  // ── 3.7. Захист nft_owners і nft_gifts ────────────────────────────────────
  if ((table === "nft_owners" || table === "nft_gifts") && !hasAnyAdminPerm) {
    if (op === "update" || op === "delete") {
      return res.status(403).json({ error: "Forbidden: cannot modify NFT records" });
    }
    if (op === "insert" && values && typeof values === "object") {
      const owner = (values as any).owner_nick || (values as any).recipient_nick;
      if (owner && String(owner).toLowerCase().trim() !== normalizedNick) {
        return res.status(403).json({ error: "Forbidden: cannot assign NFT to another user" });
      }
    }
    // ПАТЧ: upsert заборонений для NFT гравцям
    if (op === "upsert") {
      return res.status(403).json({ error: "Forbidden: cannot upsert NFT records" });
    }
  }

  // ── 3.8. Захист wanted/sos_signals — delete тільки свого запису ──────────
  // ПАТЧ: раніше при відсутності match перевірка пропускалась → delete всієї таблиці
  if (OWN_RECORD_TABLES.has(table) && !hasAnyAdminPerm) {
    if (op === "delete") {
      // match вже перевірений вище (обов'язковий для delete), але перевіряємо власника
      const hasOwnFilter = Object.entries(match!).some(([k, cond]) =>
        (k === "username" || k === "nick" || k === "author") &&
        String((cond as any).value).toLowerCase().trim() === normalizedNick
      );
      if (!hasOwnFilter) {
        return res.status(403).json({ error: "Forbidden: can only delete your own records" });
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
