// /api/auth.ts — verify, checkUser, checkTelegram, register, upsert.
// v3: фикс регистрации — разрешаем дефолтные безопасные поля (role='player',
// balance=0, telegram_id, avatar_url). Любые попытки протащить admin-роль
// или произвольный баланс блокируются строгим whitelist.

import { createClient } from "@supabase/supabase-js";
import { logDbRequest, getClientIp, getUserAgent, keysOf, safeSnapshot } from "./_logger.js";
import { verifyCredentials, hashPassword, applyCors } from "./_auth.js";
import { checkAuthLimit } from "./_ratelimit.js";

type Op = "verify" | "checkUser" | "checkTelegram" | "register" | "upsert";

interface Body {
  op: Op; nick?: string; password?: string;
  values?: Record<string, unknown>; tgId?: string;
}

const SAFE_USER_COLUMNS =
  "id, username, role, balance, avatar_url, owned_themes, telegram_id, theme, active_theme, registered_at, rare_balance, vip_expires_at, vip_duration, referral_code, referred_by, owned_gifts, favorites";

// Запрещённые поля для UPSERT обычного игрока (он не может менять role/balance/etc).
const UPSERT_FORBIDDEN_FIELDS = new Set([
  "role","is_banned","balance","rare_balance",
  "vip_expires_at","vip_duration","telegram_id",
  "password_hash",
]);

