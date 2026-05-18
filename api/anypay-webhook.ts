/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║          AnyPay WEBHOOK — Vercel Serverless Function             ║
 * ║  Файл: /api/anypay-webhook.ts                                    ║
 * ║                                                                  ║
 * ║  Що робить:                                                      ║
 * ║  1. Приймає POST від AnyPay при успішній оплаті                  ║
 * ║  2. Валідує підпис (MD5) і IP-адресу                             ║
 * ║  3. Захист від double-spending — перевіряє pay_id у БД           ║
 * ║  4. Видає роль "vip" у таблиці users                             ║
 * ║  5. Записує транзакцію в payments_history                        ║
 * ║  6. Повертає "OK" — AnyPay перестає повторювати запит            ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import { createClient } from "@supabase/supabase-js";
import * as crypto from "crypto";

// ── Офіційні IP-адреси серверів AnyPay (станом на 2024) ──────────────────────
// Оновлюй зі сторінки: https://anypay.io/doc/sci/notification
const ANYPAY_IPS = new Set([
  "185.162.128.38",
  "185.162.128.39",
  "185.162.128.40",
  "185.162.128.41",
  "185.162.128.42",
  "185.162.128.43",
  "185.162.128.44",
  "185.162.128.45",
  "185.162.128.46",
  "185.162.128.47",
  "185.162.128.48",
  "185.162.128.49",
  "185.162.128.50",
  "185.162.128.51",
  "185.162.128.52",
  "185.162.128.53",
]);

// ── Генерує MD5-підпис для перевірки запиту від AnyPay ───────────────────────
// Формула: MD5( pay_id + "::" + amount + "::" + currency + "::" + pay_status + "::" + order_id + "::" + SECRET_KEY )
function buildSign(params: {
  pay_id: string;
  amount: string;
  currency: string;
  pay_status: string;
  order_id: string;
  secretKey: string;
}): string {
  const raw = [
    params.pay_id,
    params.amount,
    params.currency,
    params.pay_status,
    params.order_id,
    params.secretKey,
  ].join("::");

  return crypto.createHash("md5").update(raw).digest("hex");
}

