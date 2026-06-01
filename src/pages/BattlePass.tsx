import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { dbSelect } from "../lib/db";
import { Star, Zap, Trophy, Crown, Flame, ChevronLeft, Lock, CheckCircle2, Calendar, ShieldCheck, Gift } from "lucide-react";

type Rarity    = "common" | "rare" | "legendary" | "mythic";
type PrizeType = "cr" | "nft" | "car" | "custom";

interface BattlePassConfig {
  season_name:   string;
  banner_url?:   string;
  gradient_from: string;
  gradient_to:   string;
  accent_color:  string;
  description?:  string;
  season_start?: string;
}

interface BattlePassSlot {
  id:           number;
  slot_number:  number;
  title:        string;
  rarity:       Rarity;
  prize_type:   PrizeType;
  prize_value?: string;
  image_url?:   string;
  nft_gift_id?: string;
  car_name?:    string;
}

interface BattlePassReward {
  slot_id:      number;
  rarity:       Rarity;
  prize_type:   PrizeType;
  prize_value?: string;
  image_url?:   string;
  car_name?:    string;
}

const RARITY_CONFIG: Record<Rarity, {
  label: string; color: string; glow: string;
  border: string; dotColor: string; icon: any; trackColor: string;
  bgCorner: string;
}> = {
  common:    { label:"Звичайний",   color:"#9ca3af", glow:"rgba(156,163,175,0.45)", border:"rgba(156,163,175,0.25)", dotColor:"#9ca3af", icon:Star,   trackColor:"#9ca3af", bgCorner:"rgba(156,163,175,0.18)" },
  rare:      { label:"Рідкісний",   color:"#38bdf8", glow:"rgba(56,189,248,0.55)",  border:"rgba(56,189,248,0.35)",  dotColor:"#38bdf8", icon:Zap,    trackColor:"#38bdf8", bgCorner:"rgba(56,189,248,0.2)"   },
  legendary: { label:"Легендарний", color:"#fbbf24", glow:"rgba(251,191,36,0.65)",  border:"rgba(251,191,36,0.4)",   dotColor:"#fbbf24", icon:Trophy, trackColor:"#fbbf24", bgCorner:"rgba(251,191,36,0.22)"  },
  mythic:    { label:"Міфічний",    color:"#f87171", glow:"rgba(248,113,113,0.7)",  border:"rgba(248,113,113,0.45)", dotColor:"#f87171", icon:Flame,  trackColor:"#f87171", bgCorner:"rgba(248,113,113,0.24)" },
};

const DEFAULT_CONFIG: BattlePassConfig = {
  season_name:   "БАТЛПАС",
  gradient_from: "#0a0a0a",
  gradient_to:   "#111827",
  accent_color:  "#fbbf24",
  description:   "Сезонні нагороди",
};

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}

