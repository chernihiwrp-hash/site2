/**
 * /api/auth.ts — verify, checkUser, checkTelegram, register
 *
 * VERCEL ENV VARS:
 *   SUPABASE_URL    — URL проєкту Supabase
 *   SECRET_ROLE_KEY — service_role key (БЕЗ VITE_ префіксу!)
 */

import { createClient } from "@supabase/supabase-js";

type Op = "verify" | "checkUser" | "checkTelegram" | "register" | "upsert";

interface Body {
  op: Op;
  nick?: string;
  password?: string;
  values?: Record<string, unknown>;
}

const SAFE_USER_COLUMNS =
  "id, username, role, balance, avatar_url, owned_themes, telegram_id, theme, active_theme, registered_at, rare_balance, vip_expires_at, vip_duration, referral_code, referred_by, owned_gifts, favorites";

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")   return res.status(405).json({ error: "Method not allowed" });

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY)
    return res.status(500).json({ error: "Server not configured" });

  let body: Body;
  try { body = typeof req.body === "string" ? JSON.parse(req.body) : req.body; }
  catch { return res.status(400).json({ error: "Invalid JSON" }); }

  const { op, nick, password, values } = body || {} as Body;
  const ALLOWED: Op[] = ["verify", "checkUser", "checkTelegram", "register", "upsert"];
  if (!op || !ALLOWED.includes(op))
    return res.status(400).json({ error: "Op not allowed" });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (op === "verify") {
    if (!nick || !password)
      return res.status(400).json({ error: "nick and password required" });

    const { data: row, error } = await supabase
      .from("users")
      .select(`${SAFE_USER_COLUMNS}, password`)
      .ilike("username", nick.trim())
      .maybeSingle();

    if (error || !row) return res.status(401).json({ error: "User not found" });
    if (row.password !== password) return res.status(401).json({ error: "Wrong password" });

    // Для адмінів та мерів — перевіряємо Telegram ID
    const tgId = String((body as any).tgId || "").trim();
    if (row.role === "admin" || row.role === "mayor") {
      if (!tgId) {
        return res.status(403).json({ error: "Telegram required for this account" });
      }
      if (String(row.telegram_id || "").trim() !== tgId) {
        return res.status(403).json({ error: "Telegram account mismatch" });
      }
    }

    const { password: _removed, ...safeUser } = row;
    return res.status(200).json({ data: safeUser });
  }

  if (op === "checkUser") {
    if (!nick) return res.status(400).json({ error: "nick required" });
    const { data } = await supabase
      .from("users").select("id").ilike("username", nick.trim()).maybeSingle();
    return res.status(200).json({ exists: !!data });
  }

  if (op === "checkTelegram") {
    if (!nick) return res.status(400).json({ error: "nick required" });
    const { data } = await supabase
      .from("users").select("telegram_id").ilike("username", nick.trim()).maybeSingle();
    return res.status(200).json({ data: data ?? null });
  }

  if (op === "register") {
    if (!values || typeof values !== "object")
      return res.status(400).json({ error: "values required" });

    const checkNick = (values as any).username || (values as any).nick;
    if (checkNick) {
      const { data: existing } = await supabase
        .from("users").select("id").ilike("username", String(checkNick).trim()).maybeSingle();
      if (existing)
        return res.status(409).json({ error: "Username already taken" });
    }

    const { data, error } = await supabase
      .from("users").insert(values as any).select(SAFE_USER_COLUMNS);

    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ data: data ?? null });
  }

  if (op === "upsert") {
    if (!values || typeof values !== "object")
      return res.status(400).json({ error: "values required" });

    // Тільки таблиця users дозволена через цей endpoint
    const { data, error } = await supabase
      .from("users")
      .upsert(values as any, { onConflict: "username" })
      .select(SAFE_USER_COLUMNS);

    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ data: data ?? null });
  }

  return res.status(400).json({ error: "Unknown op" });
}
