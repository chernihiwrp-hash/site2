import { useState, useEffect, useRef, useMemo } from "react";
import { Gift, Clock, Zap, Star, Trophy, Sparkles, Lock, Flame, AlertTriangle, CheckCircle2 } from "lucide-react";
import GradientButton from "../components/GradientButton";
import { toast } from "sonner";
import { setBalance as syncBalance, supabase } from "../lib/store";
import { dbUpdate, ilike } from "../lib/db";

/* ───────────── THEMES ───────────── */
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

/* ───────────── STREAK COLOR (interpolated HSL) ───────────── */
// <10 = yellow, 15 = red, 25 = purple, 50 = blue, 90 = green, 100 = RGB cycling
const STREAK_STOPS: { at: number; h: number; s: number; l: number }[] = [
  { at: 0,   h: 50,  s: 100, l: 55 }, // жёлтый
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

/* ───────────── FROZEN FLAME (ice version) ───────────── */
const FrozenFlame = ({ size = 180 }: { size?: number }) => {
  const layerStyle: React.CSSProperties = {
    position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
    objectFit: "contain", display: "block", pointerEvents: "none",
  };
  return (
    <div style={{
      position: "relative", width: size, height: size,
      display: "flex", alignItems: "center", justifyContent: "center", overflow: "visible",
    }}>
      {/* Ice glow */}
      <div style={{
        position: "absolute", width: "90%", height: "90%", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(135,206,250,0.4) 0%, transparent 75%)",
        filter: "blur(18px)", animation: "iceGlow 3s ease-in-out infinite",
      }} />
      <div style={{
        position: "relative", width: "100%", height: "100%",
        transform: "scale(1.25)", transformOrigin: "50% 90%",
      }}>
        {/* Ice block back */}
        <img src="https://i.ibb.co/1JmdZ0Q4/Untitled190-20260511164205.png" style={{ ...layerStyle, zIndex: 1 }} alt="ice-back" />
        {/* Frozen body with shudder */}
        <div style={{ position: "absolute", inset: 0, zIndex: 2, animation: "innerShudder 0.8s linear infinite" }}>
          <img src="https://i.ibb.co/Z6M9kR7q/Untitled190-20260511164214.png" style={layerStyle} alt="ice-body" />
        </div>
        {/* Inner glow effect */}
        <img src="https://i.ibb.co/zTgzcJxp/Untitled190-20260511164219.png"
          style={{ ...layerStyle, zIndex: 3, animation: "innerFloat 3s infinite ease-in-out" }} alt="ice-inner" />
        {/* Face group */}
        <div style={{ position: "absolute", inset: 0, zIndex: 4, animation: "innerShudder 0.8s linear infinite" }}>
          <div style={{ position: "absolute", inset: 0, animation: "blinkFrozen 6s infinite", transformOrigin: "50% 55%" }}>
            <img src="https://i.ibb.co/vx7mxNFv/Untitled190-20260511164225.png" style={layerStyle} alt="ice-eyes" />
          </div>
          <div style={{ position: "absolute", inset: 0, animation: "browsShudder 1s linear infinite", transformOrigin: "50% 35%" }}>
            <img src="https://i.ibb.co/fzFFqSg7/Untitled190-20260511164231.png" style={layerStyle} alt="ice-brows" />
          </div>
          <div style={{ position: "absolute", inset: 0, animation: "mouthVibrate 1s linear infinite", transformOrigin: "50% 65%" }}>
            <img src="https://i.ibb.co/KjSFLxFf/Untitled190-20260511164236.png" style={layerStyle} alt="ice-mouth" />
          </div>
        </div>
        {/* Snot */}
        <div style={{ position: "absolute", inset: 0, zIndex: 5, animation: "snotDripSoft 4s ease-in-out infinite", transformOrigin: "50% 50%" }}>
          <img src="https://i.ibb.co/zVbT4TTR/Untitled190-20260511164441.png" style={layerStyle} alt="ice-snot" />
        </div>
        {/* Hands shiver */}
        <div style={{ position: "absolute", inset: 0, zIndex: 6, animation: "handsShiver 0.6s linear infinite", transformOrigin: "50% 60%" }}>
          <img src="https://i.ibb.co/Rpqxt0hP/Untitled190-20260511164241.png" style={layerStyle} alt="ice-hands" />
        </div>
        {/* Ice block front */}
        <img src="https://i.ibb.co/zW5DhzsJ/Untitled190-20260511164252.png" style={{ ...layerStyle, zIndex: 7 }} alt="ice-front" />
        <img src="https://i.ibb.co/2YyJrLF2/Untitled190-20260511164352.png" style={{ ...layerStyle, zIndex: 8, opacity: 0.6 }} alt="ice-shine" />
      </div>
      <style>{`
        @keyframes innerShudder { 0%,100%{transform:translate(0,0)} 25%{transform:translate(-0.3px,0.3px)} 50%{transform:translate(0.3px,-0.3px)} 75%{transform:translate(-0.3px,-0.3px)} }
        @keyframes handsShiver { 0%,100%{transform:translateX(0) scale(1)} 20%{transform:translateX(-1px) scale(1.01)} 40%{transform:translateX(1px) translateY(-0.5px)} 60%{transform:translateX(-1px) translateY(0.5px)} 80%{transform:translateX(1px) scale(0.99)} }
        @keyframes blinkFrozen { 0%,94%,96%,100%{transform:scaleY(1)} 95%{transform:scaleY(0.01)} }
        @keyframes iceGlow { 0%,100%{opacity:0.4} 50%{opacity:0.7} }
        @keyframes innerFloat { 0%,100%{transform:translateY(0);opacity:0.7} 50%{transform:translateY(-7px);opacity:1} }
        @keyframes browsShudder { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-1.5px)} }
        @keyframes mouthVibrate { 0%,100%{transform:translateX(0)} 50%{transform:translateX(0.5px)} }
        @keyframes snotDripSoft { 0%,100%{transform:translateY(0) scaleY(1)} 50%{transform:translateY(3px) scaleY(1.05)} }
      `}</style>
    </div>
  );
};

