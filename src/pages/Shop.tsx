import { useState, useEffect, useMemo } from "react";
import { Gift, Clock, Zap, Trophy, Sparkles, Lock, Flame } from "lucide-react";
import GradientButton from "../components/GradientButton";
import { toast } from "sonner";
import { setBalance as syncBalance, supabase } from "../lib/store";
import { dbUpdate, ilike } from "../lib/db";

/* ───────────── ТЕМИ ───────────── */
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

/* ───────────── ЦВЕТ ОГНЯ ОТ СТРИКА ─────────────
   ≤10 жёлтый, 15 красный, 25 фиолетовый, 50 синий, 90 зелёный, 100+ RGB-радуга */
const STREAK_STOPS: { at: number; h: number; s: number; l: number }[] = [
  { at: 0,   h: 50,  s: 100, l: 55 }, // жёлтый
  { at: 10,  h: 50,  s: 100, l: 55 }, // жёлтый (плато до 10)
  { at: 15,  h: 0,   s: 90,  l: 55 }, // красный
  { at: 25,  h: 280, s: 85,  l: 60 }, // фиолетовый
  { at: 50,  h: 215, s: 100, l: 55 }, // синий
  { at: 90,  h: 135, s: 85,  l: 50 }, // зелёный
];
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
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
const isRgbStreak = (s: number) => s >= 100;

/* ───────────── ЗАМОРОЖЕННЫЙ ОГОНЁК ───────────── */
const FrozenFlame = ({ size = 140 }: { size?: number }) => {
  const layerStyle: React.CSSProperties = { position:"absolute", top:0, left:0, width:"100%", height:"100%", objectFit:"contain", display:"block", pointerEvents:"none" };
  return (
    <div style={{ position:"relative", width:size, height:size, display:"flex", alignItems:"center", justifyContent:"center", overflow:"visible" }}>
      <div style={{ position:"absolute", width:"90%", height:"90%", borderRadius:"50%", background:"radial-gradient(circle, rgba(135,206,250,0.5) 0%, transparent 75%)", filter:"blur(18px)", animation:"flameGlow 3s ease-in-out infinite" }} />
      <div style={{ position:"relative", width:"100%", height:"100%", transform:"scale(1.25)", transformOrigin:"50% 90%" }}>
        <img src="https://i.ibb.co/1JmdZ0Q4/Untitled190-20260511164205.png" style={{ ...layerStyle, zIndex:1 }} alt="" />
        <div style={{ position:"absolute", inset:0, zIndex:2, animation:"innerShudder 0.8s linear infinite" }}>
          <img src="https://i.ibb.co/Z6M9kR7q/Untitled190-20260511164214.png" style={layerStyle} alt="" />
        </div>
        <img src="https://i.ibb.co/zTgzcJxp/Untitled190-20260511164219.png" style={{ ...layerStyle, zIndex:3, animation:"innerFloat 3s infinite ease-in-out" }} alt="" />
        <div style={{ position:"absolute", inset:0, zIndex:4, animation:"innerShudder 0.8s linear infinite" }}>
          <div style={{ position:"absolute", inset:0, animation:"blinkFrozen 6s infinite", transformOrigin:"50% 55%" }}>
            <img src="https://i.ibb.co/vx7mxNFv/Untitled190-20260511164225.png" style={layerStyle} alt="" />
          </div>
          <div style={{ position:"absolute", inset:0, animation:"browsShudder 1s linear infinite", transformOrigin:"50% 35%" }}>
            <img src="https://i.ibb.co/fzFFqSg7/Untitled190-20260511164231.png" style={layerStyle} alt="" />
          </div>
          <div style={{ position:"absolute", inset:0, animation:"mouthVibrate 1s linear infinite", transformOrigin:"50% 65%" }}>
            <img src="https://i.ibb.co/KjSFLxFf/Untitled190-20260511164236.png" style={layerStyle} alt="" />
          </div>
        </div>
        <div style={{ position:"absolute", inset:0, zIndex:5, animation:"snotDripSoft 4s ease-in-out infinite", transformOrigin:"50% 50%" }}>
          <img src="https://i.ibb.co/zVbT4TTR/Untitled190-20260511164441.png" style={layerStyle} alt="" />
        </div>
        <div style={{ position:"absolute", inset:0, zIndex:6, animation:"handsShiver 0.6s linear infinite", transformOrigin:"50% 60%" }}>
          <img src="https://i.ibb.co/Rpqxt0hP/Untitled190-20260511164241.png" style={layerStyle} alt="" />
        </div>
        <img src="https://i.ibb.co/zW5DhzsJ/Untitled190-20260511164252.png" style={{ ...layerStyle, zIndex:7 }} alt="" />
        <img src="https://i.ibb.co/2YyJrLF2/Untitled190-20260511164352.png" style={{ ...layerStyle, zIndex:8, opacity:0.6 }} alt="" />
      </div>
      <style>{`
        @keyframes innerShudder { 0%,100%{transform:translate(0,0);} 25%{transform:translate(-0.3px,0.3px);} 50%{transform:translate(0.3px,-0.3px);} 75%{transform:translate(-0.3px,-0.3px);} }
        @keyframes handsShiver { 0%,100%{transform:translateX(0) scale(1);} 20%{transform:translateX(-1px) scale(1.01);} 40%{transform:translateX(1px) translateY(-0.5px);} 60%{transform:translateX(-1px) translateY(0.5px);} 80%{transform:translateX(1px) scale(0.99);} }
        @keyframes blinkFrozen { 0%,94%,96%,100%{transform:scaleY(1);} 95%{transform:scaleY(0.01);} }
        @keyframes flameGlow { 0%,100%{opacity:0.5;} 50%{opacity:0.8;} }
        @keyframes innerFloat { 0%,100%{transform:translateY(0);opacity:0.7;} 50%{transform:translateY(-7px);opacity:1;} }
        @keyframes browsShudder { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-1.5px);} }
        @keyframes mouthVibrate { 0%,100%{transform:translateX(0);} 50%{transform:translateX(0.5px);} }
        @keyframes snotDripSoft { 0%,100%{transform:translateY(0) scaleY(1);} 50%{transform:translateY(3px) scaleY(1.05);} }
      `}</style>
    </div>
  );
};

