// /api/_ratelimit.ts — in-process rate limiter (sliding window).
// Зберігає лічильники в пам'яті процесу Vercel — достатньо для захисту
// від одного гравця, що спамить. Між різними інвокаціями скидається,
// але це прийнятно: мета — уповільнити атаку, не гарантовано зупинити.

interface Bucket {
  count: number;
  resetAt: number; // ms timestamp
}

const store = new Map<string, Bucket>();

// Чистимо протухлі ключі кожні 5 хв щоб не течь пам'ять
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of store.entries()) {
    if (b.resetAt < now) store.delete(k);
  }
}, 5 * 60_000);

/**
 * Перевіряє ліміт.
 * @param key     — ідентифікатор (наприклад "nick:t1kron1x" або "ip:1.2.3.4")
 * @param limit   — макс. кількість запитів за windowMs
 * @param windowMs — вікно в мілісекундах (default: 60 секунд)
 * @returns true якщо ліміт перевищено (треба блокувати)
 */
export function isRateLimited(key: string, limit: number, windowMs = 60_000): boolean {
  const now = Date.now();
  let bucket = store.get(key);
  if (!bucket || bucket.resetAt < now) {
    bucket = { count: 0, resetAt: now + windowMs };
    store.set(key, bucket);
  }
  bucket.count += 1;
  return bucket.count > limit;
}

/**
 * Зручна обгортка: перевіряє і нік, і IP.
 * Повертає true (заблоковано) якщо хоча б один із них перевищив ліміт.
 *
 * Ліміти (навмисно консервативні для мутацій):
 *   - по ніку:  120 запитів / хв
 *   - по IP:    200 запитів / хв
 */
export function checkMutationLimit(nick: string | null, ip: string | null): boolean {
  let blocked = false;
  if (nick) blocked = isRateLimited(`mut:nick:${nick}`, 120) || blocked;
  if (ip)   blocked = isRateLimited(`mut:ip:${ip}`,   200) || blocked;
  return blocked;
}

/**
 * М'якший ліміт для SELECT-запитів.
 *   - по ніку:  300 / хв
 *   - по IP:    500 / хв
 */
export function checkSelectLimit(nick: string | null, ip: string | null): boolean {
  let blocked = false;
  if (nick) blocked = isRateLimited(`sel:nick:${nick}`, 300) || blocked;
  if (ip)   blocked = isRateLimited(`sel:ip:${ip}`,    500) || blocked;
  return blocked;
}

/**
 * Жорсткий ліміт для auth (захист від брутфорсу).
 *   - по ніку:  15 / хв
 *   - по IP:    30 / хв
 */
export function checkAuthLimit(nick: string | null, ip: string | null): boolean {
  let blocked = false;
  if (nick) blocked = isRateLimited(`auth:nick:${nick}`, 15) || blocked;
  if (ip)   blocked = isRateLimited(`auth:ip:${ip}`,    30) || blocked;
  return blocked;
}
