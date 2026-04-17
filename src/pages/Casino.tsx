import { useState, useEffect, useCallback } from "react";
import { Palette, Check, Zap, Gift, X, Coins, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { store, type NftGift, supabase } from "../lib/store";
import { THEMES, applyTheme, type ThemeId } from "./Shop";

const GLOBAL_STYLES = `
  @keyframes card-enter {
    0%   { opacity: 0; transform: translateY(20px) scale(0.94); }
    100% { opacity: 1; transform: translateY(0)    scale(1); }
  }
  @keyframes modal-in {
    0%   { opacity: 0; transform: scale(0.84) translateY(18px); }
    100% { opacity: 1; transform: scale(1)    translateY(0); }
  }
  @keyframes fade-backdrop {
    0%   { opacity: 0; }
    100% { opacity: 1; }
  }
  @keyframes success-in {
    0%   { opacity: 0; transform: scale(0.72) translateY(24px) rotateX(12deg); }
    100% { opacity: 1; transform: scale(1)    translateY(0)    rotateX(0deg); }
  }
  @keyframes badge-pop {
    0%   { opacity: 0; transform: scale(0) rotate(-20deg); }
    70%  { transform: scale(1.3) rotate(5deg); }
    100% { opacity: 1; transform: scale(1)   rotate(0deg); }
  }
  @keyframes halo-pulse {
    0%,100% { opacity: .75; transform: scale(1.4); }
    50%     { opacity: 1;   transform: scale(1.7); }
  }
  @keyframes particle {
    0%   { opacity: 1; transform: translate(-50%,-50%) translate(var(--px),var(--py)) scale(1); }
    100% { opacity: 0; transform: translate(-50%,-50%) translate(var(--px2),var(--py2)) scale(.15); }
  }
  @keyframes progress-drain {
    0%   { width: 100%; }
    100% { width: 0%; }
  }
  @keyframes shine-sweep {
    0%       { transform: translateX(-120%); }
    30%,100% { transform: translateX(220%); }
  }
  @keyframes glow-breathe {
    0%,100% { opacity: .6; }
    50%     { opacity: 1; }
  }
`;

const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round"
    style={{ width: 26, height: 26, color: "rgba(255,255,255,0.5)", filter: "drop-shadow(0 2px 10px rgba(0,0,0,0.9))" }}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const GiftMedia = ({ url, className }: { url: string; className?: string }) => {
  const isAnim = url.toLowerCase().includes(".tgs") || url.toLowerCase().includes(".json");
  if (isAnim)
    return (
      <div className={`${className} flex items-center justify-center`}>
        {/* @ts-ignore */}
        <dotlottie-player autoplay loop src={url} background="transparent"
          style={{ width: "100%", height: "100%" }} />
      </div>
    );
  return <img src={url} className={`${className} object-contain rounded-2xl`} alt="nft" />;
};

const PurchaseSuccess = ({ gift, onClose }: { gift: NftGift; onClose: () => void }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 3800);
    return () => clearTimeout(t);
  }, [onClose]);

  const particles = Array.from({ length: 20 }, (_, i) => {
    const angle = (i / 20) * Math.PI * 2;
    const r  = 110 + Math.random() * 90;
    const r2 = r + 60 + Math.random() * 60;
    const colors = ["hsl(var(--primary))", "#fff", "hsl(var(--primary)/0.5)", "#ffc940"];
    return {
      color: colors[i % colors.length], size: 4 + Math.random() * 6,
      px: `0px`, py: `0px`,
      px2: `${Math.cos(angle) * r2}px`, py2: `${Math.sin(angle) * (-r2 * 0.8)}px`,
      delay: i * 0.045,
    };
  });

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ perspective: "900px", pointerEvents: "none" }}>
      {particles.map((p, i) => (
        <div key={i} className="absolute left-1/2 top-1/2 rounded-full"
          style={{ width: p.size, height: p.size, background: p.color, boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
            "--px": p.px, "--py": p.py, "--px2": p.px2, "--py2": p.py2,
            animation: `particle 1.3s ${p.delay}s cubic-bezier(0.22,1,0.36,1) forwards` } as any} />
      ))}
      <div className="relative flex flex-col items-center gap-5 px-10 py-8"
        style={{ background: "linear-gradient(150deg, hsl(0 0% 8%/0.97), hsl(0 0% 3%/0.98))", border: "1px solid hsl(var(--primary)/0.3)", borderRadius: 36, boxShadow: "0 0 0 1px hsl(var(--primary)/0.07), 0 40px 80px rgba(0,0,0,.8), 0 0 80px hsl(var(--primary)/0.18)", animation: "success-in 0.55s cubic-bezier(0.34,1.5,0.64,1) forwards" }}>
        <div className="absolute inset-0 rounded-[36px] pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 55% at 50% 0%, hsl(var(--primary)/0.14) 0%, transparent 70%)" }} />
        <div className="relative">
          <div className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle, hsl(var(--primary)/0.45) 0%, transparent 65%)", filter: "blur(22px)", animation: "halo-pulse 1.6s ease-in-out infinite" }} />
          <div className="relative w-28 h-28 rounded-[26px] overflow-hidden flex items-center justify-center"
            style={{ background: "hsl(0 0% 100% / 0.03)", border: "1.5px solid hsl(var(--primary)/0.28)", boxShadow: "0 0 28px hsl(var(--primary)/0.2)" }}>
            <GiftMedia url={gift.image_url} className="w-full h-full p-3" />
          </div>
          <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "hsl(var(--primary))", boxShadow: "0 0 18px hsl(var(--primary)/0.8)", animation: "badge-pop 0.45s 0.45s cubic-bezier(0.34,1.56,0.64,1) both" }}>
            <Check className="w-4 h-4 text-black stroke-[3px]" />
          </div>
        </div>
        <div className="flex flex-col items-center gap-1 relative z-10">
          <p className="text-[9px] font-black uppercase tracking-[0.35em]" style={{ color: "hsl(var(--primary))" }}>Придбано успішно</p>
          <p className="text-xl font-black text-white uppercase italic tracking-tight">{gift.name}</p>
          <p className="text-[10px] text-zinc-500 font-bold mt-0.5">Предмет додано до вашого інвентарю</p>
        </div>
        <div className="relative w-full h-[2px] rounded-full overflow-hidden" style={{ background: "hsl(0 0% 100% / 0.07)" }}>
          <div className="absolute inset-y-0 left-0 rounded-full"
            style={{ background: "hsl(var(--primary))", boxShadow: "0 0 8px hsl(var(--primary))", animation: "progress-drain 3.5s linear forwards" }} />
        </div>
      </div>
    </div>
  );
};

