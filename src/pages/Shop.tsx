import { useState, useEffect, useRef } from "react";
import { Gift, Clock, Zap, Star, Flame, Trophy, Sparkles, Lock } from "lucide-react";
import GradientButton from "../components/GradientButton";
import { toast } from "sonner";
import { setBalance as syncBalance, supabase } from "../lib/store";
import { dbUpdate, ilike } from "../lib/db";

// ─── THEME SYSTEM ─────────────────────────────────────────────────────────────
export type ThemeId = "lime" | "neon_blue" | "cyber_red" | "gold_vip" | "purple_haze" | "arctic" | "matrix" | "sunset";

export interface Theme {
  id: ThemeId;
  name: string;
  price: number;
  preview: string;
  vars: Record<string, string>;
  bgGradient: string;
  description: string;
}

export const THEMES: Theme[] = [
  { id: "lime", name: "Lime (default)", price: 0, preview: "linear-gradient(135deg, hsl(84,81%,44%), hsl(142,71%,45%))", vars: { "--primary": "84 81% 44%", "--secondary": "142 71% 45%", "--accent": "84 81% 44%", "--ring": "84 81% 44%", "--neon-lime": "84 81% 44%", "--passport-bg": "linear-gradient(145deg, hsl(240 15% 8% / 0.95), hsl(84 40% 8% / 0.9))", "--passport-border": "hsl(84 81% 44% / 0.25)" }, bgGradient: "radial-gradient(ellipse 100% 50% at 50% 100%, hsl(142 71% 45% / 0.18) 0%, transparent 65%), radial-gradient(ellipse 70% 35% at 50% 100%, hsl(84 81% 44% / 0.12) 0%, transparent 55%)", description: "Класичний неоновий лайм" },
  { id: "neon_blue", name: "Neon Blue", price: 300, preview: "linear-gradient(135deg, hsl(210,100%,55%), hsl(200,90%,45%))", vars: { "--primary": "210 100% 55%", "--secondary": "200 90% 45%", "--accent": "210 100% 55%", "--ring": "210 100% 55%", "--neon-lime": "210 100% 55%", "--passport-bg": "linear-gradient(145deg, hsl(220 30% 6% / 0.97), hsl(210 50% 10% / 0.92))", "--passport-border": "hsl(210 100% 55% / 0.3)" }, bgGradient: "radial-gradient(ellipse 120% 60% at 50% 110%, hsl(210 100% 55% / 0.2) 0%, transparent 60%)", description: "Електричний синій неон" },
  { id: "cyber_red", name: "Cyber Red", price: 300, preview: "linear-gradient(135deg, hsl(0,85%,55%), hsl(15,80%,45%))", vars: { "--primary": "0 85% 55%", "--secondary": "15 80% 45%", "--accent": "0 85% 55%", "--ring": "0 85% 55%", "--neon-lime": "0 85% 55%", "--passport-bg": "linear-gradient(145deg, hsl(0 20% 5% / 0.97), hsl(15 30% 8% / 0.93))", "--passport-border": "hsl(0 85% 55% / 0.3)" }, bgGradient: "radial-gradient(ellipse 100% 50% at 30% 100%, hsl(0 85% 55% / 0.18) 0%, transparent 60%)", description: "Кіберпанк у червоному" },
  { id: "gold_vip", name: "Gold VIP", price: 750, preview: "linear-gradient(135deg, hsl(45,100%,55%), hsl(38,90%,45%))", vars: { "--primary": "45 100% 55%", "--secondary": "38 90% 45%", "--accent": "45 100% 55%", "--ring": "45 100% 55%", "--neon-lime": "45 100% 55%", "--passport-bg": "linear-gradient(145deg, hsl(40 20% 6% / 0.97), hsl(45 30% 9% / 0.93))", "--passport-border": "hsl(45 100% 55% / 0.4)" }, bgGradient: "radial-gradient(ellipse 100% 50% at 50% 100%, hsl(45 100% 55% / 0.2) 0%, transparent 60%)", description: "VIP золото для обраних" },
  { id: "purple_haze", name: "Purple Haze", price: 500, preview: "linear-gradient(135deg, hsl(275,80%,60%), hsl(290,70%,50%))", vars: { "--primary": "275 80% 60%", "--secondary": "290 70% 50%", "--accent": "275 80% 60%", "--ring": "275 80% 60%", "--neon-lime": "275 80% 60%", "--passport-bg": "linear-gradient(145deg, hsl(270 25% 6% / 0.97), hsl(290 20% 8% / 0.93))", "--passport-border": "hsl(275 80% 60% / 0.35)" }, bgGradient: "radial-gradient(ellipse 110% 55% at 40% 100%, hsl(275 80% 60% / 0.18) 0%, transparent 60%)", description: "Містичний фіолетовий" },
  { id: "arctic", name: "Arctic White", price: 400, preview: "linear-gradient(135deg, hsl(195,80%,70%), hsl(185,60%,55%))", vars: { "--primary": "195 80% 70%", "--secondary": "185 60% 55%", "--accent": "195 80% 70%", "--ring": "195 80% 70%", "--neon-lime": "195 80% 70%", "--passport-bg": "linear-gradient(145deg, hsl(200 25% 6% / 0.97), hsl(185 20% 8% / 0.93))", "--passport-border": "hsl(195 80% 70% / 0.3)" }, bgGradient: "radial-gradient(ellipse 100% 50% at 60% 100%, hsl(195 80% 70% / 0.15) 0%, transparent 60%)", description: "Холодний арктичний лід" },
  { id: "matrix", name: "Matrix Green", price: 600, preview: "linear-gradient(135deg, hsl(120,100%,40%), hsl(140,90%,30%))", vars: { "--primary": "120 100% 40%", "--secondary": "140 90% 30%", "--accent": "120 100% 40%", "--ring": "120 100% 40%", "--neon-lime": "120 100% 40%", "--passport-bg": "linear-gradient(145deg, hsl(130 30% 4% / 0.98), hsl(120 20% 7% / 0.93))", "--passport-border": "hsl(120 100% 40% / 0.4)" }, bgGradient: "radial-gradient(ellipse 100% 50% at 50% 100%, hsl(120 100% 40% / 0.2) 0%, transparent 60%)", description: "Матриця хакера" },
  { id: "sunset", name: "Sunset Orange", price: 450, preview: "linear-gradient(135deg, hsl(25,100%,55%), hsl(350,90%,55%))", vars: { "--primary": "25 100% 55%", "--secondary": "350 90% 55%", "--accent": "25 100% 55%", "--ring": "25 100% 55%", "--neon-lime": "25 100% 55%", "--passport-bg": "linear-gradient(145deg, hsl(20 25% 6% / 0.97), hsl(350 20% 7% / 0.93))", "--passport-border": "hsl(25 100% 55% / 0.35)" }, bgGradient: "radial-gradient(ellipse 110% 55% at 30% 100%, hsl(25 100% 55% / 0.18) 0%, transparent 60%)", description: "Захід сонця" },
];