const SlotCard = ({
  slot, owned, isToday, daysPassed,
}: {
  slot: BattlePassSlot; owned: boolean; isToday: boolean; daysPassed: number;
}) => {
  const cfg    = RARITY_CONFIG[slot.rarity];
  const Icon   = cfg.icon;
  const locked = slot.slot_number > daysPassed + 1 && !owned;
  const isLegendaryPlus = slot.rarity === "legendary" || slot.rarity === "mythic";

  return (
    <div
      className={`relative flex-shrink-0 rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer bp-slot-card ${isLegendaryPlus && (owned || isToday) ? "bp-glow-card" : ""}`}
      style={{
        width: 130,
        /* Gradient background: black bottom-left → rarity color top-right */
        background: owned || isToday
          ? `linear-gradient(135deg, #000 0%, #090909 45%, ${cfg.bgCorner} 100%)`
          : locked
          ? "linear-gradient(135deg,#080808,#0d0d0d)"
          : "linear-gradient(135deg,#0a0a0a 0%,#0a0a0a 50%,rgba(255,255,255,0.03) 100%)",
        border: isToday
          ? `2px solid ${cfg.color}`
          : owned
          ? `1.5px solid ${cfg.border}`
          : "1.5px solid rgba(255,255,255,0.07)",
        boxShadow: isLegendaryPlus && (owned || isToday)
          ? `0 0 28px ${cfg.glow}, 0 4px 20px rgba(0,0,0,0.7)`
          : isToday
          ? `0 0 18px ${cfg.glow}, 0 4px 16px rgba(0,0,0,0.6)`
          : owned
          ? `0 0 10px ${cfg.glow}44, 0 2px 10px rgba(0,0,0,0.4)`
          : "none",
        opacity:   locked ? 0.4 : 1,
        transform: isToday ? "scale(1.05)" : "scale(1)",
        "--glow-color": cfg.glow,
      } as any}
    >
      {/* Shimmer on owned */}
      {owned && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
          <div style={{ position:"absolute",inset:0,background:`linear-gradient(105deg,transparent 35%,rgba(${hexToRgb(cfg.color)},0.13) 50%,transparent 65%)`,animation:"bp-shimmer 5s ease-in-out infinite" }} />
        </div>
      )}

      {/* Top shimmer line */}
      {(owned || isToday) && (
        <div className="absolute inset-x-0 top-0 h-[2px] pointer-events-none z-20"
          style={{ background:`linear-gradient(90deg,transparent,${cfg.color},transparent)` }} />
      )}

      {/* Rarity dot + label */}
      <div className="absolute top-2 left-2 z-20 flex items-center gap-1">
        <div className="w-2.5 h-2.5 rounded-full"
          style={{ background:owned||isToday?cfg.dotColor:"rgba(255,255,255,0.12)", boxShadow:owned||isToday?`0 0 6px ${cfg.glow}`:"none" }} />
        {(owned||isToday) && (
          <span className="text-[7px] font-black uppercase tracking-widest" style={{ color:cfg.color }}>{cfg.label}</span>
        )}
      </div>

      {/* Status icon top-right */}
      <div className="absolute top-2 right-2 z-20">
        {owned ? (
          <div className="bp-owned-badge">
            <ShieldCheck className="w-4 h-4" style={{ color:cfg.color, filter:`drop-shadow(0 0 5px ${cfg.color})` }} />
          </div>
        ) : locked ? (
          <Lock className="w-3.5 h-3.5" style={{ color:"rgba(255,255,255,0.18)" }} />
        ) : isToday ? (
          <div className="w-4 h-4 rounded-full flex items-center justify-center bp-today-badge"
            style={{ background:cfg.color, boxShadow:`0 0 10px ${cfg.glow}` }}>
            <span className="text-[7px] font-black text-black">!</span>
          </div>
        ) : null}
      </div>

      {/* Image area */}
      <div className="relative w-full flex items-center justify-center" style={{ height:100, background:"rgba(0,0,0,0.35)" }}>
        {slot.image_url ? (
          <img
            src={slot.image_url}
            alt={slot.title}
            className="w-full h-full"
            style={{
              objectFit:      "cover",
              objectPosition: "center",
              animation:      owned ? "bp-float 4s ease-in-out infinite" : "none",
              filter:         locked ? "grayscale(1) brightness(0.25)" : "none",
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-1.5">
            <span style={{
              fontSize: 28,
              opacity: locked ? 0.15 : owned || isToday ? 1 : 0.45,
              filter:  owned ? `drop-shadow(0 0 8px ${cfg.color})` : "none",
              animation: owned ? "bp-float 4s ease-in-out infinite" : "none",
            }}>
              {slot.prize_type === "cr" ? "💰" : slot.prize_type === "nft" ? "🎁" : slot.prize_type === "car" ? "🚗" : "✨"}
            </span>
            <Icon className="w-5 h-5"
              style={{ color:owned||isToday?cfg.color:locked?"rgba(255,255,255,0.08)":"rgba(255,255,255,0.22)", filter:owned?`drop-shadow(0 0 6px ${cfg.color})`:"none" }} />
          </div>
        )}

        {/* Owned full-cover shimmer badge */}
        {owned && (
          <div className="absolute inset-0 flex items-end justify-end p-1.5 z-10 pointer-events-none">
            <div className="rounded-lg px-1.5 py-0.5 flex items-center gap-1 bp-received-tag"
              style={{ background:`linear-gradient(135deg,rgba(0,0,0,0.8),rgba(${hexToRgb(cfg.color)},0.3))`, border:`1px solid ${cfg.border}` }}>
              <CheckCircle2 className="w-2.5 h-2.5" style={{ color:cfg.color }} />
              <span className="text-[7px] font-black uppercase tracking-wider" style={{ color:cfg.color }}>Отримано</span>
            </div>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 h-8 pointer-events-none"
          style={{ background:"linear-gradient(to top,rgba(0,0,0,0.75),transparent)" }} />
      </div>

      {/* Title + value */}
      <div className="px-2.5 pt-1.5 pb-1">
        <p className="text-[9px] font-bold text-center leading-tight line-clamp-2"
          style={{ color:owned||isToday?cfg.color:locked?"rgba(255,255,255,0.12)":"rgba(255,255,255,0.4)", textShadow:owned?`0 0 8px ${cfg.glow}`:"none" }}>
          {slot.title||"Приз"}
        </p>
        {slot.prize_type==="cr" && slot.prize_value && (
          <p className="text-[8px] text-center mt-0.5 font-black" style={{ color:owned?"#fbbf24":"rgba(255,255,255,0.15)" }}>{slot.prize_value} CR</p>
        )}
        {slot.prize_type==="car" && slot.car_name && (
          <p className="text-[8px] text-center mt-0.5 font-black" style={{ color:owned||isToday?cfg.color:"rgba(255,255,255,0.15)" }}>🚗 {slot.car_name}</p>
        )}
      </div>

      {/* Day footer */}
      <div className="flex items-center justify-center py-1.5"
        style={{ borderTop:`1px solid ${owned||isToday?cfg.border:"rgba(255,255,255,0.05)"}`, background:owned?`rgba(${hexToRgb(cfg.color)},0.07)`:isToday?`rgba(${hexToRgb(cfg.color)},0.05)`:"transparent" }}>
        <span className="text-[10px] font-black tabular-nums"
          style={{ color:owned||isToday?cfg.color:locked?"rgba(255,255,255,0.1)":"rgba(255,255,255,0.28)", letterSpacing:"0.05em" }}>
          {isToday?"СЬОГОДНІ":`День ${slot.slot_number}`}
        </span>
      </div>
    </div>
  );
};

const ProgressTrack = ({
  slots, ownedIds, daysPassed, accent,
}: { slots: BattlePassSlot[]; ownedIds: Set<number>; daysPassed: number; accent: string }) => {
  const pct = slots.length>0?(ownedIds.size/slots.length)*100:0;
  return (
    <div className="px-4 mb-5">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" style={{ color:accent }} />
          <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color:accent+"99" }}>
            День {Math.min(daysPassed,slots.length)} з {slots.length}
          </span>
        </div>
        <span className="text-[11px] font-black tabular-nums" style={{ color:accent }}>
          {ownedIds.size} / {slots.length} отримано
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background:"rgba(255,255,255,0.06)" }}>
        <div className="h-full rounded-full transition-all duration-700 bp-progress-bar"
          style={{ width:`${pct}%`, background:`linear-gradient(90deg,${accent}88,${accent})`, boxShadow:`0 0 12px ${accent}99` }} />
      </div>
    </div>
  );
};

