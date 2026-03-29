import { useState, useEffect } from "react";
import { Palette, Check, Zap, Lock, ShoppingCart, Gift, X, ShoppingBag, Diamond } from "lucide-react";
import { toast } from "sonner";
import { getBalance, addBalance, store, type NftGift } from "../lib/store";
import { THEMES, applyTheme, type ThemeId } from "./Shop";
import GradientButton from "../components/GradientButton";
import { Player } from "@lottiefiles/react-lottie-player";

// ─── ДОПОМІЖНИЙ КОМПОНЕНТ ДЛЯ МЕДІА (TGS/IMG) ──────────────────────────────
const GiftMedia = ({ url, className, isModal = false }: { url: string; className?: string; isModal?: boolean }) => {
  const isAnimated = url.toLowerCase().includes(".tgs") || url.toLowerCase().includes(".json");
  const shadowColor = isModal ? "rgba(var(--primary-rgb), 0.5)" : "rgba(0,0,0,0.3)";

  if (isAnimated) {
    return (
      <div className={`${className} flex items-center justify-center`} style={{ filter: `drop-shadow(0 0 30px ${shadowColor})` }}>
        <Player
          autoplay
          loop
          src={url}
          style={{ height: "100%", width: "100%" }}
        />
      </div>
    );
  }
  return <img src={url} className={`${className} object-contain`} alt="gift" style={{ filter: `drop-shadow(0 0 30px ${shadowColor})` }} />;
};

