// /api/admin-verify.ts — серверна перевірка адмін-прав.
// Фронтенд викликає цей ендпоінт при відкритті AdminPanel.
// Відповідь: { role, perms } — клієнт НЕ може підробити.
// Замінює довіру до localStorage для визначення ролі.

import { createClient } from "@supabase/supabase-js";
import { verifyCredentials, applyCors } from "./_auth.js";
import { getClientIp, getUserAgent } from "./_logger.js";
import { checkAuthLimit } from "./_ratelimit.js";

const SUPER_ADMIN_NICK = "t1kron1x";

// Повний список пермішнів
const ALL_PERMS = [
  "sos","applications","factions","licenses","plates","house_requests",
  "news","houses","wanted","election","documents","add_faction","voice",
  "tokens","nft","manage_factions","recruitment","confiscation","mayor_apps",
  "debug","bans","db_logs","tech_work","battlepass","cook",
] as const;

type Perm = typeof ALL_PERMS[number];
type PermsMap = Record<Perm, boolean>;

const NO_PERMS: PermsMap = Object.fromEntries(ALL_PERMS.map(p => [p, false])) as PermsMap;
const ALL_TRUE: PermsMap = Object.fromEntries(ALL_PERMS.map(p => [p, true])) as PermsMap;

interface Body { nick: string; password: string; }

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

  const { nick, password } = body || {} as Body;

  const ip = getClientIp(req);
  const rawNick = nick ? String(nick).toLowerCase().trim() : null;

  // Анти-брутфорс
  if (checkAuthLimit(rawNick, ip)) {
    return res.status(429).json({ error: "Too many requests" });
  }

  if (!nick || !password) {
    return res.status(200).json({ role: "player", perms: NO_PERMS });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const user = await verifyCredentials(supabase, nick, password);
  if (!user) {
    return res.status(200).json({ role: "player", perms: NO_PERMS });
  }

  const { normalizedNick } = user;
  const isSuperAdmin = normalizedNick === SUPER_ADMIN_NICK.toLowerCase();

  if (isSuperAdmin) {
    return res.status(200).json({ role: "superadmin", perms: ALL_TRUE });
  }

  const isAdmin = user.role === "admin" || user.role === "superadmin";

  if (!isAdmin) {
    // Перевіряємо чи є схвалена заявка (модератор)
    const { data: appRow } = await supabase
      .from("admin_applications")
      .select("status")
      .ilike("username", normalizedNick)
      .eq("status", "approved")
      .maybeSingle();

    if (!appRow) {
      return res.status(200).json({ role: "player", perms: NO_PERMS });
    }
  }

  // Адмін — завантажуємо перміси з БД
  const { data: permRow } = await supabase
    .from("admin_perms")
    .select("perms")
    .ilike("username", normalizedNick)
    .maybeSingle();

  if (permRow?.perms) {
    // Мержимо з дефолтом false — нові перміси що з'явились пізніше будуть false
    const dbPerms = permRow.perms as Record<string, boolean>;
    const perms: PermsMap = { ...NO_PERMS };
    for (const p of ALL_PERMS) {
      perms[p] = dbPerms[p] === true;
    }
    return res.status(200).json({ role: isAdmin ? "admin" : "moderator", perms });
  }

  // Адмін без явних обмежень — повні права
  if (isAdmin) {
    return res.status(200).json({ role: "admin", perms: ALL_TRUE });
  }

  // Схвалений модератор без запису в admin_perms — повні права
  return res.status(200).json({ role: "moderator", perms: ALL_TRUE });
}
