// /api/auth.ts — verify, checkUser, checkTelegram, register, upsert.
import { createClient } from "@supabase/supabase-js";
import { logDbRequest, getClientIp, getUserAgent, keysOf } from "./_logger";

type Op = "verify" | "checkUser" | "checkTelegram" | "register" | "upsert";

interface Body {
  op: Op; nick?: string; password?: string;
  values?: Record<string, unknown>; tgId?: string;
}

const SAFE_USER_COLUMNS =
  "id, username, role, balance, avatar_url, owned_themes, telegram_id, theme, active_theme, registered_at, rare_balance, vip_expires_at, vip_duration, referral_code, referred_by, owned_gifts, favorites";

const FORBIDDEN_USER_FIELDS = new Set([
  "role","is_banned","balance","rare_balance",
  "vip_expires_at","vip_duration","telegram_id",
]);

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")   return res.status(405).json({ error: "Method not allowed" });

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) return res.status(500).json({ error: "Server not configured" });

  let body: Body;
  try { body = typeof req.body === "string" ? JSON.parse(req.body) : req.body; }
  catch { return res.status(400).json({ error: "Invalid JSON" }); }

  const { op, nick, password, values } = body || {} as Body;
  const ALLOWED: Op[] = ["verify","checkUser","checkTelegram","register","upsert"];
  if (!op || !ALLOWED.includes(op)) return res.status(400).json({ error: "Op not allowed" });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const ip = getClientIp(req);
  const ua = getUserAgent(req);

  const log = (status: number, allowed: boolean, error: string | null = null) =>
    logDbRequest(supabase, {
      endpoint: "auth", username: nick ? String(nick).toLowerCase().trim() : null,
      role: null, table_name: "users", op,
      match_keys: null, value_keys: keysOf(values),
      status, allowed, error, ip, user_agent: ua,
    });

  if (op === "verify") {
    if (!nick || !password) { await log(400, false, "missing creds"); return res.status(400).json({ error: "nick and password required" }); }
    const { data: row, error } = await supabase
      .from("users").select(`${SAFE_USER_COLUMNS}, password`)
      .ilike("username", nick.trim()).maybeSingle();
    if (error || !row)               { await log(401, false, "user not found"); return res.status(401).json({ error: "User not found" }); }
    if (row.password !== password)   { await log(401, false, "wrong password"); return res.status(401).json({ error: "Wrong password" }); }
    const tgId = String((body as any).tgId || "").trim();
    if (row.role === "admin" || row.role === "mayor") {
      if (!tgId) { await log(403, false, "tg required"); return res.status(403).json({ error: "Telegram required for this account" }); }
      if (String(row.telegram_id || "").trim() !== tgId) { await log(403, false, "tg mismatch"); return res.status(403).json({ error: "Telegram account mismatch" }); }
    }
    const { password: _removed, ...safeUser } = row;
    await log(200, true);
    return res.status(200).json({ data: safeUser });
  }

  if (op === "checkUser") {
    if (!nick) return res.status(400).json({ error: "nick required" });
    const { data } = await supabase.from("users").select("id").ilike("username", nick.trim()).maybeSingle();
    await log(200, true);
    return res.status(200).json({ exists: !!data });
  }

  if (op === "checkTelegram") {
    if (!nick) return res.status(400).json({ error: "nick required" });
    const { data } = await supabase.from("users").select("telegram_id").ilike("username", nick.trim()).maybeSingle();
    await log(200, true);
    return res.status(200).json({ data: data ?? null });
  }

  if (op === "register") {
    if (!values || typeof values !== "object") { await log(400, false, "no values"); return res.status(400).json({ error: "values required" }); }
    for (const field of FORBIDDEN_USER_FIELDS) {
      if (field in values) { await log(403, false, `forbidden ${field}`); return res.status(403).json({ error: `Forbidden: cannot set field "${field}" during registration` }); }
    }
    const checkNick = (values as any).username || (values as any).nick;
    if (checkNick) {
      const { data: existing } = await supabase
        .from("users").select("id").ilike("username", String(checkNick).trim()).maybeSingle();
      if (existing) { await log(409, false, "taken"); return res.status(409).json({ error: "Username already taken" }); }
    }
    const { data, error } = await supabase.from("users").insert(values as any).select(SAFE_USER_COLUMNS);
    if (error) { await log(400, false, error.message); return res.status(400).json({ error: error.message }); }
    await log(200, true);
    return res.status(200).json({ data: data ?? null });
  }

  if (op === "upsert") {
    if (!values || typeof values !== "object") { await log(400, false, "no values"); return res.status(400).json({ error: "values required" }); }
    for (const field of FORBIDDEN_USER_FIELDS) {
      if (field in values) { await log(403, false, `forbidden ${field}`); return res.status(403).json({ error: `Forbidden: cannot set field "${field}"` }); }
    }
    if (!nick || !password) { await log(401, false, "no creds"); return res.status(401).json({ error: "Unauthorized" }); }

    const { data: userRow, error: userErr } = await supabase
      .from("users").select("username, password").ilike("username", nick.trim()).maybeSingle();
    if (userErr || !userRow) { await log(401, false, "user not found"); return res.status(401).json({ error: "Unauthorized" }); }
    if (userRow.password !== password) { await log(401, false, "wrong password"); return res.status(401).json({ error: "Unauthorized" }); }

    // ПАТЧ H8: username у values обов'язковий і має дорівнювати залогіненому
    const targetUsername = String((values as any).username || "").toLowerCase().trim();
    const ownUsername = userRow.username.toLowerCase().trim();
    if (!targetUsername || targetUsername !== ownUsername) {
      await log(403, false, "upsert not own");
      return res.status(403).json({ error: "Forbidden: can only upsert your own record" });
    }

    const { data, error } = await supabase
      .from("users").upsert(values as any, { onConflict: "username" }).select(SAFE_USER_COLUMNS);
    if (error) { await log(400, false, error.message); return res.status(400).json({ error: error.message }); }
    await log(200, true);
    return res.status(200).json({ data: data ?? null });
  }

  return res.status(400).json({ error: "Unknown op" });
}