// Безопасные поля при REGISTER. Всё остальное — отбрасываем.
const REGISTER_ALLOWED_FIELDS = new Set([
  "username","nick","password",
  "telegram_id","avatar_url","photo_url",
  "role","balance","theme","active_theme","referred_by",
]);

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

  const { op, nick, password, values } = body || {} as Body;
  const ALLOWED: Op[] = ["verify","checkUser","checkTelegram","register","upsert"];
  if (!op || !ALLOWED.includes(op)) return res.status(400).json({ error: "Op not allowed" });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const ip = getClientIp(req);

  // Rate limiting for auth (anti-bruteforce)
  const rawNickAuth = typeof req.body?.nick === "string" ? req.body.nick.toLowerCase().trim() : null;
  if (checkAuthLimit(rawNickAuth, ip)) {
    console.warn(`[auth] rate limit: nick=${rawNickAuth} ip=${ip}`);
    return res.status(429).json({ error: "Too many requests" });
  }
  const ua = getUserAgent(req);

  const log = (status: number, allowed: boolean, error: string | null = null, tgId: string | null = null) =>
    logDbRequest(supabase, {
      endpoint: "auth", username: nick ? String(nick).toLowerCase().trim() : null,
      role: null, table_name: "users", op,
      match_keys: null, value_keys: keysOf(values),
      match_snapshot: null,
      value_snapshot: safeSnapshot(values),
      telegram_id: tgId || (typeof (values as any)?.tgId === "string" ? (values as any).tgId : null),
      status, allowed, error, ip, user_agent: ua,
    });

  if (op === "verify") {
    if (!nick || !password) { await log(400, false, "missing creds"); return res.status(400).json({ error: "nick and password required" }); }
    const user = await verifyCredentials(supabase, nick, password);
    if (!user) { await log(401, false, "bad creds"); return res.status(401).json({ error: "Invalid credentials" }); }

    const { data: profile } = await supabase
      .from("users").select(SAFE_USER_COLUMNS)
      .ilike("username", user.normalizedNick).maybeSingle();
    if (!profile) { await log(401, false, "profile missing"); return res.status(401).json({ error: "Invalid credentials" }); }

    const tgId = String((body as any).tgId || "").trim();
    if (user.role === "admin" || user.role === "mayor") {
      if (!tgId) { await log(403, false, "tg required"); return res.status(403).json({ error: "Telegram required for this account" }); }
      if (String((profile as any).telegram_id || "").trim() !== tgId) { await log(403, false, "tg mismatch"); return res.status(403).json({ error: "Telegram account mismatch" }); }
    }
    await log(200, true);
    return res.status(200).json({ data: profile });
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

    // 1. Фильтруем только разрешённые поля — всё неизвестное молча отбрасываем.
    const filtered: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(values)) {
      if (REGISTER_ALLOWED_FIELDS.has(k)) filtered[k] = v;
    }

    // 2. role — тільки 'player'. Якщо RLS або column-level security в Supabase
    //    блокує запис поля role через service key, просто видаляємо його з insert —
    //    база використає DEFAULT ('player'). Якщо передано невалідну роль — блокуємо.
    if ("role" in filtered) {
      const r = String(filtered.role ?? "").toLowerCase().trim();
      if (r !== "player") { await log(403, false, "bad role"); return res.status(403).json({ error: "Forbidden: role must be 'player'" }); }
      // Видаляємо role з payload — БД сама підставить DEFAULT 'player'.
      // Це обходить Column-Level Security / RLS, що може блокувати поле role.
      delete filtered.role;
    }
    if ("balance" in filtered) {
      const b = Number(filtered.balance);
      if (!Number.isFinite(b) || b !== 0) { await log(403, false, "bad balance"); return res.status(403).json({ error: "Forbidden: initial balance must be 0" }); }
      // Аналогічно — дозволяємо БД використати DEFAULT 0.
      delete filtered.balance;
    }
    // telegram_id — приводим к строке/null.
    if ("telegram_id" in filtered) {
      const t = filtered.telegram_id;
      filtered.telegram_id = (t === null || t === undefined || t === "") ? null : String(t);
    }

    const checkNick = (filtered.username as string | undefined) || (filtered as any).nick;
    if (!checkNick || typeof checkNick !== "string" || checkNick.trim().length < 2) {
      await log(400, false, "bad nick"); return res.status(400).json({ error: "Username required (min 2 chars)" });
    }
    const { data: existing } = await supabase
      .from("users").select("id").ilike("username", String(checkNick).trim()).maybeSingle();
    if (existing) { await log(409, false, "taken"); return res.status(409).json({ error: "Username already taken" }); }

    const pwd = filtered["password"];
    if (typeof pwd !== "string" || pwd.length < 4 || pwd.length > 256) {
      await log(400, false, "bad password");
      return res.status(400).json({ error: "Password length must be 4..256" });
    }
    delete filtered["password"];
    filtered["password_hash"] = await hashPassword(pwd);
    // На случай если в схеме всё ещё есть поле password — оставим plaintext запрещённым.

    const { data, error } = await supabase.from("users").insert(filtered as any).select(SAFE_USER_COLUMNS);
    if (error) { await log(400, false, error.message); return res.status(400).json({ error: "Registration failed" }); }
    await log(200, true);
    return res.status(200).json({ data: data ?? null });
  }

  if (op === "upsert") {
    if (!values || typeof values !== "object") { await log(400, false, "no values"); return res.status(400).json({ error: "values required" }); }
    for (const field of UPSERT_FORBIDDEN_FIELDS) {
      if (field in values) { await log(403, false, `forbidden ${field}`); return res.status(403).json({ error: `Forbidden: cannot set field "${field}"` }); }
    }
    if (!nick || !password) { await log(401, false, "no creds"); return res.status(401).json({ error: "Unauthorized" }); }

    const user = await verifyCredentials(supabase, nick, password);
    if (!user) { await log(401, false, "bad creds"); return res.status(401).json({ error: "Unauthorized" }); }

    const targetUsername = String((values as any).username || "").toLowerCase().trim();
    if (!targetUsername || targetUsername !== user.normalizedNick) {
      await log(403, false, "upsert not own");
      return res.status(403).json({ error: "Forbidden: can only upsert your own record" });
    }

    const upsertValues: Record<string, unknown> = { ...values };
    if (typeof upsertValues["password"] === "string") {
      const newPwd = upsertValues["password"] as string;
      delete upsertValues["password"];
      if (newPwd.length >= 4 && newPwd.length <= 256) {
        upsertValues["password_hash"] = await hashPassword(newPwd);
      }
    }

    const { data, error } = await supabase
      .from("users").upsert(upsertValues as any, { onConflict: "username" }).select(SAFE_USER_COLUMNS);
    if (error) { await log(400, false, error.message); return res.status(400).json({ error: "Upsert failed" }); }
    await log(200, true);
    return res.status(200).json({ data: data ?? null });
  }

  return res.status(400).json({ error: "Unknown op" });
}
