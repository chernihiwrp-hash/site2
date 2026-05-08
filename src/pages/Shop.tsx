import { useState, useEffect } from "react";
import { Gift, Clock, Zap, Trophy, Star, Flame } from "lucide-react";
import GradientButton from "../components/GradientButton";
import { toast } from "sonner";
import { setBalance as syncBalance, supabase } from "../lib/store";
import { dbUpdate, ilike } from "../lib/db";

// ─── THEME SYSTEM (exported for Casino.tsx) ───────────────────────────────────
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
  {
    id: "lime",
    name: "Lime (default)",
    price: 0,
    preview: "linear-gradient(135deg, hsl(84,81%,44%), hsl(142,71%,45%))",
    vars: { "--primary": "84 81% 44%", "--secondary": "142 71% 45%", "--accent": "84 81% 44%", "--ring": "84 81% 44%", "--neon-lime": "84 81% 44%", "--passport-bg": "linear-gradient(145deg, hsl(240 15% 8% / 0.95), hsl(84 40% 8% / 0.9))", "--passport-border": "hsl(84 81% 44% / 0.25)" },
    bgGradient: "radial-gradient(ellipse 100% 50% at 50% 100%, hsl(142 71% 45% / 0.18) 0%, transparent 65%), radial-gradient(ellipse 70% 35% at 50% 100%, hsl(84 81% 44% / 0.12) 0%, transparent 55%)",
    description: "Класичний неоновий лайм",
  },
  {
    id: "neon_blue",
    name: "Neon Blue",
    price: 300,
    preview: "linear-gradient(135deg, hsl(210,100%,55%), hsl(200,90%,45%))",
    vars: { "--primary": "210 100% 55%", "--secondary": "200 90% 45%", "--accent": "210 100% 55%", "--ring": "210 100% 55%", "--neon-lime": "210 100% 55%", "--passport-bg": "linear-gradient(145deg, hsl(220 30% 6% / 0.97), hsl(210 50% 10% / 0.92))", "--passport-border": "hsl(210 100% 55% / 0.3)" },
    bgGradient: "radial-gradient(ellipse 120% 60% at 50% 110%, hsl(210 100% 55% / 0.2) 0%, transparent 60%), radial-gradient(ellipse 80% 40% at 20% 80%, hsl(200 90% 45% / 0.12) 0%, transparent 50%), radial-gradient(ellipse 60% 30% at 80% 20%, hsl(210 100% 55% / 0.06) 0%, transparent 50%)",
    description: "Електричний синій неон",
  },
  {
    id: "cyber_red",
    name: "Cyber Red",
    price: 300,
    preview: "linear-gradient(135deg, hsl(0,85%,55%), hsl(15,80%,45%))",
    vars: { "--primary": "0 85% 55%", "--secondary": "15 80% 45%", "--accent": "0 85% 55%", "--ring": "0 85% 55%", "--neon-lime": "0 85% 55%", "--passport-bg": "linear-gradient(145deg, hsl(0 20% 5% / 0.97), hsl(15 30% 8% / 0.93))", "--passport-border": "hsl(0 85% 55% / 0.3)" },
    bgGradient: "radial-gradient(ellipse 100% 50% at 30% 100%, hsl(0 85% 55% / 0.18) 0%, transparent 60%), radial-gradient(ellipse 80% 40% at 70% 90%, hsl(15 80% 45% / 0.12) 0%, transparent 55%), radial-gradient(ellipse 50% 25% at 50% 0%, hsl(0 85% 55% / 0.05) 0%, transparent 50%)",
    description: "Кіберпанк у червоному",
  },
  {
    id: "gold_vip",
    name: "Gold VIP",
    price: 750,
    preview: "linear-gradient(135deg, hsl(45,100%,55%), hsl(38,90%,45%))",
    vars: { "--primary": "45 100% 55%", "--secondary": "38 90% 45%", "--accent": "45 100% 55%", "--ring": "45 100% 55%", "--neon-lime": "45 100% 55%", "--passport-bg": "linear-gradient(145deg, hsl(40 20% 6% / 0.97), hsl(45 30% 9% / 0.93))", "--passport-border": "hsl(45 100% 55% / 0.4)" },
    bgGradient: "radial-gradient(ellipse 100% 50% at 50% 100%, hsl(45 100% 55% / 0.2) 0%, transparent 60%), radial-gradient(ellipse 60% 30% at 80% 60%, hsl(38 90% 45% / 0.1) 0%, transparent 50%), radial-gradient(ellipse 40% 20% at 20% 40%, hsl(45 100% 55% / 0.08) 0%, transparent 50%)",
    description: "VIP золото для обраних",
  },
  {
    id: "purple_haze",
    name: "Purple Haze",
    price: 500,
    preview: "linear-gradient(135deg, hsl(275,80%,60%), hsl(290,70%,50%))",
    vars: { "--primary": "275 80% 60%", "--secondary": "290 70% 50%", "--accent": "275 80% 60%", "--ring": "275 80% 60%", "--neon-lime": "275 80% 60%", "--passport-bg": "linear-gradient(145deg, hsl(270 25% 6% / 0.97), hsl(290 20% 8% / 0.93))", "--passport-border": "hsl(275 80% 60% / 0.35)" },
    bgGradient: "radial-gradient(ellipse 110% 55% at 40% 100%, hsl(275 80% 60% / 0.18) 0%, transparent 60%), radial-gradient(ellipse 70% 35% at 70% 80%, hsl(290 70% 50% / 0.12) 0%, transparent 55%), radial-gradient(ellipse 50% 25% at 30% 20%, hsl(275 80% 60% / 0.07) 0%, transparent 50%)",
    description: "Містичний фіолетовий",
  },
  {
    id: "arctic",
    name: "Arctic White",
    price: 400,
    preview: "linear-gradient(135deg, hsl(195,80%,70%), hsl(185,60%,55%))",
    vars: { "--primary": "195 80% 70%", "--secondary": "185 60% 55%", "--accent": "195 80% 70%", "--ring": "195 80% 70%", "--neon-lime": "195 80% 70%", "--passport-bg": "linear-gradient(145deg, hsl(200 25% 6% / 0.97), hsl(185 20% 8% / 0.93))", "--passport-border": "hsl(195 80% 70% / 0.3)" },
    bgGradient: "radial-gradient(ellipse 100% 50% at 60% 100%, hsl(195 80% 70% / 0.15) 0%, transparent 60%), radial-gradient(ellipse 70% 35% at 30% 80%, hsl(185 60% 55% / 0.1) 0%, transparent 55%), radial-gradient(ellipse 80% 40% at 50% 0%, hsl(195 80% 70% / 0.05) 0%, transparent 50%)",
    description: "Холодний арктичний лід",
  },
  {
    id: "matrix",
    name: "Matrix Green",
    price: 600,
    preview: "linear-gradient(135deg, hsl(120,100%,40%), hsl(140,90%,30%))",
    vars: { "--primary": "120 100% 40%", "--secondary": "140 90% 30%", "--accent": "120 100% 40%", "--ring": "120 100% 40%", "--neon-lime": "120 100% 40%", "--passport-bg": "linear-gradient(145deg, hsl(130 30% 4% / 0.98), hsl(120 20% 7% / 0.93))", "--passport-border": "hsl(120 100% 40% / 0.4)" },
    bgGradient: "radial-gradient(ellipse 100% 50% at 50% 100%, hsl(120 100% 40% / 0.2) 0%, transparent 60%), radial-gradient(ellipse 60% 30% at 20% 70%, hsl(140 90% 30% / 0.12) 0%, transparent 50%), radial-gradient(ellipse 40% 20% at 80% 30%, hsl(120 100% 40% / 0.08) 0%, transparent 50%)",
    description: "Матриця хакера",
  },
  {
    id: "sunset",
    name: "Sunset Orange",
    price: 450,
    preview: "linear-gradient(135deg, hsl(25,100%,55%), hsl(350,90%,55%))",
    vars: { "--primary": "25 100% 55%", "--secondary": "350 90% 55%", "--accent": "25 100% 55%", "--ring": "25 100% 55%", "--neon-lime": "25 100% 55%", "--passport-bg": "linear-gradient(145deg, hsl(20 25% 6% / 0.97), hsl(350 20% 7% / 0.93))", "--passport-border": "hsl(25 100% 55% / 0.35)" },
    bgGradient: "radial-gradient(ellipse 110% 55% at 30% 100%, hsl(25 100% 55% / 0.18) 0%, transparent 60%), radial-gradient(ellipse 80% 40% at 70% 90%, hsl(350 90% 55% / 0.14) 0%, transparent 55%), radial-gradient(ellipse 50% 25% at 60% 10%, hsl(25 100% 55% / 0.06) 0%, transparent 50%)",
    description: "Захід сонця",
  },
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