export default async function handler(req: any, res: any) {
  // ── CORS / Method guard ───────────────────────────────────────────────────
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  // ══════════════════════════════════════════════════════════════════════════
  // 1. ВАЛІДАЦІЯ IP-АДРЕСИ
  // ══════════════════════════════════════════════════════════════════════════
  const realIp =
    (req.headers["x-real-ip"] as string) ||
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "";

  if (!ANYPAY_IPS.has(realIp)) {
    console.warn(`[anypay-webhook] ❌ Заблоковано невідомий IP: ${realIp}`);
    return res.status(403).send("Forbidden");
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 2. ЧИТАННЯ ТІЛА ЗАПИТУ
  // ══════════════════════════════════════════════════════════════════════════
  let body: Record<string, string>;
  try {
    body = typeof req.body === "string" ? Object.fromEntries(new URLSearchParams(req.body)) : req.body;
  } catch {
    return res.status(400).send("Bad Request");
  }

  const {
    pay_id,      // унікальний ID платежу від AnyPay
    amount,      // сума платежу
    currency,    // валюта (UAH)
    pay_status,  // статус: "paid" або "success"
    order_id,    // наш order_id (ми зберігаємо там user_id::status_type::duration)
    sign,        // MD5-підпис від AnyPay
    desc,        // опис (необов'язково)
  } = body;

  console.log("[anypay-webhook] Отримано:", { pay_id, pay_status, order_id, amount });

  // ══════════════════════════════════════════════════════════════════════════
  // 3. ПЕРЕВІРКА ПІДПИСУ (MD5)
  // ══════════════════════════════════════════════════════════════════════════
  const SECRET_KEY = process.env.ANYPAY_SECRET_KEY;
  if (!SECRET_KEY) {
    console.error("[anypay-webhook] ANYPAY_SECRET_KEY не встановлено!");
    return res.status(500).send("Server misconfigured");
  }

  const expectedSign = buildSign({ pay_id, amount, currency, pay_status, order_id, secretKey: SECRET_KEY });

  if (sign !== expectedSign) {
    console.warn(`[anypay-webhook] ❌ Невалідний підпис. Отримано: ${sign}, очікувалось: ${expectedSign}`);
    return res.status(403).send("Invalid signature");
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 4. ОБРОБЛЯЄМО ТІЛЬКИ УСПІШНІ ПЛАТЕЖІ
  // ══════════════════════════════════════════════════════════════════════════
  if (pay_status !== "paid" && pay_status !== "success") {
    console.log(`[anypay-webhook] Статус "${pay_status}" — пропускаємо.`);
    return res.status(200).send("OK"); // AnyPay вимагає "OK" навіть для non-paid
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 5. ІНІЦІАЛІЗАЦІЯ SUPABASE (SERVICE_ROLE — обходить RLS)
  // ══════════════════════════════════════════════════════════════════════════
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("[anypay-webhook] Supabase env не налаштовано");
    return res.status(500).send("Server misconfigured");
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 6. ЗАХИСТ ВІД DOUBLE SPENDING
  //    Перевіряємо: чи вже є такий pay_id у таблиці payments_history
  // ══════════════════════════════════════════════════════════════════════════
  const { data: existing } = await supabase
    .from("payments_history")
    .select("id")
    .eq("pay_id", pay_id)
    .maybeSingle();

  if (existing) {
    console.warn(`[anypay-webhook] ⚠️ Double spending: pay_id ${pay_id} вже оброблено`);
    return res.status(200).send("OK"); // Повертаємо OK щоб AnyPay не повторював
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 7. ПАРСИМО order_id → витягуємо user_id, duration
  //    Формат order_id: "USER_ID::DURATION"
  //    Приклад: "abc123::month" або "abc123::year"
  // ══════════════════════════════════════════════════════════════════════════
  const parts = (order_id || "").split("::");
  const userId = parts[0];       // username гравця
  const duration = parts[1] || "month"; // "month" або "year"

  if (!userId) {
    console.error("[anypay-webhook] Не вдалось витягти user_id з order_id:", order_id);
    // Все одно записуємо в лог, щоб вручну розібратись
    await supabase.from("payments_history").insert({
      user_id: "UNKNOWN",
      amount: parseFloat(amount) || 0,
      pay_id,
      order_id,
      duration,
      status: "error_no_user",
      created_at: new Date().toISOString(),
    });
    return res.status(200).send("OK");
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 8. РОЗРАХОВУЄМО ДАТУ ЗАКІНЧЕННЯ ПІДПИСКИ
  // ══════════════════════════════════════════════════════════════════════════
  const now = new Date();
  const vipExpiresAt = new Date(now);

  if (duration === "year") {
    vipExpiresAt.setFullYear(vipExpiresAt.getFullYear() + 1);
  } else {
    // За замовчуванням — місяць (30 днів)
    vipExpiresAt.setDate(vipExpiresAt.getDate() + 30);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 9. ОНОВЛЮЄМО КОРИСТУВАЧА — видаємо VIP-роль + встановлюємо таймер
  // ══════════════════════════════════════════════════════════════════════════
  const { error: updateError } = await supabase
    .from("users")
    .update({
      role: "vip",
      vip_expires_at: vipExpiresAt.toISOString(),
      vip_duration: duration, // "month" або "year"
    })
    .ilike("username", userId);

  if (updateError) {
    console.error("[anypay-webhook] ❌ Помилка оновлення юзера:", updateError.message);
    // Записуємо в лог навіть якщо оновлення впало
    await supabase.from("payments_history").insert({
      user_id: userId,
      amount: parseFloat(amount) || 0,
      pay_id,
      order_id,
      duration,
      status: "error_update_failed",
      created_at: new Date().toISOString(),
    });
    return res.status(500).send("DB error");
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 10. ЗАПИСУЄМО ТРАНЗАКЦІЮ В ЛOGI
  // ══════════════════════════════════════════════════════════════════════════
  const { error: logError } = await supabase.from("payments_history").insert({
    user_id: userId,
    amount: parseFloat(amount) || 0,
    pay_id,
    order_id,
    duration,
    status: "success",
    created_at: new Date().toISOString(),
  });

  if (logError) {
    // Лог впав, але підписка вже видана — просто логуємо
    console.error("[anypay-webhook] ❌ Помилка запису в payments_history:", logError.message);
  }

  console.log(`[anypay-webhook] ✅ VIP видано: ${userId} | duration: ${duration} | expires: ${vipExpiresAt.toISOString()}`);

  // ══════════════════════════════════════════════════════════════════════════
  // 11. ВІДПОВІДЬ — "OK" (обов'язково для AnyPay)
  // ══════════════════════════════════════════════════════════════════════════
  return res.status(200).send("OK");
}