export const BattlePassCarCard = ({ reward }: { reward: BattlePassReward }) => {
  const cfg     = RARITY_CONFIG[reward.rarity];
  const carName = reward.car_name||reward.prize_value||"АВТО";
  const Icon    = cfg.icon;
  return (
    <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl"
      style={{ border:`1.5px solid ${cfg.border}`,boxShadow:`0 0 32px ${cfg.glow},0 4px 24px rgba(0,0,0,0.5)`,background:`linear-gradient(135deg,#000 0%,#0d0d0d 45%,rgba(${hexToRgb(cfg.color)},0.2) 100%)` }}>
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl z-10">
        <div style={{ position:"absolute",inset:0,background:`linear-gradient(105deg,transparent 40%,rgba(${hexToRgb(cfg.color)},0.15) 50%,transparent 60%)`,animation:"bp-car-shimmer 3s ease-in-out infinite" }} />
      </div>
      <div className="absolute inset-x-0 top-0 h-px z-20" style={{ background:`linear-gradient(90deg,transparent,${cfg.color},transparent)` }} />
      <div className="relative z-10 p-4">
        {reward.image_url ? (
          <div className="relative mb-3 rounded-xl overflow-hidden" style={{ height:140 }}>
            <img src={reward.image_url} alt={carName} className="w-full h-full" style={{ objectFit:"cover",animation:"bp-float 4s ease-in-out infinite" }} />
          </div>
        ) : (
          <div className="flex items-center justify-center mb-3 rounded-xl" style={{ height:100,background:`radial-gradient(circle,rgba(${hexToRgb(cfg.color)},0.1) 0%,rgba(0,0,0,0.4) 100%)`,border:`1px dashed ${cfg.border}` }}>
            <span style={{ fontSize:48 }}>🚗</span>
          </div>
        )}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Icon className="w-3.5 h-3.5" style={{ color:cfg.color,filter:`drop-shadow(0 0 4px ${cfg.color})` }} />
            <span className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color:cfg.color }}>{cfg.label}</span>
          </div>
          <p className="text-base font-black uppercase tracking-wider" style={{ color:cfg.color,textShadow:`0 0 12px ${cfg.glow}` }}>{carName}</p>
          <p className="text-[9px] text-white/40 mt-0.5 uppercase tracking-widest">Батлпас • Авто</p>
        </div>
      </div>
    </div>
  );
};

