import { useState, useEffect, useRef, useMemo } from "react";
import { Gift, Clock, Zap, Star, Trophy, Sparkles, Lock, Flame } from "lucide-react";
import GradientButton from "../components/GradientButton";
import { toast } from "sonner";
import { setBalance as syncBalance, supabase } from "../lib/store";
import { dbUpdate, ilike } from "../lib/db";

/* ───────────── ТЕМЫ (без изменений по сути) ───────────── */
export type ThemeId = "lime" | "neon_blue" | "cyber_red" | "gold_vip" | "purple_haze" | "arctic" | "matrix" | "sunset";
export interface Theme { id: ThemeId; name: string; price: number; preview: string; vars: Record<string,string>; bgGradient: string; description: string; }
export const THEMES: Theme[] = [
  { id:"lime", name:"Lime (default)", price:0, preview:"linear-gradient(135deg,hsl(84,81%,44%),hsl(142,71%,45%))", vars:{"--primary":"84 81% 44%","--secondary":"142 71% 45%","--accent":"84 81% 44%","--ring":"84 81% 44%","--neon-lime":"84 81% 44%","--passport-bg":"linear-gradient(145deg,hsl(240 15% 8%/.95),hsl(84 40% 8%/.9))","--passport-border":"hsl(84 81% 44%/.25)"}, bgGradient:"radial-gradient(ellipse 100% 50% at 50% 100%,hsl(142 71% 45%/.18) 0%,transparent 65%),radial-gradient(ellipse 70% 35% at 50% 100%,hsl(84 81% 44%/.12) 0%,transparent 55%)", description:"Класичний неоновий лайм" },
  { id:"neon_blue", name:"Neon Blue", price:300, preview:"linear-gradient(135deg,hsl(210,100%,55%),hsl(200,90%,45%))", vars:{"--primary":"210 100% 55%","--secondary":"200 90% 45%","--accent":"210 100% 55%","--ring":"210 100% 55%","--neon-lime":"210 100% 55%","--passport-bg":"linear-gradient(145deg,hsl(220 30% 6%/.97),hsl(210 50% 10%/.92))","--passport-border":"hsl(210 100% 55%/.3)"}, bgGradient:"radial-gradient(ellipse 120% 60% at 50% 110%,hsl(210 100% 55%/.2) 0%,transparent 60%)", description:"Електричний синій неон" },
  { id:"cyber_red", name:"Cyber Red", price:300, preview:"linear-gradient(135deg,hsl(0,85%,55%),hsl(15,80%,45%))", vars:{"--primary":"0 85% 55%","--secondary":"15 80% 45%","--accent":"0 85% 55%","--ring":"0 85% 55%","--neon-lime":"0 85% 55%","--passport-bg":"linear-gradient(145deg,hsl(0 20% 5%/.97),hsl(15 30% 8%/.93))","--passport-border":"hsl(0 85% 55%/.3)"}, bgGradient:"radial-gradient(ellipse 100% 50% at 30% 100%,hsl(0 85% 55%/.18) 0%,transparent 60%)", description:"Кіберпанк у червоному" },
  { id:"gold_vip", name:"Gold VIP", price:750, preview:"linear-gradient(135deg,hsl(45,100%,55%),hsl(38,90%,45%))", vars:{"--primary":"45 100% 55%","--secondary":"38 90% 45%","--accent":"45 100% 55%","--ring":"45 100% 55%","--neon-lime":"45 100% 55%","--passport-bg":"linear-gradient(145deg,hsl(40 20% 6%/.97),hsl(45 30% 9%/.93))","--passport-border":"hsl(45 100% 55%/.4)"}, bgGradient:"radial-gradient(ellipse 100% 50% at 50% 100%,hsl(45 100% 55%/.2) 0%,transparent 60%)", description:"VIP золото для обраних" },
  { id:"purple_haze", name:"Purple Haze", price:500, preview:"linear-gradient(135deg,hsl(275,80%,60%),hsl(290,70%,50%))", vars:{"--primary":"275 80% 60%","--secondary":"290 70% 50%","--accent":"275 80% 60%","--ring":"275 80% 60%","--neon-lime":"275 80% 60%","--passport-bg":"linear-gradient(145deg,hsl(270 25% 6%/.97),hsl(290 20% 8%/.93))","--passport-border":"hsl(275 80% 60%/.35)"}, bgGradient:"radial-gradient(ellipse 110% 55% at 40% 100%,hsl(275 80% 60%/.18) 0%,transparent 60%)", description:"Містичний фіолетовий" },
  { id:"arctic", name:"Arctic White", price:400, preview:"linear-gradient(135deg,hsl(195,80%,70%),hsl(185,60%,55%))", vars:{"--primary":"195 80% 70%","--secondary":"185 60% 55%","--accent":"195 80% 70%","--ring":"195 80% 70%","--neon-lime":"195 80% 70%","--passport-bg":"linear-gradient(145deg,hsl(200 25% 6%/.97),hsl(185 20% 8%/.93))","--passport-border":"hsl(195 80% 70%/.3)"}, bgGradient:"radial-gradient(ellipse 100% 50% at 60% 100%,hsl(195 80% 70%/.15) 0%,transparent 60%)", description:"Холодний арктичний лід" },
  { id:"matrix", name:"Matrix Green", price:600, preview:"linear-gradient(135deg,hsl(120,100%,40%),hsl(140,90%,30%))", vars:{"--primary":"120 100% 40%","--secondary":"140 90% 30%","--accent":"120 100% 40%","--ring":"120 100% 40%","--neon-lime":"120 100% 40%","--passport-bg":"linear-gradient(145deg,hsl(130 30% 4%/.98),hsl(120 20% 7%/.93))","--passport-border":"hsl(120 100% 40%/.4)"}, bgGradient:"radial-gradient(ellipse 100% 50% at 50% 100%,hsl(120 100% 40%/.2) 0%,transparent 60%)", description:"Матриця хакера" },
  { id:"sunset", name:"Sunset Orange", price:450, preview:"linear-gradient(135deg,hsl(25,100%,55%),hsl(350,90%,55%))", vars:{"--primary":"25 100% 55%","--secondary":"350 90% 55%","--accent":"25 100% 55%","--ring":"25 100% 55%","--neon-lime":"25 100% 55%","--passport-bg":"linear-gradient(145deg,hsl(20 25% 6%/.97),hsl(350 20% 7%/.93))","--passport-border":"hsl(25 100% 55%/.35)"}, bgGradient:"radial-gradient(ellipse 110% 55% at 30% 100%,hsl(25 100% 55%/.18) 0%,transparent 60%)", description:"Захід сонця" },
];
export const applyTheme = (theme: Theme) => {
  const root = document.documentElement;
  Object.entries(theme.vars).forEach(([k,v]) => { if(!k.startsWith("--passport")) root.style.setProperty(k,v); });
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
  if (localTheme) { const t = THEMES.find(x=>x.id===localTheme); if (t) applyTheme(t); }
  const nick = localStorage.getItem("crp_nick"); if (!nick) return;
  supabase.from("users").select("active_theme").ilike("username", nick).maybeSingle()
    .then(({data}:any)=>{ if (data?.active_theme && data.active_theme !== localTheme) { const t = THEMES.find(x=>x.id===data.active_theme); if (t) applyTheme(t); } }).catch(()=>{});
};