/* ───────────── ACTIVE FLAME ───────────── */
const StreakFlame = ({ streak, size = 180 }: { streak: number; size?: number }) => {
  const hueShift = streak >= 90 ? 95 : streak >= 50 ? 165 : streak >= 25 ? 230 : streak >= 15 ? -25 : 0;
  const layerStyle: React.CSSProperties = {
    position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
    objectFit: "contain", display: "block", pointerEvents: "none",
  };
  // RGB animation for 100+
  const isRgb = streak >= 100;

  return (
    <div style={{
      position: "relative", width: size, height: size,
      display: "flex", alignItems: "center", justifyContent: "center", overflow: "visible",
    }}>
      <div style={{
        position: "absolute", width: "90%", height: "90%", borderRadius: "50%",
        background: isRgb
          ? "radial-gradient(circle, rgba(255,100,100,0.5) 0%, transparent 70%)"
          : `radial-gradient(circle, rgba(255,140,0,0.5) 0%, transparent 70%)`,
        filter: isRgb ? "blur(15px)" : `blur(15px) hue-rotate(${hueShift}deg)`,
        animation: isRgb ? "rgbGlow 2s linear infinite" : "flameGlow 4s ease-in-out infinite",
      }} />
      <div style={{
        position: "relative", width: "100%", height: "100%",
        animation: "flameWobble 4s ease-in-out infinite",
        transformOrigin: "50% 90%",
      }}>
        <img src="https://i.ibb.co/3mg4dWt4/Untitled190-20260511153855.png"
          style={{ ...layerStyle, filter: isRgb ? "saturate(1.5)" : `hue-rotate(${hueShift}deg)`, animation: isRgb ? "rgbBody 2s linear infinite" : undefined }} alt="body" />
        <img src="https://i.ibb.co/WvBJRvQc/Untitled190-20260511153903.png"
          style={{ ...layerStyle, filter: isRgb ? "saturate(2)" : `hue-rotate(${hueShift}deg)`, animation: isRgb ? "effectFloat 4s infinite ease-in-out, rgbInner 2s linear infinite" : "effectFloat 4s infinite ease-in-out" }} alt="effect" />
        <div style={{ position: "absolute", inset: 0 }}>
          <div style={{ position: "absolute", inset: 0, animation: "mouthBreathActive 4s ease-in-out infinite", transformOrigin: "50% 65%" }}>
            <img src="https://i.ibb.co/MDJnjp7k/image-2.png" style={layerStyle} alt="mouth" />
          </div>
          <div style={{ position: "absolute", inset: 0, animation: "browsFloatActive 4s ease-in-out infinite", transformOrigin: "50% 35%" }}>
            <img src="https://i.ibb.co/wF1TRzYX/image-3.png" style={layerStyle} alt="brows" />
          </div>
          <div style={{ position: "absolute", inset: 0, animation: "blinkSlow 7s infinite", transformOrigin: "50% 55%" }}>
            <img src="https://i.ibb.co/3mqZW48Y/image-1.png" style={layerStyle} alt="eyes" />
          </div>
        </div>
        <div style={{ position: "absolute", inset: 0, animation: "handsWiggleActive 4s ease-in-out infinite", transformOrigin: "50% 60%" }}>
          <img src="https://i.ibb.co/JRntLWBQ/Untitled190-20260511155448.png"
            style={{ ...layerStyle, filter: isRgb ? undefined : `hue-rotate(${hueShift}deg)` }} alt="hands" />
          <img src="https://i.ibb.co/jZbBtPmB/Untitled190-20260511155454.png"
            style={{ ...layerStyle, filter: isRgb ? undefined : `hue-rotate(${hueShift}deg)` }} alt="hands-inner" />
        </div>
      </div>
      <style>{`
        @keyframes flameWobble { 0%,100%{transform:rotate(-2.5deg) translateY(0)} 50%{transform:rotate(2.5deg) translateY(-2px)} }
        @keyframes blinkSlow { 0%,91%,95%,100%{transform:scaleY(1)} 93%{transform:scaleY(0.02)} }
        @keyframes flameGlow { 0%,100%{opacity:0.5} 50%{opacity:0.8} }
        @keyframes effectFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
        @keyframes handsWiggleActive { 0%,100%{transform:translateY(0) rotate(-1deg)} 50%{transform:translateY(-4px) rotate(1deg)} }
        @keyframes browsFloatActive { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px) scaleX(1.02)} }
        @keyframes mouthBreathActive { 0%,100%{transform:scale(1) translateY(0)} 50%{transform:scaleX(1.06) scaleY(0.94) translateY(1.5px)} }
        @keyframes rgbGlow { 0%{background:radial-gradient(circle,rgba(255,80,80,0.5) 0%,transparent 70%)} 33%{background:radial-gradient(circle,rgba(80,255,80,0.5) 0%,transparent 70%)} 66%{background:radial-gradient(circle,rgba(80,80,255,0.5) 0%,transparent 70%)} 100%{background:radial-gradient(circle,rgba(255,80,80,0.5) 0%,transparent 70%)} }
        @keyframes rgbBody { 0%{filter:hue-rotate(0deg) saturate(1.5)} 100%{filter:hue-rotate(360deg) saturate(1.5)} }
        @keyframes rgbInner { 0%{filter:hue-rotate(0deg) saturate(2)} 100%{filter:hue-rotate(360deg) saturate(2)} }
      `}</style>
    </div>
  );
};

