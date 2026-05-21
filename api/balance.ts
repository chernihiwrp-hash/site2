/**
 * /api/balance.ts — захищений ендпоінт для всіх операцій з балансом
 *
 * Фронт НІКОЛИ не передає новий баланс напряму.
 * Він тільки каже ЩО робить (op) і скільки (amount/itemId).
 * Сервер сам читає баланс, рахує і записує.
 *
 * Операції:
 *   daily_claim   — щоденна нагорода (перевірка часу на сервері)
 *   buy_theme     — купівля теми
 *   buy_nft       — купівля NFT
 *   game_result   — результат гри (dice, slots, rocket, blackjack, guess)
 */

import { createClient } from "@supabase/supabase-js";

// Максимальна ставка в іграх — щоб не можна було поставити мільйон
const MAX_BET = 10_000;

// Максимальний виграш за одну гру
const MAX_WIN = 100_000;

// Мінімальний час між daily_claim (23 години в мс)
const DAILY_COOLDOWN_MS = 23 * 60 * 60 * 1000;

// Бонуси за streak
const STREAK_BONUS: Record<string, number> = {
  low:    100,  // streak < 3
  mid:    150,  // streak >= 3
  high:   200,  // streak >= 6
};

type Op =
  | "daily_claim"
  | "buy_theme"
  | "buy_nft"
  | "game_result";

