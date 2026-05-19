// Клиент: всё (включая SELECT) идёт через /api/db,
// который на сервере использует SUPABASE_SERVICE_ROLE_KEY.
// В браузере НЕТ ни service_role_key, ни даже anon key.
//
// Экспортируется объект `supabase` — почти полная замена supabase-js
// клиента: поддерживает .from(table).select(...).eq().ilike().in().or()
// .filter().order().limit().single().maybeSingle() и .insert/.update/
// .delete/.upsert.

type Filter = { op: "eq" | "ilike"; value: unknown };
type Match  = Record<string, Filter>;

interface Result<T = any> {
  data: T | null;
  error: { message: string } | null;
  count?: number | null;
}

function getCredentials(): { nick: string; password: string } | null {
  if (typeof localStorage === "undefined") return null;
  const nick     = localStorage.getItem("crp_nick");
  const password = localStorage.getItem("crp_password");
  if (!nick || !password) return null;
  return { nick, password };
}

async function post(payload: any): Promise<any> {
  const res = await fetch("/api/db", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { data: null, error: { message: json?.error || `HTTP ${res.status}` } };
  return { data: json?.data ?? null, count: json?.count ?? null, error: null };
}

async function callAuthed(payload: any): Promise<Result> {
  const creds = getCredentials();
  if (!creds) return { data: null, error: { message: "Not logged in" } };
  return post({ ...payload, ...creds });
}

// ── helpers для регистрации/логина (без авторизации) ──────────────────────
export const dbVerify = async (nick: string, password: string) =>
  post({ op: "verify", nick, password });

export const dbCheckUser = async (nick: string) =>
  post({ op: "check_user", nick });

export const dbCheckTelegram = async (telegram_id: string | number) =>
  post({ op: "check_telegram", telegram_id });

export const dbRegister = async (input: {
  nick: string; password: string;
  telegram_id?: string | null; avatar_url?: string | null;
}) => post({ op: "register", ...input });

// ── низкоуровневый select (опционально, для прямого вызова) ───────────────
export const dbSelect = async (payload: {
  table: string;
  columns?: string;
  filters?: any[];
  order?: { col: string; ascending?: boolean }[];
  limit?: number;
  range?: { from: number; to: number };
  single?: boolean;
  maybeSingle?: boolean;
  count?: "exact" | "planned" | "estimated";
  head?: boolean;
}) => callAuthed({ op: "select", ...payload });

// ── мутации ───────────────────────────────────────────────────────────────
export const dbInsert = <T = any>(
  table: string, values: unknown, opts?: { returning?: boolean }
) => callAuthed({ op: "insert", table, values, returning: opts?.returning }) as Promise<Result<T>>;

export const dbUpsert = <T = any>(
  table: string, values: unknown,
  opts?: { onConflict?: string; returning?: boolean }
) => callAuthed({
  op: "upsert", table, values,
  onConflict: opts?.onConflict, returning: opts?.returning,
}) as Promise<Result<T>>;

export const dbUpdate = <T = any>(
  table: string, values: unknown, match: Match, opts?: { returning?: boolean }
) => callAuthed({ op: "update", table, values, match, returning: opts?.returning }) as Promise<Result<T>>;

export const dbDelete = <T = any>(table: string, match: Match) =>
  callAuthed({ op: "delete", table, match }) as Promise<Result<T>>;

export const eq    = (value: unknown): Filter => ({ op: "eq",    value });
export const ilike = (value: unknown): Filter => ({ op: "ilike", value });

// ───────────────────────────────────────────────────────────────────────────
// Прокси-клиент: имитирует supabase-js для существующего кода.
// supabase.from(t).select(...).eq(...).ilike(...).in(...).order(...).single()
// ───────────────────────────────────────────────────────────────────────────

type FilterEntry =
  | { op: "eq" | "ilike"; col: string; val: unknown }
  | { op: "in"; col: string; val: unknown[] }
  | { op: "or"; expr: string }
  | { op: "filter"; col: string; operator: string; val: unknown };

class QueryBuilder implements PromiseLike<Result> {
  private table: string;
  private mode: "select" | "insert" | "update" | "delete" | "upsert" | null = null;
  private columns = "*";
  private filters: FilterEntry[] = [];
  private orders: { col: string; ascending?: boolean }[] = [];
  private _limit?: number;
  private _range?: { from: number; to: number };
  private _single = false;
  private _maybeSingle = false;
  private _count?: "exact" | "planned" | "estimated";
  private _head = false;
  private _values: unknown = undefined;
  private _onConflict?: string;
  private _exec?: Promise<Result>;

  constructor(table: string) { this.table = table; }

  select(columns?: string, opts?: { count?: "exact" | "planned" | "estimated"; head?: boolean }) {
    if (this.mode === null) this.mode = "select";
    if (columns) this.columns = columns;
    if (opts?.count) this._count = opts.count;
    if (opts?.head)  this._head = true;
    return this;
  }
  insert(values: unknown)            { this.mode = "insert"; this._values = values; return this; }
  update(values: unknown)            { this.mode = "update"; this._values = values; return this; }
  upsert(values: unknown, opts?: { onConflict?: string }) {
    this.mode = "upsert"; this._values = values; this._onConflict = opts?.onConflict; return this;
  }
  delete()                            { this.mode = "delete"; return this; }

  eq(col: string, val: unknown)       { this.filters.push({ op: "eq",    col, val }); return this; }
  ilike(col: string, val: unknown)    { this.filters.push({ op: "ilike", col, val }); return this; }
  in(col: string, val: unknown[])     { this.filters.push({ op: "in",    col, val }); return this; }
  or(expr: string)                    { this.filters.push({ op: "or", expr }); return this; }
  filter(col: string, operator: string, val: unknown) {
    this.filters.push({ op: "filter", col, operator, val }); return this;
  }
  order(col: string, opts?: { ascending?: boolean }) {
    this.orders.push({ col, ascending: opts?.ascending !== false }); return this;
  }
  limit(n: number)                    { this._limit = n; return this; }
  range(from: number, to: number)     { this._range = { from, to }; return this; }
  single()                            { this._single = true; return this; }
  maybeSingle()                       { this._maybeSingle = true; return this; }

  private async run(): Promise<Result> {
    if (this.mode === null || this.mode === "select") {
      return dbSelect({
        table: this.table,
        columns: this.columns,
        filters: this.filters,
        order:   this.orders,
        limit:   this._limit,
        range:   this._range,
        single:  this._single,
        maybeSingle: this._maybeSingle,
        count:   this._count,
        head:    this._head,
      });
    }
    // Мутации: преобразуем filters в match (поддерживаются eq/ilike).
    const match: Match = {};
    for (const f of this.filters) {
      if (f.op === "eq" || f.op === "ilike") {
        match[(f as any).col] = { op: f.op, value: (f as any).val };
      }
    }
    if (this.mode === "insert") return dbInsert(this.table, this._values);
    if (this.mode === "upsert") return dbUpsert(this.table, this._values, { onConflict: this._onConflict });
    if (this.mode === "update") return dbUpdate(this.table, this._values, match);
    if (this.mode === "delete") return dbDelete(this.table, match);
    return { data: null, error: { message: `Unknown op: ${this.mode}` } };
  }

  then<TResult1 = Result, TResult2 = never>(
    onfulfilled?: ((value: Result) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?:  ((reason: any)  => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    if (!this._exec) this._exec = this.run();
    return this._exec.then(onfulfilled as any, onrejected as any);
  }
}

export const supabase = {
  from(table: string) { return new QueryBuilder(table); },
};