// ─── ОСНОВНИЙ КОМПОНЕНТ КАЗИНО ──────────────────────────────────────────────
const Casino = () => {
  const nick = localStorage.getItem("crp_nick") || "";
  
  // State
  const [activeTab, setActiveTab] = useState<"themes" | "gifts">("gifts");
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
    <div className="min-h-screen pb-20 px-4 pt-4 relative overflow-hidden">
      {/* Плавне світіння на фоні всього магазину */}
      <div className="fixed -top-40 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed -bottom-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-5 relative z-10">
        <div>
          <h1 className="font-display text-xl font-black tracking-widest neon-text-current uppercase italic">
            МАГАЗИН
          </h1>
          <p className="text-[10px] text-muted-foreground mt-0.5 uppercase font-bold tracking-wider">
            {activeTab === "themes" ? "Теми інтерфейсу" : "Ексклюзивні NFT"}
          </p>
        </div>
        <div className="flex items-center gap-1.5 liquid-glass px-4 py-2.5 rounded-2xl border border-primary/20 shadow-[0_0_15px_hsl(var(--primary)/0.1)]">
          <Zap className="w-3.5 h-3.5 text-primary" />
          <span className="text-sm font-black text-primary tracking-tight">{balance} CR</span>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex gap-2.5 mb-6 p-1.5 bg-white/5 rounded-2xl border border-white/5 relative z-10">
        <button 
          onClick={() => setActiveTab("themes")}
          className={`flex-1 flex items-center justify-center gap-2.5 py-3 rounded-xl text-[10px] font-black uppercase transition-all duration-300 ${activeTab === "themes" ? "bg-primary text-black shadow-[0_0_20px_hsl(var(--primary)/0.3)] scale-[1.02]" : "text-muted-foreground hover:bg-white/5"}`}
        >
          <Palette className="w-3.5 h-3.5" /> Теми
        </button>
        <button 
          onClick={() => setActiveTab("gifts")}
          className={`flex-1 flex items-center justify-center gap-2.5 py-3 rounded-xl text-[10px] font-black uppercase transition-all duration-300 ${activeTab === "gifts" ? "bg-primary text-black shadow-[0_0_20px_hsl(var(--primary)/0.3)] scale-[1.02]" : "text-muted-foreground hover:bg-white/5"}`}
        >
          <Gift className="w-3.5 h-3.5" /> Gifts
        </button>
      </div>

      {/* THEMES TAB */}
      {activeTab === "themes" && (
        <div className="space-y-3 animate-fade-in relative z-10">
          <p className="text-[11px] text-muted-foreground text-center mb-5 px-4 font-medium leading-relaxed">
            Вибери акцентний колір, який буде застосовано до всього інтерфейсу додатку.
          </p>
          {THEMES.map((theme, i) => {
            const isOwned = ownedThemes.includes(theme.id);
            const isActive = currentTheme === theme.id;
            return (
              <div key={theme.id} className="animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
                <div
                  className="rounded-3xl p-4 transition-all duration-300"
                  style={{
                    background: isActive
                      ? `linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--primary) / 0.05))`
                      : "linear-gradient(135deg, hsl(0 0% 100% / 0.05), hsl(0 0% 100% / 0.02))",
                    border: `1px solid ${isActive ? "hsl(var(--primary) / 0.5)" : "hsl(0 0% 100% / 0.08)"}`,
                    boxShadow: isActive ? "0 0 25px hsl(var(--primary) / 0.15)" : "none",
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl shrink-0 relative overflow-hidden shadow-inner"
                      style={{ background: theme.preview, border: "3px solid hsl(0 0% 100% / 0.1)" }}>
                      {isActive && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
                          <Check className="w-8 h-8 text-white drop-shadow-md" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-foreground uppercase tracking-tight mb-0.5">{theme.name}</p>
                      <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">{theme.description}</p>
                      {!isOwned && theme.price > 0 && (
                        <p className="text-[11px] text-primary font-black mt-1 tracking-tighter">{theme.price} CR</p>
                      )}
                    </div>
                    <div className="shrink-0">
                      <button
                        onClick={() => buyOrActivate(theme)}
                        className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all duration-300 ${
                          isActive ? "text-primary border border-primary/20 bg-primary/10" : "liquid-glass hover:bg-white/10 active:scale-95"
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
        <div className="grid grid-cols-2 gap-4 animate-fade-in relative z-10">
          {gifts.map((gift) => (
            <div 
              key={gift.id} 
              onClick={() => setSelectedGift(gift)} 
              className="liquid-glass-card rounded-3xl p-4 flex flex-col items-center border border-white/5 active:scale-95 transition-all duration-300 hover:border-primary/20 group"
            >
              <div className="w-full aspect-square mb-3 bg-black/20 rounded-2xl flex items-center justify-center p-3 relative overflow-hidden">
                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-lg" />
                <GiftMedia url={gift.image_url} className="w-full h-full" />
              </div>
              <p className="text-[10px] font-black uppercase truncate w-full text-center tracking-wider text-foreground">{gift.name}</p>
              <p className="text-[11px] text-primary font-black mt-1.5 tracking-tighter shadow-primary">{gift.price} CR</p>
            </div>
          ))}
        </div>
      )}

      {/* ПЕРЕРОБЛЕНЕ GIFT MODAL (НФТ КАРТКА) */}
      {selectedGift && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-5 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
          
          {/* Динамічне світіння позаду картки, що підлаштовується під тему */}
          <div className="absolute w-[120%] h-[120%] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

          <div className="w-full max-w-sm bg-[#0a0a0a]/60 backdrop-blur-2xl rounded-[3rem] p-8 relative border border-white/10 text-center animate-in zoom-in-95 duration-300 shadow-[0_0_60px_rgba(0,0,0,0.5)] overflow-hidden">
            
            {/* Внутрішнє свічення зверху картки */}
            <div className="absolute -top-20 -left-20 w-40 h-40 bg-primary/20 rounded-full blur-3xl pointer-events-none" />

            <button onClick={() => setSelectedGift(null)} className="absolute top-7 right-7 text-white/30 hover:text-white transition-colors z-20">
              <X className="w-6 h-6" />
            </button>
            
            <div className="relative z-10 flex flex-col items-center">
              {/* Заголовок */}
              <div className="flex items-center gap-2.5 mb-1.5">
                <Diamond className="w-4 h-4 text-primary" />
                <div className="text-[10px] font-black uppercase text-primary/80 tracking-[0.2em]">Exclsuive NFT</div>
                <Diamond className="w-4 h-4 text-primary" />
              </div>
              <h2 className="text-3xl font-black mb-10 uppercase italic text-foreground tracking-tight drop-shadow-sm">{selectedGift.name}</h2>
              
              {/* Велика анімована NFT медіа */}
              <div className="w-56 h-56 mx-auto mb-12 flex items-center justify-center relative">
                <div className="absolute inset-0 bg-primary/10 rounded-full blur-3xl scale-125" />
                <GiftMedia url={selectedGift.image_url} className="w-full h-full relative z-10" isModal={true} />
              </div>
              
              {/* Інфо Блок */}
              <div className="w-full liquid-glass-card rounded-3xl p-5 border border-white/5 flex items-center justify-between mb-8 shadow-inner bg-black/20">
                <div className="text-left">
                  <span className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Поточна ціна</span>
                  <div className="text-2xl font-black text-primary tracking-tighter">{selectedGift.price} CR</div>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                   <ShoppingBag className="text-primary w-7 h-7" />
                </div>
              </div>
              
              {/* Кнопка Придбати */}
              <GradientButton 
                variant="green" 
                className="w-full py-5 rounded-2xl font-black uppercase text-xs tracking-[0.15em] shadow-[0_10px_30px_rgba(var(--green-rgb),0.3)] hover:shadow-[0_10px_30px_rgba(var(--green-rgb),0.5)] transition-all duration-300" 
                onClick={() => handleBuyGift(selectedGift)} 
                disabled={loading}
              >
                {loading ? "Обробка транзакції..." : "Придбати NFT подарунок"}
              </GradientButton>
              
              <p className="text-[9px] text-muted-foreground mt-4 uppercase font-medium tracking-wide">Товар буде миттєво додано до вашого профілю</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Casino;