/* ───────────── ЦВЕТ ОГНЯ ОТ СТРИКА (плавная HSL-интерполяция) ───────────── */
// 0→жёлтый, 15→красный, 30→фиолетовый, 60→зелёный, 100+→синий
const STREAK_STOPS: { at: number; h: number; s: number; l: number }[] = [
  { at: 0,   h: 50,  s: 100, l: 55 }, // жёлтый
  { at: 15,  h: 0,   s: 90,  l: 55 }, // красный
  { at: 30,  h: 280, s: 85,  l: 60 }, // фиолетовый
  { at: 60,  h: 135, s: 85,  l: 50 }, // зелёный
  { at: 100, h: 215, s: 100, l: 55 }, // синий
];
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
// корректная интерполяция оттенка по короткой дуге
const lerpHue = (a: number, b: number, t: number) => {
  let d = b - a;
  if (d > 180) d -= 360; else if (d < -180) d += 360;
  return (a + d * t + 360) % 360;
};
const streakColor = (s: number) => {
  if (s <= STREAK_STOPS[0].at) return STREAK_STOPS[0];
  if (s >= STREAK_STOPS[STREAK_STOPS.length - 1].at) return STREAK_STOPS[STREAK_STOPS.length - 1];
  for (let i = 0; i < STREAK_STOPS.length - 1; i++) {
    const a = STREAK_STOPS[i], b = STREAK_STOPS[i + 1];
    if (s >= a.at && s <= b.at) {
      const t = (s - a.at) / (b.at - a.at);
      return { at: s, h: lerpHue(a.h, b.h, t), s: lerp(a.s, b.s, t), l: lerp(a.l, b.l, t) };
    }
  }
  return STREAK_STOPS[0];
};
const hsl = (c: { h: number; s: number; l: number }, a = 1) => `hsla(${c.h.toFixed(1)},${c.s.toFixed(1)}%,${c.l.toFixed(1)}%,${a})`;

