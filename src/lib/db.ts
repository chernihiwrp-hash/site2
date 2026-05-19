// Клієнтські хелпери для всіх операцій з БД.
// Всі insert/update/delete/upsert/select йдуть через /api/db.
//
// SECRET_ROLE_KEY — ТІЛЬКИ на сервері (Vercel env, без VITE_ префіксу).
// Браузер ніколи не бачить цей ключ.
// Браузер надсилає лише nick + password — сервер перевіряє їх у Supabase.
//
// ✅ VITE_SUPABASE_ANON_KEY / VITE_ADMIN_SHARED_SECRET більше не потрібні
//    для мутацій. Для SELECT — також використовуйте dbSelect замість
//    прямого supabase.from(...).select().

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

function getCredentials(): { nick: string; password: string } | null {
  const nick     = localStorage.getItem("crp_nick");
  const password = localStorage.getItem("crp_password");
  if (!nick || !password) return null;
  return { nick, password };
}

async function call<T = any>(payload: Payload): Promise<Result<T>> {
  const creds = getCredentials();
  if (!creds) {
    return { data: null, error: { message: "Not logged in" } };
  }

  try {
    const res = await fetch("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, ...creds }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { data: null, error: { message: json?.error || `HTTP ${res.status}` } };
    }
    return {
      data: (json?.data ?? null) as T,
      error: null,
      ...(json?.count !== undefined ? { count: json.count } : {}),
    };
  } catch (e: any) {
    return { data: null, error: { message: e?.message || "Network error" } };
  }
}

// ── Мутації ─────────────────────────────────────────────────────────────────

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

// ── SELECT ───────────────────────────────────────────────────────────────────
// Використовуйте dbSelect замість прямого supabase.from().select().
// Поле "password" автоматично вирізається сервером — навіть якщо вказати columns: "*".
//
// Приклади:
//   dbSelect("users", { match: { username: eq("bob") }, columns: "id, username, role" })
//   dbSelect("houses", { order: { column: "created_at", ascending: false }, limit: 20 })
//   dbSelect("users", { columns: "id", count: "exact", head: true })

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

// ── Зручні скорочення для match ─────────────────────────────────────────────
export const eq    = (value: unknown): Filter => ({ op: "eq",    value });
export const neq   = (value: unknown): Filter => ({ op: "neq",   value });
export const ilike = (value: unknown): Filter => ({ op: "ilike", value });
export const like  = (value: unknown): Filter => ({ op: "like",  value });
export const gt    = (value: unknown): Filter => ({ op: "gt",    value });
export const gte   = (value: unknown): Filter => ({ op: "gte",   value });
export const lt    = (value: unknown): Filter => ({ op: "lt",    value });
export const lte   = (value: unknown): Filter => ({ op: "lte",   value });
export const inArr = (value: unknown[]): Filter => ({ op: "in",  value });
