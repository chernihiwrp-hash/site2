/**
 * /api/balance.ts — защищённый эндпоинт для всех операций с балансом.
 * v3: добавлен op="buy_house" — серверная покупка дома за CR (раньше
 *     клиент сам делал dbUpdate("houses",...), что блокировалось RLS и
 *     открывало путь подменить владельца. Теперь — только через сервер.
 */

import { createClient } from "@supabase/supabase-js";
import { verifyCredentials, applyCors } from "./_auth.js";

const MAX_BET = 10_000;
const MAX_WIN = 100_000;
const DAILY_COOLDOWN_MS = 23 * 60 * 60 * 1000;

const STREAK_BONUS: Record<string, number> = {
  low:    100,
  mid:    150,
  high:   200,
};

const HOUSE_CR_MULT = 3;      // 1 EUR = 3 CR
const MAX_HOUSE_PRICE_CR = 10_000_000;
const ALLOWED_RENTAL_DAYS = new Set([3, 7, 14, 15, 24, 30, 60, 90]);

type Op = "daily_claim" | "buy_theme" | "buy_nft" | "game_result" | "buy_house";

interface Body {
  nick:     string;
  password: string;
  op:       Op;
  theme_id?: string;
  nft_id?: number;
  game?:   "dice" | "slots" | "rocket" | "blackjack" | "guess";
  bet?:    number;
  won?:    boolean;
  multiplier?: number;
  streak?: number;
  house_id?: number;
  rental_days?: number;
}

