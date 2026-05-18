// Клиентские хелперы для мутаций. Все insert/update/delete/upsert
// идут через /api/db, который на сервере использует SERVICE_ROLE_KEY
// и обходит RLS. Чтения — напрямую через supabase (anon).

type Filter = { op: "eq" | "ilike"; value: unknown };
type Match = Record<string, Filter>;

interface Payload {
  table: string;
  op: "insert" | "update" | "delete" | "upsert";
  values?: unknown;
  match?: Match;
  onConflict?: string;
  returning?: boolean;
}

interface Result<T = any> {
  data: T | null;
  error: { message: string } | null;
}

async function call<T = any>(payload: Payload): Promise<Result<T>> {
  try {
    const res = await fetch("/api/db", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-secret": import.meta.env.VITE_ADMIN_SHARED_SECRET as string,
      },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { data: null, error: { message: json?.error || `HTTP ${res.status}` } };
    }
    return { data: (json?.data ?? null) as T, error: null };
  } catch (e: any) {
    return { data: null, error: { message: e?.message || "Network error" } };
  }
}

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

// Удобные сокращения для match
export const eq = (value: unknown): Filter => ({ op: "eq", value });
export const ilike = (value: unknown): Filter => ({ op: "ilike", value });
