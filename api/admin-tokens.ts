// /api/admin-tokens.ts — захищений ендпоінт для управління CR-балансом гравців.
// Тільки адміни з пермішном "tokens" (або superadmin) можуть видавати/знімати CR.
// Звичайний гравець або підроблений запит — завжди 403.

import { createClient } from "@supabase/supabase-js";
import { verifyCredentials, applyCors, safeDbError } from "./_auth.js";
import { logDbRequest, getClientIp, getUserAgent, sendTelegramAlert, shouldAlert, formatAlert } from "./_logger.js";
import { checkMutationLimit } from "./_ratelimit.js";

const SUPER_ADMIN_NICK = "t1kron1x";

const MAX_GIVE_PER_OP  = 1_000_000; // макс CR за одну операцію
const MAX_GIVE_PER_MIN = 5_000_000; // захист від спаму
const MIN_AMOUNT       = 1;

interface Body {
  nick: string;       // хто виконує дію (адмін)
  password: string;
  op: "give" | "take" | "set" | "check";
  target: string;     // нік гравця якому даємо/знімаємо
  amount?: number;    // кількість CR
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

  const { nick, password, op, target, amount } = body || {} as Body;

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const ip = getClientIp(req);
  const ua = getUserAgent(req);
  const rawNick = nick ? String(nick).toLowerCase().trim() : null;

  // Rate limit
  if (checkMutationLimit(rawNick, ip)) {
    return res.status(429).json({ error: "Too many requests" });
  }

  const deny = async (status: number, error: string) => {
    await logDbRequest(supabase, {
      endpoint: "db", username: rawNick,
      role: null, table_name: "users", op: `tokens.${op || "?"}`,
      match_keys: ["username"], value_keys: ["balance"],
      match_snapshot: { target: target || null },
      value_snapshot: { amount: amount ?? null },
      telegram_id: null,
      status, allowed: false, error, ip, user_agent: ua,
    });
    return res.status(status).json({ error });
  };

  // 1. Базова валідація
  if (!nick || !password) return deny(401, "Unauthorized");
  if (!target || typeof target !== "string" || !target.trim()) return deny(400, "target required");
  if (!op || !["give", "take", "set", "check"].includes(op)) return deny(400, "Op not allowed");

  // 2. Автентифікація адміна
  const admin = await verifyCredentials(supabase, nick, password);
  if (!admin) return deny(401, "Unauthorized");

  const { normalizedNick } = admin;
  const isSuperAdmin = normalizedNick === SUPER_ADMIN_NICK.toLowerCase();
  const isAdmin      = isSuperAdmin || admin.role === "admin";

  // 3. Перевірка пермішну "tokens" — тільки сервер вирішує
  let hasTokensPerm = false;
  if (isSuperAdmin) {
    hasTokensPerm = true;
  } else if (isAdmin) {
    const { data: permRow } = await supabase
      .from("admin_perms").select("perms").ilike("username", normalizedNick).maybeSingle();
    hasTokensPerm = !!(permRow?.perms as any)?.tokens;
  }

  if (!hasTokensPerm) return deny(403, "Forbidden: missing permission \"tokens\"");

  const role = isSuperAdmin ? "superadmin" : (admin.role || "admin");

  // 4. Перевірка цільового гравця
  const normalizedTarget = String(target).toLowerCase().trim();
  const { data: targetUser, error: targetErr } = await supabase
    .from("users").select("username, balance, role").ilike("username", normalizedTarget).maybeSingle();

  if (targetErr || !targetUser) return deny(404, "Target user not found");

  // Адмін не може змінити баланс іншого адміна (захист від зловживань)
  if (!isSuperAdmin) {
    const targetRole = String(targetUser.role || "").toLowerCase();
    const isTargetAdmin = targetRole === "admin" || normalizedTarget === SUPER_ADMIN_NICK.toLowerCase();
    if (isTargetAdmin) return deny(403, "Forbidden: cannot modify admin balance");
  }

  const currentBalance = Number(targetUser.balance) || 0;

  // check — просто повернути баланс
  if (op === "check") {
    await logDbRequest(supabase, {
      endpoint: "db", username: normalizedNick, role,
      table_name: "users", op: "tokens.check",
      match_keys: ["username"], value_keys: null,
      match_snapshot: { target: normalizedTarget },
      value_snapshot: null, telegram_id: null,
      status: 200, allowed: true, error: null, ip, user_agent: ua,
    });
    return res.status(200).json({ balance: currentBalance });
  }

  // 5. Валідація amount
  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt < MIN_AMOUNT || !Number.isInteger(amt)) {
    return deny(400, `amount must be integer >= ${MIN_AMOUNT}`);
  }
  if (op !== "take" && amt > MAX_GIVE_PER_OP) {
    return deny(400, `amount exceeds max per operation (${MAX_GIVE_PER_OP})`);
  }

  // 6. Обчислення нового балансу
  let newBalance: number;
  if (op === "give") {
    newBalance = currentBalance + amt;
  } else if (op === "take") {
    newBalance = Math.max(0, currentBalance - amt);
  } else { // set
    if (!isSuperAdmin) return deny(403, "Forbidden: only superadmin can set balance directly");
    newBalance = Math.max(0, amt);
  }

  // 7. Запис
  const { error: updErr } = await supabase
    .from("users")
    .update({ balance: newBalance })
    .ilike("username", normalizedTarget);

  if (updErr) {
    await logDbRequest(supabase, {
      endpoint: "db", username: normalizedNick, role,
      table_name: "users", op: `tokens.${op}`,
      match_keys: ["username"], value_keys: ["balance"],
      match_snapshot: { target: normalizedTarget },
      value_snapshot: { old: currentBalance, new: newBalance },
      telegram_id: null,
      status: 400, allowed: true, error: updErr.message, ip, user_agent: ua,
    });
    return res.status(400).json({ error: safeDbError(updErr) });
  }

  // 8. Сповіщення гравцю
  const delta = newBalance - currentBalance;
  const notifMsg = delta > 0
    ? `Вам нараховано ${delta} CR від адміністрації!`
    : `З вашого балансу списано ${Math.abs(delta)} CR.`;

  await supabase.from("notifications").insert({
    username: String(targetUser.username),
    message: notifMsg,
    created_at: new Date().toISOString(),
  }).select().maybeSingle(); // помилка тут не критична

  const alertEntry = {
    endpoint: "db" as const, username: normalizedNick, role,
    table_name: "users", op: `tokens.${op}`,
    match_keys: ["username"], value_keys: ["balance"],
    match_snapshot: { target: normalizedTarget },
    value_snapshot: { old: currentBalance, new: newBalance, delta },
    telegram_id: null,
    status: 200, allowed: true, error: null, ip, user_agent: ua,
  };
  await logDbRequest(supabase, alertEntry);
  await sendTelegramAlert(formatAlert(alertEntry));

  return res.status(200).json({ balance: newBalance, delta });
}
