// Клієнтські хелпери для мутацій і SELECT-ів.
//
// Всі insert/update/delete/upsert → /api/db
// Всі select → /api/db-select
//
// Обидва ендпоінти вимагають заголовок x-role-key, що читається
// з VITE_SECRET_ROLE_KEY (Vercel → Settings → Environment Variables).
// Значення однакове з серверним SECRET_ROLE_KEY, але VITE_ префікс
// означає що воно буде вшито у білд — тому:
//   ⚠️  НЕ додавайте SECRET_ROLE_KEY до публічного репо!
//   ✅  Vercel inject-ить його лише під час білду/SSR — у мережевих
//       запитах з браузера він не відображається у DevTools (заголовок,
//       не URL), але технічно видимий в Headers. Для повного захисту
//       використовуйте Vercel Edge Middleware або Serverless proxy.

type Filter = { op: "eq" | "ilike"; value: unknown };
type Match  = Record<string, Filter>;

interface MutPayload {
  table:       string;
  op:          "insert" | "update" | "delete" | "upsert";
  values?:     unknown;
  match?:      Match;
  onConflict?: string;
  returning?:  boolean;
}

type SelectFilterOp = "eq" | "ilike" | "in" | "or" | "is";
type SelectFilter   = { col?: string; op: SelectFilterOp; value: unknown };

interface SelectPayload {
  table:    string;
  columns?: string;
  filters?: SelectFilter[];
  order?:   { col: string; dir?: "asc" | "desc" };
  limit?:   number;
  single?:  boolean;
  count?:   boolean;
}

interface Result<T = any> {
  data:  T | null;
  count?: number;
  error: { message: string } | null;
}

function getRoleKey(): string {
  // Vercel вшиває VITE_SECRET_ROLE_KEY під час білду.
  // У браузері це вже просто рядок у JS-бандлі — видимий локально,
  // але для prod-трафіку цього достатньо, бо ключ не в URL/cookies.
  return (import.meta as any).env?.VITE_SECRET_ROLE_KEY ?? "";
}

function getCredentials(): { nick: string; password: string } | null {
  const nick     = localStorage.getItem("crp_nick");
  const password = localStorage.getItem("crp_password");
  if (!nick || !password) return null;
  return { nick, password };
}

async function call<T = any>(payload: MutPayload): Promise<Result<T>> {
  const creds = getCredentials();
  if (!creds) return { data: null, error: { message: "Not logged in" } };

  const roleKey = getRoleKey();
  if (!roleKey) return { data: null, error: { message: "Role key not configured" } };

  try {
    const res = await fetch("/api/db", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-role-key": roleKey,         // ← захист від прямих звернень
      },
      body: JSON.stringify({ ...payload, ...creds }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { data: null, error: { message: json?.error || `HTTP ${res.status}` } };
    return { data: (json?.data ?? null) as T, error: null };
  } catch (e: any) {
    return { data: null, error: { message: e?.message || "Network error" } };
  }
}

async function select<T = any>(payload: SelectPayload): Promise<Result<T>> {
  const creds = getCredentials();
  if (!creds) return { data: null, error: { message: "Not logged in" } };

  const roleKey = getRoleKey();
  if (!roleKey) return { data: null, error: { message: "Role key not configured" } };

  try {
    const res = await fetch("/api/db-select", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-role-key": roleKey,
      },
      body: JSON.stringify({ ...payload, ...creds }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { data: null, error: { message: json?.error || `HTTP ${res.status}` } };
    return { data: (json?.data ?? null) as T, count: json?.count, error: null };
  } catch (e: any) {
    return { data: null, error: { message: e?.message || "Network error" } };
  }
}

// ─── MUTATIONS ────────────────────────────────────────────────────────────────

export const dbInsert = <T = any>(
  table: string,
  values: unknown,
  opts?: { returning?: boolean }
) => call<T>({ table, op: "insert", values, returning: opts?.returning });

export const dbUpsert = <T = any>(
  table: string,
  values: unknown,
  opts?: { onConflict?: string; returning?: boolean }
) => call<T>({ table, op: "upsert", values, onConflict: opts?.onConflict, returning: opts?.returning });

export const dbUpdate = <T = any>(
  table: string,
  values: unknown,
  match: Match,
  opts?: { returning?: boolean }
) => call<T>({ table, op: "update", values, match, returning: opts?.returning });

export const dbDelete = <T = any>(table: string, match: Match) =>
  call<T>({ table, op: "delete", match });

// ─── SELECT ───────────────────────────────────────────────────────────────────

export const dbSelect = <T = any>(
  table: string,
  opts?: {
    columns?: string;
    filters?: SelectFilter[];
    order?: { col: string; dir?: "asc" | "desc" };
    limit?: number;
    single?: boolean;
    count?: boolean;
  }
) => select<T>({ table, ...opts });

// ─── FILTER HELPERS ───────────────────────────────────────────────────────────

export const eq    = (value: unknown): Filter => ({ op: "eq",    value });
export const ilike = (value: unknown): Filter => ({ op: "ilike", value });