const NftCard = ({ gift, index, onClick }: { gift: NftGift; index: number; onClick: () => void }) => {
  const [hovered, setHovered] = useState(false);
  const isSold = !!gift.sold;

  return (
    <div
      onClick={isSold ? undefined : onClick}
      onMouseEnter={() => !isSold && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative"
      style={{
        animation: `card-enter 0.5s ${index * 0.07}s cubic-bezier(0.34,1.15,0.64,1) both`,
        cursor: isSold ? "not-allowed" : "pointer",
      }}
    >
      <div className="relative rounded-[28px] p-[1px]"
        style={{
          background: isSold
            ? "linear-gradient(135deg, hsl(0 0% 100% / 0.025), hsl(0 0% 100% / 0.01))"
            : hovered
            ? "linear-gradient(135deg, hsl(var(--primary)/0.55), hsl(var(--primary)/0.08) 55%, hsl(var(--primary)/0.35))"
            : "linear-gradient(135deg, hsl(0 0% 100% / 0.06), hsl(0 0% 100% / 0.02))",
          boxShadow: hovered && !isSold ? "0 0 40px hsl(var(--primary)/0.22), 0 18px 36px rgba(0,0,0,.45)" : "0 4px 16px rgba(0,0,0,.3)",
          transform: hovered && !isSold ? "translateY(-5px) scale(1.025)" : "translateY(0) scale(1)",
          transition: "all 0.38s cubic-bezier(0.34,1,0.64,1)",
        }}>
        <div className="relative rounded-[27px] overflow-hidden flex flex-col items-center p-4 gap-3"
          style={{ background: isSold ? "#060606" : "linear-gradient(170deg, #0d0d0d, #070707)" }}>
          {!isSold && (
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-28 h-16 rounded-full"
              style={{ background: "hsl(var(--primary)/0.3)", filter: "blur(18px)", opacity: hovered ? 1 : 0, animation: hovered ? "glow-breathe 2s ease-in-out infinite" : "none", transition: "opacity 0.4s" }} />
          )}
          <div className="relative w-full aspect-square rounded-[20px] flex items-center justify-center overflow-hidden"
            style={{ background: isSold ? "hsl(0 0% 4%)" : "radial-gradient(circle at 50% 45%, hsl(var(--primary)/0.07) 0%, transparent 70%)", border: isSold ? "1px solid hsl(0 0% 100% / 0.03)" : "1px solid hsl(0 0% 100% / 0.05)" }}>
            <div className="w-4/5 h-4/5 relative z-10" style={{ opacity: isSold ? 0.15 : 1, filter: isSold ? "grayscale(100%) brightness(0.35)" : "none" }}>
              <GiftMedia url={gift.image_url} className="w-full h-full drop-shadow-2xl" />
            </div>
            {!isSold && (
              <div className="absolute inset-0 rounded-[20px]" style={{ background: "radial-gradient(circle at 50% 50%, hsl(var(--primary)/0.14) 0%, transparent 65%)", opacity: hovered ? 1 : 0, transition: "opacity 0.5s" }} />
            )}
            {isSold && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center">
                <div className="flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl" style={{ background: "rgba(0,0,0,0.65)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <LockIcon />
                  <span className="text-[8px] font-black uppercase tracking-[0.25em]" style={{ color: "rgba(255,255,255,0.3)" }}>SOLD</span>
                </div>
              </div>
            )}
          </div>
          <div className="w-full flex items-end justify-between px-1">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.22em] mb-0.5" style={{ color: isSold ? "rgba(255,255,255,0.12)" : "hsl(var(--primary)/0.55)" }}>NFT</p>
              <p className="text-[11px] font-black uppercase tracking-tight truncate max-w-[80px]" style={{ color: isSold ? "rgba(255,255,255,0.2)" : "white" }}>{gift.name}</p>
            </div>
            {isSold ? (
              <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl" style={{ background: "hsl(0 0% 100% / 0.02)", border: "1px solid hsl(0 0% 100% / 0.05)" }}>
                <Coins className="w-3 h-3" style={{ color: "rgba(255,255,255,0.15)" }} />
                <span className="text-[10px] font-black" style={{ color: "rgba(255,255,255,0.18)", textDecoration: "line-through" }}>{gift.price}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl" style={{ background: "hsl(var(--primary)/0.1)", border: "1px solid hsl(var(--primary)/0.2)" }}>
                <Coins className="w-3 h-3" style={{ color: "hsl(var(--primary))" }} />
                <span className="text-[10px] font-black text-white">{gift.price}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Casino ─────────────────────────────────────────────────────── */
const Casino = () => {
  const nick = localStorage.getItem("crp_nick") || "";
  const [activeTab, setActiveTab] = useState<"themes" | "gifts">("themes");
  const [balance, setBalance] = useState(0);
  const [gifts, setGifts] = useState<NftGift[]>([]);
  const [selectedGift, setSelectedGift] = useState<NftGift | null>(null);
  const [purchasedGift, setPurchasedGift] = useState<NftGift | null>(null);
  const [loading, setLoading] = useState(true);
  const [buyingTheme, setBuyingTheme] = useState(false);
  const [buyingNft, setBuyingNft] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<ThemeId>("lime");
  const [ownedThemes, setOwnedThemes] = useState<ThemeId[]>(["lime"]);

  // ── Завантаження всіх даних з Supabase ────────────────────────────────────
  const loadUserData = useCallback(async () => {
    if (!nick) return;
    try {
      const { data } = await supabase
        .from("users")
        .select("balance, active_theme, owned_themes")
        .ilike("username", nick)
        .maybeSingle();

      if (data) {
        setBalance((data.balance as number) || 0);

        const dbOwned: ThemeId[] = Array.isArray(data.owned_themes) && data.owned_themes.length > 0
          ? data.owned_themes : ["lime"];
        if (!dbOwned.includes("lime")) dbOwned.unshift("lime");
        setOwnedThemes(dbOwned);

        const dbTheme = (data.active_theme as ThemeId) || "lime";
        setCurrentTheme(dbTheme);
        const themeObj = THEMES.find(t => t.id === dbTheme);
        if (themeObj) applyTheme(themeObj);
      }
    } catch (e) {
      console.error("Помилка завантаження:", e);
    }

    const nftData = await store.getNftGifts();
    setGifts(nftData);
    setLoading(false);
  }, [nick]);

  useEffect(() => {
    loadUserData();
    window.addEventListener("focus", loadUserData);
    return () => window.removeEventListener("focus", loadUserData);
  }, [loadUserData]);

  // ── Купівля / активація теми ───────────────────────────────────────────────
  const buyOrActivate = async (theme: typeof THEMES[0]) => {
    if (buyingTheme) return;

    // Якщо вже куплена — просто активуємо
    if (ownedThemes.includes(theme.id)) {
      applyTheme(theme);
      setCurrentTheme(theme.id);
      localStorage.setItem("crp_theme", theme.id);
      await supabase.from("users").update({ active_theme: theme.id }).ilike("username", nick);
      toast.success(`Тему "${theme.name}" активовано!`);
      return;
    }

    if (balance < theme.price) { toast.error("Недостатньо CR!"); return; }

    setBuyingTheme(true);
    try {
      // Беремо свіжий баланс з БД щоб не було подвійного списання
      const { data: fresh } = await supabase.from("users").select("balance").ilike("username", nick).maybeSingle();
      const freshBal = (fresh?.balance as number) ?? 0;

      if (freshBal < theme.price) {
        toast.error("Недостатньо CR!");
        setBuyingTheme(false);
        return;
      }

      const newBalance = freshBal - theme.price;
      const newOwned = [...ownedThemes, theme.id as ThemeId];

      const { error } = await supabase.from("users").update({
        balance: newBalance,
        owned_themes: newOwned,
        active_theme: theme.id,
      }).ilike("username", nick);

      if (error) { toast.error("Помилка: " + error.message); setBuyingTheme(false); return; }

      setBalance(newBalance);
      setOwnedThemes(newOwned);
      setCurrentTheme(theme.id as ThemeId);
      localStorage.setItem("crp_theme", theme.id);
      applyTheme(theme);
      toast.success(`Тему "${theme.name}" куплено!`);
    } catch (e) {
      toast.error("Щось пішло не так");
    }
    setBuyingTheme(false);
  };

  // ── Купівля NFT ────────────────────────────────────────────────────────────
  const handleBuyNft = async () => {
    if (!selectedGift || buyingNft) return;
    if (selectedGift.sold) { toast.error("Цей предмет вже продано"); setSelectedGift(null); return; }

    setBuyingNft(true);
    try {
      // Свіжий баланс з БД
      const { data: fresh } = await supabase.from("users").select("balance").ilike("username", nick).maybeSingle();
      const freshBal = (fresh?.balance as number) ?? 0;

      if (freshBal < selectedGift.price) {
        toast.error("Недостатньо CR!");
        setSelectedGift(null);
        setBuyingNft(false);
        return;
      }

      const newBalance = freshBal - selectedGift.price;

      // Списуємо баланс
      const { error: balError } = await supabase.from("users").update({ balance: newBalance }).ilike("username", nick);
      if (balError) { toast.error("Помилка списання балансу"); setBuyingNft(false); return; }

      // Записуємо власника NFT
      const { error: nftError } = await supabase.from("nft_owners").insert({ owner_nick: nick, nft_id: selectedGift.id });
      if (nftError) {
        // Повертаємо баланс якщо NFT не записався
        await supabase.from("users").update({ balance: freshBal }).ilike("username", nick);
        toast.error("Помилка покупки NFT");
        setBuyingNft(false);
        return;
      }

      setBalance(newBalance);
      const bought = selectedGift;
      setSelectedGift(null);
      // Оновлюємо список NFT
      const nftData = await store.getNftGifts();
      setGifts(nftData);
      setTimeout(() => setPurchasedGift(bought), 150);
    } catch (e) {
      toast.error("Щось пішло не так");
    }
    setBuyingNft(false);
  };

  return (
    <div className="min-h-screen pb-24 px-4 pt-4 relative overflow-hidden" style={{ background: "#050505" }}>
      <style>{GLOBAL_STYLES}</style>

      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[440px] h-[200px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse, hsl(var(--primary)/0.08) 0%, transparent 70%)", filter: "blur(50px)" }} />
      <div className="absolute bottom-40 right-0 w-[280px] h-[280px] pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(var(--primary)/0.05) 0%, transparent 70%)", filter: "blur(60px)" }} />

      {/* Header */}
      <div className="relative flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-black tracking-tighter text-white italic"
            style={{ textShadow: "0 0 32px hsl(var(--primary)/0.45)" }}>МАГАЗИН</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: "hsl(var(--primary))", boxShadow: "0 0 7px hsl(var(--primary))" }} />
            <p className="text-[9px] text-muted-foreground uppercase tracking-[0.22em] font-bold">Premium District</p>
          </div>
        </div>
        <div className="relative flex items-center gap-2.5 px-4 py-2.5 rounded-2xl overflow-hidden"
          style={{ background: "linear-gradient(135deg, hsl(0 0% 100% / 0.04), hsl(0 0% 100% / 0.02))", border: "1px solid hsl(0 0% 100% / 0.08)", boxShadow: "inset 0 1px 0 hsl(0 0% 100% / 0.06)" }}>
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(circle at 30% 50%, hsl(var(--primary)/0.09) 0%, transparent 60%)" }} />
          <Zap className="w-3.5 h-3.5 relative z-10" style={{ color: "hsl(var(--primary))", filter: "drop-shadow(0 0 6px hsl(var(--primary)))" }} />
          <span className="text-sm font-black text-white relative z-10">
            {loading ? "..." : balance} <span style={{ color: "hsl(var(--primary)/0.65)", fontSize: 9 }}>CR</span>
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-8 p-1.5 rounded-[22px]"
        style={{ background: "hsl(0 0% 100% / 0.02)", border: "1px solid hsl(0 0% 100% / 0.05)" }}>
        {(["themes", "gifts"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-[18px] text-[11px] font-black uppercase relative overflow-hidden"
            style={{
              transition: "all 0.35s cubic-bezier(0.34,1,0.64,1)",
              ...(activeTab === tab
                ? { background: "hsl(var(--primary))", color: "black", boxShadow: "0 0 22px hsl(var(--primary)/0.4), inset 0 1px 0 rgba(255,255,255,0.18)", transform: "scale(1.025)" }
                : { color: "hsl(0 0% 38%)" }),
            }}>
            {tab === "themes" ? <Palette className="w-4 h-4" /> : <Gift className="w-4 h-4" />}
            {tab === "themes" ? "Теми" : "NFT Предмети"}
          </button>
        ))}
      </div>

      {/* Themes */}
      {activeTab === "themes" && (
        <div className="grid gap-3">
          {loading ? (
            <div className="text-center text-zinc-600 text-sm py-12">Завантаження...</div>
          ) : THEMES.map((theme, i) => {
            const isOwned = ownedThemes.includes(theme.id);
            const isActive = currentTheme === theme.id;
            return (
              <div key={theme.id} className="relative overflow-hidden rounded-[24px] p-[1px]"
                style={{ background: isActive ? "linear-gradient(135deg, hsl(var(--primary)/0.5), hsl(var(--primary)/0.1) 50%, hsl(var(--primary)/0.3))" : "hsl(0 0% 100% / 0.04)", boxShadow: isActive ? "0 0 28px hsl(var(--primary)/0.14)" : "none", animation: `card-enter 0.42s ${i * 0.055}s cubic-bezier(0.34,1.15,0.64,1) both` }}>
                <div className="relative rounded-[23px] p-4 flex items-center gap-4" style={{ background: "#0a0a0a" }}>
                  <div className="w-14 h-14 rounded-xl shrink-0 overflow-hidden relative border border-white/10" style={{ background: theme.preview }}>
                    {isActive && (<div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px]"><Check className="w-5 h-5 text-white stroke-[3px]" style={{ filter: "drop-shadow(0 0 5px white)" }} /></div>)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-black text-white uppercase italic tracking-tight">{theme.name}</h3>
                    <p className="text-[10px] text-zinc-600 leading-tight mt-0.5 truncate">{theme.description}</p>
                  </div>
                  <button
                    onClick={() => buyOrActivate(theme)}
                    disabled={buyingTheme}
                    className="shrink-0 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all active:scale-95 disabled:opacity-50"
                    style={isActive
                      ? { background: "hsl(var(--primary)/0.1)", color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary)/0.25)" }
                      : isOwned
                      ? { background: "hsl(0 0% 100%/0.08)", color: "white", border: "1px solid hsl(0 0% 100%/0.1)" }
                      : { background: "hsl(var(--primary))", color: "black", boxShadow: "0 4px 16px hsl(var(--primary)/0.35)" }}>
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
        <div className="grid grid-cols-2 gap-4">
          {loading ? (
            <div className="col-span-2 text-center text-zinc-600 text-sm py-12">Завантаження...</div>
          ) : gifts.map((gift, i) => (
            <NftCard key={gift.id} gift={gift} index={i}
              onClick={() => { if (!gift.sold) setSelectedGift(gift); }} />
          ))}
        </div>
      )}

      {/* NFT Modal */}
      {selectedGift && !selectedGift.sold && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6"
          style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(20px)", animation: "fade-backdrop 0.28s ease" }}
          onClick={() => !buyingNft && setSelectedGift(null)}>
          <div className="w-full max-w-sm relative overflow-hidden"
            style={{ background: "linear-gradient(160deg, #0e0e0e, #070707)", border: "1px solid hsl(var(--primary)/0.2)", borderRadius: 36, boxShadow: "0 0 0 1px hsl(var(--primary)/0.05), 0 40px 80px rgba(0,0,0,.75), 0 0 90px hsl(var(--primary)/0.1)", animation: "modal-in 0.42s cubic-bezier(0.34,1.35,0.64,1)" }}
            onClick={(e) => e.stopPropagation()}>
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-60 h-32 rounded-full pointer-events-none"
              style={{ background: "hsl(var(--primary)/0.22)", filter: "blur(40px)" }} />
            <button onClick={() => !buyingNft && setSelectedGift(null)}
              className="absolute top-5 right-5 w-9 h-9 flex items-center justify-center rounded-full z-20 transition-all active:scale-90"
              style={{ background: "hsl(0 0% 100%/0.05)", border: "1px solid hsl(0 0% 100%/0.08)" }}>
              <X className="w-4 h-4 text-zinc-500" />
            </button>
            <div className="relative z-10 flex flex-col items-center text-center px-8 pt-10 pb-8 gap-6">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" style={{ color: "hsl(var(--primary))" }} />
                <span className="text-[9px] font-black uppercase tracking-[0.34em]" style={{ color: "hsl(var(--primary))" }}>Exclusive NFT</span>
              </div>
              <h2 className="text-2xl font-black italic text-white uppercase tracking-tighter -mt-2">{selectedGift.name}</h2>
              <div className="relative w-52 h-52 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full" style={{ background: "hsl(var(--primary)/0.18)", filter: "blur(48px)", animation: "halo-pulse 2s ease-in-out infinite" }} />
                <div className="relative w-full h-full rounded-[36px] flex items-center justify-center p-8 overflow-hidden"
                  style={{ background: "radial-gradient(circle at 50% 40%, hsl(var(--primary)/0.09) 0%, hsl(0 0% 100%/0.02) 70%)", border: "1px solid hsl(0 0% 100%/0.07)" }}>
                  <GiftMedia url={selectedGift.image_url} className="w-full h-full drop-shadow-[0_0_40px_rgba(255,255,255,0.14)]" />
                </div>
              </div>
              <div className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl"
                style={{ background: "hsl(0 0% 100%/0.03)", border: "1px solid hsl(0 0% 100%/0.06)" }}>
                <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Вартість</span>
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4" style={{ color: "hsl(var(--primary))" }} />
                  <span className="text-base font-black text-white">{selectedGift.price} <span style={{ color: "hsl(var(--primary)/0.65)", fontSize: 10 }}>CR</span></span>
                </div>
              </div>
              <button onClick={handleBuyNft} disabled={buyingNft}
                className="w-full py-4 rounded-[20px] font-black uppercase text-[11px] tracking-widest text-black relative overflow-hidden transition-all active:scale-[0.97] duration-200 disabled:opacity-60"
                style={{ background: "hsl(var(--primary))", boxShadow: "0 8px 28px hsl(var(--primary)/0.38), inset 0 1px 0 rgba(255,255,255,0.2)" }}>
                <span className="relative z-10">{buyingNft ? "Купую..." : "Підтвердити покупку"}</span>
                <div className="absolute inset-0" style={{ background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.25) 50%, transparent 70%)", animation: "shine-sweep 3s ease-in-out infinite" }} />
              </button>
              <p className="text-[9px] text-zinc-700 font-bold uppercase tracking-tight -mt-2">Предмет буде миттєво додано до інвентарю</p>
            </div>
          </div>
        </div>
      )}

      {purchasedGift && <PurchaseSuccess gift={purchasedGift} onClose={() => setPurchasedGift(null)} />}
    </div>
  );
};

export default Casino;
