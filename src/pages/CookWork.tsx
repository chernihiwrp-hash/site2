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
  const [shopOpen, setShopOpen]       = useState(false);
  const [recipesOpen, setRecipesOpen] = useState(false);
  const [cooking, setCooking]         = useState<Recipe | null>(null);
  const [targetRecipe, setTargetRecipe] = useState<Recipe | null>(null);
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

  const getIngredientList = (recipeGrid: (string | null)[]) => {
    const counts: Record<string, number> = {};
    recipeGrid.forEach(id => { if (id) counts[id] = (counts[id] || 0) + 1; });
    return Object.entries(counts).map(([id, qty]) => ({
      product: productMap.get(id),
      qty
    }));
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

  const clearAll = () => {
    setGrid(Array(9).fill(null));
    setTargetRecipe(null);
  };

  const onCookClick = async () => {
    if (!matched) return;
    const counts: Record<string, number> = {};
    grid.forEach(g => { if (g) counts[g] = (counts[g] || 0) + 1; });
    for (const [pid, q] of Object.entries(counts)) {
      if (!removeFromInventory(pid, q)) return;
    }
    setCooking(matched);
    setGrid(Array(9).fill(null));
    setTargetRecipe(null);
  };

  if (allowed === null) return <div className="min-h-screen flex items-center justify-center text-white/70 bg-[#0a0a0a]">Завантаження…</div>;
  if (!allowed) return <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ backgroundImage: `linear-gradient(rgba(0,0,0,.6), rgba(0,0,0,.75)), url(${MARBLE_URL})`, backgroundSize: "cover" }}><button className="px-5 py-2 rounded-2xl text-white" style={glass} onClick={() => nav("/")}>На головну</button></div>;

  return (
    <div className="min-h-screen pb-24 relative" style={{ backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.35) 40%, rgba(0,0,0,0.65) 100%), url(${MARBLE_URL})`, backgroundSize: "cover", backgroundAttachment: "fixed" }}>
      <style>{`
        @keyframes cook-fade-in { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes cook-pop { 0% { transform: scale(.6); opacity: 0 } 60% { transform: scale(1.18); opacity: 1 } 100% { transform: scale(1) } }
        @keyframes cook-shimmer { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }
        @keyframes cook-glow { 0%,100% { box-shadow: 0 0 0 0 hsl(84 81% 44% / 0) } 50% { box-shadow: 0 0 28px 4px hsl(84 81% 44% / .55) } }
        .cook-fade-in { animation: cook-fade-in .45s ease forwards; }
        .cook-active { animation: cook-glow 1.5s ease-in-out infinite; border-color: hsl(84 81% 65% / .8) !important; }
        .cook-cta-ready { background: linear-gradient(90deg, hsl(84 81% 50%), hsl(84 81% 70%), hsl(84 81% 50%)) !important; background-size: 200% 100% !important; animation: cook-shimmer 2.2s linear infinite, cook-glow 2.2s ease-in-out infinite; }
        .cook-cell-pop { animation: cook-pop .35s cubic-bezier(.2,1.2,.4,1) both; }
      `}</style>

      {/* Header */}
      <div className="sticky top-0 z-30 px-4 py-3 flex items-center justify-between cook-fade-in" style={{ ...glass, borderRadius: 0, borderTop: "none" }}>
        <button onClick={() => nav(-1)} className="p-2 rounded-xl" style={glass}><ArrowLeft className="w-5 h-5 text-white" /></button>
        <div className="text-white font-bold tracking-[0.3em] text-sm uppercase">Кухня</div>
        <div className="relative flex items-center gap-1 text-[hsl(84_81%_75%)] text-sm font-semibold px-3 py-1.5 rounded-xl" style={glass}>
          <Sparkles className="w-4 h-4" /> {money.toLocaleString()} <span className="text-white/50 text-[10px]">CR</span>
          {floaters.map(f => (
            <span key={f.id} className="absolute top-0 left-1/2 -translate-x-1/2 font-bold animate-[cook-fade-in_1.2s_ease-out_forwards]" style={{ color: f.type === "earn" ? "#bef264" : "#f87171" }}>{f.text}</span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-[72px_1fr_72px] gap-3 px-3 mt-4">
        <button onClick={() => setRecipesOpen(true)} className="h-24 rounded-2xl flex flex-col items-center justify-center gap-1 text-white/90" style={glass}>
          <BookOpen className="w-5 h-5" /><span className="text-[10px]">Рецепти</span>
        </button>

        <div>
          <div className="rounded-3xl px-5 py-4 mb-3 transition-all duration-500" style={{ ...glassStrong, boxShadow: matched ? "0 0 40px hsl(84 81% 50% / 0.4)" : glassStrong.boxShadow }}>
            <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-1">{matched ? "Готово до готування" : targetRecipe ? "Ви обрали рецепт" : "Поточне блюдо"}</div>
            <div className="text-white font-bold text-xl flex items-center gap-3">
              {(matched || targetRecipe) ? (<><CookIcon value={matched?.icon || targetRecipe?.icon} size={32} /><span>{matched?.name || targetRecipe?.name}</span></>) : (<span className="text-white/20 font-medium italic">Оберіть рецепт...</span>)}
            </div>
            {targetRecipe && !matched && (
              <div className="mt-4 flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2">
                {getIngredientList(targetRecipe.grid).map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5">
                    <CookIcon value={item.product?.icon} size={16} /><span className="text-white/70 text-[11px] font-bold">x{item.qty}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mx-auto rounded-[40px] p-4 relative" style={glassStrong}>
            <div className="grid grid-cols-3 gap-3">
              {grid.map((pid, i) => (
                <button key={i} onClick={() => pid ? clearCell(i) : setActiveCell(i)} className={`relative aspect-square rounded-2xl flex items-center justify-center transition-all ${activeCell === i ? "cook-active scale-105" : "active:scale-90"}`} style={glass}>
                  {pid ? <CookIcon value={productMap.get(pid)?.icon} size={44} className={lastFilledCell === i ? "cook-cell-pop" : ""} /> : <span className="text-white/10 text-2xl">+</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button onClick={clearAll} className="flex-1 py-4 rounded-2xl text-white/60 font-bold text-sm" style={glass}>ОЧИСТИТИ</button>
            <button onClick={onCookClick} disabled={!matched} className={`flex-[2] py-4 rounded-2xl font-black text-black tracking-widest uppercase transition ${matched ? "cook-cta-ready" : "opacity-40"}`} style={!matched ? { ...glass, color: "white" } : {}}>ПРИГОТУВАТИ</button>
          </div>
        </div>

        <button onClick={() => setShopOpen(true)} className="h-24 rounded-2xl flex flex-col items-center justify-center gap-1 text-white/90" style={glass}>
          <ShoppingBag className="w-5 h-5" /><span className="text-[10px]">Магазин</span>
        </button>
      </div>

      <div className="px-4 mt-6">
        <div className="text-white/30 text-[10px] font-black uppercase tracking-widest mb-3 px-1">Твій Інвентар</div>
        <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
          {inv.map(it => {
            const p = productMap.get(it.productId);
            const avail = availableQty(it.productId);
            if (!p) return null;
            return (
              <button key={it.productId} disabled={activeCell === null || avail <= 0} onClick={() => activeCell !== null && placeInCell(activeCell, it.productId)} className={`shrink-0 w-20 h-24 rounded-2xl flex flex-col items-center justify-center transition-all ${activeCell !== null && avail > 0 ? "cook-active bg-white/5" : "opacity-40"}`} style={glass}>
                <CookIcon value={p.icon} size={32} />
                <div className="text-[11px] font-black text-white/80 mt-2">x{avail}</div>
              </button>
            );
          })}
        </div>
      </div>

      {recipesOpen && <RecipesModal recipes={recipes} productMap={productMap} onClose={() => setRecipesOpen(false)} onSelect={(r) => { setTargetRecipe(r); setRecipesOpen(false); }} />}
      {shopOpen && <ShopModal products={products} money={money} onClose={() => setShopOpen(false)} onBuy={async (p, q) => { const r = await buyProduct(p, q); if (r.ok) { spawnFloater(`−${(p.price * q).toLocaleString()} CR`, "spend"); setMoney(r.balance ?? money); return true; } return false; }} />}
      {cooking && <CookingModal dishName={cooking.name} dishIcon={cooking.icon} durationMs={cooking.cookTimeMs} reward={cooking.reward} onResult={async (ok) => { if (ok) { const r = await earnRecipe(cooking.id); if (r.ok) { spawnFloater(`+${(r.delta ?? cooking.reward).toLocaleString()} CR`, "earn"); setMoney(r.balance ?? money); } } }} onClose={() => setCooking(null)} />}
    </div>
  );
}

// Вспомогательные модалки для страницы
function RecipesModal({ recipes, productMap, onClose, onSelect }: any) {
  return (
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(12px)" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-lg rounded-[40px] p-6 max-h-[85vh] overflow-y-auto" style={glassStrong}>
        <div className="flex items-center justify-between mb-8"><div className="text-white font-black tracking-widest text-sm uppercase">Книга рецептів</div><button onClick={onClose} className="p-2 rounded-xl" style={glass}><X className="w-5 h-5 text-white/50" /></button></div>
        <div className="grid gap-4">
          {recipes.map((r: Recipe) => {
            const counts: any = {}; r.grid.forEach(id => { if (id) counts[id] = (counts[id] || 0) + 1; });
            return (
              <div key={r.id} className="rounded-3xl p-5 flex flex-col gap-5 border border-white/5" style={{ background: "rgba(255,255,255,0.03)" }}>
                <div className="flex items-center gap-5"><CookIcon value={r.icon} size={50} /><div className="flex-1"><h4 className="text-white text-xl font-bold">{r.name}</h4><div className="text-lime-400 font-black text-sm">+{r.reward} CR</div></div></div>
                <div className="flex flex-wrap gap-2">{Object.entries(counts).map(([pid, q]: any) => (<div key={pid} className="flex items-center gap-2 bg-black/40 px-3 py-2 rounded-xl border border-white/5"><CookIcon value={productMap.get(pid)?.icon} size={18} /><span className="text-white/80 text-xs">{productMap.get(pid)?.name} x{q}</span></div>))}</div>
                <button onClick={() => onSelect(r)} className="w-full py-4 rounded-2xl font-black text-black uppercase tracking-widest text-xs" style={{ background: "linear-gradient(90deg, #bef264, #84cc16)" }}>Обрати рецепт</button>
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
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(12px)" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-md rounded-[40px] p-6 max-h-[85vh] overflow-y-auto" style={glassStrong}>
        <div className="flex items-center justify-between mb-8"><div className="text-white font-black tracking-widest text-sm uppercase">Магазин</div><button onClick={onClose} className="p-2 rounded-xl" style={glass}><X className="w-5 h-5 text-white/50" /></button></div>
        <div className="grid grid-cols-3 gap-3 mb-8">
          {products.map((p: Product) => (<button key={p.id} onClick={() => { setSelected(p); setQty(1); }} className={`rounded-2xl p-3 flex flex-col items-center gap-2 transition-all ${selected?.id === p.id ? "bg-white/10 border-lime-400/50 scale-105" : "bg-white/5 border-transparent"}`} style={{ border: "1px solid" }}><CookIcon value={p.icon} size={32} /><div className="text-[10px] text-white/70 font-bold">{p.name}</div><div className="text-[10px] text-lime-400 font-black">{p.price} CR</div></button>))}
        </div>
        {selected && (
          <div className="rounded-3xl p-5 bg-white/5 border border-white/10"><div className="flex items-center justify-between mb-5"><div className="flex items-center gap-3"><CookIcon value={selected.icon} size={40} /><div className="text-white font-bold">{selected.name}</div></div><div className="flex items-center gap-3 bg-black/40 p-1 rounded-xl"><button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-8 h-8 rounded-lg bg-white/5 text-white">-</button><span className="text-white font-black min-w-[20px] text-center">{qty}</span><button onClick={() => setQty(q => q + 1)} className="w-8 h-8 rounded-lg bg-white/5 text-white">+</button></div></div><button onClick={async () => { if (await onBuy(selected, qty)) setSelected(null); }} className="w-full py-4 rounded-2xl font-black text-black uppercase tracking-widest text-xs" style={{ background: "linear-gradient(90deg, #bef264, #84cc16)" }}>КУПИТИ ЗА {selected.price * qty} CR</button></div>
        )}
      </div>
    </div>
  );
}
