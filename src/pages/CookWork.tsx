// =====================================================================
// CookWork.tsx — сторінка «Робота» для фракції Кухар (/cook-work)
// Анімації появи, плавне підсвічування активної клітинки, парилка над сіткою.
// Валюта — CR з users.balance.
// =====================================================================
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShoppingBag, BookOpen, X, Plus, Minus, Sparkles } from "lucide-react";
import {
  Product, Recipe,
  fetchCookData, getProducts, getRecipes,
  getInventory, addToInventory, removeFromInventory,
  fetchBalance, buyProduct, earnRecipe,
  matchRecipe, isCook,
} from "../lib/cookStore";
import CookingModal from "../components/CookingModal";
import CookIcon from "../components/CookIcon";

export default function CookWork() {
  const nav = useNavigate();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [recipes, setRecipes]   = useState<Recipe[]>([]);
  const [inv, setInv]           = useState(getInventory());
  const [money, setMoney]       = useState(0);

  const [grid, setGrid] = useState<(string | null)[]>(Array(9).fill(null));
  const [activeCell, setActiveCell] = useState<number | null>(null);
  const [lastFilledCell, setLastFilledCell] = useState<number | null>(null);

  const [shopOpen, setShopOpen]       = useState(false);
  const [recipesOpen, setRecipesOpen] = useState(false);
  const [cooking, setCooking]         = useState<Recipe | null>(null);
  const [floaters, setFloaters]       = useState<{ id: number; text: string; type: "earn" | "spend" }[]>([]);
  const floaterId = useRef(0);

  useEffect(() => { isCook().then(setAllowed); }, []);

  useEffect(() => {
    (async () => {
      const { products: ps, recipes: rs } = await fetchCookData();
      setProducts(ps); setRecipes(rs);
      setMoney(await fetchBalance());
    })();
    const reload = () => { setProducts(getProducts()); setRecipes(getRecipes()); };
    const reloadInv = () => setInv(getInventory());
    const reloadMoney = async () => setMoney(await fetchBalance());
    window.addEventListener("cook:data", reload);
    window.addEventListener("cook:inv", reloadInv);
    window.addEventListener("cook:money", reloadMoney);
    return () => {
      window.removeEventListener("cook:data", reload);
      window.removeEventListener("cook:inv", reloadInv);
      window.removeEventListener("cook:money", reloadMoney);
    };
  }, []);

  const productMap = useMemo(() => {
    const m = new Map<string, Product>();
    products.forEach(p => m.set(p.id, p));
    return m;
  }, [products]);

  const matched = useMemo(() => matchRecipe(grid), [grid, recipes]);

  const usedCount = (pid: string) => grid.filter(g => g === pid).length;
  const availableQty = (pid: string) => {
    const it = inv.find(i => i.productId === pid);
    return (it?.qty || 0) - usedCount(pid);
  };

  const spawnFloater = (text: string, type: "earn" | "spend") => {
    const id = ++floaterId.current;
    setFloaters(f => [...f, { id, text, type }]);
    setTimeout(() => setFloaters(f => f.filter(x => x.id !== id)), 1200);
  };

  const placeInCell = (cellIdx: number, productId: string) => {
    if (availableQty(productId) <= 0) return;
    const next = [...grid];
    next[cellIdx] = productId;
    setGrid(next);
    setActiveCell(null);
    setLastFilledCell(cellIdx);
    setTimeout(() => setLastFilledCell(c => c === cellIdx ? null : c), 450);
  };
  const clearCell = (idx: number) => {
    const next = [...grid]; next[idx] = null; setGrid(next);
  };
  const clearAll = () => setGrid(Array(9).fill(null));

  const onCookClick = async () => {
    if (!matched) return;
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
    <div className="min-h-screen pb-24 relative overflow-hidden" style={{
      background: "radial-gradient(ellipse at 50% 0%, hsl(84 81% 44% / 0.08) 0%, #0a0a0a 60%)",
    }}>
      {/* Локальні стилі/анімації, щоб не чіпати глобальний index.css */}
      <style>{`
        @keyframes cook-fade-in { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes cook-pop     { 0% { transform: scale(.6); opacity: 0 } 60% { transform: scale(1.18); opacity: 1 } 100% { transform: scale(1) } }
        @keyframes cook-shimmer { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }
        @keyframes cook-steam   { 0% { transform: translate(-50%, 10px) scale(.6); opacity: 0 }
                                  20% { opacity: .6 }
                                  100% { transform: translate(calc(-50% + 12px), -60px) scale(1.4); opacity: 0 } }
        @keyframes cook-spark   { 0% { transform: scale(0) rotate(0deg); opacity: 0 } 50% { opacity: 1 } 100% { transform: scale(1.6) rotate(180deg); opacity: 0 } }
        @keyframes cook-glow    { 0%,100% { box-shadow: 0 0 0 0 hsl(84 81% 44% / 0) } 50% { box-shadow: 0 0 28px 4px hsl(84 81% 44% / .55) } }
        @keyframes cook-float   { 0% { transform: translateY(0); opacity: 0 } 20% { opacity: 1 } 100% { transform: translateY(-46px); opacity: 0 } }

        .cook-fade-in   { animation: cook-fade-in .45s ease forwards; }
        .cook-cell-pop  { animation: cook-pop .35s cubic-bezier(.2,1.2,.4,1) both; }
        .cook-active    { animation: cook-glow 1.5s ease-in-out infinite; border-color: hsl(84 81% 44% / .65) !important; }
        .cook-cta-ready { background: linear-gradient(90deg, hsl(84 81% 44%), hsl(84 81% 65%), hsl(84 81% 44%));
                          background-size: 200% 100%;
                          animation: cook-shimmer 2.2s linear infinite, cook-glow 2.2s ease-in-out infinite; }
        .cook-steam     { position: absolute; left: 50%; bottom: 100%;
                          width: 16px; height: 16px; border-radius: 50%;
                          background: radial-gradient(circle, rgba(255,255,255,.45), rgba(255,255,255,0));
                          filter: blur(3px); animation: cook-steam 2.4s ease-out infinite; }
        .cook-spark     { position: absolute; width: 6px; height: 6px; border-radius: 50%;
                          background: hsl(84 81% 65%); box-shadow: 0 0 12px hsl(84 81% 55%);
                          animation: cook-spark 1.2s ease-out forwards; }
        .cook-float     { position: absolute; top: 0; left: 50%; transform: translateX(-50%);
                          font-weight: 700; font-size: 14px; pointer-events: none;
                          animation: cook-float 1.2s ease-out forwards; }
        .cook-stagger > * { opacity: 0; animation: cook-fade-in .45s ease forwards; }
        .cook-stagger > *:nth-child(1) { animation-delay: .05s }
        .cook-stagger > *:nth-child(2) { animation-delay: .12s }
        .cook-stagger > *:nth-child(3) { animation-delay: .2s }
        .cook-stagger > *:nth-child(n+4) { animation-delay: .28s }
      `}</style>

      {/* Шапка */}
      <div className="sticky top-0 z-30 px-4 py-3 flex items-center justify-between cook-fade-in"
        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(14px)", borderBottom: "1px solid hsl(0 0% 100% / 0.06)" }}>
        <button onClick={() => nav(-1)} className="p-2 rounded-lg hover:bg-white/5 transition active:scale-90">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="text-white font-bold tracking-[0.25em] text-sm">КУХНЯ</div>
        <div className="relative flex items-center gap-1 text-[hsl(84_81%_65%)] text-sm font-semibold px-2.5 py-1 rounded-lg"
             style={{ background: "hsl(84 81% 44% / 0.08)", border: "1px solid hsl(84 81% 44% / 0.25)" }}>
          <Sparkles className="w-4 h-4" /> {money.toLocaleString()} <span className="text-white/40 text-[10px] ml-0.5">CR</span>
          {floaters.map(f => (
            <span key={f.id} className="cook-float"
              style={{ color: f.type === "earn" ? "hsl(84 81% 65%)" : "hsl(0 80% 65%)" }}>
              {f.text}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-[64px_1fr_64px] gap-2 px-3 mt-3 cook-stagger">
        {/* Ліва панель: Рецепти */}
        <button onClick={() => setRecipesOpen(true)}
          className="h-24 rounded-2xl flex flex-col items-center justify-center gap-1 text-white/80 hover:text-white transition active:scale-95"
          style={{ background: "linear-gradient(160deg, #1a1a1a, #0e0e0e)", border: "1px solid hsl(0 0% 100% / 0.06)" }}>
          <BookOpen className="w-5 h-5" />
          <span className="text-[10px] leading-none">Рецепти</span>
        </button>

        {/* Центр: панель блюда + сітка 3x3 */}
        <div>
          {/* Назва блюда */}
          <div className="rounded-2xl px-4 py-3 mb-3 relative overflow-hidden transition-all"
            style={{
              background: matched
                ? "linear-gradient(160deg, hsl(84 81% 16% / .6), #111)"
                : "linear-gradient(160deg, #1d1d1d, #111)",
              border: matched ? "1px solid hsl(84 81% 44% / .45)" : "1px solid hsl(0 0% 100% / 0.08)",
              boxShadow: matched ? "0 8px 28px hsl(84 81% 44% / .25)" : "0 8px 24px rgba(0,0,0,0.4)",
            }}>
            <div className="text-center text-white font-bold tracking-[0.2em] text-sm">
              {matched ? matched.name.toUpperCase() : "ОБЕРІТЬ КОМБІНАЦІЮ"}
            </div>
            {matched && (
              <div className="flex flex-wrap justify-center gap-2 mt-2 cook-fade-in">
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

          {/* Сітка 3x3 з парою над нею */}
          <div className="mx-auto rounded-3xl p-3 relative"
            style={{
              background: "linear-gradient(160deg, #1c1c1c, #0d0d0d)",
              border: "1px solid hsl(0 0% 100% / 0.08)",
              boxShadow: "inset 0 1px 0 hsl(0 0% 100% / 0.04), 0 20px 50px rgba(0,0,0,0.5)",
            }}>
            {matched && (
              <>
                <span className="cook-steam" style={{ left: "30%", animationDelay: "0s" }} />
                <span className="cook-steam" style={{ left: "50%", animationDelay: ".4s" }} />
                <span className="cook-steam" style={{ left: "70%", animationDelay: ".8s" }} />
              </>
            )}
            <div className="grid grid-cols-3 gap-2">
              {grid.map((pid, i) => {
                const p = pid ? productMap.get(pid) : null;
                const isActive = activeCell === i;
                return (
                  <button key={i}
                    onClick={() => pid ? clearCell(i) : setActiveCell(i)}
                    className={`relative aspect-square rounded-xl flex items-center justify-center text-3xl transition-all duration-200 active:scale-90 ${isActive ? "cook-active" : ""}`}
                    style={{
                      background: "linear-gradient(160deg, #2a2a2a, #1a1a1a)",
                      border: "1px solid hsl(0 0% 100% / 0.06)",
                      boxShadow: "inset 0 1px 0 hsl(0 0% 100% / 0.04)",
                      transform: isActive ? "translateY(-2px)" : undefined,
                    }}>
                    {p ? (
                      <span className={lastFilledCell === i ? "cook-cell-pop" : ""}>
                        <CookIcon value={p.icon} size={40} className="text-3xl" />
                      </span>
                    ) : (
                      <span className="text-white/15 text-xl">+</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Кнопки */}
          <div className="flex gap-2 mt-3">
            <button onClick={clearAll}
              className="flex-1 py-3 rounded-xl text-white/70 text-sm font-medium hover:bg-white/10 transition active:scale-95"
              style={{ background: "hsl(0 0% 100% / 0.05)", border: "1px solid hsl(0 0% 100% / 0.06)" }}>
              Очистити
            </button>
            <button onClick={onCookClick} disabled={!matched}
              className={`flex-[2] py-3 rounded-xl font-bold text-black disabled:opacity-40 disabled:cursor-not-allowed transition active:scale-95 ${matched ? "cook-cta-ready" : ""}`}
              style={!matched ? { background: "linear-gradient(90deg, hsl(84 81% 44%), hsl(84 81% 65%))" } : undefined}>
              Приготувати
            </button>
          </div>

          <div className="text-center text-[11px] text-white/40 mt-3">
            Підберіть правильну комбінацію інгредієнтів!
          </div>
        </div>

        {/* Права панель: Магазин */}
        <button onClick={() => setShopOpen(true)}
          className="h-24 rounded-2xl flex flex-col items-center justify-center gap-1 text-white/80 hover:text-white transition active:scale-95"
          style={{ background: "linear-gradient(160deg, #1a1a1a, #0e0e0e)", border: "1px solid hsl(0 0% 100% / 0.06)" }}>
          <ShoppingBag className="w-5 h-5" />
          <span className="text-[10px] leading-none">Магазин</span>
        </button>
      </div>

      {/* Інвентар знизу */}
      <div className="px-3 mt-4 cook-fade-in" style={{ animationDelay: ".35s" }}>
        <div className="text-white/50 text-xs mb-2 px-1">Інвентар</div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {inv.length === 0 && <div className="text-white/30 text-sm px-1">Порожньо — купіть продукти</div>}
          {inv.map(it => {
            const p = productMap.get(it.productId);
            if (!p) return null;
            const avail = availableQty(it.productId);
            const ready = activeCell !== null && avail > 0;
            return (
              <button key={it.productId}
                disabled={avail <= 0 || activeCell === null}
                onClick={() => activeCell !== null && placeInCell(activeCell, it.productId)}
                className={`shrink-0 w-16 h-20 rounded-xl flex flex-col items-center justify-center disabled:opacity-40 transition-all duration-200 active:scale-90 ${ready ? "cook-active" : ""}`}
                style={{
                  background: "linear-gradient(160deg, #1f1f1f, #121212)",
                  border: ready ? "1px solid hsl(84 81% 44% / 0.5)" : "1px solid hsl(0 0% 100% / 0.06)",
                  transform: ready ? "translateY(-2px)" : undefined,
                }}>
                <div className="flex items-center justify-center h-7"><CookIcon value={p.icon} size={28} className="text-2xl" /></div>
                <div className="text-[10px] text-white/60 mt-1">x{avail}</div>
              </button>
            );
          })}
        </div>
        {activeCell !== null && (
          <div className="text-center text-[11px] text-white/50 mt-1 cook-fade-in">
            Тапніть інгредієнт, щоб помістити у клітинку #{activeCell + 1}
          </div>
        )}
      </div>

      {/* ───── Модалка магазину ───── */}
      {shopOpen && (
        <ShopModal
          products={products}
          money={money}
          onClose={() => setShopOpen(false)}
          onBuy={async (p, q) => {
            const r = await buyProduct(p, q);
            if (r.ok) {
              spawnFloater(`−${(p.price * q).toLocaleString()} CR`, "spend");
              if (typeof r.balance === "number") setMoney(r.balance);
              return true;
            }
            return false;
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
          onResult={async (ok) => {
            if (ok) {
              const r = await earnRecipe(cooking.id);
              if (r.ok) {
                spawnFloater(`+${(r.delta ?? cooking.reward).toLocaleString()} CR`, "earn");
                if (typeof r.balance === "number") setMoney(r.balance);
              }
            }
          }}
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
  onBuy: (p: Product, qty: number) => Promise<boolean>;
}) {
  const [selected, setSelected] = useState<Product | null>(null);
  const [qty, setQty] = useState(1);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const total = selected ? selected.price * qty : 0;

  return (
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center cook-fade-in"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 max-h-[85vh] overflow-y-auto cook-cell-pop"
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
              className="rounded-xl p-2 flex flex-col items-center transition-all active:scale-95 hover:-translate-y-0.5"
              style={{
                background: selected?.id === p.id ? "hsl(84 81% 44% / 0.12)" : "hsl(0 0% 100% / 0.04)",
                border: selected?.id === p.id ? "1px solid hsl(84 81% 44% / 0.5)" : "1px solid hsl(0 0% 100% / 0.06)",
              }}>
              <div className="flex items-center justify-center h-9"><CookIcon value={p.icon} size={36} className="text-3xl" /></div>
              <div className="text-[11px] text-white mt-1 truncate w-full text-center">{p.name}</div>
              <div className="text-[10px] text-[hsl(84_81%_65%)] mt-0.5">{p.price} CR</div>
            </button>
          ))}
        </div>

        {selected && (
          <div className="rounded-2xl p-3 cook-fade-in"
            style={{ background: "hsl(0 0% 100% / 0.04)", border: "1px solid hsl(0 0% 100% / 0.06)" }}>
            <div className="text-white text-sm mb-2 flex items-center gap-2">
              <CookIcon value={selected.icon} size={28} className="text-2xl" />
              <span className="font-semibold">{selected.name}</span>
            </div>
            <div className="flex items-center justify-center gap-3 mb-3">
              <button onClick={() => setQty(Math.max(1, qty - 1))}
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white active:scale-90 transition">
                <Minus className="w-4 h-4" />
              </button>
              <div className="text-white text-xl font-bold w-10 text-center">{qty}</div>
              <button onClick={() => setQty(qty + 1)}
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white active:scale-90 transition">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="text-center text-white/70 text-xs mb-3">
              Разом: <b className="text-[hsl(84_81%_65%)]">{total.toLocaleString()} CR</b> · Баланс: {money.toLocaleString()} CR
            </div>
            {err && <div className="text-red-400 text-xs text-center mb-2">{err}</div>}
            <button
              disabled={busy}
              onClick={async () => {
                if (money < total) { setErr("Недостатньо коштів"); return; }
                setBusy(true); setErr("");
                const ok = await onBuy(selected, qty);
                setBusy(false);
                if (!ok) { setErr("Не вдалось купити"); return; }
                setSelected(null); setQty(1);
              }}
              className="w-full py-3 rounded-xl font-bold text-black transition active:scale-95 disabled:opacity-60"
              style={{ background: "linear-gradient(90deg, hsl(84 81% 44%), hsl(84 81% 65%))" }}>
              {busy ? "Купуємо…" : "Купити"}
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
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center cook-fade-in"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 max-h-[85vh] overflow-y-auto cook-cell-pop"
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
              <div key={r.id} className="rounded-2xl p-3 transition-all hover:-translate-y-0.5"
                style={{ background: "hsl(0 0% 100% / 0.04)", border: "1px solid hsl(0 0% 100% / 0.06)" }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-white font-bold flex items-center gap-2">
                    <CookIcon value={r.icon || "🍽"} size={24} className="text-xl" />
                    <span>{r.name}</span>
                  </div>
                  <div className="text-[hsl(84_81%_65%)] text-xs font-semibold">+{r.reward.toLocaleString()} CR</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(counts).map(([pid, q]) => {
                    const p = productMap.get(pid);
                    return (
                      <div key={pid} className="flex items-center gap-1 text-[11px] text-white/70 px-2 py-1 rounded-lg"
                        style={{ background: "hsl(0 0% 100% / 0.05)" }}>
                        <CookIcon value={p?.icon} size={14} fallback={<span>•</span>} className="text-sm" />
                        <span>{p?.name || "?"} ×{q}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="text-[10px] text-white/40 mt-2">⏱ {Math.round(r.cookTimeMs / 1000)}с приготування</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
