// ─────────────────────────────────────────────────────────────────────────────
// Клієнтський шар доступу до БД.
//
// Усі звернення (SELECT / INSERT / UPDATE / DELETE / UPSERT) проходять
// через /api/db, який на сервері використовує SUPABASE_SERVICE_ROLE_KEY
// з environment variables у Vercel. Сервісний ключ НІКОЛИ не потрапляє у
// браузер — у фронтенді немає ані anon-ключа, ані service-role-ключа.
//
// ❌ VITE_SUPABASE_*  / VITE_ADMIN_SHARED_SECRET — більше не потрібні,
//    видали їх з Vercel.
// ─────────────────────────────────────────────────────────────────────────────

type FilterOp = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "ilike" | "like" | "is" | "in" | "or";
type Filter   = { op: FilterOp; value: unknown };
type Match    = Record<string, Filter>;

interface Result<T = any> {
  data: T | null;
  error: { message: string } | null;
  count?: number | null;
}

const API_URL = "/api/db";

function creds(): { nick: string; password: string } | null {
  try {
    const nick     = localStorage.getItem("crp_nick") || "";
    const password = localStorage.getItem("crp_password") || "";
    if (!nick || !password) return null;
    return { nick, password };
  } catch { return null; }
}

async function post<T = any>(payload: Record<string, any>, requireAuth = true): Promise<Result<T>> {
  let body: Record<string, any> = { ...payload };
  if (requireAuth) {
    const c = creds();
    if (!c) return { data: null, error: { message: "Not logged in" } };
    body = { ...c, ...body };
  }
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { data: null, error: { message: json?.error || `HTTP ${res.status}` } };
    return { data: (json?.data ?? null) as T, error: null };
  } catch (e: any) {
    return { data: null, error: { message: e?.message || "Network error" } };
  }
}

/* ────────────────────── публічні auth-хелпери ────────────────────── */

export const authCheck = (nick: string) =>
  post<{ exists: boolean; hasPassword: boolean; telegram_id: string | null; role: string | null }>(
    { op: "auth_check", nick }, false,
  );

export const authLogin = (nick: string, password: string) =>
  post<{ ok: boolean; role: string | null; hasPassword: boolean }>(
    { op: "auth_login", nick, password }, false,
  );

export const authTelegramLookup = (telegram_id: string) =>
  post<{ username: string; telegram_id: string } | null>(
    { op: "auth_telegram_lookup", telegram_id }, false,
  );

export const authUserLookup = (nick: string) =>
  post<{ id: number; username: string; telegram_id: string | null } | null>(
    { op: "auth_user_lookup", nick }, false,
  );

export const authRegister = (params: {
  nick: string; password: string; telegram_id?: string | null; avatar_url?: string | null;
}) => post<{ ok: boolean }>({ op: "auth_register", ...params }, false);

export const authBanCheck = (nick: string, telegram_id: string) =>
  post<{ reason: string; expires_at: string | null; is_permanent: boolean } | null>(
    { op: "auth_ban_check", nick, telegram_id }, false,
  );

/* ────────────────────── мутації (auth required) ────────────────────── */

export const dbInsert = <T = any>(table: string, values: unknown, opts?: { returning?: boolean }) =>
  post<T>({ op: "insert", table, values, returning: opts?.returning });

export const dbUpsert = <T = any>(table: string, values: unknown, opts?: { onConflict?: string; returning?: boolean }) =>
  post<T>({ op: "upsert", table, values, onConflict: opts?.onConflict, returning: opts?.returning });

export const dbUpdate = <T = any>(table: string, values: unknown, match: Match, opts?: { returning?: boolean }) =>
  post<T>({ op: "update", table, values, match, returning: opts?.returning });

export const dbDelete = <T = any>(table: string, match: Match) =>
  post<T>({ op: "delete", table, match });

/* ────────────────────── select (auth required) ────────────────────── */

export interface SelectParams {
  columns?: string;
  filters?: Array<{ op: FilterOp; col?: string; value: unknown }>;
  match?: Match;
  order?: { column: string; ascending?: boolean };
  limit?: number;
  single?: boolean;
  maybeSingle?: boolean;
}
export const dbSelect = <T = any>(table: string, params: SelectParams = {}) =>
  post<T>({ op: "select", table, ...params });

/* ────────────────────── shortcuts ────────────────────── */

export const eq    = (value: unknown): Filter => ({ op: "eq",    value });
export const ilike = (value: unknown): Filter => ({ op: "ilike", value });
export const neq   = (value: unknown): Filter => ({ op: "neq",   value });

/* ────────────────────── supabase-compatible proxy ────────────────────────
 * Тонкий проксі, що повторює API supabase-js (.from().select().eq()...) і
 * перенаправляє все на /api/db. Дозволяє існуючому коду продовжувати
 * писати у звичному стилі, не використовуючи anon-ключ.
 *
 * Підтримувані методи: from, select, insert, update, delete, upsert,
 * eq/neq/gt/gte/lt/lte/ilike/like/is/in/or, order, limit, maybeSingle,
 * single, .then() (await).
 */
function buildQuery(table: string) {
  const state: any = {
    table,
    op: "select" as "select"|"insert"|"update"|"delete"|"upsert",
    columns: "*",
    filters: [] as Array<{ op: FilterOp; col?: string; value: unknown }>,
    values: undefined as any,
    onConflict: undefined as string | undefined,
    order: undefined as any,
    limit: undefined as number | undefined,
    single: false,
    maybeSingle: false,
  };

  const q: any = {};

  q.select = (cols: string = "*", _opts?: any) => {
    if (state.op === "select") state.columns = cols || "*";
    // якщо select викликаний після insert/update/upsert/delete — це "returning"
    // (тоді просто ігноруємо колонки і ставимо returning=true у payload)
    if (state.op !== "select") state.returning = true;
    return q;
  };
  q.insert = (values: any) => { state.op = "insert"; state.values = values; return q; };
  q.update = (values: any) => { state.op = "update"; state.values = values; return q; };
  q.delete = ()            => { state.op = "delete"; return q; };
  q.upsert = (values: any, opts?: { onConflict?: string }) => {
    state.op = "upsert"; state.values = values; state.onConflict = opts?.onConflict; return q;
  };

  const addF = (op: FilterOp) => (col: string, value: any) => {
    state.filters.push({ op, col, value }); return q;
  };
  q.eq    = addF("eq");   q.neq = addF("neq");
  q.gt    = addF("gt");   q.gte = addF("gte");
  q.lt    = addF("lt");   q.lte = addF("lte");
  q.ilike = addF("ilike"); q.like = addF("like");
  q.is    = addF("is");
  q.in    = (col: string, values: any[]) => { state.filters.push({ op: "in", col, value: values }); return q; };
  q.or    = (expr: string) => { state.filters.push({ op: "or", value: expr }); return q; };

  q.order = (column: string, opts?: { ascending?: boolean }) => {
    state.order = { column, ascending: opts?.ascending !== false }; return q;
  };
  q.limit = (n: number) => { state.limit = n; return q; };

  q.maybeSingle = () => { state.maybeSingle = true; return execute(); };
  q.single      = () => { state.single = true;      return execute(); };

  function execute(): Promise<Result> {
    return post(state);
  }
  q.then = (onF: any, onR: any) => execute().then(onF, onR);
  q.catch = (onR: any) => execute().catch(onR);
  return q;
}

export const supabase = {
  from: (table: string) => buildQuery(table),
};