/* ───────────── MINI FLAME ICON for streak bar ───────────── */
const MiniFlameIcon = ({ done, current, frozen, streakDay }: { done: boolean; current: boolean; frozen?: boolean; streakDay: number }) => {
  const c = streakColor(streakDay);
  if (frozen) {
    return (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="11" cy="13" rx="7" ry="7" fill="rgba(100,180,255,0.18)" />
        <path d="M11 3C11 3 7 7 7 11.5C7 13.8 8.8 16 11 16C13.2 16 15 13.8 15 11.5C15 9 13 7 13 7C13 7 13.5 9 12 10C12 8 11 3 11 3Z" fill="rgba(150,210,255,0.5)" />
        <rect x="7" y="9" width="8" height="7" rx="2" fill="rgba(120,200,255,0.25)" stroke="rgba(150,220,255,0.6)" strokeWidth="0.8" />
        <path d="M9 12 L13 12 M11 10 L11 14" stroke="rgba(200,240,255,0.8)" strokeWidth="0.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (!done && !current) {
    return (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M11 4C11 4 7.5 7.5 7.5 11.5C7.5 14 9.5 16 11 16C12.5 16 15 14 15 11.5C15 9 13 7 13 7C13 7 13.5 9 12 10C12 8 11 4 11 4Z" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
      </svg>
    );
  }
  const color = hsl(c, done ? 1 : 0.6);
  const glow = hsl(c, 0.5);
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ filter: done ? `drop-shadow(0 0 4px ${glow})` : undefined }}>
      <path d="M11 3C11 3 7 7.5 7 12C7 14.5 9 17 11 17C13 17 15 14.5 15 12C15 9.5 13 7.5 13 7.5C13 7.5 13.5 9.5 12 11C12 8.5 11 3 11 3Z"
        fill={color} />
      {done && (
        <ellipse cx="11" cy="13.5" rx="2.5" ry="2" fill={hsl({...c, l: c.l + 20}, 0.6)} />
      )}
    </svg>
  );
};