/* ───────────── БОЛЬШОЙ ОГОНЬ СЕРИИ ───────────── */
import React, { useMemo } from "react";

// Размеры всех PNG-исходников: 530×640
const LAYER_SIZE = { width: 530, height: 640 };

const StreakFlame = ({ streak, size = 180 }: { streak: number, size?: number }) => {
  // Логика сдвига цвета (hue-rotate)
  // Можешь настроить ее под свои нужды:
  // streak > 10 => -25 (красный)
  // streak > 50 => 240 (фиолетовый)
  const hueShift = useMemo(() => {
    if (streak > 50) return 240; 
    if (streak > 10) return -25;
    return 0; // Оранжевый (оригинал)
  }, [streak]);

  const layerStyle: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    pointerEvents: "none", // Чтобы не мешали кликам
  };

  return (
    <div style={{ 
      position: "relative", 
      width: size, 
      height: size, 
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {/* 1. Внешнее свечение (генерируется кодом, чтобы быть пушистым) */}
      <div style={{
        position: "absolute",
        width: "75%",
        height: "80%",
        borderRadius: "50%",
        // Свечение тоже меняет цвет вместе с телом
        background: `radial-gradient(circle, rgba(255,165,0,0.5) 0%, transparent 70%)`,
        filter: `blur(15px) hue-rotate(${hueShift}deg)`,
        animation: "flameGlow 3s ease-in-out infinite",
        transformOrigin: "50% 90%"
      }} />

      {/* Контейнер для всей анимации покачивания (тело, лицо, лапки) */}
      <div style={{ 
        position: "relative", 
        width: "100%", 
        height: "100%",
        animation: "flameWobble 3.2s ease-in-out infinite",
        transformOrigin: "50% 90%"
      }}>
        
        {/* 2. Слой ОСНОВНОЙ ОСНОВЫ (меняем цвет) */}
        <img 
          src="https://i.ibb.co/60qXzH5k/Untitled190-20260511153855.png" 
          style={{ ...layerStyle, filter: `hue-rotate(${hueShift}deg) saturate(1.1)` }} 
          alt="main body"
        />

        {/* 3. Слой ВНУТРЕННЕГО ЭФФЕКТА (меняем цвет) */}
        <img 
          src="https://i.ibb.co/3mqZW48Y/Untitled190-20260511153903.png" 
          style={{ ...layerStyle, filter: `hue-rotate(${hueShift}deg) saturate(1.2)`, animation: "effectBreath 2s infinite" }} 
          alt="internal effect"
        />

        {/* --- Лицо --- */}
        <div style={{ position: "absolute", inset: 0, transformOrigin: "50% 60%" }}>
          {/* 4. Брови (оригинал) */}
          <img src="https://i.ibb.co/3mqZW48Y/image-3.png" style={layerStyle} alt="brows" />
          
          {/* 5. Рот (оригинал) */}
          <img src="https://i.ibb.co/3mqZW48Y/image-2.png" style={layerStyle} alt="mouth" />

          {/* 6. ГЛАЗА (С МОРАГНИЕМ) */}
          <div style={{ 
            position: "absolute", 
            top: 0, left: 0, width: "100%", height: "100%",
            animation: "blink 6s infinite",
            transformOrigin: "50% 58%" // Точка, вокруг которой схлопываются веки
          }}>
            <img src="https://i.ibb.co/3mqZW48Y/image-1.png" style={layerStyle} alt="eyes" />
          </div>
        </div>
      </div>

      <style>{`
        /* Мягкое покачивание и "дыхание" */
        @keyframes flameWobble {
          0%, 100% { transform: rotate(-1.5deg) scale(1) translateY(0); }
          50% { transform: rotate(1.5deg) scale(1.02) translateY(-2px); }
        }

        /* Моргание глаз */
        @keyframes blink {
          0%, 92%, 96%, 100% { transform: scaleY(1); }
          94% { transform: scaleY(0.1); }
        }

        /* "Дыхание" внутреннего эффекта */
        @keyframes effectBreath {
          0%, 100% { opacity: 0.9; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.01); }
        }

        /* Пульсация свечения */
        @keyframes flameGlow {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
};

export default StreakFlame;
/* ───────────── SHOP ───────────── */
const Shop = () => {
  const nick = localStorage.getItem("crp_nick") || "";
  const [balance, setBalanceState] = useState(0);
  const [lastReward, setLastReward] = useState(() => parseInt(localStorage.getItem("crp_last_reward") || "0"));
  const [streak, setStreak] = useState(() => parseInt(localStorage.getItem("crp_streak") || "0"));
  const [loading, setLoading] = useState(false);
  const [nftGifts, setNftGifts] = useState<{ id:number; name:string; image_url:string; price:number }[]>([]);

  useEffect(() => {
    supabase.from("users").select("balance").ilike("username", nick).maybeSingle().then(({ data }:any) => {
      if (data?.balance !== undefined) {
        const bal = (data.balance as number) || 0;
        syncBalance(nick, bal); setBalanceState(bal);
      }
    });
    supabase  .from("nft_gifts")
  .select("*")
  .order("price", { ascending: true })   // ← сортируем по цене
  .limit(4)
  .then(({ data }: any) => { if (data) setNftGifts(data); });
  }, [nick]);

  const canClaim = Date.now() - lastReward > 24*60*60*1000;
  const timeLeft = () => {
    const diff = 24*60*60*1000 - (Date.now() - lastReward);
    const h = Math.floor(diff/3600000), m = Math.floor((diff%3600000)/60000);
    return `${h}г ${m}хв`;
  };
  const progress = Math.min(100, ((Date.now() - lastReward) / (24*60*60*1000)) * 100);

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
      syncBalance(nick, newBal); setBalanceState(newBal);
      const now = Date.now(); const newStreak = streak + 1;
      setLastReward(now); setStreak(newStreak);
      localStorage.setItem("crp_last_reward", String(now));
      localStorage.setItem("crp_streak", String(newStreak));
      toast.success(`+${bonus} CR нараховано! Серія: ${newStreak} днів`);
    } catch { toast.error("Щось пішло не так"); }
    setLoading(false);
  };

  const streakDays = [
    { day:1, reward:100, label:"Д1" }, { day:2, reward:100, label:"Д2" },
    { day:3, reward:150, label:"Д3" }, { day:4, reward:150, label:"Д4" },
    { day:5, reward:150, label:"Д5" }, { day:6, reward:200, label:"Д6" },
    { day:7, reward:200, label:"Д7" },
  ];

  // милстоуны NFT — тянем из БД (имя + цена)
  const milestoneDays = [15, 50, 150, 365];
  const flameC = streakColor(streak);
  const flameCss = hsl(flameC, 1);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between rounded-2xl px-5 py-4"
           style={{ background:"linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))", border:"1px solid rgba(255,255,255,0.08)" }}>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">НАГОРОДИ</h1>
          <p className="text-sm text-white/60">Щоденні бонуси</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.08)" }}>
          <Zap size={16} style={{ color: flameCss }} />
          <span className="font-semibold tabular-nums">{balance} CR</span>
        </div>
      </div>

      {/* STREAK CARD */}
      <section className="rounded-2xl p-5"
               style={{ background:"linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))", border:`1px solid ${hsl(flameC,0.25)}`, boxShadow:`0 0 40px -10px ${hsl(flameC,0.35)} inset` }}>
        {/* колонки дней */}
        <div className="grid grid-cols-7 gap-2">
          {streakDays.map(d => {
            const done = streak >= d.day;
            const current = streak + 1 === d.day;
            const dotColor = hsl(streakColor(d.day), done ? 1 : 0.35);
            return (
              <div key={d.day} className="flex flex-col items-center gap-1.5">
                <div className="w-full aspect-square rounded-xl flex items-center justify-center"
                     style={{
                       background: done ? `linear-gradient(180deg, ${hsl(streakColor(d.day),0.25)}, ${hsl(streakColor(d.day),0.08)})` : "rgba(255,255,255,0.03)",
                       border: `1px solid ${current ? hsl(flameC,0.6) : done ? hsl(streakColor(d.day),0.5) : "rgba(255,255,255,0.06)"}`,
                       boxShadow: current ? `0 0 18px ${hsl(flameC,0.4)}` : "none",
                     }}>
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: dotColor, boxShadow: done ? `0 0 8px ${dotColor}` : "none" }} />
                </div>
                <div className="text-[10px] text-white/50 tabular-nums">+{d.reward}</div>
                <div className="text-[10px] text-white/70 font-medium">{d.label}</div>
              </div>
            );
          })}
        </div>

        {/* БОЛЬШОЙ ОГОНЬ + ЛЕЙБЛ */}
        <div className="mt-6 flex flex-col items-center">
          <StreakFlame streak={streak} size={140} />
          <div className="mt-1 text-center">
            <div className="text-3xl font-extrabold tracking-tight" style={{ color: flameCss, textShadow: `0 0 20px ${hsl(flameC,0.6)}` }}>
              {streak}
            </div>
            <div className="text-xs uppercase tracking-[0.2em] text-white/60">днів поспіль</div>
          </div>
        </div>
      </section>

      {/* DAILY CLAIM */}
      <section className="rounded-2xl p-5" style={{ background:"linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))", border:"1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-white/60">
              {canClaim ? <Sparkles size={12} /> : <Clock size={12} />}
              {canClaim ? "Готово до отримання" : "На сьогодні достатньо"}
            </div>
            <h3 className="mt-1 text-lg font-semibold">Щоденна нагорода</h3>
            <p className="text-sm text-white/60">Заходь кожного дня і отримуй CR</p>
          </div>
          <div className="flex items-center gap-1 text-2xl font-bold" style={{ color: flameCss }}>
            <Zap size={20} /> +{streak >= 6 ? 200 : streak >= 3 ? 150 : 100}
          </div>
        </div>

        <div className="mt-4">
          {canClaim ? (
            <GradientButton onClick={claimReward} disabled={loading} className="w-full">
              {loading ? "Нараховую..." : "Забрати нагороду"}
            </GradientButton>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-white/60">
                <span className="flex items-center gap-1"><Clock size={12}/> Наступна через</span>
                <span className="tabular-nums">{timeLeft()}</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background:"rgba(255,255,255,0.06)" }}>
                <div className="h-full rounded-full transition-all" style={{ width:`${progress}%`, background:`linear-gradient(90deg, ${hsl(flameC,0.8)}, ${hsl({...flameC, h:(flameC.h+30)%360},0.8)})` }} />
              </div>
              <div className="text-[11px] text-white/50 text-right">{Math.round(progress)}% до нагороди</div>
            </div>
          )}
        </div>
      </section>

      {/* NFT MILESTONES (только из БД) */}
      <section className="rounded-2xl p-5" style={{ background:"linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))", border:"1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-2 mb-4">
          <Gift size={18} className="text-white/80" />
          <h3 className="text-lg font-semibold">NFT Нагороди за серію</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {milestoneDays.map((days, idx) => {
            const reached = streak >= days;
            const nft = nftGifts[idx];
            const c = streakColor(days);
            return (
              <div key={days} className="flex items-center gap-3 rounded-xl p-3"
                   style={{ background:"rgba(255,255,255,0.02)", border:`1px solid ${reached ? hsl(c,0.5) : "rgba(255,255,255,0.06)"}` }}>
                <div className="relative w-16 h-16 rounded-lg overflow-hidden flex items-center justify-center shrink-0"
                     style={{ background:`linear-gradient(135deg, ${hsl(c,0.2)}, ${hsl(c,0.05)})`, border:`1px solid ${hsl(c,0.3)}` }}>
                  {nft?.image_url
                    ? <img src={nft.image_url} alt={nft.name} className="w-full h-full object-cover" onError={(e)=>{(e.currentTarget as HTMLImageElement).style.display="none";}} />
                    : <Trophy size={24} style={{ color: hsl(c,0.8) }} />}
                  {!reached && (
                    <div className="absolute inset-0 flex items-center justify-center" style={{ background:"rgba(0,0,0,0.55)", backdropFilter:"blur(2px)" }}>
                      <Lock size={18} className="text-white/80" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold truncate">{nft?.name ?? `NFT #${idx+1}`}</div>
                    {reached && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: hsl(c,0.2), color: hsl(c,1), border:`1px solid ${hsl(c,0.5)}` }}>ОТРИМАНО</span>}
                  </div>
                  <div className="text-xs text-white/60 mt-0.5">
                    {days} днів{nft?.price != null && <> · <span className="text-white/80 tabular-nums">{nft.price} CR</span></>}
                  </div>
                </div>
                {!reached && (
                  <div className="text-right shrink-0">
                    <div className="text-lg font-bold tabular-nums" style={{ color: hsl(c,1) }}>{Math.max(0, days - streak)}</div>
                    <div className="text-[10px] text-white/50">днів</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ТАБЛИЦА БОНУСОВ */}
      <section className="grid grid-cols-3 gap-2">
        {[
          { label:"1–2 дні", bonus:"+100", c: streakColor(1) },
          { label:"3–5 днів", bonus:"+150", c: streakColor(4) },
          { label:"6+ днів", bonus:"+200", c: streakColor(7) },
        ].map((b,i)=>(
          <div key={i} className="rounded-xl p-3 text-center" style={{ background:"rgba(255,255,255,0.03)", border:`1px solid ${hsl(b.c,0.3)}` }}>
            <div className="text-[11px] text-white/60">{b.label}</div>
            <div className="font-bold tabular-nums" style={{ color: hsl(b.c,1) }}>{b.bonus} CR</div>
          </div>
        ))}
      </section>
    </div>
  );
};

export default Shop;
