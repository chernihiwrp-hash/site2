import { useState, useEffect } from "react";
import { Palette, Zap, Gift, X, ShoppingBag, Diamond } from "lucide-react";
import { toast } from "sonner";
import { getBalance, addBalance, store, type NftGift } from "../lib/store";
import { THEMES, applyTheme, type ThemeId } from "./Shop";
import GradientButton from "../components/GradientButton";

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
  const [activeTab, setActiveTab] = useState<"themes" | "gifts">("gifts");
  const [balance, setBalance] = useState(() => getBalance(nick));
  const [gifts, setGifts] = useState<NftGift[]>([]);
  const [selectedGift, setSelectedGift] = useState<NftGift | null>(null);
  const [currentTheme, setCurrentTheme] = useState<ThemeId>(() => (localStorage.getItem("crp_theme") as ThemeId) || "lime");
  const [ownedThemes, setOwnedThemes] = useState<ThemeId[]>(() => JSON.parse(localStorage.getItem(`crp_owned_themes_${nick}`) || '["lime"]'));

  useEffect(() => {
    const load = async () => setGifts(await store.getNftGifts());
    load();
  }, []);

  const handleThemeAction = (theme: typeof THEMES[0]) => {
    if (ownedThemes.includes(theme.id)) {
      applyTheme(theme);
      setCurrentTheme(theme.id);
      return;
    }
    if (balance >= theme.price) {
      addBalance(nick, -theme.price);
      const newOwned = [...ownedThemes, theme.id];
      setOwnedThemes(newOwned);
      localStorage.setItem(`crp_owned_themes_${nick}`, JSON.stringify(newOwned));
      applyTheme(theme);
      setCurrentTheme(theme.id);
      setBalance(getBalance(nick));
      toast.success("Тему придбано!");
    } else {
      toast.error("Мало CR!");
    }
  };

  return (
    <div className="min-h-screen pb-24 px-4 pt-6 bg-black text-white">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-black italic uppercase italic">МАГАЗИН<span className="text-primary">.</span></h1>
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-2xl">
          <Zap className="w-4 h-4 text-primary" />
          <span className="font-black text-primary">{balance} CR</span>
        </div>
      </div>

      <div className="flex gap-2 mb-8 p-1.5 bg-white/5 rounded-3xl border border-white/5">
        <button onClick={() => setActiveTab("themes")} className={`flex-1 py-3.5 rounded-[1.5rem] text-[10px] font-black uppercase transition-all ${activeTab === "themes" ? "bg-primary text-black" : "text-zinc-500"}`}>
          <Palette className="w-3.5 h-3.5 inline mr-2" /> Теми
        </button>
        <button onClick={() => setActiveTab("gifts")} className={`flex-1 py-3.5 rounded-[1.5rem] text-[10px] font-black uppercase transition-all ${activeTab === "gifts" ? "bg-primary text-black" : "text-zinc-500"}`}>
          <Gift className="w-3.5 h-3.5 inline mr-2" /> NFT Gifts
        </button>
      </div>

      {activeTab === "themes" ? (
        <div className="grid gap-3 animate-in fade-in">
          {THEMES.map((theme) => {
            const isActive = currentTheme === theme.id;
            return (
              <div key={theme.id} className={`p-4 rounded-[2rem] border ${isActive ? 'border-primary bg-primary/10' : 'border-white/5 bg-white/5'}`}>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl" style={{ background: theme.preview }} />
                  <div className="flex-1 text-xs font-black uppercase">{theme.name}</div>
                  <button onClick={() => handleThemeAction(theme)} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase ${isActive ? 'bg-primary text-black' : 'bg-white/10'}`}>
                    {isActive ? "Акт." : ownedThemes.includes(theme.id) ? "Вибр." : `${theme.price} CR`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 animate-in fade-in">
          {gifts.map((gift) => (
            <div key={gift.id} onClick={() => setSelectedGift(gift)} className="bg-zinc-900/50 border border-white/5 rounded-[2.5rem] p-4 flex flex-col items-center active:scale-95 transition-all">
              <div className="w-full aspect-square mb-3 bg-black/40 rounded-[2rem] flex items-center justify-center p-3">
                <GiftMedia url={gift.image_url} className="w-full h-full" />
              </div>
              <p className="text-[10px] font-black uppercase text-zinc-500 truncate w-full text-center">{gift.name}</p>
              <p className="text-xs font-black text-primary mt-1">{gift.price} CR</p>
            </div>
          ))}
        </div>
      )}

      {selectedGift && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl animate-in fade-in">
          <div className="w-full max-w-sm bg-zinc-900 border border-white/10 rounded-[3rem] p-8 relative text-center">
            <button onClick={() => setSelectedGift(null)} className="absolute top-8 right-8 text-white/20"><X /></button>
            <h2 className="text-2xl font-black italic mb-8 uppercase tracking-tighter">{selectedGift.name}</h2>
            <div className="w-48 h-48 mx-auto mb-10"><GiftMedia url={selectedGift.image_url} className="w-full h-full" /></div>
            <GradientButton variant="green" className="w-full py-5 rounded-2xl font-black uppercase text-xs" onClick={() => { store.buyNftGift(nick, selectedGift); setSelectedGift(null); setBalance(getBalance(nick)); }}>
              Купити за {selectedGift.price} CR
            </GradientButton>
          </div>
        </div>
      )}
    </div>
  );
};

export default Casino;
