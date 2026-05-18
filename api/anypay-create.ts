/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║     AnyPay CREATE INVOICE — Vercel Serverless Function           ║
 * ║  Файл: /api/anypay-create.ts                                     ║
 * ║                                                                  ║
 * ║  Фронтенд звертається до цього ендпоінту, а він вже              ║
 * ║  підписує запит і звертається до AnyPay API.                     ║
 * ║  API_KEY і SECRET_KEY залишаються тільки на сервері.             ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import * as crypto from "crypto";

// ── Ціни VIP-підписок (UAH) ────────────────────────────────────────────────
const VIP_PRICES: Record<string, number> = {
  month: 99,   // 1 місяць — 99 UAH
  year: 799,   // 1 рік   — 799 UAH
};

// ── Підпис для AnyPay SCI (MD5) ────────────────────────────────────────────
// Формула: MD5( merchant_id + amount + currency + order_id + secret_key )
function buildInvoiceSign(params: {
  merchantId: string;
  amount: number;
  currency: string;
  orderId: string;
  secretKey: string;
}): string {
  const raw = [
    params.merchantId,
    params.amount.toFixed(2),
    params.currency,
    params.orderId,
    params.secretKey,
  ].join(":");

  return crypto.createHash("md5").update(raw).digest("hex");
}

export default async function handler(req: any, res: any) {
  // ── CORS ────────────────────────────────────────────────────────────────
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // ── Зчитуємо тіло ────────────────────────────────────────────────────────
  let body: { user_id?: string; duration?: string };
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  const { user_id, duration = "month" } = body;

  if (!user_id || typeof user_id !== "string") {
    return res.status(400).json({ error: "user_id обов'язковий" });
  }

  if (!["month", "year"].includes(duration)) {
    return res.status(400).json({ error: "duration має бути 'month' або 'year'" });
  }

  // ── Env змінні ────────────────────────────────────────────────────────────
  const MERCHANT_ID = process.env.ANYPAY_MERCHANT_ID;
  const SECRET_KEY = process.env.ANYPAY_SECRET_KEY;

  if (!MERCHANT_ID || !SECRET_KEY) {
    console.error("[anypay-create] AnyPay env не налаштовано");
    return res.status(500).json({ error: "Server misconfigured" });
  }

  // ── Формуємо дані платежу ─────────────────────────────────────────────────
  const amount = VIP_PRICES[duration];
  const currency = "UAH"; // жорстко UAH
  const orderId = `${user_id}::${duration}`; // буде повернуто в вебхук

  const desc =
    duration === "year"
      ? "VIP підписка — 1 рік"
      : "VIP підписка — 1 місяць";

  const sign = buildInvoiceSign({
    merchantId: MERCHANT_ID,
    amount,
    currency,
    orderId,
    secretKey: SECRET_KEY,
  });

  // ── Відправляємо на AnyPay SCI ────────────────────────────────────────────
  // Документація: https://anypay.io/doc/sci/request
  const params = new URLSearchParams({
    merchant_id: MERCHANT_ID,
    pay_id: orderId,          // унікальний ID замовлення
    amount: amount.toFixed(2),
    currency,
    desc,
    sign,
    // Вебхук — наш обробник на Vercel
    // success_url і fail_url — куди редирект після оплати (за бажанням)
  });

  try {
    const apiRes = await fetch(
      `https://anypay.io/merchant?${params.toString()}`,
      { method: "GET", redirect: "manual" }
    );

    // AnyPay SCI при успіху повертає redirect (302) на URL оплати
    const paymentUrl =
      apiRes.headers.get("location") ||
      `https://anypay.io/merchant?${params.toString()}`;

    return res.status(200).json({
      payment_url: paymentUrl,
      order_id: orderId,
      amount,
      currency,
      duration,
    });
  } catch (e: any) {
    console.error("[anypay-create] Помилка зв'язку з AnyPay:", e.message);
    return res.status(502).json({ error: "Помилка зв'язку з платіжною системою" });
  }
}