export const applyTheme = (theme: Theme) => {
  const root = document.documentElement;
  Object.entries(theme.vars).forEach(([k, v]) => {
    if (!k.startsWith("--passport")) root.style.setProperty(k, v);
  });
  root.style.setProperty("--neon-lime", theme.vars["--primary"] || "84 81% 44%");
  root.style.setProperty("--neon-green", theme.vars["--secondary"] || "142 71% 45%");
  document.body.style.backgroundImage = theme.bgGradient;
  document.body.style.transition = "background-image 0.5s ease";
  root.setAttribute("data-passport-bg", theme.vars["--passport-bg"] || "");
  root.setAttribute("data-passport-border", theme.vars["--passport-border"] || "");
  root.setAttribute("data-theme-id", theme.id);
  localStorage.setItem("crp_theme", theme.id);
};

export const loadSavedTheme = () => {
  const localTheme = localStorage.getItem("crp_theme") as ThemeId | null;
  if (localTheme) {
    const theme = THEMES.find(t => t.id === localTheme);
    if (theme) applyTheme(theme);
  }
  const nick = localStorage.getItem("crp_nick");
  if (!nick) return;
  supabase.from("users").select("active_theme").ilike("username", nick).maybeSingle()
    .then(({ data }) => {
      if (data?.active_theme && data.active_theme !== localTheme) {
        const dbTheme = THEMES.find(t => t.id === data.active_theme);
        if (dbTheme) applyTheme(dbTheme);
      }
    }).catch(() => {});
};

