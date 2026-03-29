import { useState, useEffect } from "react";
import { Palette, Check, Zap, Gift, X, ShoppingBag, Diamond } from "lucide-react";
import { toast } from "sonner";
import { getBalance, addBalance, store, type NftGift } from "../lib/store";
import { THEMES, applyTheme, type ThemeId } from "./Shop";
import GradientButton from "../components/GradientButton";

// ─── КОМПОНЕНТ ДЛЯ МЕДІА (ПРАЦЮЄ З .TGS ТА .JSON) ──────────────────────────
const GiftMedia = ({ url, className, isModal = false }: { url: string; className?: string; isModal?: boolean }) => {
  const isAnimated = url.toLowerCase().includes(".tgs") || url.toLowerCase().includes(".json");
  const shadowColor = isModal ? "rgba(var(--primary-rgb), 0.6)" : "rgba(0,0,0,0.3)";

  if (isAnimated) {
    return (
      <div className={`${className} flex items-center justify-center`} style={{ filter: `drop-shadow(0 0 35px ${shadowColor})` }}>
        {/* @ts-ignore */}
        <dotlottie-player
          autoplay
          loop
          src={url}
          style={{ height: "100%", width: "100%" }}
          background="transparent"
        />
      </div>
    );
  }
  return <img src={url} className={`${className} object-contain`} alt="gift" style={{ filter: `drop-shadow(0 0 30px ${shadowColor})` }} />;
};

const Casino = () => {
  const nick = localStorage.getItem("crp_nick") || "";
  const [activeTab, setActiveTab] = useState<"themes" | "gifts">("gifts");
  const [balance, setBalance] = useState(() => getBalance(nick));
  const [loading, setLoading] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<ThemeId>(() => (localStorage.getItem("crp_theme") as ThemeId) || "lime");
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
    <div className="min-h-screen pb-20 px-4 pt-4 relative overflow-hidden">
      {/* Background Glows */}
      <div className="fixed -top-40 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="flex items-center justify-between mb-5 relative z-10">
        <h1 className="font-display text-xl font-black tracking-widest neon-text-current uppercase italic">МАГАЗИН</h1>
        <div className="flex items-center gap-1.5 liquid-glass px-4 py-2.5 rounded-2xl border border-primary/20">
          <Zap className="w-3.5 h-3.5 text-primary" />
          <span className="text-sm font-black text-primary">{balance} CR</span>
        </div>
      </div>

      {/* Grid Gifts */}
      {activeTab === "gifts" && (
        <div className="grid grid-cols-2 gap-4 animate-fade-in relative z-10">
          {gifts.map((gift) => (
            <div key={gift.id} onClick={() => setSelectedGift(gift)} className="liquid-glass-card rounded-3xl p-4 flex flex-col items-center border border-white/5 active:scale-95 transition-all duration-300 group">
              <div className="w-full aspect-square mb-3 bg-black/20 rounded-2xl flex items-center justify-center p-3 relative">
                <GiftMedia url={gift.image_url} className="w-full h-full" />
              </div>
              <p className="text-[10px] font-black uppercase truncate w-full text-center text-foreground">{gift.name}</p>
              <p className="text-[11px] text-primary font-black mt-1">{gift.price} CR</p>
            </div>
          ))}
        </div>
      )}

      {/* ПЕРЕРОБЛЕНА NFT КАРТКА (MODAL) */}
      {selectedGift && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-5 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
          {/* Світіння під карткою */}
          <div className="absolute w-full h-full bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

          <div className="w-full max-w-sm bg-[#0a0a0a]/70 backdrop-blur-2xl rounded-[3rem] p-8 relative border border-white/10 text-center animate-in zoom-in-95 duration-300 overflow-hidden">
            <button onClick={() => setSelectedGift(null)} className="absolute top-7 right-7 text-white/30 hover:text-white z-20"><X /></button>
            
            <div className="relative z-10 flex flex-col items-center">
              <div className="flex items-center gap-2 mb-1.5">
                <Diamond className="w-3 h-3 text-primary" />
                <span className="text-[9px] font-black uppercase text-primary tracking-[0.3em]">Exclusive NFT</span>
                <Diamond className="w-3 h-3 text-primary" />
              </div>
              <h2 className="text-2xl font-black mb-10 uppercase italic text-foreground">{selectedGift.name}</h2>
              
              {/* АНІМАЦІЯ NFT */}
              <div className="w-52 h-52 mx-auto mb-10 relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl scale-110 animate-pulse" />
                <GiftMedia url={selectedGift.image_url} className="w-full h-full relative z-10" isModal={true} />
              </div>
              
              <div className="w-full liquid-glass-card rounded-3xl p-5 border border-white/10 flex items-center justify-between mb-8 bg-white/5">
                <div className="text-left">
                  <span className="text-[10px] text-muted-foreground uppercase font-black">Вартість</span>
                  <div className="text-2xl font-black text-primary tracking-tighter">{selectedGift.price} CR</div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                   <ShoppingBag className="text-primary w-6 h-6" />
                </div>
              </div>
              
              <GradientButton variant="green" className="w-full py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg" onClick={() => handleBuyGift(selectedGift)} disabled={loading}>
                {loading ? "Транзакція..." : "Придбати зараз"}
              </GradientButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Casino;
