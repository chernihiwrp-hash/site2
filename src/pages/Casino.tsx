import { useState, useEffect, useRef } from "react";
import { Palette, Check, Zap, Gift, X, ShoppingBag, Diamond, Upload, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { getBalance, addBalance, store, type NftGift } from "../lib/store";
import { THEMES, applyTheme, type ThemeId } from "./Shop";
import GradientButton from "../components/GradientButton";

// ─── КОМПОНЕНТ ДЛЯ МЕДІА (ПІДТРИМКА .TGS ТА .JSON) ──────────────────────────
const GiftMedia = ({ url, className, isModal = false }: { url: string; className?: string; isModal?: boolean }) => {
  const isAnimated = url.toLowerCase().includes(".tgs") || url.toLowerCase().includes(".json") || url.startsWith("blob:");
  const shadowColor = isModal ? "rgba(var(--primary-rgb), 0.6)" : "rgba(var(--primary-rgb), 0.2)";

  if (isAnimated) {
    return (
      <div className={`${className} flex items-center justify-center`} style={{ filter: `drop-shadow(0 0 35px ${shadowColor})` }}>
        {/* @ts-ignore */}
        <dotlottie-player
          autoplay
          loop
          src={url}
          background="transparent"
          style={{ width: "100%", height: "100%" }}
        ></dotlottie-player>
      </div>
    );
  }

  return (
    <img 
      src={url} 
      className={`${className} object-contain`} 
      alt="gift" 
      style={{ filter: `drop-shadow(0 0 25px ${shadowColor})` }} 
    />
  );
};

// ─── ОСНОВНИЙ КОМПОНЕНТ ──────────────────────────────────────────────────────
const Casino = () => {
  const nick = localStorage.getItem("crp_nick") || "";
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeTab, setActiveTab] = useState<"themes" | "gifts">("gifts");
  const [balance, setBalance] = useState(() => getBalance(nick));
  const [loading, setLoading] = useState(false);
  
  const [currentTheme, setCurrentTheme] = useState<ThemeId>(
    () => (localStorage.getItem("crp_theme") as ThemeId) || "lime"
  );
  const [ownedThemes, setOwnedThemes] = useState<ThemeId[]>(() => {
    try { return JSON.parse(localStorage.getItem(`crp_owned_themes_${nick}`) || '["lime"]'); }
    catch { return ["lime"]; }
  });

  const [gifts, setGifts] = useState<NftGift[]>([]);
  const [selectedGift, setSelectedGift] = useState<NftGift | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setBalance(getBalance(nick));
      const nftData = await store.getNftGifts();
      setGifts(nftData);
    };
    fetchData();
  }, [nick]);

  // ФУНКЦІЯ ТЕСТОВОГО ЗАВАНТАЖЕННЯ (ДЛЯ ТЕБЕ)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    const tempGift: NftGift = {
      id: `dev-${Date.now()}`,
      name: file.name.replace(".tgs", "").replace(".json", ""),
      price: 777,
      image_url: objectUrl,
    };

    setGifts([tempGift, ...gifts]);
    toast.success("Анімацію додано для тесту!");
  };

  const handleBuyGift = async (gift: NftGift) => {
    setLoading(true);
    const success = await store.buyNftGift(nick, gift);
    if (success) {
      toast.success(`NFT "${gift.name}" придбано!`);
      setBalance(getBalance(nick));
      setSelectedGift(null);
    } else {
      toast.error("Недостатньо CR");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen pb-24 px-4 pt-4 relative overflow-hidden bg-black">
      {/* Background Neon Glows */}
      <div className="fixed -top-40 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed -bottom-40 -right-40 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div>
          <h1 className="font-display text-2xl font-black tracking-tighter text-white italic uppercase">
            Магазин<span className="text-primary">.</span>
          </h1>
          <div className="h-1 w-8 bg-primary rounded-full mt-1" />
        </div>
        <div className="flex items-center gap-2 liquid-glass px-4 py-2 rounded-2xl border border-white/10 shadow-[0_0_20px_rgba(var(--primary-rgb),0.1)]">
          <Zap className="w-4 h-4 text-primary animate-pulse" />
          <span className="font-black text-primary tracking-tight">{balance} CR</span>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex gap-2 mb-8 p-1.5 bg-white/5 rounded-[2rem] border border-white/5 relative z-10">
        <button onClick={() => setActiveTab("themes")} className={`flex-1 py-3.5 rounded-[1.5rem] text-[10px] font-black uppercase transition-all duration-500 ${activeTab === "themes" ? "bg-primary text-black shadow-lg scale-[1.02]" : "text-zinc-500"}`}>
          <Palette className="w-3.5 h-3.5 inline mr-2" /> Теми
        </button>
        <button onClick={() => setActiveTab("gifts")} className={`flex-1 py-3.5 rounded-[1.5rem] text-[10px] font-black uppercase transition-all duration-500 ${activeTab === "gifts" ? "bg-primary text-black shadow-lg scale-[1.02]" : "text-zinc-500"}`}>
          <Gift className="w-3.5 h-3.5 inline mr-2" /> Gifts
        </button>
      </div>

      {/* ADMIN UPLOAD SECTION (HIDDEN) */}
      <div className="mb-8 relative z-10">
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".tgs,.json" />
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-4 bg-white/5 border border-dashed border-white/10 rounded-3xl flex items-center justify-center gap-3 text-zinc-500 hover:text-primary hover:border-primary/50 transition-all active:scale-95"
        >
          <Upload className="w-4 h-4" />
          <span className="text-[9px] font-black uppercase tracking-widest">Тест завантаження .TGS</span>
        </button>
      </div>

      {/* Gifts Grid */}
      {activeTab === "gifts" && (
        <div className="grid grid-cols-2 gap-4 animate-fade-in relative z-10">
          {gifts.map((gift) => (
            <div 
              key={gift.id} 
              onClick={() => setSelectedGift(gift)} 
              className="liquid-glass-card rounded-[2.5rem] p-4 flex flex-col items-center border border-white/5 active:scale-95 transition-all group"
            >
              <div className="w-full aspect-square mb-4 bg-zinc-950/50 rounded-[2rem] flex items-center justify-center p-4 relative overflow-hidden border border-white/5">
                <GiftMedia url={gift.image_url} className="w-full h-full" />
              </div>
              <p className="text-[10px] font-black uppercase truncate w-full text-center text-zinc-400 mb-1">{gift.name}</p>
              <div className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-primary" />
                <p className="text-xs font-black text-primary tracking-tighter">{gift.price} CR</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL NFT CARD */}
      {selectedGift && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-2xl animate-in fade-in duration-300">
          <div className="absolute w-full h-full bg-primary/5 rounded-full blur-[150px] pointer-events-none" />
          
          <div className="w-full max-w-sm bg-zinc-900/40 border border-white/10 rounded-[3.5rem] p-8 relative text-center animate-in zoom-in-95 duration-300">
            <button onClick={() => setSelectedGift(null)} className="absolute top-8 right-8 text-white/20 hover:text-white"><X /></button>
            
            <div className="flex items-center justify-center gap-2.5 mb-2 text-primary/60">
              <Diamond className="w-3 h-3" />
              <span className="text-[9px] font-black uppercase tracking-[0.4em]">Exclusive NFT</span>
              <Diamond className="w-3 h-3" />
            </div>
            
            <h2 className="text-3xl font-black italic mb-10 uppercase text-white tracking-tight">{selectedGift.name}</h2>
            
            <div className="w-56 h-56 mx-auto mb-12 relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-[60px] animate-pulse" />
              <GiftMedia url={selectedGift.image_url} className="w-full h-full relative z-10" isModal />
            </div>

            <div className="w-full bg-white/5 rounded-3xl p-6 border border-white/5 flex items-center justify-between mb-8 shadow-inner">
              <div className="text-left">
                <span className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">Price Tag</span>
                <div className="text-3xl font-black text-primary tracking-tighter">{selectedGift.price} CR</div>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                 <ShoppingBag className="text-primary w-7 h-7" />
              </div>
            </div>
            
            <GradientButton 
              variant="green" 
              className="w-full py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl active:scale-95 transition-transform" 
              onClick={() => handleBuyGift(selectedGift)} 
              disabled={loading}
            >
              {loading ? "Processing..." : "Confirm Purchase"}
            </GradientButton>
            
            <p className="text-[8px] text-zinc-600 mt-5 uppercase font-bold tracking-widest">Digital asset will be added to your account instantly</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Casino;
