// =====================================================================
// CookWork.tsx — сторінка «Робота» для фракції Кухар (/cook-work)
// Дизайн: тёмна мармурова столешниця + Liquid Glass панелі/кнопки з блюром.
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

// Фотореалістична тёмна мармурова столешниця (Unsplash, безкоштовно)
const MARBLE_URL =
  "https://images.unsplash.com/photo-1615874959474-d609969a20ed?auto=format&fit=crop&w=1600&q=80";

// Базовий liquid-glass стиль для будь-якого блоку
const glass: React.CSSProperties = {
  background:
    "linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 60%, rgba(255,255,255,0.08) 100%)",
  border: "1px solid rgba(255,255,255,0.18)",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.25), 0 10px 30px rgba(0,0,0,0.45)",
  backdropFilter: "blur(22px) saturate(160%)",
  WebkitBackdropFilter: "blur(22px) saturate(160%)" as unknown as string,
};

const glassStrong: React.CSSProperties = {
  ...glass,
  background:
    "linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.05) 55%, rgba(255,255,255,0.10) 100%)",
};

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
    return (
      <div className="min-h-screen flex items-center justify-center text-white/70"
        style={{ background: "#0a0a0a" }}>Завантаження…</div>
    );
  }
  if (!allowed) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center text-center px-6"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,.6), rgba(0,0,0,.75)), url(${MARBLE_URL})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="text-white/90 text-lg mb-3">Доступ лише для фракції «Кухар»</div>
        <button className="px-5 py-2 rounded-2xl text-white" style={glass} onClick={() => nav("/")}>
          На головну
        </button>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen pb-24 relative"
      style={{
        backgroundImage: `
          linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.35) 40%, rgba(0,0,0,0.65) 100%),
          url(${MARBLE_URL})
        `,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Анімації */}
      <style>{`
        @keyframes cook-fade-in { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes cook-pop     { 0% { transform: scale(.6); opacity: 0 } 60% { transform: scale(1.18); opacity: 1 } 100% { transform: scale(1) } }
        @keyframes cook-shimmer { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }
        @keyframes cook-steam   { 0% { transform: translate(-50%, 10px) scale(.6); opacity: 0 }
                                  20% { opacity: .6 }
                                  100% { transform: translate(calc(-50% + 12px), -60px) scale(1.4); opacity: 0 } }
        @keyframes cook-glow    { 0%,100% { box-shadow: 0 0 0 0 hsl(84 81% 44% / 0) } 50% { box-shadow: 0 0 28px 4px hsl(84 81% 44% / .55) } }
        @keyframes cook-float   { 0% { transform: translateY(0); opacity: 0 } 20% { opacity: 1 } 100% { transform: translateY(-46px); opacity: 0 } }

        .cook-fade-in   { animation: cook-fade-in .45s ease forwards; }
        .cook-cell-pop  { animation: cook-pop .35s cubic-bezier(.2,1.2,.4,1) both; }
        .cook-active    { animation: cook-glow 1.5s ease-in-out infinite; border-color: hsl(84 81% 65% / .8) !important; }
        .cook-cta-ready { background: linear-gradient(90deg, hsl(84 81% 50%), hsl(84 81% 70%), hsl(84 81% 50%)) !important;
                          background-size: 200% 100% !important;
                          animation: cook-shimmer 2.2s linear infinite, cook-glow 2.2s ease-in-out infinite; }
        .cook-steam     { position: absolute; left: 50%; bottom: 100%;
                          width: 16px; height: 16px; border-radius: 50%;
                          background: radial-gradient(circle, rgba(255,255,255,.55), rgba(255,255,255,0));
                          filter: blur(3px); animation: cook-steam 2.4s ease-out infinite; }
        .cook-float     { position: absolute; top: 0; left: 50%; transform: translateX(-50%);
                          font-weight: 700; font-size: 14px; pointer-events: none;
                          animation: cook-float 1.2s ease-out forwards; }
        .cook-stagger > * { opacity: 0; animation: cook-fade-in .45s ease forwards; }
        .cook-stagger > *:nth-child(1) { animation-delay: .05s }
        .cook-stagger > *:nth-child(2) { animation-delay: .12s }
        .cook-stagger > *:nth-child(3) { animation-delay: .2s }
        .cook-stagger > *:nth-child(n+4) { animation-delay: .28s }
      `}</style>

      {/* Шапка (liquid glass) */}
      <div className="sticky top-0 z-30 px-4 py-3 flex items-center justify-between cook-fade-in"
        style={{ ...glass, borderRadius: 0, borderLeft: "none", borderRight: "none", borderTop: "none" }}>
        <button onClick={() => nav(-1)}
          className="p-2 rounded-xl transition active:scale-90"
          style={glass}>
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="text-white font-bold tracking-[0.3em] text-sm drop-shadow">КУХНЯ</div>
        <div className="relative flex items-center gap-1 text-[hsl(84_81%_75%)] text-sm font-semibold px-3 py-1.5 rounded-xl"
             style={glass}>
          <Sparkles className="w-4 h-4" /> {money.toLocaleString()}
          <span className="text-white/50 text-[10px] ml-0.5">CR</span>
          {floaters.map(f => (
            <span key={f.id} className="cook-float"
              style={{ color: f.type === "earn" ? "hsl(84 81% 75%)" : "hsl(0 80% 75%)" }}>
              {f.text}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-[72px_1fr_72px] gap-3 px-3 mt-4 cook-stagger">
        {/* Ліва панель: Рецепти */}
        <button onClick={() => setRecipesOpen(true)}
          className="h-24 rounded-2xl flex flex-col items-center justify-center gap-1 text-white/90 hover:text-white transition active:scale-95"
          style={glass}>
          <BookOpen className="w-5 h-5" />
          <span className="text-[10px] leading-none tracking-wide">Рецепти</span>
        </button>

        {/* Центр */}
        <div>
          {/* Назва блюда (glass panel) */}
          <div className="rounded-2xl px-4 py-3 mb-3 relative overflow-hidden transition-all"
            style={{
              ...glassStrong,
              boxShadow: matched
                ? `${glassStrong.boxShadow}, 0 0 30px hsl(84 81% 50% / 0.35)`
                : glassStrong.boxShadow,
            }}>
            <div className="text-[10px] uppercase tracking-[0.25em] text-white/60">Блюдо</div>
            <div className="text-white font-bold text-lg mt-0.5 flex items-center gap-2">
              {matched ? (
                <>
                  <CookIcon value={matched.icon} size={24} className="text-2xl" />
                  <span>{matched.name}</span>
                </>
              ) : (
                <span className="text-white/45 font-normal italic">Заповніть сітку…</span>
              )}
            </div>
            {!matched && grid.some(Boolean) && (
              <div className="mt-2 flex flex-wrap gap-1">
                {Object.entries(
                  grid.reduce<Record<string, number>>((a, pid) => {
                    if (pid) a[pid] = (a[pid] || 0) + 1;
                    return a;
                  }, {})
                ).map(([pid, q]) => {
                  const p = productMap.get(pid);
                  return (
                    <div key={pid} className="flex items-center gap-1 text-xs text-white/85 px-2 py-1 rounded-lg"
                      style={glass}>
                      <CookIcon value={p?.icon} size={16} fallback={<span>•</span>} className="text-base" />
                      <span>x{q}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Сітка 3x3 (glass) */}
          <div className="mx-auto rounded-3xl p-3 relative" style={glassStrong}>
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
                      ...glass,
                      transform: isActive ? "translateY(-2px)" : undefined,
                    }}>
                    {p ? (
                      <span className={lastFilledCell === i ? "cook-cell-pop" : ""}>
                        <CookIcon value={p.icon} size={40} className="text-3xl" />
                      </span>
                    ) : (
                      <span className="text-white/30 text-xl">+</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Кнопки */}
          <div className="flex gap-2 mt-3">
            <button onClick={clearAll}
              className="flex-1 py-3 rounded-2xl text-white/85 text-sm font-medium transition active:scale-95"
              style={glass}>
              Очистити
            </button>
            <button onClick={onCookClick} disabled={!matched}
              className={`flex-[2] py-3 rounded-2xl font-bold text-black disabled:opacity-50 disabled:cursor-not-allowed transition active:scale-95 ${matched ? "cook-cta-ready" : ""}`}
              style={!matched
                ? { ...glass, color: "rgba(255,255,255,0.9)" }
                : undefined
              }>
              Приготувати
            </button>
          </div>

          <div className="text-center text-[11px] text-white/55 mt-3">
            Підберіть правильну комбінацію інгредієнтів!
          </div>
        </div>

        {/* Права панель: Магазин */}
        <button onClick={() => setShopOpen(true)}
          className="h-24 rounded-2xl flex flex-col items-center justify-center gap-1 text-white/90 hover:text-white transition active:scale-95"
          style={glass}>
          <ShoppingBag className="w-5 h-5" />
          <span className="text-[10px] leading-none tracking-wide">Магазин</span>
        </button>
      </div>

      {/* Інвентар */}
      <div className="px-3 mt-4 cook-fade-in" style={{ animationDelay: ".35s" }}>
        <div className="text-white/65 text-xs mb-2 px-1 tracking-wide">Інвентар</div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {inv.length === 0 && <div className="text-white/40 text-sm px-1">Порожньо — купіть продукти</div>}
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
                  ...glass,
                  transform: ready ? "translateY(-2px)" : undefined,
                }}>
                <div className="flex items-center justify-center h-7"><CookIcon value={p.icon} size={28} className="text-2xl" /></div>
                <div className="text-[10px] text-white/80 mt-1">x{avail}</div>
              </button>
            );
          })}
        </div>
        {activeCell !== null && (
          <div className="text-center text-[11px] text-white/65 mt-1 cook-fade-in">
            Тапніть інгредієнт, щоб помістити у клітинку #{activeCell + 1}
          </div>
        )}
      </div>

      {/* Модалки */}
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

      {recipesOpen && (
        <RecipesModal
          recipes={recipes}
          productMap={productMap}
          onClose={() => setRecipesOpen(false)}
        />
      )}

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

// ===================== Модалки (liquid glass) =====================

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
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" as any }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 max-h-[85vh] overflow-y-auto cook-cell-pop"
        style={glassStrong}>
        <div className="flex items-center justify-between mb-4">
          <div className="text-white font-bold tracking-wide">МАГАЗИН ПРОДУКТІВ</div>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={glass}>
            <X className="w-4 h-4 text-white/80" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {products.length === 0 && (
            <div className="col-span-3 text-center text-white/55 py-8 text-sm">
              Адміни ще не додали продукти
            </div>
          )}
          {products.map(p => (
            <button key={p.id} onClick={() => { setSelected(p); setQty(1); setErr(""); }}
              className="rounded-xl p-2 flex flex-col items-center transition-all active:scale-95 hover:-translate-y-0.5"
              style={selected?.id === p.id
                ? { ...glassStrong, borderColor: "hsl(84 81% 60% / 0.7)" }
                : glass}>
              <div className="flex items-center justify-center h-9">
                <CookIcon value={p.icon} size={36} className="text-3xl" />
              </div>
              <div className="text-[11px] text-white mt-1 truncate w-full text-center">{p.name}</div>
              <div className="text-[10px] text-[hsl(84_81%_75%)]">{p.price} CR</div>
            </button>
          ))}
        </div>

        {selected && (
          <div className="rounded-2xl p-3" style={glass}>
            <div className="flex items-center gap-3">
              <CookIcon value={selected.icon} size={40} className="text-4xl" />
              <div className="flex-1">
                <div className="text-white font-semibold">{selected.name}</div>
                <div className="text-[hsl(84_81%_75%)] text-xs">{selected.price} CR / шт</div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setQty(q => Math.max(1, q - 1))}
                  className="w-8 h-8 rounded-lg flex items-center justify-center" style={glass}>
                  <Minus className="w-4 h-4 text-white" />
                </button>
                <div className="w-10 text-center text-white font-semibold">{qty}</div>
                <button onClick={() => setQty(q => q + 1)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center" style={glass}>
                  <Plus className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3 text-sm">
              <div className="text-white/70">Сума</div>
              <div className={total > money ? "text-red-400 font-bold" : "text-white font-bold"}>
                {total.toLocaleString()} CR
              </div>
            </div>
            {err && <div className="text-red-400 text-xs mt-2">{err}</div>}
            <button
              disabled={busy || total > money}
              onClick={async () => {
                setBusy(true); setErr("");
                const ok = await onBuy(selected, qty);
                setBusy(false);
                if (!ok) setErr("Не вдалося купити");
                else { setSelected(null); setQty(1); }
              }}
              className="w-full mt-3 py-2.5 rounded-xl font-bold text-black disabled:opacity-50 transition active:scale-95"
              style={{
                background: "linear-gradient(90deg, hsl(84 81% 50%), hsl(84 81% 70%))",
              }}>
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
  recipes: Recipe[];
  productMap: Map<string, Product>;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center cook-fade-in"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" as any }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 max-h-[85vh] overflow-y-auto cook-cell-pop"
        style={glassStrong}>
        <div className="flex items-center justify-between mb-4">
          <div className="text-white font-bold tracking-wide">РЕЦЕПТИ</div>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={glass}>
            <X className="w-4 h-4 text-white/80" />
          </button>
        </div>

        {recipes.length === 0 && (
          <div className="text-center text-white/55 py-8 text-sm">
            Адміни ще не додали рецепти
          </div>
        )}

        <div className="space-y-3">
          {recipes.map(r => (
            <div key={r.id} className="rounded-2xl p-3" style={glass}>
              <div className="flex items-center gap-3 mb-2">
                <CookIcon value={r.icon} size={36} className="text-3xl" />
                <div className="flex-1">
                  <div className="text-white font-semibold">{r.name}</div>
                  <div className="text-[11px] text-white/60">
                    +{r.reward} CR • {(r.cookTimeMs / 1000).toFixed(0)} сек
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1 w-32">
                {r.grid.map((pid, i) => {
                  const p = pid ? productMap.get(pid) : null;
                  return (
                    <div key={i}
                      className="aspect-square rounded-md flex items-center justify-center text-lg"
                      style={glass}>
                      {p ? <CookIcon value={p.icon} size={22} className="text-xl" /> : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
