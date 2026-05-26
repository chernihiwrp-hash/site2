// Спільний логер для всіх API ендпоінтів. v3: зберігає snapshot значень.

import { createClient, SupabaseClient } from "@supabase/supabase-js";

export interface DbLogEntry {
  endpoint: "db" | "db-select" | "auth" | "balance";
  username:      string | null;
  role:          string | null;
  table_name:    string | null;
  op:            string | null;
  match_keys:    string[] | null;
  value_keys:    string[] | null;
  // нові поля
  match_snapshot: Record<string, unknown> | null; // значення фільтрів (id, username...)
  value_snapshot: Record<string, unknown> | null; // значення що писались (name, text...)
  telegram_id:   string | null;
  status:        number;
  allowed:       boolean;
  error:         string | null;
  ip:            string | null;
  user_agent:    string | null;
}

export function getClientIp(req: any): string | null {
  const xf = req?.headers?.["x-forwarded-for"];
  if (typeof xf === "string" && xf.length > 0) return xf.split(",")[0].trim();
  if (Array.isArray(xf) && xf.length > 0) return String(xf[0]).split(",")[0].trim();
  return req?.headers?.["x-real-ip"] || req?.socket?.remoteAddress || null;
}

export function getUserAgent(req: any): string | null {
  return req?.headers?.["user-agent"] || null;
}

export function keysOf(obj: unknown): string[] | null {
  if (!obj || typeof obj !== "object") return null;
  return Object.keys(obj as Record<string, unknown>);
}

// Безпечно витягує snapshot значень — обрізає великі поля, не зберігає паролі
const SENSITIVE = new Set(["password","password_hash","secret_key","secret_token","service_key"]);
const MAX_VAL_LEN = 200;

function safeSnapshot(obj: unknown): Record<string, unknown> | null {
  if (!obj || typeof obj !== "object") return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE.has(k.toLowerCase())) { out[k] = "***"; continue; }
    if (typeof v === "string" && v.length > MAX_VAL_LEN) {
      out[k] = v.slice(0, MAX_VAL_LEN) + "…";
    } else {
      out[k] = v;
    }
  }
  return out;
}

// Витягує snapshot з match (формат { col: { op, value } })
function matchSnapshot(match: unknown): Record<string, unknown> | null {
  if (!match || typeof match !== "object") return null;
  const out: Record<string, unknown> = {};
  for (const [k, cond] of Object.entries(match as Record<string, any>)) {
    if (SENSITIVE.has(k.toLowerCase())) { out[k] = "***"; continue; }
    out[k] = cond?.value ?? null;
  }
  return Object.keys(out).length ? out : null;
}

export async function logDbRequest(
  supabaseAdmin: SupabaseClient,
  entry: DbLogEntry,
): Promise<void> {
  try {
    await supabaseAdmin.from("db_logs").insert({
      endpoint:       entry.endpoint,
      username:       entry.username,
      role:           entry.role,
      table_name:     entry.table_name,
      op:             entry.op,
      match_keys:     entry.match_keys,
      value_keys:     entry.value_keys,
      match_snapshot: entry.match_snapshot,
      value_snapshot: entry.value_snapshot,
      telegram_id:    entry.telegram_id,
      status:         entry.status,
      allowed:        entry.allowed,
      error:          entry.error ? String(entry.error).slice(0, 500) : null,
      ip:             entry.ip,
      user_agent:     entry.user_agent ? String(entry.user_agent).slice(0, 300) : null,
    });
  } catch {
    // не пробрасуємо — лог не повинен ламати запит
  }
}

export { safeSnapshot, matchSnapshot };

export function getAdmin(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// ─── Telegram-алерты для подозрительных действий ────────────────────────────
// Нужны переменные окружения: TG_BOT_TOKEN и TG_ALERT_CHAT_ID

const SUSPICIOUS_OPS = new Set([
  "tokens.give", "tokens.take", "tokens.set",
  "update", "delete", "upsert",
]);

const SENSITIVE_TABLES = new Set([
  "users", "bans", "admin_perms", "factions", "faction_leaders",
  "houses", "house_confiscations",
]);

export async function sendTelegramAlert(message: string): Promise<void> {
  const token  = process.env.TG_BOT_TOKEN;
  const chatId = process.env.TG_ALERT_CHAT_ID;
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "HTML" }),
    });
  } catch { /* не критично */ }
}

export function shouldAlert(entry: DbLogEntry): boolean {
  // Алерт если: действие с чувствительной таблицей + подозрительная операция
  if (!entry.allowed) return false; // уже заблокировано — не шумим
  if (!entry.table_name || !SENSITIVE_TABLES.has(entry.table_name)) return false;
  if (!entry.op) return false;
  return SUSPICIOUS_OPS.has(entry.op);
}

export function formatAlert(entry: DbLogEntry): string {
  const time = new Date().toLocaleString("uk-UA", { timeZone: "Europe/Kyiv" });
  return (
    `🚨 <b>Адмін-дія на сервері</b>\n` +
    `🕐 ${time}\n` +
    `👤 Користувач: <code>${entry.username || "?"}</code> (${entry.role || "?"})\n` +
    `📋 Таблиця: <code>${entry.table_name}</code>\n` +
    `⚙️ Операція: <code>${entry.op}</code>\n` +
    `🌐 IP: <code>${entry.ip || "?"}</code>\n` +
    (entry.match_snapshot ? `🔍 Match: <code>${JSON.stringify(entry.match_snapshot)}</code>\n` : "") +
    (entry.value_snapshot ? `📝 Values: <code>${JSON.stringify(entry.value_snapshot)}</code>\n` : "")
  );
}