const BattlePass = () => {
  const navigate = useNavigate();
  const nick = localStorage.getItem("crp_nick")||"";

  const [cfg,     setCfg]     = useState<BattlePassConfig>(DEFAULT_CONFIG);
  const [slots,   setSlots]   = useState<BattlePassSlot[]>([]);
  const [rewards, setRewards] = useState<BattlePassReward[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const getDaysPassed = (seasonStart?: string): number => {
    if (!seasonStart) return 0;
    const start = new Date(seasonStart).getTime();
    return Math.max(0, Math.floor((Date.now() - start) / 86_400_000));
  };

  const daysPassed = getDaysPassed(cfg.season_start);

  useEffect(() => {
    const load = async () => {
      const [configRes, slotsRes, rewardsRes] = await Promise.all([
        dbSelect("battlepass_config", { limit: 1 }),
        dbSelect("battlepass_slots",  { order: { col: "slot_number", dir: "asc" } }),
        nick
          ? dbSelect("battlepass_rewards", { filters: [{ col: "username", op: "ilike", value: nick }] })
          : Promise.resolve({ data: [], error: null }),
      ]);
      const configRow = (configRes.data as any[])?.[0];
      if (configRow) setCfg({ ...DEFAULT_CONFIG, ...configRow });
      setSlots((slotsRes.data   as any[]) || []);
      setRewards((rewardsRes.data as any[]) || []);
      setLoading(false);
    };
    load();
  }, [nick]);

  useEffect(() => {
    if (!loading && scrollRef.current) {
      const el = scrollRef.current.querySelector(`[data-day="${daysPassed}"]`);
      el?.scrollIntoView({ behavior:"smooth", inline:"center", block:"nearest" });
    }
  }, [loading, daysPassed]);

  const ownedIds    = new Set(rewards.map(r => r.slot_id));
  const accent      = cfg.accent_color||"#fbbf24";
  const accentRgb   = hexToRgb(accent);
  const sortedSlots = [...slots].sort((a,b) => a.slot_number - b.slot_number);

  return (
    <div className="min-h-screen pb-24" style={{ background:"#0a0a0a" }}>
      <style>{`
        @keyframes bp-fade-up    { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes bp-shimmer    { 0%{transform:translateX(-100%) rotate(10deg)} 100%{transform:translateX(250%) rotate(10deg)} }
        @keyframes bp-shimmer-banner { 0%{transform:translateX(-100%)} 100%{transform:translateX(200%)} }
        @keyframes bp-header-glow{ 0%,100%{opacity:.5;transform:scale(1)} 50%{opacity:1;transform:scale(1.08)} }
        @keyframes bp-float      { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        @keyframes bp-car-shimmer{ 0%{transform:translateX(-100%) rotate(15deg)} 100%{transform:translateX(300%) rotate(15deg)} }
        @keyframes bp-glow-pulse { 0%,100%{box-shadow:0 0 18px -4px var(--glow-color)} 50%{box-shadow:0 0 38px -2px var(--glow-color),0 0 60px -8px var(--glow-color)} }
        @keyframes bp-border-ani { 0%,100%{border-color:rgba(var(--glow-rgb),0.3)} 50%{border-color:rgba(var(--glow-rgb),0.8)} }
        @keyframes bp-owned-pop  { 0%{opacity:0;transform:scale(0.4) rotate(-20deg)} 60%{transform:scale(1.2) rotate(5deg)} 100%{opacity:1;transform:scale(1) rotate(0)} }
        @keyframes bp-today-pulse{ 0%,100%{transform:scale(1)} 50%{transform:scale(1.3)} }
        @keyframes bp-tag-fadein { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes bp-progress   { from{width:0} to{width:var(--target-w)} }
        .bp-card-row            { scrollbar-width:none }
        .bp-card-row::-webkit-scrollbar{ display:none }
        .bp-slot-card           { transition: transform .2s, box-shadow .3s, border-color .3s }
        .bp-slot-card:active    { transform: scale(0.97) !important }
        .bp-glow-card           { animation: bp-glow-pulse 2.8s ease-in-out infinite }
        .bp-owned-badge         { animation: bp-owned-pop .45s cubic-bezier(.34,1.56,.64,1) }
        .bp-today-badge         { animation: bp-today-pulse 1.4s ease-in-out infinite }
        .bp-received-tag        { animation: bp-tag-fadein .3s ease }
        .bp-progress-bar        { animation: bp-progress .9s ease both }
      `}</style>

      {/* ── Banner / Header ── */}
      <div className="relative w-full overflow-hidden" style={{ minHeight: cfg.banner_url ? 200 : 0 }}>
        {cfg.banner_url && (
          <>
            {/* Banner at FULL quality — no compression */}
            <img
              src={cfg.banner_url}
              alt="banner"
              className="w-full object-cover"
              style={{ height: 220, objectFit: "cover", objectPosition: "center top", imageRendering: "auto" }}
            />
            <div className="absolute inset-0 pointer-events-none"
              style={{ background:`linear-gradient(to bottom,rgba(0,0,0,0.0) 0%,rgba(10,10,10,0.7) 65%,#0a0a0a 100%)` }} />
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div style={{ position:"absolute",inset:0,background:"linear-gradient(105deg,transparent 30%,rgba(255,255,255,0.05) 50%,transparent 70%)",animation:"bp-shimmer-banner 7s ease-in-out infinite" }} />
            </div>
          </>
        )}

        <button onClick={() => navigate(-1)}
          className="absolute left-4 top-4 w-9 h-9 rounded-xl flex items-center justify-center z-10"
          style={{ background:"rgba(0,0,0,0.55)",border:"1px solid rgba(255,255,255,0.14)",backdropFilter:"blur(12px)" }}>
          <ChevronLeft className="w-4 h-4 text-white" />
        </button>

        <div className={`${cfg.banner_url?"absolute bottom-0 left-0 right-0":"relative pt-14"} px-4 pb-4 text-center`}>
          {!cfg.banner_url && (
            <div className="relative inline-flex items-center justify-center mb-4">
              <div className="absolute w-24 h-24 rounded-full pointer-events-none"
                style={{ background:`radial-gradient(circle,rgba(${accentRgb},0.35) 0%,transparent 70%)`,animation:"bp-header-glow 3s ease-in-out infinite" }} />
              <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background:`linear-gradient(135deg,rgba(${accentRgb},0.18),rgba(${accentRgb},0.08))`,border:`1.5px solid rgba(${accentRgb},0.4)`,boxShadow:`0 0 28px rgba(${accentRgb},0.35),0 4px 20px rgba(0,0,0,0.5)` }}>
                <Crown className="w-8 h-8" style={{ color:accent,filter:`drop-shadow(0 0 10px rgba(${accentRgb},0.6))` }} />
              </div>
            </div>
          )}
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="h-px flex-1" style={{ background:`linear-gradient(to right,transparent,rgba(${accentRgb},0.4))` }} />
            <h1 className="text-2xl font-black uppercase tracking-[0.18em]"
              style={{ color:accent,textShadow:`0 0 28px rgba(${accentRgb},0.7),0 2px 8px rgba(0,0,0,0.9)` }}>
              {cfg.season_name||"БАТЛПАС"}
            </h1>
            <div className="h-px flex-1" style={{ background:`linear-gradient(to left,transparent,rgba(${accentRgb},0.4))` }} />
          </div>
          {cfg.description && (
            <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color:accent+"80" }}>{cfg.description}</p>
          )}
        </div>
      </div>

      {/* ── Progress ── */}
      {!loading && (
        <div className="mt-4" style={{ animation:"bp-fade-up .4s ease both" }}>
          <ProgressTrack slots={sortedSlots} ownedIds={ownedIds} daysPassed={daysPassed} accent={accent} />
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor:accent+"33",borderTopColor:accent }} />
        </div>
      ) : slots.length === 0 ? (
        <div className="text-center py-20" style={{ color:"rgba(255,255,255,0.2)" }}>
          <Crown className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Батлпас поки не налаштований</p>
          <p className="text-[10px] mt-1 opacity-60">Адміністратор незабаром додасть нагороди</p>
        </div>
      ) : (
        <div style={{ animation:"bp-fade-up .5s ease both",animationDelay:"100ms" }}>

          {/* Section header */}
          <div className="px-4 mb-3 flex items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-[0.15em]" style={{ color:"rgba(255,255,255,0.45)" }}>Всі нагороди</span>
            <div className="flex-1 h-px" style={{ background:"linear-gradient(to right,rgba(255,255,255,0.08),transparent)" }} />
            <span className="text-[10px]" style={{ color:"rgba(255,255,255,0.22)" }}>1 день = 1 нагорода</span>
          </div>

          {/* Cards row */}
          <div ref={scrollRef} className="bp-card-row flex gap-3 overflow-x-auto pb-4" style={{ paddingLeft:16,paddingRight:16 }}>
            {sortedSlots.map(slot => (
              <div key={slot.id} data-day={slot.slot_number}>
                <SlotCard
                  slot={slot}
                  owned={ownedIds.has(slot.id)}
                  isToday={slot.slot_number === daysPassed}
                  daysPassed={daysPassed}
                />
              </div>
            ))}
          </div>

          {/* Rarity legend */}
          <div className="px-4 mt-5" style={{ animation:"bp-fade-up .5s ease both",animationDelay:"200ms" }}>
            <p className="text-[9px] uppercase tracking-widest mb-3" style={{ color:"rgba(255,255,255,0.2)" }}>Рідкості</p>
            <div className="flex flex-wrap gap-2">
              {(["common","rare","legendary","mythic"] as Rarity[]).map(r => {
                const rc   = RARITY_CONFIG[r];
                const Icon = rc.icon;
                const count = sortedSlots.filter(s=>s.rarity===r).length;
                return (
                  <div key={r} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5"
                    style={{ background:`rgba(${hexToRgb(rc.color)},0.08)`,border:`1px solid rgba(${hexToRgb(rc.color)},0.2)` }}>
                    <div className="w-2 h-2 rounded-full" style={{ background:rc.dotColor,boxShadow:`0 0 4px ${rc.glow}` }} />
                    <Icon className="w-3 h-3" style={{ color:rc.color }} />
                    <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color:rc.color }}>{rc.label}</span>
                    <span className="text-[8px]" style={{ color:rc.color+"66" }}>×{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default BattlePass;
