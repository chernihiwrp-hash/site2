import { useState, useEffect } from "react";
import { Palette, Check, Zap, Lock, ShoppingCart, Gift, X, Diamond } from "lucide-react";
import { toast } from "sonner";
import { getBalance, addBalance, store, type NftGift } from "../lib/store";
import { THEMES, applyTheme, type ThemeId } from "./Shop";
import GradientButton from "../components/GradientButton";

// Компонент для відображення медіа (Твій дизайн картки з картинки)
const GiftMedia = ({ url, className }: { url: string; className?: string }) => {
  const isAnimated = url.toLowerCase().includes(".tgs") || url.toLowerCase().includes(".json");
  if (isAnimated) {
    return (
      <div className={`${className} flex items-center justify-center`}>
        {/* @ts-ignore */}
        <dotlottie-player autoplay loop src={url} background="transparent" style={{ width: "100%", height: "100%" }} />
      </div>
    );
  }
  return <img src={url} className={`${className} object-contain`} alt="nft" />;
};

const Casino = () => {
  const nick = localStorage.getItem("crp_nick") || "";
  const [activeTab, setActiveTab] = useState<"themes" | "gifts">("themes"); // Вкладки
  const [balance, setBalance] = useState(() => getBalance(nick));
  const [gifts, setGifts] = useState<NftGift[]>([]);
  const [selectedGift, setSelectedGift] = useState<NftGift | null>(null);
  const [currentTheme, setCurrentTheme] = useState<ThemeId>(
    () => (localStorage.getItem("crp_theme") as ThemeId) || "lime"
  );
  const [ownedThemes, setOwnedThemes] = useState<ThemeId[]>(() => {
    try { return JSON.parse(localStorage.getItem(`crp_owned_themes_${nick}`) || '["lime"]'); }
    catch { return ["lime"]; }
  });

  useEffect(() => {
    const loadData = async () => {
      setBalance(getBalance(nick));
      const nftData = await store.getNftGifts();
      setGifts(nftData);
    };
    loadData();
    window.addEventListener("focus", loadData);
    return () => window.removeEventListener("focus", loadData);
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
    toast.success(`Тему "${theme.name}" куплено!`);
  };

  return (
    <div className="min-h-screen pb-24 px-4 pt-4 bg-black">
      {/* Header (Твій оригінальний дизайн) */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-xl font-bold tracking-wider neon-text-lime uppercase">Магазин</h1>
          <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-widest">Premium Portal</p>
        </div>
        <div className="flex items-center gap-1.5 liquid-glass px-3 py-2 rounded-xl"
          style={{ border: "1px solid hsl(var(--primary) / 0.2)" }}>
          <Zap className="w-3.5 h-3.5 text-primary animate-pulse" />
          <span className="text-sm font-bold text-primary">{balance} CR</span>
        </div>
      </div>

      {/* Tabs (Додаємо вкладки у твоєму стилі) */}
      <div className="flex gap-2 mb-6 p-1 bg-white/5 rounded-2xl border border-white/5">
        <button 
          onClick={() => setActiveTab("themes")}
          className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === "themes" ? "bg-primary text-black" : "text-zinc-500"}`}
        >
          <Palette className="w-3.5 h-3.5 inline mr-2" /> Теми
        </button>
        <button 
          onClick={() => setActiveTab("gifts")}
          className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === "gifts" ? "bg-primary text-black" : "text-zinc-500"}`}
        >
          <Gift className="w-3.5 h-3.5 inline mr-2" /> NFT Подарунки
        </button>
      </div>

      {/* Контент: ТЕМИ (Твій старий код без змін дизайну) */}
      {activeTab === "themes" && (
        <div className="space-y-3 animate-fade-in">
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
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl shrink-0 relative overflow-hidden"
                      style={{ background: theme.preview, border: "2px solid hsl(0 0% 100% / 0.15)" }}>
                      {isActive && <div className="absolute inset-0 flex items-center justify-center bg-black/20"><Check className="w-6 h-6 text-white" /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground uppercase">{theme.name}</p>
                      <p className="text-[10px] text-muted-foreground">{theme.description}</p>
                    </div>
                    <div className="shrink-0">
                      <button onClick={() => buyOrActivate(theme)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${isActive ? "text-primary border border-primary/20 bg-primary/10" : "liquid-glass"}`}>
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

      {/* Контент: NFT (Дизайн картки як на скріншоті) */}
      {activeTab === "gifts" && (
        <div className="grid grid-cols-2 gap-4 animate-fade-in">
          {gifts.map((gift) => (
            <div 
              key={gift.id} 
              onClick={() => setSelectedGift(gift)}
              className="liquid-glass-card rounded-[2rem] p-4 flex flex-col items-center border border-white/5 active:scale-95 transition-all"
            >
              <div className="w-full aspect-square mb-4 bg-zinc-950/50 rounded-[1.5rem] flex items-center justify-center p-4 border border-white/5 overflow-hidden">
                <GiftMedia url={gift.image_url} className="w-full h-full" />
              </div>
              <p className="text-[10px] font-black uppercase text-white tracking-widest mb-1">{gift.name}</p>
              <p className="text-xs font-bold text-primary tracking-tighter">{gift.price} CR</p>
            </div>
          ))}
        </div>
      )}

      {/* Модалка покупки NFT (Premium стиль) */}
      {selectedGift && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-in fade-in">
          <div className="w-full max-w-sm bg-zinc-900/50 border border-white/10 rounded-[3rem] p-8 relative text-center">
            <button onClick={() => setSelectedGift(null)} className="absolute top-8 right-8 text-white/20"><X /></button>
            <div className="flex items-center justify-center gap-2 mb-2 text-primary/60 text-[9px] font-black uppercase tracking-widest">
              <Diamond size={12} /> Exclusive NFT <Diamond size={12} />
            </div>
            <h2 className="text-2xl font-black italic mb-10 uppercase tracking-tighter">{selectedGift.name}</h2>
            <div className="w-48 h-48 mx-auto mb-10"><GiftMedia url={selectedGift.image_url} className="w-full h-full" /></div>
            <GradientButton 
              variant="green" 
              className="w-full py-5 rounded-2xl font-black uppercase text-xs" 
              onClick={() => {
                const success = store.buyNftGift(nick, selectedGift);
                if (success) { setBalance(getBalance(nick)); setSelectedGift(null); }
              }}
            >
              Купити за {selectedGift.price} CR
            </GradientButton>
          </div>
        </div>
      )}
    </div>
  );
};

export default Casino;
