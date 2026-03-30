import { useState, useEffect } from "react";
import { Palette, Check, Zap, Lock, ShoppingCart, Gift, X, Diamond } from "lucide-react";
import { toast } from "sonner";
import { getBalance, addBalance, store, type NftGift } from "../lib/store";
import { THEMES, applyTheme, type ThemeId } from "./Shop";

// Компонент для медіа (TGS/JSON/IMG)
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
  const [activeTab, setActiveTab] = useState<"themes" | "gifts">("themes");
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
    const update = async () => {
      setBalance(getBalance(nick));
      const nftData = await store.getNftGifts();
      setGifts(nftData);
    };
    update();
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
      toast.error(`Недостатньо CR!`);
      return;
    }
    addBalance(nick, -theme.price);
    setBalance(getBalance(nick));
    const newOwned = [...ownedThemes, theme.id];
    setOwnedThemes(newOwned);
    localStorage.setItem(`crp_owned_themes_${nick}`, JSON.stringify(newOwned));
    applyTheme(theme);
    setCurrentTheme(theme.id);
    toast.success(`Тему куплено!`);
  };

  return (
    <div className="min-h-screen pb-24 px-4 pt-4">
      {/* Твій оригінальний Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-display text-xl font-bold tracking-wider neon-text-lime">МАГАЗИН</h1>
          <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-widest">Premium Portal</p>
        </div>
        <div className="flex items-center gap-1.5 liquid-glass px-3 py-2 rounded-xl"
          style={{ border: "1px solid hsl(var(--primary) / 0.2)" }}>
          <Zap className="w-3.5 h-3.5 text-primary" />
          <span className="text-sm font-bold text-primary">{balance} CR</span>
        </div>
      </div>

      {/* Вкладки у твоєму стилі */}
      <div className="flex gap-2 mb-6 p-1 bg-white/5 rounded-2xl border border-white/5">
        <button 
          onClick={() => setActiveTab("themes")}
          className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === "themes" ? "bg-primary text-black shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]" : "text-zinc-500"}`}
        >
          <Palette className="w-3.5 h-3.5 inline mr-2" /> Теми
        </button>
        <button 
          onClick={() => setActiveTab("gifts")}
          className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === "gifts" ? "bg-primary text-black shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]" : "text-zinc-500"}`}
        >
          <Gift className="w-3.5 h-3.5 inline mr-2" /> NFT
        </button>
      </div>

      {/* ТЕМИ */}
      {activeTab === "themes" && (
        <div className="space-y-3">
          {THEMES.map((theme, i) => {
            const isOwned = ownedThemes.includes(theme.id);
            const isActive = currentTheme === theme.id;
            return (
              <div key={theme.id} className="animate-slide-up" style={{ animationDelay: `${i * 40}ms` }}>
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
                    <div className="w-14 h-14 rounded-xl shrink-0" style={{ background: theme.preview, border: "2px solid hsl(0 0% 100% / 0.15)" }}>
                      {isActive && <div className="h-full w-full flex items-center justify-center bg-black/20"><Check className="text-white" /></div>}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-foreground">{theme.name}</p>
                      <p className="text-[10px] text-muted-foreground">{theme.description}</p>
                    </div>
                    <button 
                      onClick={() => buyOrActivate(theme)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${isActive ? "text-primary border border-primary/20 bg-primary/10" : "liquid-glass"}`}
                    >
                      {isActive ? "Активна" : isOwned ? "Вибрати" : `${theme.price} CR`}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* NFT GIFTS */}
      {activeTab === "gifts" && (
        <div className="grid grid-cols-2 gap-4 animate-fade-in">
          {gifts.map((gift) => (
            <div 
              key={gift.id} 
              onClick={() => setSelectedGift(gift)}
              className="liquid-glass rounded-[2rem] p-4 flex flex-col items-center border border-white/5 active:scale-95 transition-all"
              style={{ background: "rgba(255,255,255,0.03)" }}
            >
              <div className="w-full aspect-square mb-3 bg-black/40 rounded-[1.5rem] flex items-center justify-center p-3 border border-white/5">
                <GiftMedia url={gift.image_url} className="w-full h-full" />
              </div>
              <p className="text-[10px] font-black uppercase text-white mb-1">{gift.name}</p>
              <p className="text-xs font-bold text-primary">{gift.price} CR</p>
            </div>
          ))}
        </div>
      )}

      {/* Модалка для NFT */}
      {selectedGift && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-in fade-in">
          <div className="w-full max-w-sm bg-zinc-900 border border-white/10 rounded-[3rem] p-8 relative text-center">
            <button onClick={() => setSelectedGift(null)} className="absolute top-8 right-8 text-white/20"><X /></button>
            <h2 className="text-2xl font-black italic mb-8 uppercase tracking-tighter">{selectedGift.name}</h2>
            <div className="w-48 h-48 mx-auto mb-10"><GiftMedia url={selectedGift.image_url} className="w-full h-full" /></div>
            <button 
              className="w-full py-5 rounded-2xl font-black uppercase text-xs bg-primary text-black"
              onClick={() => { store.buyNftGift(nick, selectedGift); setSelectedGift(null); setBalance(getBalance(nick)); }}
            >
              ПРИДБАТИ ЗА {selectedGift.price} CR
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Casino;
