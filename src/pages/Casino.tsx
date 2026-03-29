import { useState, useEffect } from "react";
import { Palette, Check, Zap, Lock, ShoppingCart, Gift, X, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { getBalance, addBalance, store, type NftGift } from "../lib/store";
import { THEMES, applyTheme, type ThemeId } from "./Shop";
import GradientButton from "../components/GradientButton";

const Casino = () => {
  const nick = localStorage.getItem("crp_nick") || "";
  
  // State
  const [activeTab, setActiveTab] = useState<"themes" | "gifts">("themes");
  const [balance, setBalance] = useState(() => getBalance(nick));
  const [loading, setLoading] = useState(false);
  
  // Themes State
  const [currentTheme, setCurrentTheme] = useState<ThemeId>(
    () => (localStorage.getItem("crp_theme") as ThemeId) || "lime"
  );
  const [ownedThemes, setOwnedThemes] = useState<ThemeId[]>(() => {
    try { return JSON.parse(localStorage.getItem(`crp_owned_themes_${nick}`) || '["lime"]'); }
    catch { return ["lime"]; }
  });

  // Gifts State
  const [gifts, setGifts] = useState<NftGift[]>([]);
  const [selectedGift, setSelectedGift] = useState<NftGift | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      // Оновлюємо баланс та завантажуємо подарунки
      setBalance(getBalance(nick));
      const nftData = await store.getNftGifts();
      setGifts(nftData);
    };
    fetchData();

    const update = () => setBalance(getBalance(nick));
    window.addEventListener("focus", update);
    return () => window.removeEventListener("focus", update);
  }, [nick]);

  const buyOrActivate = (theme: typeof THEMES[0]) => {
    if (ownedThemes.includes(theme.id)) {
      applyTheme(theme);
      setCurrentTheme(theme.id);
      toast.success(`Тему "${theme.name}" активовано!`);
      return;
    }
    if (balance < theme.price) {
      toast.error(`Недостатньо CR! Потрібно ${theme.price} CR`);
      return;
    }
    addBalance(nick, -theme.price);
    setBalance(getBalance(nick));
    const newOwned = [...ownedThemes, theme.id];
    setOwnedThemes(newOwned);
    localStorage.setItem(`crp_owned_themes_${nick}`, JSON.stringify(newOwned));
    applyTheme(theme);
    setCurrentTheme(theme.id);
    toast.success(`Тему "${theme.name}" куплено та активовано!`);
  };

  const handleBuyGift = async (gift: NftGift) => {
    setLoading(true);
    const success = await store.buyNftGift(nick, gift);
    if (success) {
      toast.success(`Подарунок "${gift.name}" придбано!`);
      setBalance(getBalance(nick));
      setSelectedGift(null);
    } else {
      toast.error("Недостатньо CR або помилка транзакції");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen pb-20 px-4 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-display text-xl font-bold tracking-wider neon-text-lime uppercase">
            МАГАЗИН
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {activeTab === "themes" ? "Теми інтерфейсу" : "Ексклюзивні NFT"}
          </p>
        </div>
        <div className="flex items-center gap-1.5 liquid-glass px-3 py-2 rounded-xl"
          style={{ border: "1px solid hsl(var(--primary) / 0.2)" }}>
          <Zap className="w-3.5 h-3.5 text-primary" />
          <span className="text-sm font-bold text-primary">{balance} CR</span>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex gap-2 mb-6 p-1 bg-white/5 rounded-2xl border border-white/5">
        <button 
          onClick={() => setActiveTab("themes")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === "themes" ? "bg-primary text-black shadow-lg" : "text-muted-foreground hover:bg-white/5"}`}
        >
          <Palette className="w-3 h-3" /> Теми
        </button>
        <button 
          onClick={() => setActiveTab("gifts")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === "gifts" ? "bg-primary text-black shadow-lg" : "text-muted-foreground hover:bg-white/5"}`}
        >
          <Gift className="w-3 h-3" /> Gifts
        </button>
      </div>

      {/* THEMES TAB */}
      {activeTab === "themes" && (
        <div className="space-y-3 animate-fade-in">
          <p className="text-[11px] text-muted-foreground text-center mb-4 px-4">
            Теми змінюють акцентний колір усього інтерфейсу.
          </p>
          {THEMES.map((theme, i) => {
            const isOwned = ownedThemes.includes(theme.id);
            const isActive = currentTheme === theme.id;
            return (
              <div key={theme.id} className="animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
                <div
                  className="rounded-2xl p-4 transition-all"
                  style={{
                    background: isActive
                      ? `linear-gradient(135deg, hsl(var(--primary) / 0.12), hsl(var(--primary) / 0.04))`
                      : "linear-gradient(135deg, hsl(0 0% 100% / 0.05), hsl(0 0% 100% / 0.015))",
                    border: `1px solid ${isActive ? "hsl(var(--primary) / 0.4)" : "hsl(0 0% 100% / 0.08)"}`,
                    boxShadow: isActive ? "0 0 20px hsl(var(--primary) / 0.15)" : "none",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl shrink-0 relative overflow-hidden"
                      style={{ background: theme.preview, border: "2px solid hsl(0 0% 100% / 0.15)" }}>
                      {isActive && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <Check className="w-6 h-6 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p className="text-sm font-bold text-foreground">{theme.name}</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{theme.description}</p>
                      {!isOwned && theme.price > 0 && (
                        <p className="text-[10px] text-primary font-bold mt-0.5">{theme.price} CR</p>
                      )}
                    </div>
                    <div className="shrink-0">
                      <button
                        onClick={() => buyOrActivate(theme)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                          isActive ? "text-primary border border-primary/20 bg-primary/10" : "liquid-glass"
                        }`}
                      >
                        {isActive ? "Активна" : isOwned ? "Вибрати" : `${theme.price} CR`}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* GIFTS TAB */}
      {activeTab === "gifts" && (
        <div className="grid grid-cols-2 gap-4 animate-fade-in">
          {gifts.map((gift) => (
            <div 
              key={gift.id} 
              onClick={() => setSelectedGift(gift)} 
              className="liquid-glass-card rounded-2xl p-3 flex flex-col items-center border border-white/5 active:scale-95 transition-transform"
            >
              <div className="w-full aspect-square mb-2 bg-black/20 rounded-lg flex items-center justify-center p-2 relative">
                <img src={gift.image_url} alt={gift.name} className="w-full h-full object-contain drop-shadow-xl" />
              </div>
              <p className="text-[10px] font-bold uppercase truncate w-full text-center">{gift.name}</p>
              <p className="text-[10px] text-primary font-black mt-1">{gift.price} CR</p>
            </div>
          ))}
        </div>
      )}

      {/* GIFT MODAL */}
      {selectedGift && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
          <div className="w-full max-w-sm liquid-glass-card rounded-[2.5rem] p-8 relative border border-white/10 text-center animate-in zoom-in-95 duration-200">
            <button onClick={() => setSelectedGift(null)} className="absolute top-8 right-8 text-muted-foreground">
              <X className="w-6 h-6" />
            </button>
            <h2 className="text-2xl font-black mb-1 uppercase italic">{selectedGift.name}</h2>
            <div className="text-[9px] font-black uppercase text-primary/60 mb-8 tracking-widest">Premium Gift Item</div>
            <div className="w-48 h-48 mx-auto mb-10">
              <img src={selectedGift.image_url} className="w-full h-full object-contain drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]" />
            </div>
            <div className="flex justify-between items-center pb-4 border-b border-white/5 mb-8">
              <div className="text-left">
                <span className="text-[9px] text-muted-foreground uppercase font-bold">Вартість</span>
                <div className="text-xl font-black text-primary">{selectedGift.price} CR</div>
              </div>
              <ShoppingBag className="text-primary/40 w-8 h-8" />
            </div>
            <GradientButton 
              variant="green" 
              className="w-full py-4 font-black uppercase" 
              onClick={() => handleBuyGift(selectedGift)} 
              disabled={loading}
            >
              {loading ? "Обробка..." : "Придбати"}
            </GradientButton>
          </div>
        </div>
      )}
    </div>
  );
};

export default Casino;