/* ───────────── SHOP ───────────── */
const Shop = () => {
  const nick = localStorage.getItem("crp_nick") || "";
  const [balance, setBalanceState] = useState(0);
  const [lastReward, setLastReward] = useState(() => parseInt(localStorage.getItem("crp_last_reward") || "0"));
  const [streak, setStreak] = useState(() => parseInt(localStorage.getItem("crp_streak") || "0"));
  const [loading, setLoading] = useState(false);
  const [nftGifts, setNftGifts] = useState<{ id: number; name: string; image_url: string; price: number }[]>([]);
  const [claimedNfts, setClaimedNfts] = useState<Set<number>>(new Set());
  const [claimingNft, setClaimingNft] = useState<number | null>(null);
  const [flameRevealed, setFlameRevealed] = useState(false); // for first-time reveal animation
  const [flameAnimating, setFlameAnimating] = useState(false);

  // 24h expiry logic
  const now = Date.now();
  const timeSinceClaim = now - lastReward;
  const canClaim = timeSinceClaim > 24 * 60 * 60 * 1000;
  const streakExpired = lastReward > 0 && timeSinceClaim > 48 * 60 * 60 * 1000; // missed 2 windows = frozen
  const streakFrozen = streakExpired && streak > 0;
  // Time left to claim before streak freezes (48h window)
  const freezeAt = lastReward + 48 * 60 * 60 * 1000;
  const timeUntilFreeze = Math.max(0, freezeAt - now);
  const hoursUntilFreeze = Math.floor(timeUntilFreeze / 3600000);
  const minsUntilFreeze = Math.floor((timeUntilFreeze % 3600000) / 60000);

  useEffect(() => {
    supabase.from("users").select("balance").ilike("username", nick).maybeSingle().then(({ data }: any) => {
      if (data?.balance !== undefined) {
        const bal = (data.balance as number) || 0;
        syncBalance(nick, bal); setBalanceState(bal);
      }
    });
    supabase.from("nft_gifts").select("*").order("price", { ascending: true }).limit(4)
      .then(({ data }: any) => { if (data) setNftGifts(data); });

    // Load claimed NFTs from localStorage
    const saved = localStorage.getItem("crp_claimed_nfts");
    if (saved) {
      try { setClaimedNfts(new Set(JSON.parse(saved))); } catch {}
    }
  }, [nick]);

  const timeLeft = () => {
    const diff = 24 * 60 * 60 * 1000 - timeSinceClaim;
    const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000);
    return `${h}г ${m}хв`;
  };
  const progress = Math.min(100, (timeSinceClaim / (24 * 60 * 60 * 1000)) * 100);

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
      const nowTs = Date.now();
      // If streak was frozen, reset to 1, otherwise increment
      const newStreak = streakFrozen ? 1 : streak + 1;
      setLastReward(nowTs); setStreak(newStreak);
      localStorage.setItem("crp_last_reward", String(nowTs));
      localStorage.setItem("crp_streak", String(newStreak));
      if (streakFrozen) {
        toast.info(`Серія відновлена! Починаємо заново з 1 дня. +${bonus} CR`);
      } else {
        toast.success(`+${bonus} CR нараховано! Серія: ${newStreak} днів 🔥`);
      }
    } catch { toast.error("Щось пішло не так"); }
    setLoading(false);
  };

  /* NFT Claim */
  const claimNft = async (nft: { id: number; name: string; image_url: string; price: number }, days: number) => {
    if (streak < days || claimedNfts.has(nft.id) || claimingNft !== null) return;
    setClaimingNft(nft.id);
    try {
      // Save to nft_owners — the table that Profile reads from
      const { error } = await supabase.from("nft_owners").insert({
        owner_nick: nick,
        nft_id: nft.id,
        obtained_at: new Date().toISOString(),
      });
      if (error) {
        console.warn("NFT claim DB error:", error);
      }
      const newClaimed = new Set(claimedNfts);
      newClaimed.add(nft.id);
      setClaimedNfts(newClaimed);
      localStorage.setItem("crp_claimed_nfts", JSON.stringify([...newClaimed]));
      toast.success(`🎁 NFT «${nft.name}» отримано і додано до профілю!`);
    } catch (e) {
      toast.error("Помилка отримання NFT");
    }
    setClaimingNft(null);
  };

  const streakDays = [
    { day: 1, reward: 100, label: "Д1" }, { day: 2, reward: 100, label: "Д2" },
    { day: 3, reward: 150, label: "Д3" }, { day: 4, reward: 150, label: "Д4" },
    { day: 5, reward: 150, label: "Д5" }, { day: 6, reward: 200, label: "Д6" },
    { day: 7, reward: 200, label: "Д7" },
  ];

  const milestoneDays = [15, 50, 150, 365];
  const flameC = streakColor(streakFrozen ? 0 : streak);
  const flameCss = streakFrozen ? "rgba(150,210,255,0.9)" : hsl(flameC, 1);
  const isRgb = streak >= 100 && !streakFrozen;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      {/* ─── HEADER ─── */}
      <div className="flex items-center justify-between rounded-2xl px-5 py-4"
        style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))", border: "1px solid rgba(255,255,255,0.09)" }}>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">НАГОРОДИ</h1>
          <p className="text-sm text-white/50">Щоденні бонуси та серії</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full"
          style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <Zap size={16} style={{ color: flameCss }} />
          <span className="font-bold tabular-nums">{balance} CR</span>
        </div>
      </div>

      {/* ─── STREAK CARD ─── */}
      <section className="rounded-2xl overflow-hidden"
        style={{
          background: streakFrozen
            ? "linear-gradient(180deg, rgba(100,180,255,0.08), rgba(50,120,200,0.03))"
            : "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015))",
          border: `1px solid ${streakFrozen ? "rgba(100,180,255,0.3)" : hsl(flameC, 0.3)}`,
          boxShadow: streakFrozen
            ? "0 0 40px -10px rgba(100,180,255,0.3) inset"
            : `0 0 40px -10px ${hsl(flameC, 0.3)} inset`,
        }}>

        {/* Frozen warning banner */}
        {streakFrozen && (
          <div className="flex items-center gap-3 px-5 py-3 text-sm"
            style={{ background: "rgba(100,180,255,0.12)", borderBottom: "1px solid rgba(100,180,255,0.2)" }}>
            <AlertTriangle size={16} style={{ color: "rgba(150,210,255,0.9)", flexShrink: 0 }} />
            <span style={{ color: "rgba(200,235,255,0.85)" }}>
              Серія заморожена! Забери нагороду щоб відновити з 1 дня
            </span>
          </div>
        )}

        {/* Pending claim warning */}
        {canClaim && !streakFrozen && lastReward > 0 && timeUntilFreeze < 24 * 60 * 60 * 1000 && (
          <div className="flex items-center gap-3 px-5 py-3 text-sm"
            style={{ background: "rgba(255,180,50,0.08)", borderBottom: "1px solid rgba(255,180,50,0.15)" }}>
            <Clock size={16} style={{ color: "rgba(255,200,80,0.9)", flexShrink: 0 }} />
            <span style={{ color: "rgba(255,220,130,0.85)" }}>
              Серія згасне через {hoursUntilFreeze}г {minsUntilFreeze}хв якщо не забереш нагороду!
            </span>
          </div>
        )}

        <div className="p-5">
          {/* ── STREAK BAR with flame icons ── */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase tracking-widest text-white/40 font-medium">Тижнева серія</span>
              <span className="text-xs text-white/40">{Math.min(streak, 7)}/7 днів</span>
            </div>
            <div className="flex gap-1.5 items-end">
              {streakDays.map((d) => {
                const done = streak >= d.day;
                const current = streak + 1 === d.day;
                const frozen = streakFrozen && done;
                const c = streakColor(d.day);
                return (
                  <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                    {/* Flame icon */}
                    <div className="relative flex items-center justify-center" style={{ width: 36, height: 36 }}>
                      {/* Glow bg for done */}
                      {done && !frozen && (
                        <div style={{
                          position: "absolute", inset: 0, borderRadius: "50%",
                          background: `radial-gradient(circle, ${hsl(c, 0.3)} 0%, transparent 70%)`,
                          filter: "blur(4px)",
                        }} />
                      )}
                      <MiniFlameIcon done={done} current={current} frozen={frozen} streakDay={d.day} />
                      {current && (
                        <div style={{
                          position: "absolute", inset: -3, borderRadius: "50%",
                          border: `1.5px solid ${hsl(flameC, 0.7)}`,
                          animation: "pulseRing 2s ease-in-out infinite",
                        }} />
                      )}
                    </div>
                    {/* Bar segment */}
                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: done ? "100%" : "0%",
                          background: frozen
                            ? "linear-gradient(90deg, rgba(100,180,255,0.6), rgba(150,220,255,0.4))"
                            : `linear-gradient(90deg, ${hsl(c, 0.9)}, ${hsl({ ...c, h: (c.h + 20) % 360 }, 0.7)})`,
                        }} />
                    </div>
                    {/* Label */}
                    <span className="text-[10px] font-medium" style={{ color: done ? (frozen ? "rgba(150,210,255,0.7)" : hsl(c, 0.8)) : "rgba(255,255,255,0.25)" }}>
                      {d.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── FLAME DISPLAY + STREAK NUMBER ── */}
          <div className="flex flex-col items-center py-2">
            {streakFrozen ? (
              <FrozenFlame size={140} />
            ) : (
              <StreakFlame streak={streak} size={140} />
            )}
            <div className="mt-1 text-center">
              <div className="text-4xl font-extrabold tabular-nums tracking-tight"
                style={{
                  color: flameCss,
                  textShadow: streakFrozen
                    ? "0 0 20px rgba(100,180,255,0.6)"
                    : `0 0 20px ${hsl(flameC, 0.6)}`,
                  animation: isRgb ? "rgbText 2s linear infinite" : undefined,
                }}>
                {streak}
              </div>
              <div className="text-xs uppercase tracking-[0.2em] text-white/50 mt-0.5">
                {streakFrozen ? "🧊 серія заморожена" : "днів поспіль"}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── DAILY CLAIM ─── */}
      <section className="rounded-2xl p-5"
        style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-white/50 mb-1">
              {canClaim ? <Sparkles size={12} /> : <Clock size={12} />}
              {canClaim
                ? streakFrozen ? "Відновити серію" : "Готово до отримання"
                : "На сьогодні достатньо"}
            </div>
            <h3 className="text-lg font-semibold">Щоденна нагорода</h3>
            <p className="text-sm text-white/50 mt-0.5">
              {streakFrozen ? "Забери щоб розморозити серію" : "Заходь кожного дня і отримуй CR"}
            </p>
          </div>
          <div className="flex items-center gap-1 text-2xl font-bold shrink-0" style={{ color: flameCss }}>
            <Zap size={20} /> +{streak >= 6 ? 200 : streak >= 3 ? 150 : 100}
          </div>
        </div>

        <div className="mt-4">
          {canClaim ? (
            <GradientButton onClick={claimReward} disabled={loading} className="w-full">
              {loading ? "Нараховую..." : streakFrozen ? "🧊 Розморозити серію" : "🔥 Забрати нагороду"}
            </GradientButton>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-white/50">
                <span className="flex items-center gap-1"><Clock size={12} /> Наступна через</span>
                <span className="tabular-nums font-medium">{timeLeft()}</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${progress}%`,
                    background: `linear-gradient(90deg, ${hsl(flameC, 0.8)}, ${hsl({ ...flameC, h: (flameC.h + 30) % 360 }, 0.8)})`,
                  }} />
              </div>
              <div className="flex justify-between text-[11px] text-white/40">
                <span>{Math.round(progress)}% до нагороди</span>
                {timeUntilFreeze < 24 * 60 * 60 * 1000 && (
                  <span style={{ color: "rgba(255,180,80,0.8)" }}>
                    ⚠ серія згасне через {hoursUntilFreeze}г {minsUntilFreeze}хв
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ─── NFT MILESTONES ─── */}
      <section className="rounded-2xl p-5"
        style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-2 mb-4">
          <Gift size={18} className="text-white/70" />
          <h3 className="text-lg font-semibold">NFT Нагороди за серію</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {milestoneDays.map((days, idx) => {
            const reached = streak >= days;
            const nft = nftGifts[idx];
            const c = streakColor(days);
            const isClaimed = nft ? claimedNfts.has(nft.id) : false;
            const isClaiming = nft ? claimingNft === nft.id : false;
            const canClaimNft = reached && nft && !isClaimed;

            return (
              <div key={days}
                className="flex flex-col gap-3 rounded-xl p-3"
                style={{
                  background: reached ? `linear-gradient(135deg, ${hsl(c, 0.08)}, rgba(0,0,0,0.1))` : "rgba(255,255,255,0.02)",
                  border: `1px solid ${reached ? hsl(c, isClaimed ? 0.6 : 0.4) : "rgba(255,255,255,0.07)"}`,
                  transition: "border-color 0.3s",
                }}>
                <div className="flex items-center gap-3">
                  {/* NFT preview */}
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden flex items-center justify-center shrink-0"
                    style={{ background: `linear-gradient(135deg, ${hsl(c, 0.25)}, ${hsl(c, 0.07)})`, border: `1px solid ${hsl(c, 0.35)}` }}>
                    {nft?.image_url
                      ? <img src={nft.image_url} alt={nft.name} className="w-full h-full object-cover"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                      : <Trophy size={22} style={{ color: hsl(c, 0.8) }} />}
                    {!reached && (
                      <div className="absolute inset-0 flex items-center justify-center"
                        style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(2px)" }}>
                        <Lock size={16} className="text-white/70" />
                      </div>
                    )}
                    {isClaimed && (
                      <div className="absolute inset-0 flex items-center justify-center"
                        style={{ background: `${hsl(c, 0.35)}`, backdropFilter: "blur(1px)" }}>
                        <CheckCircle2 size={20} style={{ color: hsl(c, 1) }} />
                      </div>
                    )}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{nft?.name ?? `NFT Серія ${days}`}</div>
                    <div className="text-xs text-white/50 mt-0.5 flex items-center gap-1.5">
                      <span className="flex items-center gap-0.5" style={{ color: hsl(c, 0.8) }}>
                        <MiniFlameIcon done streakDay={days} current={false} />
                        {days} днів
                      </span>
                      {nft?.price != null && <><span className="text-white/30">·</span><span className="text-white/60 tabular-nums">{nft.price} CR</span></>}
                    </div>
                    {/* Badge */}
                    {isClaimed && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold mt-1"
                        style={{ background: hsl(c, 0.18), color: hsl(c, 1), border: `1px solid ${hsl(c, 0.5)}` }}>
                        <CheckCircle2 size={9} /> ОТРИМАНО
                      </span>
                    )}
                    {!reached && (
                      <div className="text-[11px] text-white/40 mt-1">
                        ще <span className="tabular-nums font-semibold" style={{ color: hsl(c, 0.7) }}>{days - streak}</span> днів
                      </div>
                    )}
                  </div>
                </div>

                {/* Claim button — only shown when reachable and not yet claimed */}
                {canClaimNft && (
                  <button
                    onClick={() => claimNft(nft, days)}
                    disabled={isClaiming}
                    className="w-full py-2 rounded-lg text-sm font-semibold transition-all active:scale-95"
                    style={{
                      background: `linear-gradient(135deg, ${hsl(c, 0.6)}, ${hsl({ ...c, h: (c.h + 20) % 360 }, 0.5)})`,
                      border: `1px solid ${hsl(c, 0.7)}`,
                      color: "#fff",
                      boxShadow: `0 0 16px -4px ${hsl(c, 0.5)}`,
                      cursor: isClaiming ? "wait" : "pointer",
                      opacity: isClaiming ? 0.7 : 1,
                    }}>
                    {isClaiming ? "Отримую..." : "🎁 Отримати NFT"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── BONUS TABLE ─── */}
      <section className="grid grid-cols-3 gap-2">
        {[
          { label: "1–2 дні", bonus: "+100", c: streakColor(1) },
          { label: "3–5 днів", bonus: "+150", c: streakColor(4) },
          { label: "6+ днів", bonus: "+200", c: streakColor(7) },
        ].map((b, i) => (
          <div key={i} className="rounded-xl p-3 text-center"
            style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${hsl(b.c, 0.25)}` }}>
            <div className="text-[11px] text-white/50 mb-1">{b.label}</div>
            <div className="font-bold tabular-nums text-base" style={{ color: hsl(b.c, 1) }}>{b.bonus} CR</div>
          </div>
        ))}
      </section>

      <style>{`
        @keyframes pulseRing {
          0%,100% { opacity:0.6; transform:scale(1); }
          50% { opacity:1; transform:scale(1.15); }
        }
        @keyframes rgbText {
          0%{color:hsl(0,90%,65%)} 33%{color:hsl(120,85%,55%)} 66%{color:hsl(240,90%,70%)} 100%{color:hsl(360,90%,65%)}
        }
      `}</style>
    </div>
  );
};

export default Shop;