interface Body {
  nick:     string;
  password: string;
  op:       Op;
  // buy_theme
  theme_id?: string;
  // buy_nft
  nft_id?: number;
  // game_result
  game?:   "dice" | "slots" | "rocket" | "blackjack" | "guess";
  bet?:    number;
  won?:    boolean;
  multiplier?: number; // для rocket/blackjack
  // daily_claim
  streak?: number;
}

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")   return res.status(405).json({ error: "Method not allowed" });

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY)
    return res.status(500).json({ error: "Server not configured" });

  let body: Body;
  try { body = typeof req.body === "string" ? JSON.parse(req.body) : req.body; }
  catch { return res.status(400).json({ error: "Invalid JSON" }); }

  const { nick, password, op } = body || {} as Body;

  const ALLOWED_OPS: Op[] = ["daily_claim", "buy_theme", "buy_nft", "game_result"];
  if (!op || !ALLOWED_OPS.includes(op))
    return res.status(400).json({ error: "Op not allowed" });

  if (!nick || !password)
    return res.status(401).json({ error: "Unauthorized: no credentials" });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ── Авторизація ───────────────────────────────────────────────────────────
  // Спочатку базові поля
  const { data: userRow, error: userErr } = await supabase
    .from("users")
    .select("username, password, balance, owned_themes")
    .ilike("username", nick.trim())
    .maybeSingle();

  if (userErr || !userRow)
    return res.status(401).json({ error: "Unauthorized: user not found" });
  if (userRow.password !== password)
    return res.status(401).json({ error: "Unauthorized: wrong password" });

  // Окремо daily поля — якщо колонок ще немає в БД, не падаємо
  let dailyRow: { last_daily_claim: any; daily_streak: any } | null = null;
  try {
    const res = await supabase
      .from("users")
      .select("last_daily_claim, daily_streak")
      .ilike("username", (userRow.username as string).toLowerCase().trim())
      .maybeSingle();
    dailyRow = (res.data as any) ?? null;
  } catch {
    dailyRow = null;
  }

  const currentBalance = (userRow.balance as number) || 0;
  const normalizedNick = userRow.username.toLowerCase().trim();

  // ══════════════════════════════════════════════════════════════════════════
  // DAILY CLAIM
  // ══════════════════════════════════════════════════════════════════════════
  if (op === "daily_claim") {
    // Graceful fallback якщо колонок last_daily_claim/daily_streak ще немає в БД
    const lastClaim = dailyRow?.last_daily_claim ? new Date((dailyRow as any).last_daily_claim).getTime() : 0;
    const now = Date.now();

    // Перевірка часу на СЕРВЕРІ — фронт не може підробити
    if (now - lastClaim < DAILY_COOLDOWN_MS) {
      const remaining = DAILY_COOLDOWN_MS - (now - lastClaim);
      return res.status(429).json({ error: "Too soon", remaining_ms: remaining });
    }

    // Streak — беремо з БД, не з фронту
    const dbStreak = ((dailyRow as any)?.daily_streak as number) || 0;
    const streakExpired = lastClaim > 0 && (now - lastClaim) > 48 * 60 * 60 * 1000;
    const newStreak = streakExpired ? 1 : dbStreak + 1;

    const bonus = newStreak >= 6 ? STREAK_BONUS.high
                : newStreak >= 3 ? STREAK_BONUS.mid
                : STREAK_BONUS.low;

    const newBalance = currentBalance + bonus;

    const { error } = await supabase
      .from("users")
      .update({
        balance: newBalance,
        last_daily_claim: new Date(now).toISOString(),
        daily_streak: newStreak,
      })
      .ilike("username", normalizedNick);

    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({
      data: { balance: newBalance, bonus, streak: newStreak }
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // BUY THEME
  // ══════════════════════════════════════════════════════════════════════════
  if (op === "buy_theme") {
    const { theme_id } = body;
    if (!theme_id) return res.status(400).json({ error: "theme_id required" });

    // Ціни тем — на сервері, не на фронті
    const THEME_PRICES: Record<string, number> = {
      "default": 0,
      "neon":    500,
      "dark":    750,
      "gold":    1000,
      "purple":  800,
      "ocean":   600,
    };

    const price = THEME_PRICES[theme_id];
    if (price === undefined)
      return res.status(400).json({ error: "Unknown theme" });

    // Перевіряємо чи вже є
    const ownedThemes = (userRow.owned_themes as string[]) || [];
    if (ownedThemes.includes(theme_id))
      return res.status(400).json({ error: "Theme already owned" });

    if (currentBalance < price)
      return res.status(400).json({ error: "Insufficient balance" });

    const newBalance = currentBalance - price;
    const newOwned = [...ownedThemes, theme_id];

    const { error } = await supabase
      .from("users")
      .update({ balance: newBalance, owned_themes: newOwned, active_theme: theme_id })
      .ilike("username", normalizedNick);

    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({ data: { balance: newBalance, owned_themes: newOwned } });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // BUY NFT
  // ══════════════════════════════════════════════════════════════════════════
  if (op === "buy_nft") {
    const { nft_id } = body;
    if (!nft_id) return res.status(400).json({ error: "nft_id required" });

    // Читаємо ціну з БД — фронт не може підробити
    const { data: nft, error: nftErr } = await supabase
      .from("nft_gifts")
      .select("id, price, sold")
      .eq("id", nft_id)
      .maybeSingle();

    if (nftErr || !nft) return res.status(404).json({ error: "NFT not found" });
    if (nft.sold)        return res.status(400).json({ error: "NFT already sold" });

    const price = (nft.price as number) || 0;
    if (currentBalance < price)
      return res.status(400).json({ error: "Insufficient balance" });

    // Перевіряємо чи не куплено вже цим гравцем
    const { data: alreadyOwned } = await supabase
      .from("nft_owners")
      .select("id")
      .eq("nft_id", nft_id)
      .ilike("owner_nick", normalizedNick)
      .maybeSingle();

    if (alreadyOwned) return res.status(400).json({ error: "Already owned" });

    const newBalance = currentBalance - price;

    // Списуємо баланс
    const { error: balErr } = await supabase
      .from("users")
      .update({ balance: newBalance })
      .ilike("username", normalizedNick);

    if (balErr) return res.status(500).json({ error: balErr.message });

    // Записуємо власника
    const { error: nftInsertErr } = await supabase
      .from("nft_owners")
      .insert({ owner_nick: normalizedNick, nft_id });

    if (nftInsertErr) {
      // Повертаємо баланс якщо не вдалось записати
      await supabase.from("users").update({ balance: currentBalance }).ilike("username", normalizedNick);
      return res.status(500).json({ error: "Failed to record NFT ownership" });
    }

    // Позначаємо NFT як продане
    await supabase.from("nft_gifts").update({ sold: true }).eq("id", nft_id);

    return res.status(200).json({ data: { balance: newBalance } });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // GAME RESULT
  // ══════════════════════════════════════════════════════════════════════════
  if (op === "game_result") {
    const { game, bet, won, multiplier } = body;

    const ALLOWED_GAMES = ["dice", "slots", "rocket", "blackjack", "guess"];
    if (!game || !ALLOWED_GAMES.includes(game))
      return res.status(400).json({ error: "Unknown game" });

    if (!bet || typeof bet !== "number" || bet <= 0 || bet > MAX_BET)
      return res.status(400).json({ error: `Bet must be between 1 and ${MAX_BET}` });

    if (typeof won !== "boolean")
      return res.status(400).json({ error: "won must be boolean" });

    // Перевіряємо що у гравця є ставка
    if (!won && currentBalance < bet)
      return res.status(400).json({ error: "Insufficient balance for this bet" });

    // Розраховуємо виплату на сервері
    let delta = 0;

    if (!won) {
      delta = -bet;
    } else {
      // Перевіряємо multiplier від фронту і обмежуємо максимум
      const safeMultiplier = typeof multiplier === "number" && multiplier > 0
        ? multiplier
        : 2; // дефолт x2

      // Максимальні множники по іграх
      const MAX_MULTIPLIERS: Record<string, number> = {
        dice:       2,
        slots:      10,
        rocket:     100,  // crash game — може бути великий mult
        blackjack:  2.5,
        guess:      50,
      };

      const maxMult = MAX_MULTIPLIERS[game] || 2;
      const clampedMult = Math.min(safeMultiplier, maxMult);
      delta = Math.min(Math.floor(bet * clampedMult), MAX_WIN);
    }

    const newBalance = Math.max(0, currentBalance + delta);

    const { error } = await supabase
      .from("users")
      .update({ balance: newBalance })
      .ilike("username", normalizedNick);

    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({ data: { balance: newBalance, delta } });
  }

  return res.status(400).json({ error: "Unknown op" });
}
