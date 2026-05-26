/**
 * src/lib/balanceApi.ts
 * Всі операції з балансом — ТІЛЬКИ через /api/balance
 * Фронт ніколи не передає новий баланс напряму
 */

const API_URL = "/api/balance";

function getCreds() {
  const nick     = localStorage.getItem("crp_nick");
  const password = sessionStorage.getItem("crp_password");
  return { nick, password };
}

async function call(body: Record<string, unknown>): Promise<{ balance?: number; bonus?: number; streak?: number; delta?: number; error?: string }> {
  const { nick, password } = getCreds();
  if (!nick || !password) return { error: "Not logged in" };

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nick, password, ...body }),
    });
    const json = await res.json();
    if (!res.ok) return { error: json.error || "Server error" };
    return json.data || {};
  } catch (e: any) {
    return { error: e?.message || "Network error" };
  }
}

/** Щоденна нагорода */
export async function claimDaily(): Promise<{ balance: number; bonus: number; streak: number } | { error: string }> {
  return call({ op: "daily_claim" }) as any;
}

/** Купівля теми */
export async function buyTheme(theme_id: string): Promise<{ balance: number } | { error: string }> {
  return call({ op: "buy_theme", theme_id }) as any;
}

/** Купівля NFT */
export async function buyNft(nft_id: number): Promise<{ balance: number } | { error: string }> {
  return call({ op: "buy_nft", nft_id }) as any;
}

/** Результат гри */
export async function submitGameResult(
  game: "dice" | "slots" | "rocket" | "blackjack" | "guess",
  bet: number,
  won: boolean,
  multiplier?: number
): Promise<{ balance: number; delta: number } | { error: string }> {
  return call({ op: "game_result", game, bet, won, multiplier }) as any;
}