/* ───────────── ЖИВОЙ ОГОНЁК ───────────── */
const StreakFlame = ({ streak, size = 140 }: { streak: number, size?: number }) => {
  const rgb = isRgbStreak(streak);
  const hueShift = streak >= 90 ? 80 : streak >= 50 ? 165 : streak >= 25 ? 240 : streak >= 15 ? -25 : 0;
  const layerStyle: React.CSSProperties = { position:"absolute", top:0, left:0, width:"100%", height:"100%", objectFit:"contain", display:"block", pointerEvents:"none" };
  const filterFx = rgb ? "hue-rotate(var(--rgb-hue, 0deg)) saturate(1.3)" : `hue-rotate(${hueShift}deg)`;

  return (
    <div style={{ position:"relative", width:size, height:size, display:"flex", alignItems:"center", justifyContent:"center", overflow:"visible", animation: rgb ? "rgbCycle 4s linear infinite" : undefined } as any}>
      <div style={{ position:"absolute", width:"90%", height:"90%", borderRadius:"50%", background:"radial-gradient(circle, rgba(255,140,0,0.5) 0%, transparent 70%)", filter:`blur(15px) ${filterFx}`, animation:"flameGlow 4s ease-in-out infinite" }} />
      <div style={{ position:"relative", width:"100%", height:"100%", animation:"flameWobble 4s ease-in-out infinite", transformOrigin:"50% 90%" }}>
        <img src="https://i.ibb.co/3mg4dWt4/Untitled190-20260511153855.png" style={{ ...layerStyle, filter:filterFx }} alt="" />
        <img src="https://i.ibb.co/WvBJRvQc/Untitled190-20260511153903.png" style={{ ...layerStyle, filter:filterFx, animation:"effectFloat 4s infinite ease-in-out" }} alt="" />
        <div style={{ position:"absolute", inset:0 }}>
          <div style={{ position:"absolute", inset:0, animation:"mouthBreathActive 4s ease-in-out infinite", transformOrigin:"50% 65%" }}>
            <img src="https://i.ibb.co/MDJnjp7k/image-2.png" style={layerStyle} alt="" />
          </div>
          <div style={{ position:"absolute", inset:0, animation:"browsFloatActive 4s ease-in-out infinite", transformOrigin:"50% 35%" }}>
            <img src="https://i.ibb.co/wF1TRzYX/image-3.png" style={layerStyle} alt="" />
          </div>
          <div style={{ position:"absolute", inset:0, animation:"blinkSlow 7s infinite", transformOrigin:"50% 55%" }}>
            <img src="https://i.ibb.co/3mqZW48Y/image-1.png" style={layerStyle} alt="" />
          </div>
        </div>
        <div style={{ position:"absolute", inset:0, animation:"handsWiggleActive 4s ease-in-out infinite", transformOrigin:"50% 60%" }}>
          <img src="https://i.ibb.co/JRntLWBQ/Untitled190-20260511155448.png" style={{ ...layerStyle, filter:filterFx }} alt="" />
          <img src="https://i.ibb.co/jZbBtPmB/Untitled190-20260511155454.png" style={{ ...layerStyle, filter:filterFx }} alt="" />
        </div>
      </div>
      <style>{`
        @keyframes flameWobble { 0%,100%{transform:rotate(-2.5deg) translateY(0);} 50%{transform:rotate(2.5deg) translateY(-2px);} }
        @keyframes blinkSlow { 0%,91%,95%,100%{transform:scaleY(1);} 93%{transform:scaleY(0.02);} }
        @keyframes flameGlow { 0%,100%{opacity:0.5;} 50%{opacity:0.8;} }
        @keyframes effectFloat { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-7px);} }
        @keyframes handsWiggleActive { 0%,100%{transform:translateY(0) rotate(-1deg);} 50%{transform:translateY(-4px) rotate(1deg);} }
        @keyframes browsFloatActive { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-5px) scaleX(1.02);} }
        @keyframes mouthBreathActive { 0%,100%{transform:scale(1) translateY(0);} 50%{transform:scaleX(1.06) scaleY(0.94) translateY(1.5px);} }
        @property --rgb-hue { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
        @keyframes rgbCycle { from { --rgb-hue: 0deg; } to { --rgb-hue: 360deg; } }
      `}</style>
    </div>
  );
};

