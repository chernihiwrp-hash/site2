// Клієнтські хелпери для мутацій. Всі insert/update/delete/upsert
// йдуть через /api/db, який на сервері перевіряє нік+пароль і
// виконує запит через SERVICE_ROLE_KEY.
//
// ✅ VITE_ADMIN_SHARED_SECRET більше не використовується — видали з Vercel!
// Читання — напряму через supabase (anon).

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

function getCredentials(): { nick: string; password: string } | null {
  // Нік і пароль вже зберігаються в localStorage після логіну
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
      // Сервер перевіряє нік+пароль сам — жодного секрету у фронтенді
      body: JSON.stringify({ ...payload, ...creds }),
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

// Зручні скорочення для match
export const eq    = (value: unknown): Filter => ({ op: "eq",    value });
export const ilike = (value: unknown): Filter => ({ op: "ilike", value });
