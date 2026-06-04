import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShoppingBag, BookOpen, X, Plus, Minus, Sparkles } from "lucide-react";
import {
  Product, Recipe,
  fetchCookData, getProducts, getRecipes,
  getInventory, removeFromInventory,
  fetchBalance, buyProduct, earnRecipe,
  matchRecipe, isCook,
} from "../lib/cookStore";
import CookingModal from "../components/CookingModal";
import CookIcon from "../components/CookIcon";

const MARBLE_URL = "https://img.freepik.com/free-photo/top-view-greens-vegetables-with-pepper-grey-space_140725-97965.jpg?semt=ais_hybrid&w=740&q=80";

const glass: React.CSSProperties = {
  background: "linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 60%, rgba(255,255,255,0.08) 100%)",
  border: "1px solid rgba(255,255,255,0.18)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.25), 0 10px 30px rgba(0,0,0,0.45)",
  backdropFilter: "blur(22px) saturate(160%)",
  WebkitBackdropFilter: "blur(22px) saturate(160%)" as any,
};

const glassStrong: React.CSSProperties = {
  ...glass,
  background: "linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.05) 55%, rgba(255,255,255,0.10) 100%)",
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
  const [targetRecipe, setTargetRecipe] = useState<Recipe | null>(null);

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

  const matched = useMemo(() => matchRecipe(grid), [grid]);

  const getTargetIngredients = (r: Recipe) => {
    const counts: Record<string, number> = {};
    r.grid.forEach(id => { if (id) counts[id] = (counts[id] || 0) + 1; });
    return Object.entries(counts).map(([id, q]) => ({ p: productMap.get(id), q }));
  };

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
    const next = [...grid]; next[cellIdx] = productId;
    setGrid(next); setActiveCell(null); setLastFilledCell(cellIdx);
    setTimeout(() => setLastFilledCell(c => c === cellIdx ? null : c), 450);
  };

  const clearAll = () => { setGrid(Array(9).fill(null)); setTargetRecipe(null); };

  const onCookClick = async () => {
    if (!matched) return;
    const counts: Record<string, number> = {};
    grid.forEach(g => { if (g) counts[g] = (counts[g] || 0) + 1; });
    for (const [pid, q] of Object.entries(counts)) { if (!removeFromInventory(pid, q)) return; }
    setCooking(matched); clearAll();
  };

  if (allowed === null) return <div className="min-h-screen flex items-center justify-center text-white/70 bg-black">Завантаження...</div>;
  if (!allowed) return <div className="min-h-screen flex flex-col items-center justify-center text-center px-6" style={{ backgroundImage: `linear-gradient(rgba(0,0,0,.6), rgba(0,0,0,.75)), url(${MARBLE_URL})`, backgroundSize: "cover" }}><button className="px-5 py-2 rounded-2xl text-white" style={glass} onClick={() => nav("/")}>На головну</button></div>;

  return (
    <div className="min-h-screen pb-24 relative" style={{ backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.35) 40%, rgba(0,0,0,0.65) 100%), url(${MARBLE_URL})`, backgroundSize: "cover", backgroundAttachment: "fixed" }}>
      
      <style>{`
        @keyframes cook-pop { 0% { transform: scale(.6); opacity: 0 } 60% { transform: scale(1.18); opacity: 1 } 100% { transform: scale(1) } }
        @keyframes cook-shimmer { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }
        @keyframes cook-glow { 0%,100% { box-shadow: 0 0 0 0 hsl(84 81% 44% / 0) } 50% { box-shadow: 0 0 28px 4px hsl(84 81% 44% / .55) } }
        .cook-cta-ready { background: linear-gradient(90deg, hsl(84 81% 50%), hsl(84 81% 70%), hsl(84 81% 50%)) !important; background-size: 200% 100% !important; animation: cook-shimmer 2.2s linear infinite, cook-glow 2.2s ease-in-out infinite; }
      `}</style>

      {/* Header */}
      <div className="sticky top-0 z-30 px-4 py-3 flex items-center justify-between" style={{ ...glass, borderRadius: 0, borderTop: "none" }}>
        <button onClick={() => nav(-1)} className="p-2 rounded-xl" style={glass}><ArrowLeft className="w-5 h-5 text-white" /></button>
        <div className="text-white font-bold tracking-[0.3em] text-sm">КУХНЯ</div>
        <div className="relative flex items-center gap-1 text-[hsl(84_81%_75%)] text-sm font-semibold px-3 py-1.5 rounded-xl" style={glass}>
          <Sparkles className="w-4 h-4" /> {money.toLocaleString()}
          {floaters.map(f => <span key={f.id} className="absolute -top-4 left-1/2 -translate-x-1/2 font-bold animate-bounce" style={{ color: f.type === "earn" ? "#bef264" : "#f87171" }}>{f.text}</span>)}
        </div>
      </div>

      <div className="grid grid-cols-[72px_1fr_72px] gap-3 px-3 mt-4">
        <button onClick={() => setRecipesOpen(true)} className="h-24 rounded-2xl flex flex-col items-center justify-center gap-1 text-white/90" style={glass}><BookOpen className="w-5 h-5" /><span className="text-[10px]">Рецепти</span></button>

        <div>
          <div className="rounded-2xl px-4 py-3 mb-3 relative overflow-hidden" style={glassStrong}>
            <div className="text-[10px] uppercase tracking-[0.25em] text-white/60">{matched ? "Готово" : targetRecipe ? "Рецепт" : "Блюдо"}</div>
            <div className="text-white font-bold text-lg mt-0.5 flex items-center gap-2">
              {matched ? <><CookIcon value={matched.icon} size={24} />{matched.name}</> : targetRecipe ? <><CookIcon value={targetRecipe.icon} size={24} />{targetRecipe.name}</> : <span className="text-white/45 italic">Заповніть сітку...</span>}
            </div>
            {targetRecipe && !matched && (
              <div className="mt-2 flex flex-wrap gap-1">
                {getTargetIngredients(targetRecipe).map((it, idx) => (
                  <div key={idx} className="flex items-center gap-1 text-[10px] text-white/80 px-2 py-1 rounded-lg border border-white/5 bg-white/5">
                    <CookIcon value={it.p?.icon} size={14} /><span>x{it.q}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mx-auto rounded-3xl p-3 relative" style={glassStrong}>
            <div className="grid grid-cols-3 gap-2">
              {grid.map((pid, i) => (
                <button key={i} onClick={() => pid ? setGrid(g => { const n = [...g]; n[i] = null; return n; }) : setActiveCell(i)} className={`relative aspect-square rounded-xl flex items-center justify-center transition-all ${activeCell === i ? "border-lime-400 border-2" : ""}`} style={glass}>
                  {pid ? <CookIcon value={productMap.get(pid)?.icon} size={40} className={lastFilledCell === i ? "animate-ping" : ""} /> : <span className="text-white/30 text-xl">+</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 mt-3">
            <button onClick={clearAll} className="flex-1 py-3 rounded-2xl text-white/85 text-sm" style={glass}>Очистити</button>
            <button onClick={onCookClick} disabled={!matched} className={`flex-[2] py-3 rounded-2xl font-bold text-black ${matched ? "cook-cta-ready" : "opacity-50"}`} style={!matched ? { ...glass, color: "white" } : {}}>Приготувати</button>
          </div>

          <div className="text-center text-[11px] text-white/55 mt-3">Підберіть правильну комбінацію інгредієнтів!</div>
        </div>

        <button onClick={() => setShopOpen(true)} className="h-24 rounded-2xl flex flex-col items-center justify-center gap-1 text-white/90" style={glass}><ShoppingBag className="w-5 h-5" /><span className="text-[10px]">Магазин</span></button>
      </div>

      <div className="px-3 mt-4">
        <div className="text-white/65 text-xs mb-2 px-1">Інвентар</div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {inv.map(it => {
            const p = productMap.get(it.productId);
            const avail = availableQty(it.productId);
            return p ? (
              <button key={it.productId} disabled={activeCell === null || avail <= 0} onClick={() => activeCell !== null && placeInCell(activeCell, it.productId)} className={`shrink-0 w-16 h-20 rounded-xl flex flex-col items-center justify-center ${activeCell !== null && avail > 0 ? "border-lime-400 border" : "opacity-40"}`} style={glass}>
                <CookIcon value={p.icon} size={28} /><div className="text-[10px] text-white/80 mt-1">x{avail}</div>
              </button>
            ) : null;
          })}
        </div>
      </div>

      {recipesOpen && <RecipesModal recipes={recipes} productMap={productMap} onClose={() => setRecipesOpen(false)} onSelect={(r: Recipe) => { setTargetRecipe(r); setRecipesOpen(false); }} />}
      {shopOpen && <ShopModal products={products} money={money} onClose={() => setShopOpen(false)} onBuy={async (p: any, q: any) => { const r = await buyProduct(p, q); if (r.ok) { spawnFloater(`-${p.price * q} CR`, "spend"); setMoney(r.balance); return true; } return false; }} />}
      {cooking && <CookingModal dishName={cooking.name} dishIcon={cooking.icon} durationMs={cooking.cookTimeMs} reward={cooking.reward} onResult={async (ok) => { if (ok) { const r = await earnRecipe(cooking.id); if (r.ok) { spawnFloater(`+${r.delta} CR`, "earn"); setMoney(r.balance); } } }} onClose={() => setCooking(null)} />}
    </div>
  );
}

function RecipesModal({ recipes, productMap, onClose, onSelect }: any) {
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-md rounded-3xl p-6 max-h-[80vh] overflow-y-auto" style={glassStrong}>
        <div className="flex items-center justify-between mb-6"><div className="text-white font-bold tracking-widest text-sm uppercase">Книга рецептів</div><button onClick={onClose} className="p-2 rounded-xl" style={glass}><X size={18} className="text-white/50" /></button></div>
        <div className="space-y-4">
          {recipes.map((r: any) => {
            const counts: any = {}; r.grid.forEach((id: any) => { if (id) counts[id] = (counts[id] || 0) + 1; });
            return (
              <div key={r.id} className="rounded-2xl p-4 border border-white/5 bg-white/5">
                <div className="flex items-center gap-4 mb-4"><CookIcon value={r.icon} size={40} /><div className="flex-1 font-bold text-white text-lg">{r.name}</div><div className="text-lime-400 font-bold">+{r.reward} CR</div></div>
                <div className="flex flex-wrap gap-2 mb-4">{Object.entries(counts).map(([pid, q]: any) => (<div key={pid} className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded-lg border border-white/5"><CookIcon value={productMap.get(pid)?.icon} size={16} /><span className="text-white/60 text-xs">{productMap.get(pid)?.name} x{q}</span></div>))}</div>
                <button onClick={() => onSelect(r)} className="w-full py-3 rounded-xl font-bold text-black uppercase text-xs" style={{ background: "linear-gradient(90deg, #bef264, #84cc16)" }}>Обрати рецепт</button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ShopModal({ products, money, onClose, onBuy }: any) {
  const [selected, setSelected] = useState<any>(null);
  const [qty, setQty] = useState(1);
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-md rounded-3xl p-6 max-h-[80vh] overflow-y-auto" style={glassStrong}>
        <div className="flex items-center justify-between mb-6"><div className="text-white font-bold tracking-widest text-sm uppercase">Магазин</div><button onClick={onClose} className="p-2 rounded-xl" style={glass}><X size={18} className="text-white/50" /></button></div>
        <div className="grid grid-cols-3 gap-2 mb-6">
          {products.map((p: any) => (<button key={p.id} onClick={() => { setSelected(p); setQty(1); }} className={`rounded-xl p-2 flex flex-col items-center gap-1 transition-all ${selected?.id === p.id ? "border-lime-400 border" : ""}`} style={glass}><CookIcon value={p.icon} size={32} /><div className="text-[10px] text-white/70 font-bold">{p.name}</div><div className="text-[10px] text-lime-400 font-bold">{p.price} CR</div></button>))}
        </div>
        {selected && (
          <div className="rounded-2xl p-4 bg-white/5 border border-white/10"><div className="flex items-center justify-between mb-4"><div className="flex items-center gap-3"><CookIcon value={selected.icon} size={40} /><div className="text-white font-bold">{selected.name}</div></div><div className="flex items-center gap-2"><button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-8 h-8 rounded-lg bg-white/5 text-white">-</button><span className="text-white font-bold">{qty}</span><button onClick={() => setQty(q => q + 1)} className="w-8 h-8 rounded-lg bg-white/5 text-white">+</button></div></div><button onClick={async () => { if (await onBuy(selected, qty)) setSelected(null); }} className="w-full py-3 rounded-xl font-bold text-black uppercase text-xs" style={{ background: "linear-gradient(90deg, #bef264, #84cc16)" }}>Купити ({selected.price * qty} CR)</button></div>
        )}
      </div>
    </div>
  );
}
