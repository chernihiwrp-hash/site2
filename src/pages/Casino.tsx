import { useState, useEffect } from "react";
import { Palette, Check, Zap, Gift, X, Coins, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { getBalance, addBalance, store, type NftGift } from "../lib/store";
import { THEMES, applyTheme, type ThemeId } from "./Shop";

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
  return <img src={url} className={`${className} object-contain rounded-2xl`} alt="nft" />;
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
    <div className="min-h-screen pb-24 px-4 pt-4 bg-[#050505]">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-black tracking-tighter text-white italic">МАГАЗИН</h1>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <p className="text-[9px] text-muted-foreground uppercase tracking-[0.2em] font-bold">Premium District</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white/[0.03] border border-white/10 px-4 py-2 rounded-2xl backdrop-blur-md">
          <Zap className="w-4 h-4 text-primary fill-primary/20" />
          <span className="text-sm font-black text-white">{balance} <span className="text-primary/60 text-[10px]">CR</span></span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 p-1.5 bg-white/[0.02] rounded-[22px] border border-white/[0.05] backdrop-blur-sm">
        <button 
          onClick={() => setActiveTab("themes")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[18px] text-[11px] font-black uppercase transition-all duration-500 ${activeTab === "themes" ? "bg-primary text-black shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)] scale-[1.02]" : "text-zinc-500 hover:text-zinc-300"}`}
        >
          <Palette className="w-4 h-4" /> Теми
        </button>
        <button 
          onClick={() => setActiveTab("gifts")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[18px] text-[11px] font-black uppercase transition-all duration-500 ${activeTab === "gifts" ? "bg-primary text-black shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)] scale-[1.02]" : "text-zinc-500 hover:text-zinc-300"}`}
        >
          <Gift className="w-4 h-4" /> NFT Предмети
        </button>
      </div>

      {/* Themes List */}
      {activeTab === "themes" && (
        <div className="grid gap-4">
          {THEMES.map((theme, i) => {
            const isOwned = ownedThemes.includes(theme.id);
            const isActive = currentTheme === theme.id;
            return (
              <div 
                key={theme.id} 
                className="group relative overflow-hidden rounded-[28px] p-[1px] transition-all duration-500"
                style={{ background: isActive ? 'hsl(var(--primary) / 0.3)' : 'rgba(255,255,255,0.05)' }}
              >
                <div className="relative bg-[#0a0a0a] rounded-[27px] p-4 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl shrink-0 overflow-hidden border border-white/10 relative" style={{ background: theme.preview }}>
                    {isActive && (
                       <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                         <Check className="w-6 h-6 text-white stroke-[3px]" />
                       </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-black text-white uppercase italic tracking-tight">{theme.name}</h3>
                    <p className="text-[10px] text-zinc-500 leading-tight mt-1">{theme.description}</p>
                  </div>
                  <button 
                    onClick={() => buyOrActivate(theme)}
                    className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${isActive ? "bg-white/5 text-primary border border-primary/20" : isOwned ? "bg-white/10 text-white hover:bg-white/20" : "bg-primary text-black shadow-lg"}`}
                  >
                    {isActive ? "Активна" : isOwned ? "Вибрати" : `${theme.price} CR`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* NFT Grid */}
      {activeTab === "gifts" && (
        <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {gifts.map((gift) => (
            <div 
              key={gift.id} 
              onClick={() => setSelectedGift(gift)}
              className="group relative flex flex-col items-center bg-white/[0.02] border border-white/[0.05] rounded-[32px] p-4 active:scale-95 transition-all hover:bg-white/[0.04]"
            >
              <div className="relative w-full aspect-square mb-4 bg-black/40 rounded-[24px] flex items-center justify-center p-4 border border-white/[0.05] overflow-hidden">
                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity blur-2xl" />
                <GiftMedia url={gift.image_url} className="w-full h-full relative z-10 drop-shadow-2xl transition-transform group-hover:scale-110 duration-500" />
              </div>
              <p className="text-[10px] font-black uppercase text-zinc-400 mb-1 tracking-widest">{gift.name}</p>
              <div className="flex items-center gap-1.5">
                <div className="w-1 h-1 rounded-full bg-primary" />
                <p className="text-xs font-black text-white">{gift.price} <span className="text-primary text-[9px]">CR</span></p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Premium NFT Purchase Modal */}
      {selectedGift && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-500">
          <div className="w-full max-w-sm bg-[#0a0a0a] border border-white/10 rounded-[40px] p-8 relative overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.5)]">
            {/* Background Glow */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/20 blur-[100px] rounded-full" />
            
            <button 
              onClick={() => setSelectedGift(null)} 
              className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center bg-white/5 border border-white/10 rounded-full text-white/40 hover:text-white transition-colors z-20"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-3 h-3 text-primary" />
                <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Exclusive NFT</span>
              </div>
              
              <h2 className="text-3xl font-black italic text-white uppercase tracking-tighter mb-8">{selectedGift.name}</h2>
              
              {/* Image Container with Glow */}
              <div className="relative w-56 h-56 mb-10 flex items-center justify-center">
                <div className="absolute inset-0 bg-primary/10 blur-[60px] rounded-full animate-pulse" />
                <div className="relative w-full h-full bg-white/[0.02] border border-white/10 rounded-[40px] flex items-center justify-center p-8 backdrop-blur-sm">
                  <GiftMedia url={selectedGift.image_url} className="w-full h-full drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]" />
                </div>
              </div>

              <div className="w-full space-y-4">
                <div className="flex items-center justify-between px-6 py-4 bg-white/5 rounded-2xl border border-white/5">
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Вартість</span>
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-primary" />
                    <span className="text-lg font-black text-white">{selectedGift.price} <span className="text-primary text-xs">CR</span></span>
                  </div>
                </div>

                <button 
                  className="w-full py-5 rounded-[22px] font-black uppercase text-[11px] tracking-widest bg-primary text-black shadow-[0_10px_30px_rgba(var(--primary-rgb),0.3)] active:scale-95 transition-all duration-300"
                  onClick={() => { 
                    store.buyNftGift(nick, selectedGift); 
                    setSelectedGift(null); 
                    setBalance(getBalance(nick)); 
                  }}
                >
                  Підтвердити покупку
                </button>
                
                <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-tight">Предмет буде миттєво додано до вашого інвентарю</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Casino;