export default async function handler(req: any, res: any) {
  applyCors(req, res);
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

  const ALLOWED_OPS: Op[] = ["daily_claim", "buy_theme", "buy_nft", "game_result", "buy_house"];
  if (!op || !ALLOWED_OPS.includes(op))
    return res.status(400).json({ error: "Op not allowed" });

  if (!nick || !password)
    return res.status(401).json({ error: "Unauthorized: no credentials" });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ── Авторизация (bcrypt) ──────────────────────────────────────────────────
  const user = await verifyCredentials(supabase, nick, password);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const normalizedNick = user.normalizedNick;

  const { data: userRow, error: userErr } = await supabase
    .from("users")
    .select("username, balance, owned_themes")
    .ilike("username", normalizedNick)
    .maybeSingle();

  if (userErr || !userRow)
    return res.status(401).json({ error: "Unauthorized" });

  let dailyRow: { last_daily_claim: any; daily_streak: any } | null = null;
  try {
    const r = await supabase
      .from("users")
      .select("last_daily_claim, daily_streak")
      .ilike("username", normalizedNick)
      .maybeSingle();
    dailyRow = (r.data as any) ?? null;
  } catch {
    dailyRow = null;
  }

  const currentBalance = (userRow.balance as number) || 0;
  const realUsername   = String(userRow.username);

  // ══════════════════════════════════════════════════════════════════════════
  // DAILY CLAIM
  // ══════════════════════════════════════════════════════════════════════════
  if (op === "daily_claim") {
    const lastClaim = dailyRow?.last_daily_claim ? new Date((dailyRow as any).last_daily_claim).getTime() : 0;
    const now = Date.now();

    if (now - lastClaim < DAILY_COOLDOWN_MS) {
      const remaining = DAILY_COOLDOWN_MS - (now - lastClaim);
      return res.status(429).json({ error: "Too soon", remaining_ms: remaining });
    }

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

    if (error) return res.status(500).json({ error: "Update failed" });

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

    // Должно полностью совпадать с THEMES в src/pages/Shop.tsx.
    // Источник правды — сервер: клиент НЕ диктует цену.
    const THEME_PRICES: Record<string, number> = {
      lime: 0,
      neon_blue: 300,
      cyber_red: 300,
      gold_vip: 750,
      purple_haze: 500,
      arctic: 400,
      matrix: 600,
      sunset: 450,
    };

    const price = THEME_PRICES[theme_id];
    if (price === undefined) return res.status(400).json({ error: "Unknown theme" });

    const ownedThemes = (userRow.owned_themes as string[]) || [];
    if (ownedThemes.includes(theme_id)) return res.status(400).json({ error: "Theme already owned" });
    if (currentBalance < price) return res.status(400).json({ error: "Insufficient balance" });

    const newBalance = currentBalance - price;
    const newOwned = [...ownedThemes, theme_id];

    const { error } = await supabase
      .from("users")
      .update({ balance: newBalance, owned_themes: newOwned, active_theme: theme_id })
      .ilike("username", normalizedNick);

    if (error) return res.status(500).json({ error: "Update failed" });

    return res.status(200).json({ data: { balance: newBalance, owned_themes: newOwned } });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // BUY NFT
  // ══════════════════════════════════════════════════════════════════════════
  if (op === "buy_nft") {
    const { nft_id } = body;
    if (!nft_id) return res.status(400).json({ error: "nft_id required" });

    const { data: nft, error: nftErr } = await supabase
      .from("nft_gifts")
      .select("id, price, sold")
      .eq("id", nft_id)
      .maybeSingle();

    if (nftErr || !nft) return res.status(404).json({ error: "NFT not found" });
    if (nft.sold)        return res.status(400).json({ error: "NFT already sold" });

    const price = (nft.price as number) || 0;
    if (currentBalance < price) return res.status(400).json({ error: "Insufficient balance" });

    const { data: alreadyOwned } = await supabase
      .from("nft_owners")
      .select("id")
      .eq("nft_id", nft_id)
      .ilike("owner_nick", normalizedNick)
      .maybeSingle();

    if (alreadyOwned) return res.status(400).json({ error: "Already owned" });

    const newBalance = currentBalance - price;

    const { error: balErr } = await supabase
      .from("users")
      .update({ balance: newBalance })
      .ilike("username", normalizedNick);

    if (balErr) return res.status(500).json({ error: "Update failed" });

    const { error: nftInsertErr } = await supabase
      .from("nft_owners")
      .insert({ owner_nick: normalizedNick, nft_id });

    if (nftInsertErr) {
      await supabase.from("users").update({ balance: currentBalance }).ilike("username", normalizedNick);
      return res.status(500).json({ error: "Failed to record NFT ownership" });
    }

    // NOTE: We do NOT set sold=true on nft_gifts globally.
    // NFT availability is tracked per-user via nft_owners table.
    // sold=true is only set manually by admin for truly limited 1-of-1 NFTs.

    return res.status(200).json({ data: { balance: newBalance } });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // BUY HOUSE — серверная покупка дома за CR
  // ══════════════════════════════════════════════════════════════════════════
  if (op === "buy_house") {
    const houseId = Number(body.house_id);
    const rentalDays = Number(body.rental_days ?? 24);

    if (!Number.isInteger(houseId) || houseId <= 0) {
      return res.status(400).json({ error: "house_id required" });
    }
    if (!ALLOWED_RENTAL_DAYS.has(rentalDays)) {
      return res.status(400).json({ error: "Invalid rental_days" });
    }

    const { data: house, error: hErr } = await supabase
      .from("houses")
      .select("id, price, owner_username, is_for_sale")
      .eq("id", houseId)
      .maybeSingle();

    if (hErr || !house) return res.status(404).json({ error: "House not found" });
    if (house.owner_username) return res.status(400).json({ error: "House already owned" });
    if (house.is_for_sale === false) return res.status(400).json({ error: "House not for sale" });

    const priceEUR = Number(house.price) || 0;
    if (priceEUR <= 0) return res.status(400).json({ error: "Invalid house price" });

    const crPrice = Math.floor(priceEUR * HOUSE_CR_MULT);
    if (crPrice > MAX_HOUSE_PRICE_CR) {
      return res.status(400).json({ error: "House price exceeds limit" });
    }
    if (currentBalance < crPrice) {
      return res.status(400).json({ error: `Need ${crPrice} CR (have ${currentBalance})` });
    }

    const newBalance = currentBalance - crPrice;

    // 1) Списываем CR
    const { error: balErr } = await supabase
      .from("users")
      .update({ balance: newBalance })
      .ilike("username", normalizedNick);
    if (balErr) return res.status(500).json({ error: "Update failed" });

    // 2) Атомарно ставим владельца (только если ещё свободен — защита от гонки)
    const { data: updated, error: hUpdErr } = await supabase
      .from("houses")
      .update({ owner_username: realUsername, is_for_sale: false })
      .eq("id", houseId)
      .is("owner_username", null)
      .select("id");

    if (hUpdErr || !updated || updated.length === 0) {
      // Откат баланса
      await supabase.from("users").update({ balance: currentBalance }).ilike("username", normalizedNick);
      return res.status(409).json({ error: "House was taken by someone else" });
    }

    // 3) Регистрируем заявку как approved (для истории)
    try {
      await supabase.from("house_purchase_requests").insert({
        house_id: houseId,
        username: realUsername,
        status: "approved",
        rental_days: rentalDays,
      });
    } catch { /* лог не критичен */ }

    // 4) Нотификация (тоже не критична)
    try {
      await supabase.from("notifications").insert({
        username: realUsername,
        message: `🏠 Будинок придбано за ${crPrice.toLocaleString()} CR`,
      });
    } catch { /* лог не критичен */ }

    return res.status(200).json({ data: { balance: newBalance, cr_spent: crPrice } });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // GAME RESULT
  // ══════════════════════════════════════════════════════════════════════════
  if (op === "game_result") {
    const { game, bet, won, multiplier } = body;

    const ALLOWED_GAMES = ["dice", "slots", "rocket", "blackjack", "guess"];
    if (!game || !ALLOWED_GAMES.includes(game)) return res.status(400).json({ error: "Unknown game" });

    if (!bet || typeof bet !== "number" || bet <= 0 || bet > MAX_BET)
      return res.status(400).json({ error: `Bet must be between 1 and ${MAX_BET}` });

    if (typeof won !== "boolean") return res.status(400).json({ error: "won must be boolean" });
    if (!won && currentBalance < bet) return res.status(400).json({ error: "Insufficient balance for this bet" });

    let delta = 0;
    if (!won) {
      delta = -bet;
    } else {
      const safeMultiplier = typeof multiplier === "number" && multiplier > 0 ? multiplier : 2;
      const MAX_MULTIPLIERS: Record<string, number> = {
        dice: 2, slots: 10, rocket: 100, blackjack: 2.5, guess: 50,
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

    if (error) return res.status(500).json({ error: "Update failed" });

    return res.status(200).json({ data: { balance: newBalance, delta } });
  }

  return res.status(400).json({ error: "Unknown op" });
}
