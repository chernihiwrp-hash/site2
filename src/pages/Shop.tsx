import { useState, useEffect, useRef } from "react";
import { Gift, Clock, Zap, Star, Flame, Trophy, Sparkles, Lock } from "lucide-react";
import GradientButton from "../components/GradientButton";
import { toast } from "sonner";
import { setBalance as syncBalance, supabase } from "../lib/store";
import { dbUpdate, ilike } from "../lib/db";

// ─── FlameVFX (оновлений) ─────────────────────────────────────
const FlameVFX = ({ size = 72, active = true, streak = 0 }: { size?: number; active?: boolean; streak?: number }) => {
  const getTargetColor = (s: number): string => {
    if (s >= 365) return "#3b82f6";      // Blue
    if (s >= 150) return "#22c55e";      // Green
    if (s >= 50) return "#a855f7";       // Purple
    if (s >= 15) return "#ef4444";       // Red
    return "#facc15";                    // Yellow
  };

  const targetColor = getTargetColor(streak);
  const glow = active ? `drop-shadow(0 0 25px ${targetColor}) drop-shadow(0 0 40px ${targetColor}) drop-shadow(0 0 60px ${targetColor})` : "none";

  return (
    <div className="relative flex items-center justify-center">
      <div
        className="transition-all duration-700"
        style={{
          filter: glow,
          animation: active ? "flameWobble 1.2s ease-in-out infinite alternate, flamePulse 2s ease-in-out infinite" : "none"
        }}
      >
        <span className="text-[72px] drop-shadow-xl">🔥</span>
      </div>
      <style jsx>{`
        @keyframes flameWobble {
          from { transform: scale(1) rotate(-8deg); }
          to   { transform: scale(1.12) rotate(8deg); }
        }
        @keyframes flamePulse {
          0%, 100% { opacity: 0.95; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

// ─── SHOP COMPONENT ───────────────────────────────────────────
const Shop = () => {
  const nick = localStorage.getItem("crp_nick") || "";
  const [balance, setBalanceState] = useState(0);
  const [lastReward, setLastReward] = useState(() => parseInt(localStorage.getItem("crp_last_reward") || "0"));
  const [streak, setStreak] = useState(() => parseInt(localStorage.getItem("crp_streak") || "0"));
  const [loading, setLoading] = useState(false);
  const [nftGifts, setNftGifts] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("users").select("balance").ilike("username", nick).maybeSingle().then(({ data }) => {
      if (data?.balance !== undefined) {
        const bal = (data.balance as number) || 0;
        syncBalance(nick, bal);
        setBalanceState(bal);
      }
    });

    supabase.from("nft_gifts").select("*").order("price", { ascending: true }).then(({ data }) => {
      if (data) setNftGifts(data);
    });
  }, [nick]);

  const canClaim = Date.now() - lastReward > 24 * 60 * 60 * 1000;
  const timeLeft = () => {
    const diff = 24 * 60 * 60 * 1000 - (Date.now() - lastReward);
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}г ${m}хв`;
  };

  const progress = Math.min(100, ((Date.now() - lastReward) / (24 * 60 * 60 * 1000)) * 100);

  const claimReward = async () => {
    if (!canClaim || loading) return;
    setLoading(true);
    try {
      const bonus = streak >= 6 ? 200 : streak >= 3 ? 150 : 100;
      const { data: user } = await supabase.from("users").select("balance").ilike("username", nick).maybeSingle();
      const currentBal = (user?.balance as number) ?? 0;
      const newBal = currentBal + bonus;

      const { error } = await dbUpdate("users", { balance: newBal }, { username: ilike(nick) });
      if (error) throw error;

      syncBalance(nick, newBal);
      setBalanceState(newBal);

      const now = Date.now();
      const newStreak = streak + 1;
      setLastReward(now);
      setStreak(newStreak);
      localStorage.setItem("crp_last_reward", String(now));
      localStorage.setItem("crp_streak", String(newStreak));

      toast.success(`+${bonus} CR! Серія: ${newStreak} днів 🔥`);
    } catch {
      toast.error("Помилка нарахування");
    } finally {
      setLoading(false);
    }
  };

  const streakDays = [
    { day: 1, reward: 100, label: "Д1" },
    { day: 2, reward: 100, label: "Д2" },
    { day: 3, reward: 150, label: "Д3" },
    { day: 4, reward: 150, label: "Д4" },
    { day: 5, reward: 150, label: "Д5" },
    { day: 6, reward: 200, label: "Д6" },
    { day: 7, reward: 200, label: "Д7" },
  ];

  const nftMilestones = [
    { days: 15, label: "15 днів", bonusCr: "200", icon: Star },
    { days: 50, label: "50 днів", bonusCr: "350", icon: Flame },
    { days: 150, label: "150 днів", bonusCr: "500", icon: Trophy },
    { days: 365, label: "365 днів", bonusCr: "800", icon: Sparkles },
  ];

  return (
    <div className="min-h-screen bg-black/95 text-white pb-12">
      {/* Header */}
      <div className="flex justify-between items-center p-6 border-b border-white/10">
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
          НАГОРОДИ
        </h1>
        <div className="flex items-center gap-3 bg-zinc-900 px-6 py-3 rounded-2xl border border-white/10">
          <Zap className="w-6 h-6 text-yellow-400" />
          <span className="text-2xl font-bold">{balance} <span className="text-sm text-zinc-400">CR</span></span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-8 space-y-12">
        {/* СТREAK SECTION */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <FlameVFX size={80} active={true} streak={streak} />
          </div>
          <h2 className="text-5xl font-bold mb-2 tracking-tighter">Серія: <span className="text-orange-400">{streak}</span> днів</h2>
          {streak >= 3 && <p className="text-green-400 text-xl">Бонус активний 🔥</p>}
        </div>

        {/* Daily Rewards Grid */}
        <div>
          <h3 className="text-xl font-semibold mb-6 text-center text-zinc-400">ЩОДЕННІ НАГОРОДИ</h3>
          <div className="grid grid-cols-7 gap-3">
            {streakDays.map((d) => {
              const isDone = streak >= d.day;
              const isCurrent = streak + 1 === d.day;
              return (
                <div
                  key={d.day}
                  className={`relative p-4 rounded-2xl text-center transition-all duration-300 border ${
                    isDone ? "bg-green-900/30 border-green-500/50" : isCurrent ? "bg-orange-500/20 border-orange-400 scale-105" : "bg-zinc-900/80 border-white/10"
                  }`}
                >
                  {isDone && <div className="absolute -top-2 -right-2 bg-green-500 text-black text-xs px-2 py-0.5 rounded-full">✓</div>}
                  <div className="text-3xl mb-2">🔥</div>
                  <div className="font-bold text-lg">+{d.reward}</div>
                  <div className="text-xs text-zinc-400">{d.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* NFT Milestones */}
        <div>
          <h3 className="text-xl font-semibold mb-6 flex items-center gap-3 justify-center">
            <Trophy className="text-yellow-400" /> NFT НАГОРОДИ ЗА СЕРІЮ
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {nftMilestones.map((m, idx) => {
              const reached = streak >= m.days;
              const Icon = m.icon;
              return (
                <div
                  key={idx}
                  className={`p-6 rounded-3xl border transition-all ${reached ? "border-yellow-400/50 bg-gradient-to-br from-yellow-900/20 to-transparent" : "border-white/10 bg-zinc-900/80"}`}
                >
                  <div className="flex justify-center mb-4">
                    <Icon className={`w-12 h-12 ${reached ? "text-yellow-400" : "text-zinc-500"}`} />
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-2xl mb-1">{m.label}</div>
                    <div className="text-emerald-400 font-medium">+{m.bonusCr} CR + NFT</div>
                    {reached ? (
                      <div className="mt-4 text-green-400 font-bold flex items-center justify-center gap-2">
                        ОТРИМАНО <span>✅</span>
                      </div>
                    ) : (
                      <div className="mt-4 text-xs text-zinc-500">
                        Ще {m.days - streak} днів
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* NFT Shop */}
        {nftGifts.length > 0 && (
          <div>
            <h3 className="text-xl font-semibold mb-6 flex items-center gap-3">
              <Gift className="text-purple-400" /> NFT МАГАЗИН
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {nftGifts.map((gift) => (
                <div
                  key={gift.id}
                  className="bg-zinc-900/90 border border-white/10 rounded-3xl overflow-hidden hover:border-purple-500/50 transition-all group"
                >
                  <div className="aspect-square bg-black/60 flex items-center justify-center p-6">
                    <img
                      src={gift.image_url}
                      alt={gift.name}
                      className="w-full h-full object-contain transition-transform group-hover:scale-110"
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />
                  </div>
                  <div className="p-4">
                    <div className="font-semibold text-lg">{gift.name}</div>
                    <div className="text-purple-400 font-bold mt-2">{gift.price} CR</div>
                    <GradientButton className="mt-4 w-full">Купити</GradientButton>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Daily Claim */}
        <div className="bg-gradient-to-br from-zinc-900 to-black border border-white/10 rounded-3xl p-8 text-center">
          <div className="flex justify-center mb-6">
            {canClaim ? (
              <div className="text-6xl animate-bounce">🎁</div>
            ) : (
              <Clock className="w-20 h-20 text-zinc-500" />
            )}
          </div>

          <h3 className="text-3xl font-bold mb-2">Щоденна нагорода</h3>
          <p className="text-zinc-400 mb-6">Заходь кожен день — отримуй CR</p>

          <div className="text-5xl font-bold text-orange-400 mb-8">
            +{streak >= 6 ? 200 : streak >= 3 ? 150 : 100} CR
          </div>

          {canClaim ? (
            <GradientButton onClick={claimReward} disabled={loading} className="text-xl py-4 px-12">
              {loading ? "Нараховую..." : "ЗАБРАТИ НАГОРОДУ"}
            </GradientButton>
          ) : (
            <div className="space-y-3">
              <div className="text-lg text-zinc-400">Наступна нагорода через</div>
              <div className="text-4xl font-bold text-white">{timeLeft()}</div>
              <div className="h-2.5 bg-zinc-800 rounded-full overflow-hidden w-80 mx-auto">
                <div className="h-full bg-gradient-to-r from-orange-400 to-yellow-400 transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Shop;
