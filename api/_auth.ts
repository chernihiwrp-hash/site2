// /api/_auth.ts — единая проверка кредов через bcrypt + CORS-хелперы.
// Используется во всех POST-эндпоинтах (db, db-select, auth, balance).

import bcrypt from "bcryptjs";

export interface VerifiedUser {
  username: string;        // оригинальный case из БД
  normalizedNick: string;  // lower+trim
  role: string | null;
  password_hash: string;
}

/**
 * Подгружает пользователя по нику и проверяет bcrypt-хеш.
 * Возвращает null при любой ошибке (юзер не найден / пароль не подошёл / БД упала).
 * НЕ логирует — это делает вызывающая сторона через _logger.
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
    .select("username, password_hash, role")
    .ilike("username", n)
    .maybeSingle();

  if (error || !row || !row.password_hash) return null;

  let ok = false;
  try {
    ok = await bcrypt.compare(p, row.password_hash as string);
  } catch {
    ok = false;
  }
  if (!ok) return null;

  const username = String(row.username);
  return {
    username,
    normalizedNick: username.toLowerCase().trim(),
    role: (row.role as string | null) ?? null,
    password_hash: row.password_hash as string,
  };
}

/** bcrypt-хеш для регистрации/смены пароля. */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

/**
 * CORS: если задан ALLOWED_ORIGIN в env — отдаём только его (можно
 * перечислить через запятую). Иначе — '*' (обратная совместимость).
 */
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
      // Не отдаём CORS-заголовок — браузер заблокирует.
      res.setHeader("Vary", "Origin");
    }
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

/** Скрывает внутренние сообщения Supabase от клиента. */
export function safeDbError(_err: unknown): string {
  return "Database error";
}
