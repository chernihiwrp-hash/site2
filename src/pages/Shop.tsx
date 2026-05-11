import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Gift, Clock, Sparkles, Star, Flame, Trophy, Lock, Coins, Check } from "lucide-react";
import StreakFlame, { getStreakColor } from "@/components/StreakFlame";
export const Route = createFileRoute("/shop")({
  component: ShopPage,
});
// ── mock data (replace with your store / supabase calls when wired up) ──
const NICK_KEY = "crp_nick";
const BAL_KEY = "crp_balance";
const STREAK_KEY = "crp_streak";
const LAST_KEY = "crp_last_reward";
interface NftGift {
  id: number;
  name: string;
  image_url: string;
  /** Стан / стан рідкости (НЕ ціна). */
  condition: "Mint" | "Rare" | "Epic" | "Legendary";
}
const MOCK_NFTS: NftGift[] = [
  { id: 1, name: "Lime Spark",     image_url: "", condition: "Mint" },
  { id: 2, name: "Crimson Ember",  image_url: "", condition: "Rare" },
  { id: 3, name: "Violet Pulse",   image_url: "", condition: "Epic" },
  { id: 4, name: "Azure Crown",    image_url: "", condition: "Legendary" },
];
const CONDITION_STYLES: Record<NftGift["condition"], { bg: string; text: string; ring: string }> = {
  Mint:      { bg: "rgba(132,204,22,0.12)",  text: "#a3e635", ring: "rgba(132,204,22,0.45)" },
  Rare:      { bg: "rgba(59,130,246,0.12)",  text: "#60a5fa", ring: "rgba(59,130,246,0.45)" },
  Epic:      { bg: "rgba(168,85,247,0.14)",  text: "#c084fc", ring: "rgba(168,85,247,0.5)"  },
  Legendary: { bg: "rgba(250,204,21,0.14)",  text: "#fbbf24", ring: "rgba(250,204,21,0.55)" },
};
const STREAK_DAYS = [
  { day: 1, reward: 100 },
  { day: 2, reward: 100 },
  { day: 3, reward: 150 },
  { day: 4, reward: 150 },
  { day: 5, reward: 150 },
  { day: 6, reward: 200 },
  { day: 7, reward: 200 },
];
const NFT_MILESTONES = [
  { days: 15,  bonus: 200, icon: Star },
  { days: 50,  bonus: 350, icon: Flame },
  { days: 150, bonus: 500, icon: Trophy },
  { days: 365, bonus: 800, icon: Sparkles },
];
function ShopPage() {
  const [balance, setBalance] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lastReward, setLastReward] = useState(0);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    setBalance(parseInt(localStorage.getItem(BAL_KEY) || "0", 10));
    setStreak(parseInt(localStorage.getItem(STREAK_KEY) || "0", 10));
    setLastReward(parseInt(localStorage.getItem(LAST_KEY) || "0", 10));
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  const DAY = 24 * 60 * 60 * 1000;
  const canClaim = now - lastReward > DAY;
  const progress = Math.min(100, ((now - lastReward) / DAY) * 100);
  const nextBonus = streak >= 6 ? 200 : streak >= 3 ? 150 : 100;
  const flameColor = useMemo(() => getStreakColor(streak), [streak]);
  const timeLeft = () => {
    const diff = Math.max(0, DAY - (now - lastReward));
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}г ${m}хв`;
  };
  const claim = () => {
    if (!canClaim) return;
    const newBal = balance + nextBonus;
    const newStreak = streak + 1;
    setBalance(newBal);
    setStreak(newStreak);
    setLastReward(Date.now());
    localStorage.setItem(BAL_KEY, String(newBal));
    localStorage.setItem(STREAK_KEY, String(newStreak));
    localStorage.setItem(LAST_KEY, String(Date.now()));
  };
  return (
    <div
      className="min-h-screen text-foreground"
      style={{
        background: `radial-gradient(ellipse 80% 50% at 50% -10%, ${flameColor.main}22 0%, transparent 60%), radial-gradient(ellipse 100% 60% at 50% 110%, ${flameColor.main}1c 0%, transparent 65%), #0a0a0f`,
        transition: "background 800ms ease",
      }}
    >
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-8">
        {/* ─── Header ─── */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Нагороди</h1>
            <p className="text-sm text-muted-foreground mt-1">Заходь щодня — серія росте, бонуси теж</p>
          </div>
          <div
            className="flex items-center gap-2 rounded-full border bg-white/5 backdrop-blur px-4 py-2"
            style={{ borderColor: `${flameColor.main}55` }}
          >
            <Coins size={18} style={{ color: flameColor.main }} />
            <span className="font-bold tabular-nums">{balance}</span>
            <span className="text-xs text-muted-foreground">CR</span>
          </div>
        </header>
        {/* ─── Серія днів ─── */}
        <section
          className="rounded-3xl border p-6 backdrop-blur-sm"
          style={{
            background: `linear-gradient(160deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))`,
            borderColor: `${flameColor.main}33`,
            boxShadow: `0 30px 80px -40px ${flameColor.main}55`,
          }}
        >
          {/* 7 days strip */}
          <div className="grid grid-cols-7 gap-2 mb-6">
            {STREAK_DAYS.map((d) => {
              const done = streak >= d.day;
              const current = streak + 1 === d.day && canClaim;
              return (
                <div key={d.day} className="flex flex-col items-center gap-1">
                  <div
                    className="w-full aspect-square rounded-2xl flex items-center justify-center text-xs font-bold transition-all"
                    style={{
                      background: done
                        ? `linear-gradient(135deg, ${flameColor.light}, ${flameColor.main})`
                        : current
                        ? `${flameColor.main}22`
                        : "rgba(255,255,255,0.04)",
                      border: `1px solid ${done ? flameColor.main : current ? flameColor.main + "88" : "rgba(255,255,255,0.06)"}`,
                      boxShadow: current ? `0 0 24px ${flameColor.main}66` : "none",
                      color: done ? "#0a0a0f" : "rgba(255,255,255,0.7)",
                    }}
                  >
                    {done ? <Check size={16} strokeWidth={3} /> : `Д${d.day}`}
                  </div>
                  <span className="text-[10px] text-muted-foreground tabular-nums">+{d.reward}</span>
                </div>
              );
            })}
          </div>
          {/* ── ОГОНЁК серии под колонками ── */}
          <div className="flex flex-col items-center pt-2 pb-1">
            <StreakFlame streak={streak} size={96} />
          </div>
          {/* Daily reward CTA */}
          <div className="mt-6">
            {canClaim ? (
              <button
                onClick={claim}
                className="group relative w-full overflow-hidden rounded-2xl py-4 font-bold text-base transition-transform active:scale-[0.99]"
                style={{
                  background: `linear-gradient(135deg, ${flameColor.light}, ${flameColor.main}, ${flameColor.dark})`,
                  color: "#0a0a0f",
                  boxShadow: `0 20px 50px -15px ${flameColor.main}aa`,
                }}
              >
                <span className="relative z-10 inline-flex items-center gap-2">
                  <Gift size={18} /> Забрати +{nextBonus} CR
                </span>
                <span
                  className="absolute inset-y-0 -left-1/3 w-1/3 bg-white/40 blur-md"
                  style={{ animation: "shine 2.4s ease-in-out infinite" }}
                />
              </button>
            ) : (
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                    <Clock size={14} /> Наступна нагорода
                  </span>
                  <span className="font-mono font-semibold tabular-nums" style={{ color: flameColor.main }}>
                    {timeLeft()}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${progress}%`,
                      background: `linear-gradient(90deg, ${flameColor.dark}, ${flameColor.main}, ${flameColor.light})`,
                      boxShadow: `0 0 12px ${flameColor.main}`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </section>
        {/* ─── Бонусна шкала ─── */}
        <section className="grid grid-cols-3 gap-2">
          {[
            { label: "Дні 1–2", bonus: "+100", c: "#facc15" },
            { label: "Дні 3–5", bonus: "+150", c: "#fb923c" },
            { label: "Дні 6+",  bonus: "+200", c: "#ef4444" },
          ].map((b) => (
            <div
              key={b.label}
              className="rounded-2xl border border-white/5 bg-white/[0.03] px-3 py-3 text-center"
            >
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{b.label}</div>
              <div className="mt-1 text-lg font-black" style={{ color: b.c }}>{b.bonus} CR</div>
            </div>
          ))}
        </section>
        {/* ─── NFT Мілстоуни ─── */}
        <section>
          <div className="flex items-center gap-2 mb-3 px-1">
            <Sparkles size={18} style={{ color: flameColor.main }} />
            <h2 className="text-lg font-bold">NFT за серію</h2>
          </div>
          <div className="space-y-2">
            {NFT_MILESTONES.map((m, idx) => {
              const reached = streak >= m.days;
              const Icon = m.icon;
              const left = Math.max(0, m.days - streak);
              return (
                <div
                  key={m.days}
                  className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-3"
                >
                  <div
                    className="relative w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: reached
                        ? `linear-gradient(135deg, ${flameColor.light}, ${flameColor.main})`
                        : "rgba(255,255,255,0.04)",
                      border: `1px solid ${reached ? flameColor.main : "rgba(255,255,255,0.06)"}`,
                    }}
                  >
                    <Icon size={22} className={reached ? "text-black" : "text-muted-foreground"} />
                    {!reached && (
                      <div className="absolute inset-0 rounded-xl bg-black/40 backdrop-blur-[1px] flex items-center justify-center">
                        <Lock size={14} className="text-white/70" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">NFT · {m.days} днів</div>
                    <div className="text-xs text-muted-foreground">Бонус +{m.bonus} CR</div>
                  </div>
                  {reached ? (
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider rounded-full px-2.5 py-1"
                      style={{ background: `${flameColor.main}22`, color: flameColor.main }}
                    >
                      Отримано
                    </span>
                  ) : (
                    <div className="text-right">
                      <div className="text-base font-black tabular-nums">{left}</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">днів</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
        {/* ─── NFT Подарунки (без ціни — показуємо стан) ─── */}
        <section>
          <div className="flex items-center gap-2 mb-3 px-1">
            <Gift size={18} style={{ color: flameColor.main }} />
            <h2 className="text-lg font-bold">NFT Подарунки</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {MOCK_NFTS.map((g) => {
              const c = CONDITION_STYLES[g.condition];
              return (
                <div
                  key={g.id}
                  className="group rounded-2xl border border-white/5 bg-white/[0.03] overflow-hidden transition-all hover:-translate-y-0.5"
                  style={{ boxShadow: `0 0 0 1px transparent` }}
                >
                  <div
                    className="aspect-square flex items-center justify-center text-4xl"
                    style={{
                      background: `radial-gradient(circle at 30% 20%, ${c.text}33, transparent 60%), linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0))`,
                    }}
                  >
                    {g.image_url ? (
                      <img
                        src={g.image_url}
                        alt={g.name}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <Sparkles size={42} style={{ color: c.text }} />
                    )}
                  </div>
                  <div className="p-3">
                    <div className="font-semibold text-sm truncate">{g.name}</div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Стан</span>
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 border"
                        style={{ background: c.bg, color: c.text, borderColor: c.ring }}
                      >
                        {g.condition}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

export default Shop;