/* ───────────── МИНИ ОГОНЁК ДЛЯ ДНЕЙ ───────────── */
const MiniFlame = ({ color, dim, rgb }: { color: string; dim?: boolean; rgb?: boolean }) => (
  <span style={{
    display:"inline-flex", alignItems:"center", justifyContent:"center",
    filter: rgb ? "drop-shadow(0 0 6px hsl(var(--mf-hue,0) 100% 60%))" : `drop-shadow(0 0 6px ${color})`,
    opacity: dim ? 0.35 : 1,
    animation: rgb ? "mfRgb 3s linear infinite" : undefined,
  } as any}>
    <Flame size={20} style={{ color: rgb ? "hsl(var(--mf-hue,0) 100% 60%)" : color, fill: rgb ? "hsl(var(--mf-hue,0) 100% 60%)" : color, fillOpacity: dim ? 0.15 : 0.25 }} />
    <style>{`@property --mf-hue{syntax:'<number>';initial-value:0;inherits:false;} @keyframes mfRgb{from{--mf-hue:0;}to{--mf-hue:360;}}`}</style>
  </span>
);

/* ───────────── SHOP ───────────── */
const Shop = () => {
  const nick = localStorage.getItem("crp_nick") || "";
  const [balance, setBalanceState] = useState(0);
  const [lastReward, setLastReward] = useState(() => parseInt(localStorage.getItem("crp_last_reward") || "0"));
  const [streak, setStreak] = useState(() => parseInt(localStorage.getItem("crp_streak") || "0"));
  const [loading, setLoading] = useState(false);
  const [claimingNft, setClaimingNft] = useState<number | null>(null);
  const [nftGifts, setNftGifts] = useState<{ id:number; name:string; image_url:string; price:number }[]>([]);
  const [claimedNfts, setClaimedNfts] = useState<Set<number>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("crp_claimed_nfts") || "[]")); } catch { return new Set(); }
  });

  useEffect(() => {
    supabase.from("users").select("balance").ilike("username", nick).maybeSingle().then(({ data }: any) => {
      if (data?.balance !== undefined) {
        const bal = (data.balance as number) || 0;
        syncBalance(nick, bal); setBalanceState(bal);
      }
    });
    supabase.from("nft_gifts").select("*").order("price", { ascending: true }).limit(4)
      .then(({ data }: any) => { if (data) setNftGifts(data); });
    // подтягиваем уже забранные NFT за серию
    supabase.from("user_nft_claims").select("nft_id").ilike("username", nick)
      .then(({ data }: any) => {
        if (Array.isArray(data)) {
          const ids = new Set<number>(data.map((r: any) => r.nft_id));
          setClaimedNfts(ids);
          localStorage.setItem("crp_claimed_nfts", JSON.stringify([...ids]));
        }
      }).catch(() => {});
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

  /* ── Получение NFT за серию ── */
  const claimNftMilestone = async (nft: { id:number; name:string; image_url:string; price:number }) => {
    if (claimingNft !== null) return;
    if (claimedNfts.has(nft.id)) return;
    setClaimingNft(nft.id);
    try {
      // 1) пробуем записать в user_nft_claims (не обязательная таблица)
      let dbOk = false;
      try {
        const { error } = await supabase.from("user_nft_claims").insert({
          username: nick, nft_id: nft.id, source: "streak", claimed_at: new Date().toISOString(),
        });
        dbOk = !error;
      } catch { dbOk = false; }

      // 2) пробуем добавить в инвентарь пользователя (если есть user_inventory)
      try {
        await supabase.from("user_inventory").insert({
          username: nick, nft_id: nft.id, source: "streak_reward",
        });
      } catch { /* игнор */ }

      // 3) локальный fallback всегда
      const next = new Set(claimedNfts); next.add(nft.id);
      setClaimedNfts(next);
      localStorage.setItem("crp_claimed_nfts", JSON.stringify([...next]));

      toast.success(`🎁 Отримано: ${nft.name}${dbOk ? "" : " (локально)"}`);
    } catch (e) {
      toast.error("Не вдалося отримати NFT");
    } finally {
      setClaimingNft(null);
    }
  };

  const streakDays = [
    { day:1, reward:100, label:"Д1" }, { day:2, reward:100, label:"Д2" },
    { day:3, reward:150, label:"Д3" }, { day:4, reward:150, label:"Д4" },
    { day:5, reward:150, label:"Д5" }, { day:6, reward:200, label:"Д6" },
    { day:7, reward:200, label:"Д7" },
  ];

  const milestoneDays = [15, 50, 150, 365];
  const flameC = streakColor(streak);
  const flameCss = isRgbStreak(streak) ? "hsl(var(--rgb-hue,0deg) 100% 60%)" : hsl(flameC, 1);
  const borderCss = isRgbStreak(streak) ? "hsla(0,0%,100%,0.3)" : hsl(flameC, 0.25);
  const showFrozen = canClaim && streak > 0; // не забрали — заморожен

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
      <section className="rounded-2xl p-5 relative overflow-hidden"
               style={{ background:"linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.015))", border:`1px solid ${borderCss}`, boxShadow:`0 0 50px -12px ${hsl(flameC,0.4)} inset` }}>
        {/* Дни — иконки огонька вместо точек */}
        <div className="grid grid-cols-7 gap-2 relative z-10">
          {streakDays.map(d => {
            const done = streak >= d.day;
            const current = streak + 1 === d.day && canClaim;
            const c = streakColor(d.day);
            const dotColor = hsl(c, done ? 1 : 0.4);
            return (
              <div key={d.day} className="flex flex-col items-center gap-1.5">
                <div className="w-full aspect-square rounded-xl flex items-center justify-center transition-all"
                     style={{
                       background: done ? `linear-gradient(180deg, ${hsl(c,0.28)}, ${hsl(c,0.08)})` : "rgba(255,255,255,0.03)",
                       border: `1px solid ${current ? hsl(flameC,0.7) : done ? hsl(c,0.55) : "rgba(255,255,255,0.06)"}`,
                       boxShadow: current ? `0 0 22px ${hsl(flameC,0.5)}` : done ? `0 0 10px ${hsl(c,0.25)} inset` : "none",
                     }}>
                  <MiniFlame color={dotColor} dim={!done} />
                </div>
                <div className="text-[10px] text-white/50 tabular-nums">+{d.reward}</div>
                <div className="text-[10px] text-white/70 font-medium">{d.label}</div>
              </div>
            );
          })}
        </div>

        {/* БОЛЬШОЙ ОГОНЬ */}
        <div className="mt-6 flex flex-col items-center relative z-10">
          {showFrozen ? <FrozenFlame size={150} /> : <StreakFlame streak={streak} size={150} />}
          <div className="mt-2 text-center">
            <div className="text-4xl font-extrabold tracking-tight" style={{ color: showFrozen ? "#bfeaff" : flameCss, textShadow: `0 0 22px ${showFrozen ? "rgba(135,206,250,0.7)" : hsl(flameC,0.7)}` }}>
              {streak}
            </div>
            <div className="text-[11px] uppercase tracking-[0.25em] text-white/60 mt-1">днів поспіль</div>
            {showFrozen && (
              <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full"
                   style={{ background:"rgba(135,206,250,0.12)", border:"1px solid rgba(135,206,250,0.35)", color:"#bfeaff" }}>
                ❄ Серія замерзне — забери нагороду
              </div>
            )}
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
                <div className="h-full rounded-full transition-all" style={{ width:`${progress}%`, background:`linear-gradient(90deg, ${hsl(flameC,0.85)}, ${hsl({...flameC, h:(flameC.h+30)%360},0.85)})` }} />
              </div>
              <div className="text-[11px] text-white/50 text-right">{Math.round(progress)}% до нагороди</div>
            </div>
          )}
        </div>
      </section>

      {/* NFT MILESTONES */}
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
            const claimed = nft ? claimedNfts.has(nft.id) : false;
            const isClaiming = nft ? claimingNft === nft.id : false;
            return (
              <div key={days} className="flex items-center gap-3 rounded-xl p-3 transition-all"
                   style={{
                     background: reached ? `linear-gradient(135deg, ${hsl(c,0.10)}, rgba(255,255,255,0.02))` : "rgba(255,255,255,0.02)",
                     border:`1px solid ${reached ? hsl(c,0.5) : "rgba(255,255,255,0.06)"}`,
                     boxShadow: reached && !claimed ? `0 0 24px -8px ${hsl(c,0.6)}` : "none",
                   }}>
                <div className="relative w-16 h-16 rounded-lg overflow-hidden flex items-center justify-center shrink-0"
                     style={{ background:`linear-gradient(135deg, ${hsl(c,0.25)}, ${hsl(c,0.05)})`, border:`1px solid ${hsl(c,0.35)}` }}>
                  {nft?.image_url
                    ? <img src={nft.image_url} alt={nft.name} className="w-full h-full object-cover" onError={(e)=>{(e.currentTarget as HTMLImageElement).style.display="none";}} />
                    : <Trophy size={24} style={{ color: hsl(c,0.85) }} />}
                  {!reached && (
                    <div className="absolute inset-0 flex items-center justify-center" style={{ background:"rgba(0,0,0,0.6)", backdropFilter:"blur(2px)" }}>
                      <Lock size={18} className="text-white/85" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-semibold truncate">{nft?.name ?? `NFT #${idx+1}`}</div>
                    {claimed && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background:hsl(c,0.2), color:hsl(c,1), border:`1px solid ${hsl(c,0.5)}` }}>ОТРИМАНО</span>}
                  </div>
                  <div className="text-xs text-white/60 mt-0.5 flex items-center gap-1">
                    <Flame size={10} style={{ color: hsl(c,1) }} />
                    {days} днів{nft?.price != null && <> · <span className="text-white/80 tabular-nums">{nft.price} CR</span></>}
                  </div>
                  {reached && nft && !claimed && (
                    <button
                      onClick={() => claimNftMilestone(nft)}
                      disabled={isClaiming}
                      className="mt-2 w-full text-xs font-bold py-1.5 px-3 rounded-lg transition-all active:scale-[0.98] disabled:opacity-60"
                      style={{ background:`linear-gradient(135deg, ${hsl(c,0.9)}, ${hsl({...c,h:(c.h+30)%360},0.9)})`, color:"#0b0b0b", boxShadow:`0 6px 20px -6px ${hsl(c,0.7)}` }}
                    >
                      {isClaiming ? "Отримую..." : "Отримати NFT"}
                    </button>
                  )}
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

      {/* ТАБЛИЦЯ БОНУСІВ */}
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
