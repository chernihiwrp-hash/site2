// =====================================================================
// cookStore.ts — сховище для фракції «Кухар» (Повар).
// Продукти й рецепти зберігаються в БД (cook_products / cook_recipes).
// Гроші — це users.balance (валюта CR). Інвентар лишається локальним,
// бо це особистий «рюкзак» гравця і не вимагає синхронізації між пристроями.
// =====================================================================

import { dbSelect, dbUpsert, dbDelete, eq } from "./db";

const NICK_KEY = "crp_nick";
const nick = () => (localStorage.getItem(NICK_KEY) || "").trim();
const ns = (k: string) => `cook_${nick().toLowerCase()}_${k}`;

// ---------- Типи ----------
export type Product = {
  id: string;
  name: string;
  icon: string;
  price: number;
};

export type Recipe = {
  id: string;
  name: string;
  icon?: string;
  grid: (string | null)[]; // довжина 9
  cookTimeMs: number;
  reward: number;
};

export type InventoryItem = { productId: string; qty: number };

// ---------- Кеш у пам'яті ----------
let _products: Product[] = [];
let _recipes: Recipe[] = [];
let _loaded = false;

function emitData() { window.dispatchEvent(new Event("cook:data")); }

// ---------- Продукти/рецепти: завантаження з БД ----------
type ProductRow = { id: string; name: string; icon: string; price: number; sort_order?: number };
type RecipeRow = {
  id: string; name: string; icon: string | null;
  grid: (string | null)[]; cook_time_ms: number; reward: number; sort_order?: number;
};

export async function fetchCookData(): Promise<{ products: Product[]; recipes: Recipe[] }> {
  // Публічний select — кожен може читати каталог
  const [p, r] = await Promise.all([
    fetch("/api/db-public", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: "cook_products", order: { col: "sort_order", dir: "asc" } }),
    }).then(x => x.json()).catch(() => ({ data: [] })),
    fetch("/api/db-public", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: "cook_recipes", order: { col: "sort_order", dir: "asc" } }),
    }).then(x => x.json()).catch(() => ({ data: [] })),
  ]);

  _products = ((p?.data as ProductRow[]) || []).map(x => ({
    id: x.id, name: x.name, icon: x.icon, price: x.price,
  }));
  _recipes = ((r?.data as RecipeRow[]) || []).map(x => ({
    id: x.id, name: x.name, icon: x.icon || "🍽",
    grid: Array.isArray(x.grid) ? x.grid : [],
    cookTimeMs: x.cook_time_ms, reward: x.reward,
  }));
  _loaded = true;
  emitData();
  return { products: _products, recipes: _recipes };
}

export function getProducts(): Product[] { return _products; }
export function getRecipes(): Recipe[] { return _recipes; }
export function isLoaded(): boolean { return _loaded; }

// ---------- CRUD для адмінки ----------
export async function adminUpsertProduct(p: Product, sort = 0): Promise<boolean> {
  const { error } = await dbUpsert("cook_products", {
    id: p.id, name: p.name, icon: p.icon, price: p.price, sort_order: sort,
  }, { onConflict: "id" });
  if (!error) { await fetchCookData(); return true; }
  console.error("upsert product", error);
  return false;
}

export async function adminDeleteProduct(id: string): Promise<boolean> {
  const { error } = await dbDelete("cook_products", { id: eq(id) });
  if (!error) { await fetchCookData(); return true; }
  return false;
}

export async function adminUpsertRecipe(r: Recipe, sort = 0): Promise<boolean> {
  const { error } = await dbUpsert("cook_recipes", {
    id: r.id, name: r.name, icon: r.icon || "🍽",
    grid: r.grid, cook_time_ms: r.cookTimeMs, reward: r.reward, sort_order: sort,
  }, { onConflict: "id" });
  if (!error) { await fetchCookData(); return true; }
  console.error("upsert recipe", error);
  return false;
}

export async function adminDeleteRecipe(id: string): Promise<boolean> {
  const { error } = await dbDelete("cook_recipes", { id: eq(id) });
  if (!error) { await fetchCookData(); return true; }
  return false;
}

// ---------- Інвентар гравця (локально) ----------
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

// ---------- Гроші: users.balance (CR) ----------
export async function fetchBalance(): Promise<number> {
  const n = nick();
  if (!n) return 0;
  const { data } = await dbSelect<{ balance: number }>("users", {
    columns: "balance",
    filters: [{ col: "username", op: "ilike", value: n }],
    single: true,
  });
  return (data?.balance as number) || 0;
}

async function balanceCall(body: Record<string, unknown>) {
  const password = localStorage.getItem("crp_password") || sessionStorage.getItem("crp_password");
  const n = nick();
  if (!n || !password) return { error: "Not logged in" } as { error: string };
  const res = await fetch("/api/balance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nick: n, password, ...body }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { error: json?.error || "Server error" } as { error: string };
  return (json.data || {}) as { balance?: number; spent?: number; delta?: number };
}

/** Купити продукт. Списує гроші з users.balance, додає в інвентар при успіху. */
export async function buyProduct(p: Product, qty: number): Promise<{ ok: boolean; balance?: number; error?: string }> {
  const r = await balanceCall({ op: "cook_spend", product_id: p.id, qty });
  if ("error" in r && r.error) return { ok: false, error: r.error };
  addToInventory(p.id, qty);
  window.dispatchEvent(new Event("cook:money"));
  return { ok: true, balance: r.balance };
}

/** Винагорода за приготування — додається до users.balance на сервері. */
export async function earnRecipe(recipeId: string): Promise<{ ok: boolean; balance?: number; delta?: number; error?: string }> {
  const r = await balanceCall({ op: "cook_earn", recipe_id: recipeId });
  if ("error" in r && r.error) return { ok: false, error: r.error };
  window.dispatchEvent(new Event("cook:money"));
  return { ok: true, balance: r.balance, delta: r.delta };
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

// ---------- Підбір рецепта ----------
export function matchRecipe(grid: (string | null)[]): Recipe | null {
  for (const r of _recipes) {
    if (r.grid.length !== 9) continue;
    let ok = true;
    for (let i = 0; i < 9; i++) {
      if ((r.grid[i] || null) !== (grid[i] || null)) { ok = false; break; }
    }
    if (ok) return r;
  }
  return null;
}
