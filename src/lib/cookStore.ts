// =====================================================================
// cookStore.ts — локальне сховище для фракції «Кухар» (Повар)
// ---------------------------------------------------------------------
// Зберігає продукти, рецепти, інвентар та баланс «кухарських грошей»
// у localStorage. Якщо у вас уже є бекенд для балансу/інвентарю —
// замініть функції addMoney / getMoney / inventory* на свої виклики API.
// =====================================================================

import { dbSelect } from "./db";

const NICK_KEY = "crp_nick";
const nick = () => (localStorage.getItem(NICK_KEY) || "").trim();
const ns = (k: string) => `cook_${nick().toLowerCase()}_${k}`;

// ---------- Типи ----------
export type Product = {
  id: string;
  name: string;
  icon: string;   // emoji або URL
  price: number;
};

export type Recipe = {
  id: string;
  name: string;
  icon?: string;
  // 9 клітинок, зліва-направо, зверху-вниз. null = порожня
  grid: (string | null)[]; // довжина 9, productId або null
  cookTimeMs: number;
  reward: number;
};

export type InventoryItem = { productId: string; qty: number };

// ---------- Глобальні дані (продукти/рецепти) ----------
const KEY_PRODUCTS = "cook_admin_products";
const KEY_RECIPES  = "cook_admin_recipes";

export function getProducts(): Product[] {
  try { return JSON.parse(localStorage.getItem(KEY_PRODUCTS) || "[]"); } catch { return []; }
}
export function saveProducts(list: Product[]) {
  localStorage.setItem(KEY_PRODUCTS, JSON.stringify(list));
  window.dispatchEvent(new Event("cook:data"));
}
export function getRecipes(): Recipe[] {
  try { return JSON.parse(localStorage.getItem(KEY_RECIPES) || "[]"); } catch { return []; }
}
export function saveRecipes(list: Recipe[]) {
  localStorage.setItem(KEY_RECIPES, JSON.stringify(list));
  window.dispatchEvent(new Event("cook:data"));
}

// ---------- Інвентар гравця ----------
export function getInventory(): InventoryItem[] {
  try { return JSON.parse(localStorage.getItem(ns("inv")) || "[]"); } catch { return []; }
}
export function setInventory(inv: InventoryItem[]) {
  localStorage.setItem(ns("inv"), JSON.stringify(inv.filter(i => i.qty > 0)));
  window.dispatchEvent(new Event("cook:inv"));
}
export function addToInventory(productId: string, qty: number) {
  const inv = getInventory();
  const i = inv.findIndex(x => x.productId === productId);
  if (i >= 0) inv[i].qty += qty; else inv.push({ productId, qty });
  setInventory(inv);
}
export function removeFromInventory(productId: string, qty: number): boolean {
  const inv = getInventory();
  const i = inv.findIndex(x => x.productId === productId);
  if (i < 0 || inv[i].qty < qty) return false;
  inv[i].qty -= qty;
  setInventory(inv);
  return true;
}

// ---------- «Кухарські гроші» (локальні) ----------
// Якщо є реальний API балансу — підключіть тут.
export function getMoney(): number {
  return parseInt(localStorage.getItem(ns("money")) || "0", 10) || 0;
}
export function addMoney(delta: number) {
  const next = getMoney() + delta;
  localStorage.setItem(ns("money"), String(Math.max(0, next)));
  window.dispatchEvent(new Event("cook:money"));
}
export function spendMoney(amount: number): boolean {
  const cur = getMoney();
  if (cur < amount) return false;
  localStorage.setItem(ns("money"), String(cur - amount));
  window.dispatchEvent(new Event("cook:money"));
  return true;
}

// ---------- Перевірка ролі повара ----------
const COOK_NAMES = ["кухар", "повар", "cook", "chef"];

export async function isCook(): Promise<boolean> {
  const n = nick();
  if (!n) return false;
  try {
    const { data } = await dbSelect("faction_applications", {
      columns: "faction_name, status, username",
      filters: [{ col: "status", op: "eq", value: "approved" }],
    });
    const rows = (data || []) as { faction_name?: string; username?: string }[];
    return rows.some(r =>
      (r.username || "").toLowerCase() === n.toLowerCase() &&
      COOK_NAMES.some(c => (r.faction_name || "").toLowerCase().includes(c))
    );
  } catch {
    return false;
  }
}

// ---------- Підбір рецепта по 9 клітинках ----------
export function matchRecipe(grid: (string | null)[]): Recipe | null {
  const recipes = getRecipes();
  for (const r of recipes) {
    if (r.grid.length !== 9) continue;
    let ok = true;
    for (let i = 0; i < 9; i++) {
      if ((r.grid[i] || null) !== (grid[i] || null)) { ok = false; break; }
    }
    if (ok) return r;
  }
  return null;
}
