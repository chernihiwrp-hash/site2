// =====================================================================
// CookWork.tsx — сторінка «Робота» для фракції Кухар (/cook-work)
// Liquid Glass / Glassmorphism редизайн з плавними анімаціями.
// =====================================================================
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShoppingBag, BookOpen, X, Plus, Minus, Coins, Sparkles, ChefHat } from "lucide-react";
import {
  Product, Recipe,
  getProducts, getRecipes, getInventory, setInventory,
  addToInventory, removeFromInventory,
  getMoney, addMoney, spendMoney,
  matchRecipe, isCook,
} from "../lib/cookStore";
import CookingModal from "../components/CookingModal";

/* ───── Локальні стилі (glassmorphism + анімації) ───── */
const GlassStyles = () => (
  <style>{`
    @keyframes cookFadeUp {
      from { opacity: 0; transform: translateY(14px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes cookFloat {
      0%, 100% { transform: translateY(0); }
      50%      { transform: translateY(-4px); }
    }
    @keyframes cookPulseGlow {
      0%, 100% { box-shadow: 0 0 0 0 hsl(84 81% 55% / 0.45), 0 10px 30px hsl(84 81% 44% / 0.35); }
      50%      { box-shadow: 0 0 0 10px hsl(84 81% 55% / 0), 0 14px 38px hsl(84 81% 44% / 0.55); }
    }
    @keyframes cookSlideUp {
      from { opacity: 0; transform: translateY(40px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0)    scale(1); }
    }
    @keyframes cookBgShift {
      0%, 100% { background-position: 0% 50%; }
      50%      { background-position: 100% 50%; }
    }
    @keyframes cookCellPop {
      0%   { transform: scale(0.6); opacity: 0; }
      60%  { transform: scale(1.15); opacity: 1; }
      100% { transform: scale(1); }
    }
    @keyframes cookShimmer {
      0%   { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
    .cook-bg {
      background:
        radial-gradient(900px 500px at 20% -10%, hsl(84 81% 50% / 0.18), transparent 60%),
        radial-gradient(700px 400px at 90% 10%, hsl(180 80% 50% / 0.10), transparent 60%),
        radial-gradient(600px 500px at 50% 100%, hsl(280 80% 55% / 0.12), transparent 60%),
        linear-gradient(180deg, #07070a 0%, #0a0a10 100%);
      background-size: 200% 200%;
      animation: cookBgShift 18s ease-in-out infinite;
    }
    .glass {
      background: linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02));
      backdrop-filter: blur(22px) saturate(160%);
      border: 1px solid rgba(255,255,255,0.12);
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.10),
        inset 0 -1px 0 rgba(0,0,0,0.25),
        0 12px 36px rgba(0,0,0,0.45);
    }
    .glass-soft {
      background: linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.015));
      backdrop-filter: blur(16px) saturate(150%);
      border: 1px solid rgba(255,255,255,0.08);
    }
    .glass-strong {
      background: linear-gradient(160deg, rgba(255,255,255,0.10), rgba(255,255,255,0.03));
      backdrop-filter: blur(28px) saturate(180%);
      border: 1px solid rgba(255,255,255,0.16);
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.15),
        0 24px 60px rgba(0,0,0,0.55);
    }
    .glass-hover { transition: transform .35s cubic-bezier(.2,.8,.2,1), background .3s, border-color .3s, box-shadow .35s; }
    .glass-hover:hover {
      transform: translateY(-2px);
      border-color: rgba(255,255,255,0.22);
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.18),
        0 18px 44px rgba(0,0,0,0.55);
    }
    .glass-press:active { transform: scale(0.96); }
    .neon-text {
      background: linear-gradient(90deg, hsl(84 90% 70%), hsl(84 81% 50%));
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
    .anim-fade-up { animation: cookFadeUp .55s cubic-bezier(.2,.8,.2,1) both; }
    .anim-pop     { animation: cookCellPop .35s cubic-bezier(.2,1.4,.4,1) both; }
    .anim-float   { animation: cookFloat 3.6s ease-in-out infinite; }
    .anim-glow    { animation: cookPulseGlow 1.8s ease-in-out infinite; }
    .anim-slide-up { animation: cookSlideUp .4s cubic-bezier(.2,.8,.2,1) both; }
    .shimmer-wrap { position: relative; overflow: hidden; }
    .shimmer-wrap::after {
      content: "";
      position: absolute; inset: 0;
      background: linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.15) 50%, transparent 70%);
      animation: cookShimmer 2.6s ease-in-out infinite;
      pointer-events: none;
    }
    .cell-empty { background: linear-gradient(160deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01)); }
    .cell-active {
      background: linear-gradient(160deg, hsl(84 81% 50% / 0.18), hsl(84 81% 40% / 0.05));
      border-color: hsl(84 81% 55% / 0.55) !important;
      box-shadow: 0 0 0 2px hsl(84 81% 55% / 0.25), 0 10px 26px hsl(84 81% 44% / 0.25);
    }
  `}</style>
);

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
      <div className="min-h-screen cook-bg flex items-center justify-center">
        <GlassStyles />
        <div className="glass rounded-2xl px-6 py-4 text-white/70 anim-fade-up">Завантаження…</div>
      </div>
    );
  }
  if (!allowed) {
    return (
      <div className="min-h-screen cook-bg flex flex-col items-center justify-center text-center px-6">
        <GlassStyles />
        <div className="glass-strong rounded-3xl p-7 max-w-sm anim-fade-up">
          <ChefHat className="w-10 h-10 mx-auto mb-3 text-white/70" />
          <div className="text-white text-lg font-bold mb-2">Доступ лише для фракції «Кухар»</div>
          <div className="text-white/50 text-sm mb-5">Спершу подайте заявку та отримайте схвалення.</div>
          <button className="glass-hover glass-press px-5 py-2.5 rounded-xl bg-white/10 text-white border border-white/15"
            onClick={() => nav("/")}>На головну</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28 cook-bg">
      <GlassStyles />

      {/* Шапка */}
      <div className="sticky top-0 z-30 px-4 py-3 flex items-center justify-between glass anim-fade-up"
        style={{ borderRadius: 0, borderLeft: "none", borderRight: "none", borderTop: "none" }}>
        <button onClick={() => nav(-1)}
          className="w-10 h-10 rounded-xl glass-soft glass-hover glass-press flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex items-center gap-2">
          <ChefHat className="w-4 h-4 text-white/70" />
          <div className="text-white font-bold tracking-[0.25em] text-sm">КУХНЯ</div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-soft text-amber-300 text-sm font-semibold">
          <Coins className="w-4 h-4" /> {money}
        </div>
      </div>

      <div className="grid grid-cols-[72px_1fr_72px] gap-3 px-3 mt-4">
        {/* Ліва панель: Рецепти */}
        <button onClick={() => setRecipesOpen(true)}
          className="h-28 rounded-2xl glass glass-hover glass-press flex flex-col items-center justify-center gap-1.5 text-white/85 anim-fade-up"
          style={{ animationDelay: "60ms" }}>
          <BookOpen className="w-5 h-5" />
          <span className="text-[10px] leading-none tracking-widest font-semibold">РЕЦЕПТИ</span>
        </button>

        {/* Центр */}
        <div className="anim-fade-up" style={{ animationDelay: "120ms" }}>
          {/* Назва блюда */}
          <div className={`glass-strong rounded-2xl px-4 py-3 mb-3 ${matched ? "shimmer-wrap" : ""}`}>
            <div className={`text-center font-bold tracking-[0.2em] text-sm ${matched ? "neon-text" : "text-white/85"}`}>
              {matched ? matched.name.toUpperCase() : "ОБЕРІТЬ КОМБІНАЦІЮ"}
            </div>
            {matched && (
              <div className="flex flex-wrap justify-center gap-2 mt-2 anim-fade-up">
                {Object.entries(
                  matched.grid.reduce<Record<string, number>>((a, pid) => {
                    if (pid) a[pid] = (a[pid] || 0) + 1;
                    return a;
                  }, {})
                ).map(([pid, q]) => {
                  const p = productMap.get(pid);
                  return (
                    <div key={pid} className="flex items-center gap-1 text-xs text-white/85 px-2 py-1 rounded-lg glass-soft">
                      <span>{p?.icon || "•"}</span>
                      <span>x{q}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Сітка 3x3 */}
          <div className="glass-strong rounded-3xl p-3 mx-auto">
            <div className="grid grid-cols-3 gap-2">
              {grid.map((pid, i) => {
                const p = pid ? productMap.get(pid) : null;
                const isActive = activeCell === i;
                return (
                  <button key={i}
                    onClick={() => pid ? clearCell(i) : setActiveCell(isActive ? null : i)}
                    className={`aspect-square rounded-2xl flex items-center justify-center text-3xl transition-all duration-300 glass-press border ${isActive ? "cell-active" : "cell-empty"} `}
                    style={{
                      borderColor: "rgba(255,255,255,0.08)",
                      boxShadow: pid
                        ? "inset 0 1px 0 rgba(255,255,255,0.10), 0 6px 18px rgba(0,0,0,0.4)"
                        : "inset 0 1px 0 rgba(255,255,255,0.05)",
                    }}>
                    {p ? <span key={p.id + i} className="anim-pop">{p.icon}</span>
                       : <span className="text-white/20 text-xl">+</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Кнопки */}
          <div className="flex gap-2 mt-3">
            <button onClick={clearAll}
              className="flex-1 py-3 rounded-xl glass-soft glass-hover glass-press text-white/80 text-sm font-medium">
              Очистити
            </button>
            <button onClick={onCookClick} disabled={!matched}
              className={`flex-[2] py-3 rounded-xl font-bold text-black transition-all duration-300 glass-press relative overflow-hidden ${matched ? "anim-glow" : "opacity-40 cursor-not-allowed"}`}
              style={{
                background: "linear-gradient(95deg, hsl(84 81% 50%), hsl(84 90% 70%), hsl(84 81% 50%))",
                backgroundSize: "200% 100%",
              }}>
              <span className="inline-flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Приготувати
              </span>
            </button>
          </div>

          <div className="text-center text-[11px] text-white/45 mt-3 tracking-wide">
            Підберіть правильну комбінацію інгредієнтів!
          </div>
        </div>

        {/* Права панель: Магазин */}
        <button onClick={() => setShopOpen(true)}
          className="h-28 rounded-2xl glass glass-hover glass-press flex flex-col items-center justify-center gap-1.5 text-white/85 anim-fade-up"
          style={{ animationDelay: "60ms" }}>
          <ShoppingBag className="w-5 h-5" />
          <span className="text-[10px] leading-none tracking-widest font-semibold">МАГАЗИН</span>
        </button>
      </div>

      {/* Інвентар */}
      <div className="px-3 mt-5 anim-fade-up" style={{ animationDelay: "180ms" }}>
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="text-white/60 text-[11px] uppercase tracking-[0.2em] font-semibold">Інвентар</div>
          {activeCell !== null && (
            <div className="text-[10px] text-lime-300/90 uppercase tracking-widest">Оберіть інгредієнт</div>
          )}
        </div>
        <div className="glass rounded-2xl p-2.5">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {inv.length === 0 && (
              <div className="text-white/40 text-sm px-2 py-3">Порожньо — купіть продукти у магазині</div>
            )}
            {inv.map(it => {
              const p = productMap.get(it.productId);
              if (!p) return null;
              const avail = availableQty(it.productId);
              const selectable = activeCell !== null && avail > 0;
              return (
                <button key={it.productId}
                  disabled={avail <= 0 || activeCell === null}
                  onClick={() => activeCell !== null && placeInCell(activeCell, it.productId)}
                  className={`shrink-0 w-[68px] h-[84px] rounded-2xl glass-soft glass-hover glass-press flex flex-col items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-all`}
                  style={{
                    borderColor: selectable ? "hsl(84 81% 55% / 0.55)" : undefined,
                    boxShadow: selectable ? "0 0 0 2px hsl(84 81% 55% / 0.25)" : undefined,
                  }}>
                  <div className="text-2xl anim-float">{p.icon}</div>
                  <div className="text-[10px] text-white/65 mt-1">x{avail}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ───── Модалки ───── */}
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
          onResult={(ok) => { if (ok) addMoney(cooking.reward); }}
          onClose={() => setCooking(null)}
        />
      )}
    </div>
  );
}

/* ============== Модалки ============== */

function ModalShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center anim-fade-up"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(14px) saturate(140%)" }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 max-h-[85vh] overflow-y-auto glass-strong anim-slide-up">
        {children}
      </div>
    </div>
  );
}

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
    <ModalShell onClose={onClose}>
      <GlassStyles />
      <div className="flex items-center justify-between mb-4">
        <div className="text-white font-bold tracking-[0.18em] text-sm">МАГАЗИН ПРОДУКТІВ</div>
        <button onClick={onClose} className="w-9 h-9 rounded-xl glass-soft glass-hover glass-press flex items-center justify-center">
          <X className="w-4 h-4 text-white/70" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {products.length === 0 && <div className="col-span-3 text-center text-white/40 py-8 text-sm">Адміни ще не додали продукти</div>}
        {products.map(p => {
          const active = selected?.id === p.id;
          return (
            <button key={p.id} onClick={() => { setSelected(p); setQty(1); setErr(""); }}
              className="rounded-2xl p-2 flex flex-col items-center glass-soft glass-hover glass-press transition-all anim-fade-up"
              style={active ? {
                background: "linear-gradient(160deg, hsl(84 81% 50% / 0.20), hsl(84 81% 40% / 0.05))",
                borderColor: "hsl(84 81% 55% / 0.55)",
                boxShadow: "0 0 0 2px hsl(84 81% 55% / 0.2)",
              } : undefined}>
              <div className="text-3xl">{p.icon}</div>
              <div className="text-[11px] text-white mt-1 truncate w-full text-center">{p.name}</div>
              <div className="text-[10px] text-amber-300 mt-0.5">{p.price} ₴</div>
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="glass-soft rounded-2xl p-3 anim-fade-up">
          <div className="text-white text-sm mb-2 flex items-center gap-2">
            <span className="text-2xl">{selected.icon}</span>
            <span className="font-semibold">{selected.name}</span>
          </div>
          <div className="flex items-center justify-center gap-3 mb-3">
            <button onClick={() => setQty(Math.max(1, qty - 1))}
              className="w-9 h-9 rounded-full glass-soft glass-hover glass-press flex items-center justify-center text-white">
              <Minus className="w-4 h-4" />
            </button>
            <div className="text-white text-xl font-bold w-10 text-center">{qty}</div>
            <button onClick={() => setQty(qty + 1)}
              className="w-9 h-9 rounded-full glass-soft glass-hover glass-press flex items-center justify-center text-white">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="text-center text-white/70 text-xs mb-3">
            Разом: <b className="text-amber-300">{total} ₴</b> · Баланс: {money} ₴
          </div>
          {err && <div className="text-red-400 text-xs text-center mb-2">{err}</div>}
          <button
            onClick={() => {
              if (money < total) { setErr("Недостатньо коштів"); return; }
              const ok = onBuy(selected, qty);
              if (!ok) { setErr("Не вдалось купити"); return; }
              setSelected(null); setQty(1);
            }}
            className="w-full py-3 rounded-xl font-bold text-black glass-press transition-all"
            style={{ background: "linear-gradient(95deg, hsl(84 81% 50%), hsl(84 90% 70%))", boxShadow: "0 10px 28px hsl(84 81% 44% / 0.4)" }}>
            Купити
          </button>
        </div>
      )}
    </ModalShell>
  );
}

function RecipesModal({
  recipes, productMap, onClose,
}: {
  recipes: Recipe[]; productMap: Map<string, Product>;
  onClose: () => void;
}) {
  return (
    <ModalShell onClose={onClose}>
      <GlassStyles />
      <div className="flex items-center justify-between mb-4">
        <div className="text-white font-bold tracking-[0.18em] text-sm">РЕЦЕПТИ</div>
        <button onClick={onClose} className="w-9 h-9 rounded-xl glass-soft glass-hover glass-press flex items-center justify-center">
          <X className="w-4 h-4 text-white/70" />
        </button>
      </div>
      <div className="space-y-3">
        {recipes.length === 0 && <div className="text-center text-white/40 py-8 text-sm">Поки немає рецептів</div>}
        {recipes.map((r, idx) => {
          const counts: Record<string, number> = {};
          r.grid.forEach(g => { if (g) counts[g] = (counts[g] || 0) + 1; });
          return (
            <div key={r.id} className="glass-soft rounded-2xl p-3 anim-fade-up" style={{ animationDelay: `${idx * 40}ms` }}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-white font-bold flex items-center gap-2">
                  {r.icon && <span className="text-xl">{r.icon}</span>}
                  {r.name}
                </div>
                <div className="text-amber-300 text-sm font-semibold">+{r.reward} ₴</div>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {Object.entries(counts).map(([pid, q]) => {
                  const p = productMap.get(pid);
                  return (
                    <span key={pid} className="text-xs text-white/85 px-2 py-1 rounded-lg flex items-center gap-1 glass-soft">
                      <span>{p?.icon || "•"}</span>
                      <span>{p?.name || pid}</span>
                      <span className="text-white/50">x{q}</span>
                    </span>
                  );
                })}
              </div>
              <div className="text-[11px] text-white/45">⏱ {Math.round(r.cookTimeMs / 1000)} сек</div>
            </div>
          );
        })}
      </div>
    </ModalShell>
  );
}
