// Клієнтські хелпери для всіх операцій з БД.
//
// АРХІТЕКТУРА БЕЗПЕКИ:
//   /api/auth — verify, checkUser, checkTelegram, register  (SECRET_ROLE_KEY, сервер)
//   /api/db   — insert, update, delete, upsert, select       (SECRET_ROLE_KEY, сервер)
//
// Браузер НІКОЛИ не звертається до Supabase напряму для операцій з чутливими даними.
// SECRET_ROLE_KEY і паролі користувачів залишаються виключно на сервері.
//
// supabase (anon) експортується ТІЛЬКИ для real-time каналів (supabase.channel())
// та публічних read-запитів, де RLS обмежує доступ.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL      as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Тільки для real-time channels і публічних reads (news, factions тощо)
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Типи ─────────────────────────────────────────────────────────────────────
type FilterOp = "eq" | "neq" | "ilike" | "like" | "gt" | "gte" | "lt" | "lte" | "in";
type Filter = { op: FilterOp; value: unknown };
type Match = Record<string, Filter>;

interface MutationPayload {
  table: string;
  op: "insert" | "update" | "delete" | "upsert";
  values?: unknown;
  match?: Match;
  onConflict?: string;
  returning?: boolean;
}

interface SelectPayload {
  table: string;
  op: "select";
  columns?: string;
  match?: Match;
  order?: { column: string; ascending?: boolean };
  limit?: number;
  single?: boolean;
  maybeSingle?: boolean;
  count?: "exact" | "planned" | "estimated";
  head?: boolean;
}

type Payload = MutationPayload | SelectPayload;

interface Result<T = any> {
  data: T | null;
  error: { message: string } | null;
  count?: number;
}

// ── Внутрішній виклик /api/db ────────────────────────────────────────────────
function getCredentials(): { nick: string; password: string } | null {
  const nick     = localStorage.getItem("crp_nick");
  const password = localStorage.getItem("crp_password");
  if (!nick || !password) return null;
  return { nick, password };
}

async function call<T = any>(payload: Payload): Promise<Result<T>> {
  const creds = getCredentials();
  if (!creds) return { data: null, error: { message: "Not logged in" } };

  try {
    const res = await fetch("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, ...creds }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { data: null, error: { message: json?.error || `HTTP ${res.status}` } };
    return {
      data: (json?.data ?? null) as T,
      error: null,
      ...(json?.count !== undefined ? { count: json.count } : {}),
    };
  } catch (e: any) {
    return { data: null, error: { message: e?.message || "Network error" } };
  }
}

// ── Внутрішній виклик /api/auth ──────────────────────────────────────────────
async function callAuth<T = any>(
  body: Record<string, unknown>
): Promise<{ data: T | null; error: { message: string } | null; exists?: boolean }> {
  try {
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { data: null, error: { message: json?.error || `HTTP ${res.status}` } };
    return { data: (json?.data ?? null) as T, error: null, exists: json?.exists };
  } catch (e: any) {
    return { data: null, error: { message: e?.message || "Network error" } };
  }
}

// ── Мутації ──────────────────────────────────────────────────────────────────

export const dbInsert = <T = any>(
  table: string,
  values: unknown,
  opts?: { returning?: boolean }
) => call<T>({ table, op: "insert", values, returning: opts?.returning });

export const dbUpsert = <T = any>(
  table: string,
  values: unknown,
  opts?: { onConflict?: string; returning?: boolean }
) =>
  call<T>({
    table,
    op: "upsert",
    values,
    onConflict: opts?.onConflict,
    returning: opts?.returning,
  });

export const dbUpdate = <T = any>(
  table: string,
  values: unknown,
  match: Match,
  opts?: { returning?: boolean }
) => call<T>({ table, op: "update", values, match, returning: opts?.returning });

export const dbDelete = <T = any>(table: string, match: Match) =>
  call<T>({ table, op: "delete", match });

// ── SELECT через API ─────────────────────────────────────────────────────────

export interface SelectOptions {
  columns?:     string;
  match?:       Match;
  order?:       { column: string; ascending?: boolean };
  limit?:       number;
  single?:      boolean;
  maybeSingle?: boolean;
  count?:       "exact" | "planned" | "estimated";
  head?:        boolean;
}

export const dbSelect = <T = any>(
  table: string,
  opts?: SelectOptions
): Promise<Result<T>> =>
  call<T>({
    table,
    op: "select",
    columns:     opts?.columns,
    match:       opts?.match,
    order:       opts?.order,
    limit:       opts?.limit,
    single:      opts?.single,
    maybeSingle: opts?.maybeSingle,
    count:       opts?.count,
    head:        opts?.head,
  });

// ── Pre-auth функції — всі через /api/auth ────────────────────────────────────

export async function dbVerify(
  nick: string,
  password: string
): Promise<Record<string, unknown> | null> {
  const { data, error } = await callAuth({ op: "verify", nick, password });
  if (error || !data) return null;
  return data as Record<string, unknown>;
}

export async function dbCheckUser(nick: string): Promise<boolean> {
  const res = await callAuth({ op: "checkUser", nick });
  return res.exists === true;
}

export async function dbCheckTelegram(
  nick: string
): Promise<{ telegram_id?: string | null } | null> {
  const { data } = await callAuth<{ telegram_id?: string | null }>({
    op: "checkTelegram",
    nick,
  });
  return data ?? null;
}

export async function dbRegister(
  values: Record<string, unknown>
): Promise<{ data: unknown; error: { message: string } | null }> {
  const { data, error } = await callAuth({ op: "register", values });
  return { data: data ?? null, error };
}

// ── Зручні скорочення для match ───────────────────────────────────────────────
export const eq    = (value: unknown): Filter => ({ op: "eq",    value });
export const neq   = (value: unknown): Filter => ({ op: "neq",   value });
export const ilike = (value: unknown): Filter => ({ op: "ilike", value });
export const like  = (value: unknown): Filter => ({ op: "like",  value });
export const gt    = (value: unknown): Filter => ({ op: "gt",    value });
export const gte   = (value: unknown): Filter => ({ op: "gte",   value });
export const lt    = (value: unknown): Filter => ({ op: "lt",    value });
export const lte   = (value: unknown): Filter => ({ op: "lte",   value });
export const inArr = (value: unknown[]): Filter => ({ op: "in",  value });
