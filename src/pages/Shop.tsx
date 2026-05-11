import { useState, useEffect, useRef } from "react";
import { Gift, Clock, Zap, Star, Flame, Trophy, Sparkles, Lock } from "lucide-react";
import GradientButton from "../components/GradientButton";
import { toast } from "sonner";
import { setBalance as syncBalance, supabase } from "../lib/store";
import { dbUpdate, ilike } from "../lib/db";

// ─── КОНСТАНТИ КОЛЬОРІВ ТА ЦІН ──────────────────────────────────────────────
const STREAK_COLORS = {
  1: "#facc15", // Жовтий (Старт)
  2: "#facc15",
  3: "#f97316", // Помаранчевий
  4: "#ef4444", // Червоний
  5: "#a855f7", // Фіолетовий
  6: "#3b82f6", // Синій
  7: "#06b6d4", // Блакитний (Максимум)
};

// ─── АНІМОВАНИЙ ВОГОНЬ (З ДИНАМІЧНИМ КОЛЬОРОМ) ───────────────────────────────
const FlameVFX = ({ size = 48, active = true, customColor }: { size?: number; active?: boolean; customColor?: string }) => {
  const color = active ? (customColor || "#facc15") : "#333";
  const glow = active ? `drop-shadow(0 0 ${size * 0.3}px ${color})` : "none";

  return (
    <div style={{ position: "relative", width: size, height: size, display: 'flex', alignItems: 'center', justifyCenter: 'center' }}>
      <Flame
        style={{
          width: size, height: size, color, filter: glow,
          animation: active ? "flameWobble 0.5s ease-in-out infinite alternate" : "none",
          transition: "color 0.5s ease",
        }}
      />
      <style>{`
        @keyframes flameWobble {
          from { transform: scaleY(1) rotate(-2deg); }
          to   { transform: scaleY(1.1) rotate(2deg); }
        }
      `}</style>
    </div>
  );
};

const Shop = () => {
  const nick = localStorage.getItem("crp_nick") || "";
  const [balance, setBalanceState] = useState(0);
  const [lastReward, setLastReward] = useState(() => parseInt(localStorage.getItem("crp_last_reward") || "0"));
  const [streak, setStreak] = useState(() => parseInt(localStorage.getItem("crp_streak") || "0"));
  const [loading, setLoading] = useState(false);
  const [nftGifts, setNftGifts] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("users").select("balance").ilike("username", nick).maybeSingle().then(({ data }) => {
      if (data) setBalanceState(data.balance || 0);
    });
    // Тут ми виставляємо дешеві ціни вручну або тягнемо з БД
    supabase.from("nft_gifts").select("*").order("price", { ascending: true }).then(({ data }) => {
      if (data) setNftGifts(data);
    });
  }, [nick]);

  const canClaim = Date.now() - lastReward > 24 * 60 * 60 * 1000;
  
  // Визначаємо колір головного вогника в залежності від серії (РГБ прогресія)
  const getProgressColor = (s: number) => {
    if (s <= 2) return STREAK_COLORS[1];
    if (s <= 4) return STREAK_COLORS[4];
    if (s <= 6) return STREAK_COLORS[5];
    return STREAK_COLORS[7];
  };

  const claimReward = async () => {
    if (!canClaim || loading) return;
    setLoading(true);
    const bonus = streak >= 6 ? 50 : streak >= 3 ? 30 : 20; // Невеликі нагороди для балансу
    const newBal = balance + bonus;
    
    const { error } = await dbUpdate("users", { balance: newBal }, { username: ilike(nick) });
    if (!error) {
      setBalanceState(newBal);
      const now = Date.now();
      const newStreak = streak + 1;
      setLastReward(now);
      setStreak(newStreak);
      localStorage.setItem("crp_last_reward", String(now));
      localStorage.setItem("crp_streak", String(newStreak));
      toast.success(`+${bonus} CR отримано!`);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen pb-24 px-4 pt-4">
      {/* Баланс */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-black tracking-tighter">МАРКЕТ</h1>
        <div className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-full flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-400 fill-yellow-400" />
          <span className="font-bold text-sm">{balance} CR</span>
        </div>
      </div>

      {/* Головна картка з РГБ вогником */}
      <div className="bg-gradient-to-b from-white/10 to-transparent border border-white/10 rounded-[32px] p-8 mb-6 text-center relative overflow-hidden">
         <div className="flex justify-center mb-4">
            <FlameVFX size={80} active={streak > 0} customColor={getProgressColor(streak)} />
         </div>
         <h2 className="text-2xl font-black mb-1">Серія: {streak} дн.</h2>
         <p className="text-white/40 text-xs mb-6">Твій вогник стає сильнішим щодня</p>
         
         {canClaim ? (
           <GradientButton variant="green" className="w-full py-6 rounded-2xl" onClick={claimReward} disabled={loading}>
             ЗАБРАТИ БОНУС
           </GradientButton>
         ) : (
           <div className="text-white/20 text-sm font-bold flex items-center justify-center gap-2">
             <Clock className="w-4 h-4" /> ПОВЕРТАЙСЯ ЗАВТРА
           </div>
         )}
      </div>

      {/* Сітка днів з кольоровими вогниками */}
      <div className="grid grid-cols-7 gap-2 mb-8">
        {[1, 2, 3, 4, 5, 6, 7].map((day) => {
          const isDone = streak >= day;
          const color = STREAK_COLORS[day as keyof typeof STREAK_COLORS];
          return (
            <div key={day} 
              className="flex flex-col items-center p-2 rounded-2xl border transition-all"
              style={{ 
                background: isDone ? `${color}10` : 'transparent',
                borderColor: isDone ? `${color}40` : 'white/5'
              }}>
              <FlameVFX size={20} active={isDone} customColor={color} />
              <span className="text-[10px] mt-1 font-bold" style={{ color: isDone ? color : '#333' }}>Д{day}</span>
            </div>
          );
        })}
      </div>

      {/* Дешеві NFT */}
      <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-purple-400" /> ДОСТУПНІ NFT
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {nftGifts.map(nft => (
          <div key={nft.id} className="bg-white/5 border border-white/10 rounded-2xl p-3 overflow-hidden">
            <div className="aspect-square rounded-xl bg-black/40 mb-3 overflow-hidden">
              <img src={nft.image_url} className="w-full h-full object-cover" alt="" />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold truncate pr-2">{nft.name}</span>
              <div className="flex items-center gap-1 shrink-0">
                <Zap className="w-3 h-3 text-yellow-400" />
                <span className="text-[11px] font-black">{nft.price}</span>
              </div>
            </div>
            <button className="w-full mt-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] font-bold transition-colors">
              ПРИДБАТИ
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Shop;