// Крок 1: одразу з localStorage (без флашу), Крок 2: синхронізує з Supabase
export const loadSavedTheme = () => {
  const localTheme = localStorage.getItem("crp_theme") as ThemeId | null;
  if (localTheme) {
    const theme = THEMES.find(t => t.id === localTheme);
    if (theme) applyTheme(theme);
  }

  const nick = localStorage.getItem("crp_nick");
  if (!nick) return;

  supabase
    .from("users")
    .select("active_theme")
    .ilike("username", nick)
    .maybeSingle()
    .then(({ data }) => {
      if (data?.active_theme && data.active_theme !== localTheme) {
        const dbTheme = THEMES.find(t => t.id === data.active_theme);
        if (dbTheme) applyTheme(dbTheme);
      }
    })
    .catch(() => {});
};

// ─── SHOP PAGE — тільки нагороди ──────────────────────────────────────────────
const Shop = () => {
  const nick = localStorage.getItem("crp_nick") || "";
  const [balance, setBalanceState] = useState(0);
  const [lastReward, setLastReward] = useState(() => parseInt(localStorage.getItem("crp_last_reward") || "0"));
  const [streak, setStreak] = useState(() => parseInt(localStorage.getItem("crp_streak") || "0"));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Завантажуємо баланс з Supabase — єдине джерело правди
    supabase.from("users").select("balance").ilike("username", nick).maybeSingle().then(({ data }) => {
      if (data?.balance !== undefined) {
        const bal = (data.balance as number) || 0;
        syncBalance(nick, bal);
        setBalanceState(bal);
      }
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

      // Читаємо свіжий баланс з БД
      const { data: user } = await supabase.from("users").select("balance").ilike("username", nick).maybeSingle();
      const currentBal = (user?.balance as number) ?? 0;
      const newBal = currentBal + bonus;

      // Оновлюємо баланс в БД
      const { error } = await dbUpdate("users", { balance: newBal }, { username: ilike(nick) });
      if (error) {
        toast.error("Помилка нарахування балансу");
        setLoading(false);
        return;
      }

      // Синхронізуємо localStorage і стан
      syncBalance(nick, newBal);
      setBalanceState(newBal);

      const now = Date.now();
      const newStreak = streak + 1;
      setLastReward(now);
      setStreak(newStreak);
      localStorage.setItem("crp_last_reward", String(now));
      localStorage.setItem("crp_streak", String(newStreak));

      toast.success(`+${bonus} CR нараховано! Серія: ${newStreak} днів`);
    } catch (e) {
      toast.error("Щось пішло не так");
    }
    setLoading(false);
  };

  const streakDays = [
    { day: 1, reward: 100, icon: Star },
    { day: 2, reward: 100, icon: Star },
    { day: 3, reward: 150, icon: Flame },
    { day: 4, reward: 150, icon: Flame },
    { day: 5, reward: 150, icon: Flame },
    { day: 6, reward: 200, icon: Trophy },
    { day: 7, reward: 200, icon: Trophy },
  ];

  return (
    <div className="min-h-screen pb-20 px-4 pt-4">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-display text-xl font-bold tracking-wider neon-text-lime">НАГОРОДИ</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Щоденні бонуси</p>
        </div>
        <div className="flex items-center gap-1.5 liquid-glass px-3 py-2 rounded-xl"
          style={{ border: "1px solid hsl(var(--primary) / 0.2)" }}>
          <Zap className="w-3.5 h-3.5 text-primary" />
          <span className="text-sm font-bold text-primary">{balance} CR</span>
        </div>
      </div>

      <div className="liquid-glass-card rounded-2xl p-4 mb-4 animate-fade-in">
        <div className="flex items-center gap-2 mb-3">
          <Flame className="w-4 h-4 text-orange-400" />
          <span className="text-sm font-semibold text-foreground">Серія: {streak} днів</span>
          {streak >= 3 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-orange-400/15 text-orange-400 border border-orange-400/20">
              Бонус активний
            </span>
          )}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {streakDays.map((d) => {
            const isDone = streak >= d.day;
            const isCurrent = streak + 1 === d.day;
            const Icon = d.icon;
            return (
              <div key={d.day} className={`flex flex-col items-center gap-1 rounded-xl py-2 transition-all ${
                isDone ? "bg-primary/15 border border-primary/25" :
                isCurrent ? "bg-primary/8 border border-primary/15" :
                "bg-muted/10 border border-white/5"
              }`}>
                <Icon className={`w-3.5 h-3.5 ${isDone ? "text-primary" : isCurrent ? "text-primary/60" : "text-muted-foreground/30"}`} />
                <span className={`text-[8px] font-bold ${isDone ? "text-primary" : isCurrent ? "text-primary/60" : "text-muted-foreground/30"}`}>
                  +{d.reward}
                </span>
                <span className={`text-[7px] ${isDone ? "text-primary/60" : "text-muted-foreground/30"}`}>Д{d.day}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-3xl animate-fade-in"
        style={{
          background: canClaim
            ? "linear-gradient(135deg, hsl(var(--primary) / 0.18), hsl(var(--secondary) / 0.1), hsl(0 0% 0% / 0.6))"
            : "hsl(0 0% 0% / 0.5)",
          border: canClaim ? "1px solid hsl(var(--primary) / 0.4)" : "1px solid hsl(0 0% 100% / 0.07)",
          boxShadow: canClaim ? "0 0 40px hsl(var(--primary) / 0.2), 0 0 80px hsl(var(--primary) / 0.06)" : "none",
          backdropFilter: "blur(20px)",
        }}>

        {canClaim && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.25) 0%, transparent 70%)" }} />
        )}

        <div className="relative p-6">
          <div className="flex justify-center mb-5">
            <div className="relative">
              {canClaim && (
                <>
                  <div className="absolute inset-0 rounded-3xl animate-ping opacity-20"
                    style={{ background: "hsl(var(--primary) / 0.4)", scale: "1.3" }} />
                  <div className="absolute inset-0 rounded-3xl animate-pulse opacity-30"
                    style={{ background: "hsl(var(--primary) / 0.3)", scale: "1.15" }} />
                </>
              )}
              <div className="relative w-24 h-24 rounded-3xl flex items-center justify-center"
                style={{
                  background: canClaim
                    ? "linear-gradient(135deg, hsl(var(--primary) / 0.3), hsl(var(--secondary) / 0.15))"
                    : "hsl(0 0% 100% / 0.05)",
                  border: canClaim ? "2px solid hsl(var(--primary) / 0.5)" : "1px solid hsl(0 0% 100% / 0.1)",
                  boxShadow: canClaim ? "0 0 30px hsl(var(--primary) / 0.4), inset 0 1px 0 hsl(0 0% 100% / 0.1)" : "none",
                }}>
                <Gift className="w-12 h-12"
                  style={{
                    color: canClaim ? "hsl(var(--primary))" : "hsl(0 0% 40%)",
                    filter: canClaim ? "drop-shadow(0 0 12px hsl(var(--primary)))" : "none",
                  }} />
              </div>
              {canClaim && (
                <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-[9px] font-black text-black animate-bounce"
                  style={{ background: "hsl(var(--primary))", boxShadow: "0 0 10px hsl(var(--primary) / 0.8)" }}>
                  READY
                </div>
              )}
            </div>
          </div>

          <div className="text-center mb-4">
            <h3 className="text-lg font-black text-foreground mb-1">Щоденна нагорода</h3>
            <p className="text-xs text-muted-foreground">Заходь кожного дня і отримуй CR</p>
          </div>

          <div className="flex items-center justify-center gap-3 mb-5">
            <div className="flex items-center gap-2 px-5 py-2.5 rounded-2xl"
              style={{
                background: canClaim ? "hsl(var(--primary) / 0.12)" : "hsl(0 0% 100% / 0.05)",
                border: canClaim ? "1px solid hsl(var(--primary) / 0.3)" : "1px solid hsl(0 0% 100% / 0.07)",
              }}>
              <Zap className="w-5 h-5" style={{ color: canClaim ? "hsl(var(--primary))" : "hsl(0 0% 40%)" }} />
              <span className="text-3xl font-black"
                style={{
                  color: canClaim ? "hsl(var(--primary))" : "hsl(0 0% 40%)",
                  textShadow: canClaim ? "0 0 20px hsl(var(--primary) / 0.7)" : "none",
                }}>
                +{streak >= 6 ? 200 : streak >= 3 ? 150 : 100}
              </span>
              <span className="text-sm font-bold" style={{ color: canClaim ? "hsl(var(--primary))" : "hsl(0 0% 40%)" }}>CR</span>
            </div>
          </div>

          {canClaim ? (
            <GradientButton variant="green" className="w-full text-base py-3.5" onClick={claimReward} disabled={loading}>
              {loading
                ? <span className="flex items-center gap-2 justify-center"><Clock className="w-5 h-5 animate-spin" />Нараховую...</span>
                : <span className="flex items-center gap-2 justify-center"><Gift className="w-5 h-5" />Забрати нагороду</span>
              }
            </GradientButton>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">Наступна через</span>
                </div>
                <span className="text-xs font-bold text-foreground">{timeLeft()}</span>
              </div>
              <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "hsl(0 0% 100% / 0.06)" }}>
                <div className="h-full rounded-full transition-all duration-1000 relative overflow-hidden"
                  style={{ width: `${progress}%`, background: "linear-gradient(90deg, hsl(var(--primary) / 0.6), hsl(var(--primary)))" }}>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground text-center mt-1.5">{Math.round(progress)}% до нагороди</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-2 animate-fade-in">
        {[
          { label: "1-2 дні поспіль", bonus: "+100 CR", color: "text-primary", bg: "bg-primary/8 border-primary/15" },
          { label: "3-5 днів поспіль", bonus: "+150 CR", color: "text-orange-400", bg: "bg-orange-400/8 border-orange-400/15" },
          { label: "6-7 днів поспіль", bonus: "+200 CR", color: "text-yellow-400", bg: "bg-yellow-400/8 border-yellow-400/15" },
        ].map(b => (
          <div key={b.label} className={`flex items-center justify-between px-4 py-2.5 rounded-xl border ${b.bg}`}>
            <span className="text-xs text-muted-foreground">{b.label}</span>
            <span className={`text-xs font-bold ${b.color}`}>{b.bonus}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Shop;
