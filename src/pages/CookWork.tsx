import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShoppingBag, BookOpen, X, Plus, Minus, Sparkles, ChefHat } from "lucide-react";
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
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 10px 30px rgba(0,0,0,0.45)",
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

  const availableQty = (pid: string) => {
    const used = grid.filter(g => g === pid).length;
    const it = inv.find(i => i.productId === pid);
    return (it?.qty || 0) - used;
  };

  const spawnFloater = (text: string, type: "earn" | "spend") => {
    const id = ++floaterId.current;
    setFloaters(f => [...f, { id, text, type }]);
    setTimeout(() => setFloaters(f => f.filter(x => x.id !== id)), 1000);
  };

  const placeInCell = (cellIdx: number, productId: string) => {
    if (availableQty(productId) <= 0) return;
    const next = [...grid]; next[cellIdx] = productId;
    setGrid(next); setActiveCell(null); setLastFilledCell(cellIdx);
    setTimeout(() => setLastFilledCell(null), 400);
  };

  const onCookClick = async () => {
    if (!matched) return;
    const counts: Record<string, number> = {};
    grid.forEach(g => { if (g) counts[g] = (counts[g] || 0) + 1; });
    for (const [pid, q] of Object.entries(counts)) { if (!removeFromInventory(pid, q)) return; }
    setCooking(matched);
    setGrid(Array(9).fill(null));
    setTargetRecipe(null);
  };

  if (allowed === null) return <div className="min-h-screen bg-black" />;

  return (
    <div className="min-h-screen pb-24 relative overflow-hidden" style={{ backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.7) 100%), url(${MARBLE_URL})`, backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed" }}>
      
      <style>{`
        @keyframes modalIn { from { opacity: 0; transform: scale(0.9) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes overlayIn { from { backdrop-filter: blur(0px); background: rgba(0,0,0,0); } to { backdrop-filter: blur(8px); background: rgba(0,0,0,0.6); } }
        @keyframes floatText { 0% { transform: translateY(0); opacity: 0; } 20% { opacity: 1; } 100% { transform: translateY(-40px); opacity: 0; } }
        @keyframes cellPop { 0% { transform: scale(1); } 50% { transform: scale(1.15); } 100% { transform: scale(1); } }
        @keyframes steam { 0% { transform: translateY(0) scale(1); opacity: 0.4; } 100% { transform: translateY(-20px) scale(1.5); opacity: 0; } }
        @keyframes pulseGlow { 0%, 100% { box-shadow: 0 0 10px rgba(190, 242, 100, 0); } 50% { box-shadow: 0 0 25px rgba(190, 242, 100, 0.4); } }
        
        .anim-modal { animation: modalIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .anim-overlay { animation: overlayIn 0.3s ease forwards; }
        .anim-float { animation: floatText 1s ease-out forwards; }
        .anim-cell-fill { animation: cellPop 0.3s ease-out; }
        .anim-matched { animation: pulseGlow 2s infinite; border-color: rgba(190, 242, 100, 0.5) !important; }
        .cook-shimmer { background-size: 200% 100%; animation: cook-shimmer 2s linear infinite; }
        @keyframes cook-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      `}</style>

      {/* Header */}
      <div className="sticky top-0 z-30 px-4 py-4 flex items-center justify-between" style={{ ...glass, borderRadius: 0, borderTop: "none" }}>
        <button onClick={() => nav(-1)} className="p-2.5 rounded-2xl active:scale-90 transition-transform" style={glass}>
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex flex-col items-center">
          <ChefHat className="w-4 h-4 text-white/30 mb-0.5" />
          <div className="text-white font-black tracking-[0.4em] text-[10px] uppercase">Робота Повара</div>
        </div>
        <div className="relative flex items-center gap-1.5 text-lime-400 text-sm font-black px-4 py-2 rounded-2xl" style={glassStrong}>
          <Sparkles size={14} /> {money.toLocaleString()}
          {floaters.map(f => (
            <span key={f.id} className="absolute -top-6 left-1/2 -translate-x-1/2 anim-float font-black" style={{ color: f.type === "earn" ? "#bef264" : "#f87171" }}>{f.text}</span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-[80px_1fr_80px] gap-4 px-4 mt-6">
        {/* Книга рецептів */}
        <button onClick={() => setRecipesOpen(true)} 
          className="h-28 rounded-[28px] flex flex-col items-center justify-center gap-2 text-white/80 active:scale-95 transition-all hover:bg-white/5" style={glass}>
          <BookOpen className="w-6 h-6" />
          <span className="text-[9px] font-bold uppercase tracking-widest">Книга</span>
        </button>

        {/* Центр: Робоча зона */}
        <div className="flex flex-col">
          {/* Панель підказки */}
          <div className={`rounded-[30px] px-5 py-4 mb-4 transition-all duration-500 ${matched ? 'anim-matched' : ''}`} style={glassStrong}>
            <div className="text-[9px] uppercase tracking-[0.3em] text-white/30 mb-1 font-black">
              {matched ? "Рецепт зібрано!" : targetRecipe ? "Твоя ціль" : "Поточне блюдо"}
            </div>
            <div className="text-white font-black text-lg flex items-center gap-3">
              {(matched || targetRecipe) ? (
                <>
                  <div className="p-1 bg-white/5 rounded-lg border border-white/10">
                    <CookIcon value={matched?.icon || targetRecipe?.icon} size={28} />
                  </div>
                  <span className="truncate">{matched?.name || targetRecipe?.name}</span>
                </>
              ) : (
                <span className="text-white/10 italic font-medium">Обери рецепт...</span>
              )}
            </div>
            {targetRecipe && !matched && (
              <div className="mt-4 flex flex-wrap gap-2 animate-in slide-in-from-top-2 duration-300">
                {getTargetIngredients(targetRecipe).map((it, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-xl border border-white/5">
                    <CookIcon value={it.p?.icon} size={14} />
                    <span className="text-white/60 text-[10px] font-black">x{it.q}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Сітка 3x3 */}
          <div className="mx-auto rounded-[40px] p-4 relative" style={glassStrong}>
            <div className="grid grid-cols-3 gap-3">
              {grid.map((pid, i) => (
                <button key={i} 
                  onClick={() => pid ? setGrid(g => { const n = [...g]; n[i] = null; return n; }) : setActiveCell(i)} 
                  className={`relative aspect-square rounded-[22px] flex items-center justify-center transition-all duration-300 ${activeCell === i ? 'ring-2 ring-lime-400 ring-offset-4 ring-offset-transparent scale-95' : 'hover:bg-white/5 active:scale-90'}`} 
                  style={glass}>
                  {pid ? (
                    <div className={lastFilledCell === i ? 'anim-cell-fill' : ''}>
                      <CookIcon value={productMap.get(pid)?.icon} size={44} />
                    </div>
                  ) : <span className="text-white/5 text-3xl font-light">+</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Кнопки */}
          <div className="flex gap-3 mt-5">
            <button onClick={() => { setGrid(Array(9).fill(null)); setTargetRecipe(null); }} 
              className="flex-1 py-4 rounded-[24px] text-white/40 font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all" style={glass}>
              Очистити
            </button>
            <button onClick={onCookClick} disabled={!matched} 
              className={`flex-[2] py-4 rounded-[24px] font-black text-black text-[10px] uppercase tracking-[0.2em] transition-all duration-300 ${matched ? 'cook-shimmer active:scale-95' : 'opacity-20'}`}
              style={{ background: matched ? "linear-gradient(90deg, #bef264, #a3e635, #bef264)" : "white" }}>
              Приготувати
            </button>
          </div>
          
          <div className="text-center text-[10px] text-white/20 mt-4 font-bold uppercase tracking-widest">
            Тобі потрібно вгадати правильну комбінацію!
          </div>
        </div>

        {/* Магазин */}
        <button onClick={() => setShopOpen(true)} 
          className="h-28 rounded-[28px] flex flex-col items-center justify-center gap-2 text-white/80 active:scale-95 transition-all hover:bg-white/5" style={glass}>
          <ShoppingBag className="w-6 h-6" />
          <span className="text-[9px] font-bold uppercase tracking-widest">Ринок</span>
        </button>
      </div>

      {/* Інвентар */}
      <div className="px-5 mt-8">
        <div className="text-white/20 text-[9px] font-black uppercase tracking-[0.3em] mb-4">Твої інгредієнти</div>
        <div className="flex gap-3 overflow-x-auto pb-6 no-scrollbar">
          {inv.map(it => {
            const p = productMap.get(it.productId);
            const avail = availableQty(it.productId);
            if (!p) return null;
            return (
              <button key={it.productId} disabled={activeCell === null || avail <= 0} 
                onClick={() => activeCell !== null && placeInCell(activeCell, it.productId)} 
                className={`shrink-0 w-20 h-24 rounded-[24px] flex flex-col items-center justify-center gap-2 transition-all duration-300 ${activeCell !== null && avail > 0 ? 'bg-lime-500/10 border-lime-500/40 scale-105' : 'opacity-30'}`} style={glass}>
                <CookIcon value={p.icon} size={32} />
                <div className="bg-black/40 px-2 py-0.5 rounded-lg text-[10px] font-black text-white">x{avail}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* MODALS */}
      {recipesOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 anim-overlay" onClick={() => setRecipesOpen(false)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-md rounded-[40px] p-8 max-h-[80vh] overflow-y-auto anim-modal" style={glassStrong}>
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-white font-black tracking-widest text-xs uppercase">Книга рецептів</h3>
              <button onClick={() => setRecipesOpen(false)} className="p-2 rounded-xl bg-white/5 text-white/40"><X size={20}/></button>
            </div>
            <div className="space-y-4">
              {recipes.map(r => {
                const counts: any = {}; r.grid.forEach(id => { if (id) counts[id] = (counts[id] || 0) + 1; });
                return (
                  <div key={r.id} className="rounded-[30px] p-5 border border-white/5 bg-white/5 flex flex-col gap-5">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center"><CookIcon value={r.icon} size={32} /></div>
                      <div className="flex-1"><div className="text-white font-black">{r.name}</div><div className="text-lime-400 font-black text-sm">+{r.reward} CR</div></div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(counts).map(([pid, q]: any) => (
                        <div key={pid} className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-xl border border-white/5">
                          <CookIcon value={productMap.get(pid)?.icon} size={14} /><span className="text-white/40 text-[10px] font-bold">{productMap.get(pid)?.name} x{q}</span>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => { setTargetRecipe(r); setRecipesOpen(false); }} className="w-full py-4 rounded-2xl font-black text-black uppercase text-[10px] tracking-widest bg-lime-400 active:scale-95 transition-transform">Обрати цей рецепт</button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {shopOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 anim-overlay" onClick={() => setShopOpen(false)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-md rounded-[40px] p-8 anim-modal" style={glassStrong}>
            <div className="flex items-center justify-between mb-8"><h3 className="text-white font-black tracking-widest text-xs uppercase">Ринок продуктів</h3><button onClick={() => setShopOpen(false)} className="p-2 rounded-xl bg-white/5 text-white/40"><X size={20}/></button></div>
            <div className="grid grid-cols-3 gap-3 mb-8">
              {products.map(p => (
                <button key={p.id} onClick={() => { setSelectedProduct(p); setShopQty(1); }} className={`rounded-[22px] p-3 flex flex-col items-center gap-2 transition-all ${selectedProduct?.id === p.id ? 'bg-lime-500/20 border-lime-500/50 scale-105' : 'bg-white/5 border-transparent hover:bg-white/10'}`} style={{ border: '1px solid' }}><CookIcon value={p.icon} size={32} /><div className="text-lime-400 font-black text-[10px]">{p.price} CR</div></button>
              ))}
            </div>
            {selectedProduct && (
              <div className="rounded-[30px] p-6 bg-white/5 border border-white/10 animate-in zoom-in-95">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3"><CookIcon value={selectedProduct.icon} size={32} /><span className="text-white font-black">{selectedProduct.name}</span></div>
                  <div className="flex items-center gap-3 bg-black/40 p-1 rounded-xl">
                    <button onClick={() => setShopQty(q => Math.max(1, q - 1))} className="w-8 h-8 rounded-lg bg-white/5 text-white">-</button>
                    <span className="text-white font-black min-w-[20px] text-center">{shopQty}</span>
                    <button onClick={() => setShopQty(q => q + 1)} className="w-8 h-8 rounded-lg bg-white/5 text-white">+</button>
                  </div>
                </div>
                <button onClick={async () => { if (await buyProduct(selectedProduct, shopQty)) { spawnFloater(`-${selectedProduct.price * shopQty} CR`, 'spend'); setSelectedProduct(null); const b = await fetchBalance(); setMoney(b); } }} className="w-full py-4 rounded-2xl font-black text-black uppercase tracking-widest text-[10px] bg-lime-400">Придбати за {selectedProduct.price * shopQty} CR</button>
              </div>
            )}
          </div>
        </div>
      )}

      {cooking && <CookingModal dishName={cooking.name} dishIcon={cooking.icon} durationMs={cooking.cookTimeMs} reward={cooking.reward} onResult={async (ok) => { if (ok) { const r = await earnRecipe(cooking.id); if (r.ok) { spawnFloater(`+${r.delta} CR`, "earn"); setMoney(r.balance ?? money); } } }} onClose={() => setCooking(null)} />}
    </div>
  );
}

// Вспомогательный стейт для магазина внутри компонента
function useShopState() {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [shopQty, setShopQty] = useState(1);
  return { selectedProduct, setSelectedProduct, shopQty, setShopQty };
}

// Примечание: В реальном коде я добавил переменные selectedProduct и shopQty прямо в тело компонента для краткости
