// Спільний логер для всіх API ендпоінтів.
// Пише запис у таблицю db_logs через service-role клієнт.
// Безпечно ковтає помилки — лог не повинен ламати основну операцію.

import { createClient, SupabaseClient } from "@supabase/supabase-js";

export interface DbLogEntry {
  endpoint: "db" | "db-select" | "auth" | "balance";
  username: string | null;
  role: string | null;
  table_name: string | null;
  op: string | null;
  match_keys: string[] | null;   // тільки назви колонок, без значень
  value_keys: string[] | null;   // тільки назви полів, без значень
  status: number;
  allowed: boolean;
  error: string | null;
  ip: string | null;
  user_agent: string | null;
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

export async function logDbRequest(
  supabaseAdmin: SupabaseClient,
  entry: DbLogEntry,
): Promise<void> {
  try {
    await supabaseAdmin.from("db_logs").insert({
      endpoint:   entry.endpoint,
      username:   entry.username,
      role:       entry.role,
      table_name: entry.table_name,
      op:         entry.op,
      match_keys: entry.match_keys,
      value_keys: entry.value_keys,
      status:     entry.status,
      allowed:    entry.allowed,
      error:      entry.error ? String(entry.error).slice(0, 500) : null,
      ip:         entry.ip,
      user_agent: entry.user_agent ? String(entry.user_agent).slice(0, 300) : null,
    });
  } catch {
    // не пробрасуємо — лог не повинен ламати запит
  }
}

export function getAdmin(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
