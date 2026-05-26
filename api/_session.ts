// /api/_session.ts — управление сессионными токенами.
// Используется в auth.ts для выдачи токена при логине.
//
// SQL для создания таблицы в Supabase (выполни в SQL Editor):
// ---------------------------------------------------------------
// create table sessions (
//   id uuid default gen_random_uuid() primary key,
//   token text unique not null,
//   username text not null,
//   ip text,
//   created_at timestamptz default now(),
//   expires_at timestamptz not null
// );
// create index on sessions(token);
// ---------------------------------------------------------------

import crypto from "crypto";

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function createSession(
  supabase: any,
  username: string,
  ip: string | null,
): Promise<string> {
  const token = generateToken();
  const expires_at = new Date(Date.now() + 8 * 3600 * 1000).toISOString();
  await supabase.from("sessions").insert({ token, username, ip, expires_at });
  return token;
}

export async function verifySession(
  supabase: any,
  token: unknown,
  ip: string | null,
): Promise<string | null> {
  if (typeof token !== "string" || token.length !== 64) return null;

  const { data } = await supabase
    .from("sessions")
    .select("username, expires_at, ip")
    .eq("token", token)
    .maybeSingle();

  if (!data) return null;

  if (new Date(data.expires_at) < new Date()) {
    await supabase.from("sessions").delete().eq("token", token);
    return null;
  }

  // Если IP изменился — сессия недействительна (защита от кражи токена)
  if (data.ip && ip && data.ip !== ip) return null;

  return data.username as string;
}

export async function deleteSession(supabase: any, token: string): Promise<void> {
  await supabase.from("sessions").delete().eq("token", token);
}

// Чистка протухших сессий (можно вызывать из cron или при логине)
export async function cleanExpiredSessions(supabase: any): Promise<void> {
  await supabase.from("sessions").delete().lt("expires_at", new Date().toISOString());
}
