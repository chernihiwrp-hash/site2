// =====================================================================
// CookWork.tsx — сторінка «Робота» для фракції Кухар (/cook-work)
// =====================================================================
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShoppingBag, BookOpen, X, Plus, Minus, Coins } from "lucide-react";
import {
  Product, Recipe,
  getProducts, getRecipes, getInventory, setInventory,
  addToInventory, removeFromInventory,
  getMoney, addMoney, spendMoney,
  matchRecipe, isCook,
} from "../lib/cookStore";
import CookingModal from "../components/CookingModal";
import CookIcon from "../components/CookIcon";

export default function CookWork() {
  const nav = useNavigate();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [products, setProducts] = useState<Product[]>(getProducts());
  const [recipes, setRecipes]   = useState<Recipe[]>(getRecipes());
  const [inv, setInv]           = useState(getInventory());
  const [money, setMoney]       = useState(getMoney());

  const [grid, setGrid] = useState<(string | null)[]>(Array(9).fill(null));
  const [activeCell, setActiveCell] = useState<number | null>(null);

  const [shopOpen, setShopOpen]       = useState(false);
  const [recipesOpen, setRecipesOpen] = useState(false);
  const [cooking, setCooking]         = useState<Recipe | null>(null);

  useEffect(() => { isCook().then(setAllowed); }, []);
  useEffect(() => {
    const reload = () => {
      setProducts(getProducts());
      setRecipes(getRecipes());
      setInv(getInventory());
      setMoney(getMoney());
    };
    window.addEventListener("cook:data", reload);
    window.addEventListener("cook:inv", reload);
    window.addEventListener("cook:money", reload);
    return () => {
      window.removeEventListener("cook:data", reload);
      window.removeEventListener("cook:inv", reload);
      window.removeEventListener("cook:money", reload);
    };
  }, []);

  const productMap = useMemo(() => {
    const m = new Map<string, Product>();
    products.forEach(p => m.set(p.id, p));
    return m;
  }, [products]);

  const matched = useMemo(() => matchRecipe(grid), [grid, recipes]);

  // Підрахунок використаних у сітці
  const usedCount = (pid: string) => grid.filter(g => g === pid).length;
  const availableQty = (pid: string) => {
    const it = inv.find(i => i.productId === pid);
    return (it?.qty || 0) - usedCount(pid);
  };

  const placeInCell = (cellIdx: number, productId: string) => {
    if (availableQty(productId) <= 0) return;
    const next = [...grid];
    next[cellIdx] = productId;
    setGrid(next);
    setActiveCell(null);
  };
  const clearCell = (idx: number) => {
    const next = [...grid]; next[idx] = null; setGrid(next);
  };
  const clearAll = () => setGrid(Array(9).fill(null));

  const onCookClick = () => {
    if (!matched) return;
    // забираємо інгредієнти з інвентаря
    const counts: Record<string, number> = {};
    grid.forEach(g => { if (g) counts[g] = (counts[g] || 0) + 1; });
    for (const [pid, q] of Object.entries(counts)) {
      if (!removeFromInventory(pid, q)) return;
    }
    setCooking(matched);
    setGrid(Array(9).fill(null));
  };

  if (allowed === null) {
    return <div className="min-h-screen flex items-center justify-center text-white/60">Завантаження…</div>;
  }
  if (!allowed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
        <div className="text-white/80 text-lg mb-3">Доступ лише для фракції «Кухар»</div>
        <button className="px-4 py-2 rounded-xl bg-white/10 text-white" onClick={() => nav("/")}>На головну</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{
      background: "radial-gradient(ellipse at 50% 0%, hsl(84 81% 44% / 0.06) 0%, #0a0a0a 60%)",
    }}>
      {/* Шапка */}
      <div className="sticky top-0 z-30 px-4 py-3 flex items-center justify-between"
        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(14px)", borderBottom: "1px solid hsl(0 0% 100% / 0.06)" }}>
        <button onClick={() => nav(-1)} className="p-2 rounded-lg hover:bg-white/5">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="text-white font-bold tracking-wide">КУХНЯ</div>
        <div className="flex items-center gap-1 text-amber-300 text-sm font-semibold">
          <Coins className="w-4 h-4" /> {money}
        </div>
      </div>

      <div className="grid grid-cols-[64px_1fr_64px] gap-2 px-3 mt-3">
        {/* Ліва панель: Рецепти */}
        <button onClick={() => setRecipesOpen(true)}
          className="h-24 rounded-2xl flex flex-col items-center justify-center gap-1 text-white/80 hover:text-white"
          style={{ background: "linear-gradient(160deg, #1a1a1a, #0e0e0e)", border: "1px solid hsl(0 0% 100% / 0.06)" }}>
          <BookOpen className="w-5 h-5" />
          <span className="text-[10px] leading-none">Рецепти</span>
        </button>

        {/* Центр: панель блюда + сітка 3x3 */}
        <div>
          {/* Назва блюда + інгредієнти */}
          <div className="rounded-2xl px-4 py-3 mb-3"
            style={{
              background: "linear-gradient(160deg, #1d1d1d, #111)",
              border: "1px solid hsl(0 0% 100% / 0.08)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            }}>
            <div className="text-center text-white font-bold tracking-[0.2em] text-sm">
              {matched ? matched.name.toUpperCase() : "ОБЕРІТЬ КОМБІНАЦІЮ"}
            </div>
            {matched && (
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {Object.entries(
                  matched.grid.reduce<Record<string, number>>((a, pid) => {
                    if (pid) a[pid] = (a[pid] || 0) + 1;
                    return a;
                  }, {})
                ).map(([pid, q]) => {
                  const p = productMap.get(pid);
                  return (
                    <div key={pid} className="flex items-center gap-1 text-xs text-white/80 px-2 py-1 rounded-lg"
                      style={{ background: "hsl(0 0% 100% / 0.05)" }}>
                      <CookIcon value={p?.icon} size={16} fallback={<span>•</span>} className="text-base" />
                      <span>x{q}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Сітка 3x3 */}
          <div className="mx-auto rounded-3xl p-3"
            style={{
              background: "linear-gradient(160deg, #1c1c1c, #0d0d0d)",
              border: "1px solid hsl(0 0% 100% / 0.08)",
              boxShadow: "inset 0 1px 0 hsl(0 0% 100% / 0.04), 0 20px 50px rgba(0,0,0,0.5)",
            }}>
            <div className="grid grid-cols-3 gap-2">
              {grid.map((pid, i) => {
                const p = pid ? productMap.get(pid) : null;
                return (
                  <button key={i}
                    onClick={() => pid ? clearCell(i) : setActiveCell(i)}
                    className="aspect-square rounded-xl flex items-center justify-center text-3xl transition-all active:scale-95"
                    style={{
                      background: "linear-gradient(160deg, #2a2a2a, #1a1a1a)",
                      border: "1px solid hsl(0 0% 100% / 0.06)",
                      boxShadow: "inset 0 1px 0 hsl(0 0% 100% / 0.04)",
                    }}>
                    {p ? <CookIcon value={p.icon} size={40} className="text-3xl" /> : <span className="text-white/15 text-xl">+</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Кнопки */}
          <div className="flex gap-2 mt-3">
            <button onClick={clearAll}
              className="flex-1 py-3 rounded-xl text-white/70 text-sm font-medium"
              style={{ background: "hsl(0 0% 100% / 0.05)", border: "1px solid hsl(0 0% 100% / 0.06)" }}>
              Очистити
            </button>
            <button onClick={onCookClick} disabled={!matched}
              className="flex-[2] py-3 rounded-xl font-bold text-black disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "linear-gradient(90deg, hsl(84 81% 44%), hsl(84 81% 65%))", boxShadow: matched ? "0 8px 24px hsl(84 81% 44% / 0.4)" : "none" }}>
              Приготувати
            </button>
          </div>

          <div className="text-center text-[11px] text-white/40 mt-3">
            Підберіть правильну комбінацію інгредієнтів!
          </div>
        </div>

        {/* Права панель: Магазин */}
        <button onClick={() => setShopOpen(true)}
          className="h-24 rounded-2xl flex flex-col items-center justify-center gap-1 text-white/80 hover:text-white"
          style={{ background: "linear-gradient(160deg, #1a1a1a, #0e0e0e)", border: "1px solid hsl(0 0% 100% / 0.06)" }}>
          <ShoppingBag className="w-5 h-5" />
          <span className="text-[10px] leading-none">Магазин</span>
        </button>
      </div>

      {/* Інвентар знизу */}
      <div className="px-3 mt-4">
        <div className="text-white/50 text-xs mb-2 px-1">Інвентар</div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {inv.length === 0 && <div className="text-white/30 text-sm px-1">Порожньо — купіть продукти</div>}
          {inv.map(it => {
            const p = productMap.get(it.productId);
            if (!p) return null;
            const avail = availableQty(it.productId);
            return (
              <button key={it.productId}
                disabled={avail <= 0 || activeCell === null}
                onClick={() => activeCell !== null && placeInCell(activeCell, it.productId)}
                className="shrink-0 w-16 h-20 rounded-xl flex flex-col items-center justify-center disabled:opacity-40 transition-all active:scale-95"
                style={{
                  background: "linear-gradient(160deg, #1f1f1f, #121212)",
                  border: activeCell !== null && avail > 0 ? "1px solid hsl(84 81% 44% / 0.5)" : "1px solid hsl(0 0% 100% / 0.06)",
                }}>
                <div className="flex items-center justify-center h-7"><CookIcon value={p.icon} size={28} className="text-2xl" /></div>
                <div className="text-[10px] text-white/60 mt-1">x{avail}</div>
              </button>
            );
          })}
        </div>
        {activeCell !== null && (
          <div className="text-center text-[11px] text-white/50 mt-1">Тапніть інгредієнт, щоб помістити у клітинку #{activeCell + 1}</div>
        )}
      </div>

      {/* ───── Модалка магазину ───── */}
      {shopOpen && (
        <ShopModal
          products={products}
          money={money}
          onClose={() => setShopOpen(false)}
          onBuy={(p, q) => {
            const cost = p.price * q;
            if (!spendMoney(cost)) return false;
            addToInventory(p.id, q);
            return true;
          }}
        />
      )}

      {/* ───── Модалка рецептів ───── */}
      {recipesOpen && (
        <RecipesModal
          recipes={recipes}
          productMap={productMap}
          onClose={() => setRecipesOpen(false)}
        />
      )}

      {/* ───── Модалка приготування ───── */}
      {cooking && (
        <CookingModal
          dishName={cooking.name}
          dishIcon={cooking.icon}
          durationMs={cooking.cookTimeMs}
          reward={cooking.reward}
          onResult={(ok) => { if (ok) addMoney(cooking.reward); }}
          onClose={() => setCooking(null)}
        />
      )}
    </div>
  );
}

// ===================== Модалки =====================

function ShopModal({
  products, money, onClose, onBuy,
}: {
  products: Product[]; money: number;
  onClose: () => void;
  onBuy: (p: Product, qty: number) => boolean;
}) {
  const [selected, setSelected] = useState<Product | null>(null);
  const [qty, setQty] = useState(1);
  const [err, setErr] = useState("");

  const total = selected ? selected.price * qty : 0;

  return (
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 max-h-[85vh] overflow-y-auto"
        style={{
          background: "linear-gradient(160deg, #181818, #0c0c0c)",
          border: "1px solid hsl(0 0% 100% / 0.08)",
        }}>
        <div className="flex items-center justify-between mb-4">
          <div className="text-white font-bold tracking-wide">МАГАЗИН ПРОДУКТІВ</div>
          <button onClick={onClose}><X className="w-5 h-5 text-white/60" /></button>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {products.length === 0 && <div className="col-span-3 text-center text-white/40 py-8 text-sm">Адміни ще не додали продукти</div>}
          {products.map(p => (
            <button key={p.id} onClick={() => { setSelected(p); setQty(1); setErr(""); }}
              className="rounded-xl p-2 flex flex-col items-center"
              style={{
                background: selected?.id === p.id ? "hsl(84 81% 44% / 0.12)" : "hsl(0 0% 100% / 0.04)",
                border: selected?.id === p.id ? "1px solid hsl(84 81% 44% / 0.5)" : "1px solid hsl(0 0% 100% / 0.06)",
              }}>
              <div className="flex items-center justify-center h-9"><CookIcon value={p.icon} size={36} className="text-3xl" /></div>
              <div className="text-[11px] text-white mt-1 truncate w-full text-center">{p.name}</div>
              <div className="text-[10px] text-amber-300 mt-0.5">{p.price} ₴</div>
            </button>
          ))}
        </div>

        {selected && (
          <div className="rounded-2xl p-3"
            style={{ background: "hsl(0 0% 100% / 0.04)", border: "1px solid hsl(0 0% 100% / 0.06)" }}>
            <div className="text-white text-sm mb-2 flex items-center gap-2">
              <CookIcon value={selected.icon} size={28} className="text-2xl" />
              <span className="font-semibold">{selected.name}</span>
            </div>
            <div className="flex items-center justify-center gap-3 mb-3">
              <button onClick={() => setQty(Math.max(1, qty - 1))}
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white">
                <Minus className="w-4 h-4" />
              </button>
              <div className="text-white text-xl font-bold w-10 text-center">{qty}</div>
              <button onClick={() => setQty(qty + 1)}
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="text-center text-white/70 text-xs mb-3">Разом: <b className="text-amber-300">{total} ₴</b> · Баланс: {money} ₴</div>
            {err && <div className="text-red-400 text-xs text-center mb-2">{err}</div>}
            <button
              onClick={() => {
                if (money < total) { setErr("Недостатньо коштів"); return; }
                const ok = onBuy(selected, qty);
                if (!ok) { setErr("Не вдалось купити"); return; }
                setSelected(null); setQty(1);
              }}
              className="w-full py-3 rounded-xl font-bold text-black"
              style={{ background: "linear-gradient(90deg, hsl(84 81% 44%), hsl(84 81% 65%))" }}>
              Купити
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function RecipesModal({
  recipes, productMap, onClose,
}: {
  recipes: Recipe[]; productMap: Map<string, Product>;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 max-h-[85vh] overflow-y-auto"
        style={{
          background: "linear-gradient(160deg, #181818, #0c0c0c)",
          border: "1px solid hsl(0 0% 100% / 0.08)",
        }}>
        <div className="flex items-center justify-between mb-4">
          <div className="text-white font-bold tracking-wide">РЕЦЕПТИ</div>
          <button onClick={onClose}><X className="w-5 h-5 text-white/60" /></button>
        </div>
        <div className="space-y-3">
          {recipes.length === 0 && <div className="text-center text-white/40 py-8 text-sm">Поки немає рецептів</div>}
          {recipes.map(r => {
            const counts: Record<string, number> = {};
            r.grid.forEach(g => { if (g) counts[g] = (counts[g] || 0) + 1; });
            return (
              <div key={r.id} className="rounded-2xl p-3"
                style={{ background: "hsl(0 0% 100% / 0.04)", border: "1px solid hsl(0 0% 100% / 0.06)" }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-white font-bold flex items-center gap-2">
                    {r.icon && <CookIcon value={r.icon} size={22} className="text-xl" />}
                    {r.name}
                  </div>
                  <div className="text-amber-300 text-sm font-semibold">+{r.reward} ₴</div>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {Object.entries(counts).map(([pid, q]) => {
                    const p = productMap.get(pid);
                    return (
                      <span key={pid} className="text-xs text-white/80 px-2 py-1 rounded-lg flex items-center gap-1"
                        style={{ background: "hsl(0 0% 100% / 0.06)" }}>
                        <CookIcon value={p?.icon} size={16} fallback={<span>•</span>} className="text-base" />
                        <span>{p?.name || pid}</span>
                        <span className="text-white/50">x{q}</span>
                      </span>
                    );
                  })}
                </div>
                <div className="text-[11px] text-white/40">⏱ {Math.round(r.cookTimeMs / 1000)} сек</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