// ─── АНІМОВАНИЙ ВОГОНЬ ───────────────────────────────────────────────────────
// Якщо передано `color` — статичний кольоровий вогонь з wobble + glow.
// Без `color` — RGB-цикл по всіх кольорах.
const FlameVFX = ({ size = 48, active = true, color }: { size?: number; active?: boolean; color?: string }) => {
  const COLORS = [
    "#ff4500", "#ff6a00", "#ff8c00", "#ffb300",
    "#ffdd00", "#84cc16", "#22c55e", "#06b6d4",
    "#3b82f6", "#a855f7", "#ec4899", "#ef4444",
  ];
  const [colorIdx, setColorIdx] = useState(0);
  const [nextIdx, setNextIdx] = useState(1);
  const [blend, setBlend] = useState(0);
  const rafRef = useRef<number>();
  const startRef = useRef<number>();

  useEffect(() => {
    if (!active || color) return; // фіксований колір — без RGB-циклу
    const duration = 900;
    const animate = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const t = Math.min(elapsed / duration, 1);
      setBlend(t);
      if (t >= 1) {
        startRef.current = ts;
        setColorIdx(prev => (prev + 1) % COLORS.length);
        setNextIdx(prev => (prev + 1) % COLORS.length);
        setBlend(0);
      }
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [active, color]);

  const lerpColor = (a: string, b: string, t: number) => {
    const h2d = (h: string) => parseInt(h, 16);
    const parse = (c: string) => ({ r: h2d(c.slice(1, 3)), g: h2d(c.slice(3, 5)), b: h2d(c.slice(5, 7)) });
    const ca = parse(a), cb = parse(b);
    const r = Math.round(ca.r + (cb.r - ca.r) * t);
    const g = Math.round(ca.g + (cb.g - ca.g) * t);
    const b2 = Math.round(ca.b + (cb.b - ca.b) * t);
    return `rgb(${r},${g},${b2})`;
  };

  const finalColor = !active
    ? "#444"
    : (color ?? lerpColor(COLORS[colorIdx], COLORS[nextIdx], blend));
  const glow = active
    ? `drop-shadow(0 0 ${size * 0.3}px ${finalColor}) drop-shadow(0 0 ${size * 0.15}px ${finalColor})`
    : "none";

  return (
    <div style={{ position: "relative", width: size, height: size, display: "inline-block" }}>
      <Flame
        size={size}
        style={{
          color: finalColor,
          filter: glow,
          animation: active ? "flameWobble 0.4s ease-in-out infinite alternate" : "none",
          transformOrigin: "50% 100%",
        }}
      />
      {active && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${finalColor}40 0%, transparent 70%)`,
            animation: "pulse 1.2s ease-in-out infinite alternate",
            pointerEvents: "none",
          }}
        />
      )}
      <style>{`
        @keyframes flameWobble {
          from { transform: scaleY(1) scaleX(1) rotate(-2deg); }
          to   { transform: scaleY(1.08) scaleX(0.95) rotate(2deg); }
        }
        @keyframes pulse {
          from { opacity: 0.4; transform: scale(0.9); }
          to   { opacity: 0.8; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
};

// Колір вогню для загального лічильника серії
const getStreakFlameColor = (s: number): string =>
  s >= 100 ? "#3b82f6" : s >= 30 ? "#a855f7" : s >= 7 ? "#ef4444" : "#facc15";

// ─── SHOP PAGE ────────────────────────────────────────────────────────────────
const Shop = () => {
  const nick = localStorage.getItem("crp_nick") || "";
  const [balance, setBalanceState] = useState(0);
  const [lastReward, setLastReward] = useState(() => parseInt(localStorage.getItem("crp_last_reward") || "0"));
  const [streak, setStreak] = useState(() => parseInt(localStorage.getItem("crp_streak") || "0"));
  const [loading, setLoading] = useState(false);
  const [nftGifts, setNftGifts] = useState<{ id: number; name: string; image_url: string; price: number }[]>([]);

  useEffect(() => {
    supabase.from("users").select("balance").ilike("username", nick).maybeSingle().then(({ data }) => {
      if (data?.balance !== undefined) {
        const bal = (data.balance as number) || 0;
        syncBalance(nick, bal);
        setBalanceState(bal);
      }
    });
    supabase.from("nft_gifts").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      if (data) setNftGifts(data as any);
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
      if (error) { toast.error("Помилка нарахування балансу"); setLoading(false); return; }
      syncBalance(nick, newBal);
      setBalanceState(newBal);
      const now = Date.now();
      const newStreak = streak + 1;
      setLastReward(now);
      setStreak(newStreak);
      localStorage.setItem("crp_last_reward", String(now));
      localStorage.setItem("crp_streak", String(newStreak));
      toast.success(`+${bonus} CR нараховано! Серія: ${newStreak} днів`);
    } catch { toast.error("Щось пішло не так"); }
    setLoading(false);
  };

  const streakDays = [
    { day: 1, reward: 100, color: "#facc15", label: "Д1" },
    { day: 2, reward: 100, color: "#facc15", label: "Д2" },
    { day: 3, reward: 150, color: "#f97316", label: "Д3" },
    { day: 4, reward: 150, color: "#ef4444", label: "Д4" },
    { day: 5, reward: 150, color: "#a855f7", label: "Д5" },
    { day: 6, reward: 200, color: "#22c55e", label: "Д6" },
    { day: 7, reward: 200, color: "#3b82f6", label: "Д7" },
  ];

  // NFT мілстоуни — дешевші бонуси (200–800 CR)
  const nftMilestones = [
    { days: 15,  label: "15 днів",  color: "#facc15", icon: Star,     bonusCr: "200" },
    { days: 50,  label: "50 днів",  color: "#f97316", icon: Flame,    bonusCr: "350" },
    { days: 150, label: "150 днів", color: "#a855f7", icon: Trophy,   bonusCr: "500" },
    { days: 365, label: "365 днів", color: "#3b82f6", icon: Sparkles, bonusCr: "800" },
  ];

  return (
    <div style={{ padding: "24px", maxWidth: 720, margin: "0 auto", color: "white" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>НАГОРОДИ</h1>
          <p style={{ opacity: 0.7, margin: 0 }}>Щоденні бонуси</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 18, fontWeight: 700 }}>
          <Zap size={20} />
          {balance} CR
        </div>
      </div>

      {/* Серія днів */}
      <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 20, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <FlameVFX size={32} active={streak > 0} color={getStreakFlameColor(streak)} />
          <span style={{ fontSize: 18, fontWeight: 700 }}>Серія: {streak} днів</span>
          {streak >= 3 && (
            <span style={{ marginLeft: "auto", fontSize: 12, padding: "4px 10px", background: "rgba(132,204,22,0.15)", borderRadius: 999, color: "#84cc16" }}>
              Бонус активний
            </span>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
          {streakDays.map((d) => {
            const isDone = streak >= d.day;
            const isCurrent = streak + 1 === d.day;
            return (
              <div key={d.day} style={{ textAlign: "center", opacity: isDone || isCurrent ? 1 : 0.45 }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>
                  <FlameVFX size={28} active={isDone || isCurrent} color={d.color} />
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: d.color }}>+{d.reward}</div>
                <div style={{ fontSize: 10, opacity: 0.6 }}>{d.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* NFT Мілстоуни */}
      <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 20, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, fontWeight: 700 }}>
          <Trophy size={20} />
          NFT Нагороди за серію
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {nftMilestones.map((m, idx) => {
            const reached = streak >= m.days;
            const Icon = m.icon;
            const nft = nftGifts[idx] || null;
            return (
              <div key={m.days} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, background: "rgba(255,255,255,0.03)", borderRadius: 12, border: `1px solid ${reached ? m.color + "55" : "rgba(255,255,255,0.06)"}` }}>
                <div style={{ position: "relative", width: 56, height: 56, borderRadius: 12, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  {nft?.image_url ? (
                    <img src={nft.image_url} alt={nft.name} style={{ width: "100%", height: "100%", objectFit: "cover", filter: reached ? "none" : "grayscale(1) brightness(0.5)" }} />
                  ) : (
                    <Icon size={28} color={reached ? m.color : "#666"} />
                  )}
                  {!reached && (
                    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Lock size={18} color="#fff" opacity={0.7} />
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{nft?.name || `NFT #${idx + 1}`}</span>
                    {reached && (
                      <span style={{ fontSize: 10, padding: "2px 8px", background: m.color + "22", color: m.color, borderRadius: 999, fontWeight: 700 }}>
                        ОТРИМАНО
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.65, marginTop: 2 }}>
                    {m.label} · {m.bonusCr} CR
                  </div>
                </div>
                {reached ? (
                  <Sparkles size={20} color={m.color} />
                ) : (
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: m.color }}>{Math.max(0, m.days - streak)}</div>
                    <div style={{ fontSize: 10, opacity: 0.6 }}>днів</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* NFT Магазин */}
      {nftGifts.length > 0 && (
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 20, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, fontWeight: 700 }}>
            <Gift size={20} />
            NFT Подарунки
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
            {nftGifts.map(gift => (
              <div key={gift.id} style={{ background: "rgba(0,0,0,0.3)", borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ aspectRatio: "1/1", background: "rgba(0,0,0,0.4)" }}>
                  <img
                    src={gift.image_url}
                    alt={gift.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
                <div style={{ padding: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{gift.name}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#84cc16" }}>
                    <Zap size={12} />
                    {gift.price} CR
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Кнопка щоденної нагороди */}
      <div style={{ position: "relative", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 20 }}>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            {canClaim && <Sparkles size={20} color="#84cc16" />}
            <span style={{ fontSize: 16, fontWeight: 700 }}>
              {canClaim ? "Готово до отримання" : "На сьогодні достатньо"}
            </span>
            {canClaim && (
              <span style={{ fontSize: 10, padding: "2px 8px", background: "rgba(132,204,22,0.2)", color: "#84cc16", borderRadius: 999, fontWeight: 700 }}>
                READY
              </span>
            )}
          </div>
          <div style={{ marginTop: 6 }}>
            <div style={{ fontWeight: 700 }}>Щоденна нагорода</div>
            <div style={{ fontSize: 12, opacity: 0.65 }}>Заходь кожного дня і отримуй CR</div>
          </div>
          <div style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 22, fontWeight: 800, color: "#84cc16" }}>
            <Zap size={20} />
            +{streak >= 6 ? 200 : streak >= 3 ? 150 : 100} CR
          </div>
        </div>

        {canClaim ? (
          <GradientButton onClick={claimReward} disabled={loading} style={{ width: "100%" }}>
            {loading ? "Нараховую..." : "Забрати нагороду"}
          </GradientButton>
        ) : (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, opacity: 0.7 }}>
                <Clock size={14} />
                Наступна через
              </span>
              <span style={{ fontSize: 12, fontWeight: 700 }}>{timeLeft()}</span>
            </div>
            <div style={{ position: "relative", height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 999, overflow: "hidden" }}>
              <div style={{ position: "absolute", inset: 0, width: `${progress}%`, background: "linear-gradient(90deg, #84cc16, #22c55e)", borderRadius: 999, transition: "width 0.3s ease" }} />
            </div>
            <div style={{ marginTop: 6, fontSize: 11, opacity: 0.6, textAlign: "right" }}>{Math.round(progress)}% до нагороди</div>
          </div>
        )}
      </div>

      {/* Таблиця бонусів */}
      <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
        {[
          { label: "1-2 дні поспіль", bonus: "+100 CR", color: "#84cc16" },
          { label: "3-5 днів поспіль", bonus: "+150 CR", color: "#fb923c" },
          { label: "6-7 днів поспіль", bonus: "+200 CR", color: "#facc15" },
        ].map(b => (
          <div key={b.label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: b.color + "14", border: `1px solid ${b.color}26`, borderRadius: 10 }}>
            <span style={{ fontSize: 13 }}>{b.label}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: b.color }}>{b.bonus}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Shop;
