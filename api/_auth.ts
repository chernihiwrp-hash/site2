// /api/_auth.ts  [ПРОЕКТ: site2-main] — проверка кредов через plaintext password (совместимость с casino проектом).

export interface VerifiedUser {
  username: string;
  normalizedNick: string;
  role: string | null;
  password: string;
}

/**
 * Подгружает пользователя по нику и проверяет пароль (plaintext).
 * Возвращает null при любой ошибке.
 */
export async function verifyCredentials(
  supabase: any,
  nick: unknown,
  password: unknown,
): Promise<VerifiedUser | null> {
  if (typeof nick !== "string" || typeof password !== "string") return null;
  const n = nick.trim();
  const p = password;
  if (!n || !p || n.length > 64 || p.length > 256) return null;

  const { data: row, error } = await supabase
    .from("users")
    .select("username, password, role")
    .ilike("username", n)
    .maybeSingle();

  if (error || !row || !row.password) return null;

  if (row.password !== p) return null;

  const username = String(row.username);
  return {
    username,
    normalizedNick: username.toLowerCase().trim(),
    role: (row.role as string | null) ?? null,
    password: row.password as string,
  };
}

/** Просто возвращает пароль как есть — без хеширования. */
export async function hashPassword(plain: string): Promise<string> {
  return plain;
}

export function applyCors(req: any, res: any): void {
  const allowed = (process.env.ALLOWED_ORIGIN || "*").trim();
  const origin = String(req?.headers?.origin || "");
  if (allowed === "*") {
    res.setHeader("Access-Control-Allow-Origin", "*");
  } else {
    const list = allowed.split(",").map((s) => s.trim()).filter(Boolean);
    if (list.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    } else {
      res.setHeader("Vary", "Origin");
    }
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export function safeDbError(_err: unknown): string {
  return "Database error";
}
