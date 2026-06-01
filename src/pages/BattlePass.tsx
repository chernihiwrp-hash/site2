import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { dbSelect, dbInsert } from "../lib/db";
import { toast } from "sonner";
import {
  Star, Zap, Trophy, Crown, Flame, ChevronLeft, Lock, CheckCircle2,
  Calendar, ShieldCheck, Gift,
} from "lucide-react";

/* ──────────────────────────────────────────────────────────────────
   Battle Pass v2
   Нові фічі:
   1. Чорна карточка з градієнтним «кружечком» рідкості в куті,
      який перетікає в чорний.
   2. Анімована підсвітка контуру для legendary/mythic під колір рідкості.
   3. Кастомний фон батлпасу (background_url) — якщо заданий,
      замість банера ставиться повноекранне фото, а карточки
      перетворюються на liquid-glass з блюром.
   4. Кнопка «Забрати щоденну нагороду» — раз на добу видає +1 рівень.
   5. Шкала номерів рівня знизу карточки (як на референсі).
   6. Колір шкали налаштовується (level_color).
   ────────────────────────────────────────────────────────────────── */

type Rarity    = "common" | "rare" | "legendary" | "mythic";
type PrizeType = "cr" | "nft" | "car" | "custom";

interface BattlePassConfig {
  season_name:    string;
  banner_url?:    string;
  background_url?:string;  // NEW — повноекранний фон
  gradient_from:  string;
  gradient_to:    string;
  accent_color:   string;
  level_color?:   string;  // NEW — колір шкали рівнів
  description?:   string;
  season_start?:  string;
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
  label: string; color: string; glow: string; rgb: string;
  border: string; icon: any;
}> = {
  common:    { label:"Звичайний",   color:"#9ca3af", glow:"rgba(156,163,175,0.55)", rgb:"156,163,175", border:"rgba(156,163,175,0.3)", icon:Star   },
  rare:      { label:"Рідкісний",   color:"#3b82f6", glow:"rgba(59,130,246,0.65)",   rgb:"59,130,246",   border:"rgba(59,130,246,0.42)",  icon:Zap    },
  legendary: { label:"Легендарний", color:"#fbbf24", glow:"rgba(251,191,36,0.75)",  rgb:"251,191,36",  border:"rgba(251,191,36,0.5)",  icon:Trophy },
  mythic:    { label:"Міфічний",    color:"#ef4444", glow:"rgba(239,68,68,0.8)",    rgb:"239,68,68",   border:"rgba(239,68,68,0.55)",  icon:Flame  },
};

const DEFAULT_CONFIG: BattlePassConfig = {
  season_name:   "БАТЛПАС",
  gradient_from: "#0a0a0a",
  gradient_to:   "#111827",
  accent_color:  "#fbbf24",
  level_color:   "#38bdf8",
  description:   "Сезонні нагороди",
};

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}

const todayKey = () => new Date().toISOString().slice(0,10);

/* ───────────────────────────── SLOT CARD ─────────────────────────── */
const SlotCard = ({
  slot, owned, isToday, daysPassed, glass, levelColor,
}: {
  slot: BattlePassSlot;
  owned: boolean;
  isToday: boolean;
  daysPassed: number;
  glass: boolean;          // liquid-glass режим (коли є background_url)
  levelColor: string;
}) => {
  const cfg    = RARITY_CONFIG[slot.rarity];
  const Icon   = cfg.icon;
  const locked = slot.slot_number > daysPassed + 1 && !owned;
  const isAnimated = slot.rarity === "legendary" || slot.rarity === "mythic";

  /* фон карточки: чорний з градієнтом-«кружечком» зверху-зліва */
  const cardBg = glass
    ? `linear-gradient(160deg, rgba(20,20,20,0.55) 0%, rgba(0,0,0,0.65) 100%)`
    : `radial-gradient(circle at 0% 0%, rgba(${cfg.rgb},0.76) 0%, rgba(${cfg.rgb},0.46) 24%, rgba(${cfg.rgb},0.18) 48%, rgba(0,0,0,0.96) 78%, #050505 100%)`;

  return (
    <div
      className={`bp-card relative flex-shrink-0 rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer
        ${isAnimated ? "bp-card-animated" : ""}
        ${glass ? "bp-card-glass" : ""}`}
      style={{
        width: 140,
        background: cardBg,
        backdropFilter: glass ? "blur(18px) saturate(140%)" : undefined,
        WebkitBackdropFilter: glass ? "blur(18px) saturate(140%)" : undefined,
        border: glass
          ? `1px solid rgba(255,255,255,0.14)`
          : `1px solid rgba(${cfg.rgb},0.22)`,
        opacity:   locked ? 0.45 : 1,
        transform: isToday ? "scale(1.04)" : "scale(1)",
        "--r":  cfg.color,
        "--rg": cfg.glow,
        "--rrgb": cfg.rgb,
      } as any}
    >
      {/* Анімована рамка для legendary/mythic */}
      {isAnimated && !locked && (
        <div className="bp-anim-border" aria-hidden />
      )}

      {/* Кружечок рідкості зверху-зліва (як на референсі) */}
      <div className="absolute top-2 left-2 z-30">
        <div
          className="rounded-full"
          style={{
            width: 8, height: 8,
            background: cfg.color,
            boxShadow: `0 0 6px ${cfg.glow}`,
          }}
        />
      </div>


      {/* Бейдж статусу справа */}
      <div className="absolute top-2 right-2 z-30">
        {owned ? (
          <div className="rounded-full p-0.5"
            style={{ background:"rgba(0,0,0,0.55)", border:`1px solid ${cfg.border}` }}>
            <CheckCircle2 className="w-3.5 h-3.5" style={{ color:cfg.color }} />
          </div>
        ) : locked ? (
          <Lock className="w-3.5 h-3.5" style={{ color:"rgba(255,255,255,0.25)" }} />
        ) : isToday ? (
          <span className="text-[8px] font-black px-1.5 py-0.5 rounded-md"
            style={{ background:cfg.color, color:"#000", boxShadow:`0 0 10px ${cfg.glow}` }}>
            СЬОГОДНІ
          </span>
        ) : null}
      </div>

      {/* Зображення / іконка */}
      <div className="relative w-full flex items-center justify-center mt-1"
        style={{ height: 108 }}>
        {slot.image_url ? (
          slot.prize_type === "nft" ? (
            <div className="relative" style={{ width: "82%", height: "92%" }}>
              <img src={slot.image_url} alt={slot.title}
                className="w-full h-full"
                style={{
                  objectFit: "cover",
                  borderRadius: 14,
                  border: `1px solid rgba(${cfg.rgb},0.45)`,
                  boxShadow: owned ? `0 4px 14px ${cfg.glow}` : `0 2px 8px rgba(0,0,0,0.45)`,
                  filter: locked ? "grayscale(1) brightness(0.3)" : "none",
                  animation: owned ? "bp-float 4s ease-in-out infinite" : "none",
                }} />
            </div>
          ) : (
            <img src={slot.image_url} alt={slot.title}
              className="w-full h-full"
              style={{
                objectFit: "contain", padding: 6,
                filter: locked ? "grayscale(1) brightness(0.3)"
                  : owned ? `drop-shadow(0 4px 14px ${cfg.glow})` : "none",
                animation: owned ? "bp-float 4s ease-in-out infinite" : "none",
              }} />
          )
        ) : (
          <div className="flex flex-col items-center gap-1">
            <span style={{ fontSize: 34, opacity: locked ? 0.2 : 1,
              filter: owned ? `drop-shadow(0 0 10px ${cfg.color})` : "none" }}>
              {slot.prize_type === "cr" ? "💰" :
               slot.prize_type === "nft" ? "🎁" :
               slot.prize_type === "car" ? "🚗" : "✨"}
            </span>
            <Icon className="w-4 h-4" style={{ color: cfg.color, opacity: locked ? 0.2 : 0.8 }} />
          </div>
        )}
      </div>


      {/* Назва */}
      <div className="px-2 pt-1 pb-2 relative z-20">
        <p className="text-[10px] font-bold text-center leading-tight line-clamp-2"
          style={{ color: locked ? "rgba(255,255,255,0.25)" : "#fff" }}>
          {slot.title || "Приз"}
        </p>
        {slot.prize_type === "cr" && slot.prize_value && (
          <p className="text-[9px] text-center mt-0.5 font-black"
            style={{ color: "#fbbf24" }}>{slot.prize_value} CR</p>
        )}
        {slot.prize_type === "car" && slot.car_name && (
          <p className="text-[9px] text-center mt-0.5 font-black"
            style={{ color: cfg.color }}>🚗 {slot.car_name}</p>
        )}
      </div>

      {/* Шкала з номером рівня (як на референсі) */}
      <div className="relative pb-3 pt-1 flex items-center justify-center">
        <div className="absolute left-3 right-3 h-[2px] rounded-full"
          style={{
            background: `linear-gradient(90deg, rgba(${cfg.rgb},0.15), ${cfg.color}, rgba(${cfg.rgb},0.15))`,
            boxShadow: `0 0 8px ${cfg.glow}`,
            opacity: locked ? 0.3 : 1,
          }} />
        <div className="relative rounded-full flex items-center justify-center font-black tabular-nums"
          style={{
            width: 28, height: 28,
            background: `radial-gradient(circle, #0b0b0b, #000)`,
            border: `2px solid ${cfg.color}`,
            color: cfg.color,
            fontSize: 11,
            boxShadow: `0 0 12px ${cfg.glow}, inset 0 0 8px rgba(0,0,0,0.6)`,
            opacity: locked ? 0.5 : 1,
          }}>
          {slot.slot_number}
        </div>
      </div>
    </div>
  );
};

/* ───────────────────────────── PROGRESS ──────────────────────────── */
const ProgressTrack = ({
  slots, ownedIds, daysPassed, accent,
}: { slots: BattlePassSlot[]; ownedIds: Set<number>; daysPassed: number; accent: string }) => {
  const pct = slots.length>0?(ownedIds.size/slots.length)*100:0;
  return (
    <div className="px-4 mb-5">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" style={{ color:accent }} />
          <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color:accent+"cc" }}>
            День {Math.min(daysPassed,slots.length)} з {slots.length}
          </span>
        </div>
        <span className="text-[11px] font-black tabular-nums" style={{ color:accent }}>
          {ownedIds.size} / {slots.length} отримано
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background:"rgba(255,255,255,0.08)" }}>
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width:`${pct}%`, background:`linear-gradient(90deg,${accent}88,${accent})`, boxShadow:`0 0 14px ${accent}` }} />
      </div>
    </div>
  );
};

/* ───────────────────────────── MAIN PAGE ─────────────────────────── */
const BattlePass = () => {
  const navigate = useNavigate();
  const nick = localStorage.getItem("crp_nick")||"";

  const [cfg,     setCfg]     = useState<BattlePassConfig>(DEFAULT_CONFIG);
  const [slots,   setSlots]   = useState<BattlePassSlot[]>([]);
  const [rewards, setRewards] = useState<BattlePassReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [nftMap, setNftMap] = useState<Record<string, string>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  const claimKey = `bp_last_claim_${nick}`;
  const [lastClaim, setLastClaim] = useState<string>(() => localStorage.getItem(claimKey) || "");

  const getDaysPassed = (seasonStart?: string): number => {
    if (!seasonStart) return 0;
    const start = new Date(seasonStart).getTime();
    return Math.max(0, Math.floor((Date.now() - start) / 86_400_000));
  };
  const daysPassed = getDaysPassed(cfg.season_start);

  useEffect(() => {
    (async () => {
      const [configRes, slotsRes, rewardsRes, nftsRes] = await Promise.all([
        dbSelect("battlepass_config", { limit: 1 }),
        dbSelect("battlepass_slots",  { order: { col: "slot_number", dir: "asc" } }),
        nick
          ? dbSelect("battlepass_rewards", { filters: [{ col: "username", op: "ilike", value: nick }] })
          : Promise.resolve({ data: [], error: null }),
        // Підвантажуємо NFT-подарунки, щоб показати реальну картинку замість смайлика 🎁.
        dbSelect("nft_gifts", {}).catch(() => ({ data: [], error: null })),
      ]);
      const configRow = (configRes.data as any[])?.[0];
      if (configRow) setCfg({ ...DEFAULT_CONFIG, ...configRow });
      setSlots((slotsRes.data   as any[]) || []);
      setRewards((rewardsRes.data as any[]) || []);

      // Будуємо мапу: id → image_url (з різними можливими назвами поля)
      const nfts = (nftsRes?.data as any[]) || [];
      const map: Record<string, string> = {};
      for (const n of nfts) {
        const img = n.image_url || n.image || n.img || n.url || n.picture || "";
        if (img && n.id != null) map[String(n.id)] = img;
        if (img && n.gift_id != null) map[String(n.gift_id)] = img;
        if (img && n.name) map[String(n.name)] = img;
      }
      setNftMap(map);
      setLoading(false);
    })();
  }, [nick]);

  useEffect(() => {
    if (!loading && scrollRef.current) {
      const el = scrollRef.current.querySelector(`[data-day="${daysPassed}"]`);
      el?.scrollIntoView({ behavior:"smooth", inline:"center", block:"nearest" });
    }
  }, [loading, daysPassed]);

  const ownedIds    = new Set(rewards.map(r => r.slot_id));
  const accent      = cfg.accent_color || "#fbbf24";
  const accentRgb   = hexToRgb(accent);
  const levelColor  = cfg.level_color || "#38bdf8";
  const sortedSlots = [...slots].sort((a,b) => a.slot_number - b.slot_number);
  // banner_url теж використовується як повноекранний вертикальний фон
  const bgImage     = cfg.background_url || cfg.banner_url || "";
  const glass       = !!bgImage;


  /* ── Щоденний клейм ── */
  const canClaim = !!nick && lastClaim !== todayKey();
  const nextSlot = sortedSlots.find(s => !ownedIds.has(s.id));

  const handleDailyClaim = async () => {
    if (!nick) { toast.error("Увійди в аккаунт"); return; }
    if (!canClaim) { toast("Сьогодні вже отримано — повертайся завтра"); return; }
    if (!nextSlot) { toast.success("Усі нагороди вже зібрано!"); return; }
    setClaiming(true);
    try {
      const payload = {
        username:    nick,
        slot_id:     nextSlot.id,
        rarity:      nextSlot.rarity,
        prize_type:  nextSlot.prize_type,
        prize_value: nextSlot.prize_value ?? null,
        image_url:   nextSlot.image_url   ?? null,
        car_name:    nextSlot.car_name    ?? null,
        claimed_at:  new Date().toISOString(),
      };
      const { error } = await dbInsert("battlepass_rewards", [payload]);
      if (error) throw error;
      const today = todayKey();
      localStorage.setItem(claimKey, today);
      setLastClaim(today);
      setRewards(p => [...p, payload as any]);
      toast.success(`+1 рівень: ${nextSlot.title || "Нагорода"}`);
    } catch (e: any) {
      toast.error(e?.message || "Помилка отримання");
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="min-h-screen pb-24 relative" style={{ background: "#050505" }}>
      {/* Глобальний фон — або кастомне фото (банер/окремий фон), або градієнт */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        {bgImage ? (
          <>
            <img src={bgImage} alt=""
              className="absolute inset-0 w-full h-full"
              style={{ objectFit:"cover", objectPosition:"center" }} />
            <div className="absolute inset-0"
              style={{ background:"linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.72) 100%)" }} />
          </>
        ) : (
          <div className="absolute inset-0"
            style={{ background:`linear-gradient(180deg, ${cfg.gradient_from}, ${cfg.gradient_to})` }} />
        )}
      </div>


      <style>{`
        @keyframes bp-fade-up    { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes bp-float      { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        @keyframes bp-border-spin{ 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
        @keyframes bp-claim-glow { 0%,100%{box-shadow:0 0 18px var(--ag),0 0 34px var(--ag)} 50%{box-shadow:0 0 30px var(--ag),0 0 64px var(--ag)} }
        @keyframes bp-btn-sweep  { 0%{transform:translateX(-130%)} 52%,100%{transform:translateX(130%)} }
        @keyframes bp-shimmer-banner { 0%{transform:translateX(-100%)} 100%{transform:translateX(200%)} }

        .bp-card-row{ scrollbar-width:none }
        .bp-card-row::-webkit-scrollbar{ display:none }

        .bp-card{ transition:transform .2s, box-shadow .3s, border-color .3s }
        .bp-card:active{ transform:scale(0.97)!important }

        .bp-card-glass{
          box-shadow: 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08);
        }

        /* Анімована рамка legendary/mythic — два протилежні glow-сегменти їдуть по контуру */
        .bp-card-animated{ box-shadow: 0 0 22px rgba(var(--rrgb),0.16), inset 0 0 18px rgba(var(--rrgb),0.08); }
        .bp-anim-border{
          position:absolute; inset:-1px; border-radius:16px; pointer-events:none; z-index:10;
        }
        .bp-anim-border::before,
        .bp-anim-border::after{
          content:""; position:absolute; inset:0; border-radius:inherit; padding:2px;
          background: conic-gradient(from 0deg,
            transparent 0deg, transparent 26deg,
            var(--r) 40deg, rgba(255,255,255,0.95) 52deg, var(--r) 64deg,
            transparent 82deg, transparent 206deg,
            var(--r) 220deg, rgba(255,255,255,0.95) 232deg, var(--r) 244deg,
            transparent 262deg, transparent 360deg);
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
                  mask-composite: exclude;
          animation: bp-border-spin 3.8s linear infinite;
        }
        .bp-anim-border::after{ filter: blur(7px); opacity:.9; }

        .bp-claim-btn{ position:relative; overflow:hidden; animation: bp-claim-glow 2.2s ease-in-out infinite; }
        .bp-claim-btn::after{ content:""; position:absolute; inset:0; background:linear-gradient(105deg, transparent 25%, rgba(255,255,255,.16) 50%, transparent 75%); animation:bp-btn-sweep 2.9s ease-in-out infinite; pointer-events:none; }
      `}</style>

      {/* Header (банер тепер працює як фон, тут лише навбар + назва) */}
      <div className="relative w-full">
        <button onClick={() => navigate(-1)}
          className="absolute left-4 top-4 w-9 h-9 rounded-xl flex items-center justify-center z-10"
          style={{ background:"rgba(0,0,0,0.55)",border:"1px solid rgba(255,255,255,0.14)",backdropFilter:"blur(12px)" }}>
          <ChevronLeft className="w-4 h-4 text-white" />
        </button>

        <div className="relative pt-16 px-4 pb-4 text-center">
          <div className="relative inline-flex items-center justify-center mb-4">
            <div className="absolute w-24 h-24 rounded-full pointer-events-none"
              style={{ background:`radial-gradient(circle,rgba(${accentRgb},0.35) 0%,transparent 70%)` }} />
            <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{
                background: glass
                  ? `linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))`
                  : `linear-gradient(135deg,rgba(${accentRgb},0.18),rgba(${accentRgb},0.08))`,
                border: `1.5px solid rgba(${accentRgb},0.4)`,
                backdropFilter: glass ? "blur(14px)" : undefined,
                boxShadow: `0 0 28px rgba(${accentRgb},0.35)`,
              }}>
              <Crown className="w-8 h-8" style={{ color:accent }} />
            </div>
          </div>
          <h1 className="text-2xl font-black uppercase tracking-[0.18em]"
            style={{ color:accent, textShadow:`0 0 28px rgba(${accentRgb},0.7),0 2px 8px rgba(0,0,0,0.9)` }}>
            {cfg.season_name || "БАТЛПАС"}
          </h1>
          {cfg.description && (
            <p className="text-[10px] uppercase tracking-[0.2em] mt-1" style={{ color:accent+"99" }}>
              {cfg.description}
            </p>
          )}
        </div>
      </div>


      {/* Кнопка щоденного клейму */}
      {!loading && slots.length > 0 && (
        <div className="px-4 mb-4" style={{ animation:"bp-fade-up .4s ease both" }}>
          {(() => {
            const allDone   = !nextSlot;
            const claimed   = !canClaim && !allDone;            // вже забрали сьогодні
            const active    = canClaim && !!nextSlot && !claiming;
            const btnLabel  = claiming
              ? "Отримання..."
              : allDone
              ? "Усі нагороди зібрано"
              : claimed
              ? "Отримано"
              : "Отримати";
            return (
              <>
                <button
                  onClick={handleDailyClaim}
                  disabled={!active}
                  className={`w-full rounded-2xl py-3.5 flex items-center justify-center gap-2 font-black uppercase tracking-widest text-sm transition-all active:scale-[0.98] ${active ? "bp-claim-btn" : ""}`}
                  style={{
                    background: active
                      ? `linear-gradient(135deg, rgba(${accentRgb},0.25), rgba(${accentRgb},0.1))`
                      : "rgba(255,255,255,0.05)",
                    border: `1.5px solid ${active ? `rgba(${accentRgb},0.55)` : "rgba(255,255,255,0.08)"}`,
                    color: active ? accent : "rgba(255,255,255,0.4)",
                    backdropFilter: "blur(10px)",
                    cursor: active ? "pointer" : "default",
                    "--ag": `rgba(${accentRgb},0.45)`,
                  } as any}
                >
                  <Gift className="w-4 h-4" />
                  {btnLabel}
                </button>
                {(claimed || allDone) && (
                  <p
                    className="text-center mt-2 text-[10px] uppercase tracking-[0.2em] font-bold"
                    style={{ color: "rgba(255,255,255,0.45)" }}>
                    {allDone
                      ? "Усі нагороди вже зібрано"
                      : "Сьогодні вже отримано — приходь завтра"}
                  </p>
                )}
              </>
            );
          })()}
        </div>
      )}



      {/* Progress */}
      {!loading && (
        <div style={{ animation:"bp-fade-up .4s ease both" }}>
          <ProgressTrack slots={sortedSlots} ownedIds={ownedIds} daysPassed={daysPassed} accent={accent} />
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor:accent+"33",borderTopColor:accent }} />
        </div>
      ) : slots.length === 0 ? (
        <div className="text-center py-20" style={{ color:"rgba(255,255,255,0.3)" }}>
          <Crown className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Батлпас поки не налаштований</p>
        </div>
      ) : (
        <div style={{ animation:"bp-fade-up .5s ease both",animationDelay:"100ms" }}>
          <div className="px-4 mb-3 flex items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-[0.15em]"
              style={{ color:"rgba(255,255,255,0.55)" }}>Всі нагороди</span>
            <div className="flex-1 h-px"
              style={{ background:"linear-gradient(to right,rgba(255,255,255,0.12),transparent)" }} />
          </div>

          <div ref={scrollRef}
            className="bp-card-row flex gap-3 overflow-x-auto pb-4"
            style={{ paddingLeft:16, paddingRight:16 }}>
            {sortedSlots.map(slot => {
              // Якщо це NFT і нема явного image_url — підтягуємо з мапи nft
              const resolvedImg =
                slot.image_url ||
                (slot.prize_type === "nft"
                  ? (slot.nft_gift_id ? nftMap[String(slot.nft_gift_id)] : "") ||
                    (slot.title ? nftMap[String(slot.title)] : "")
                  : "") ||
                "";
              const slotWithImg = { ...slot, image_url: resolvedImg };
              return (
                <div key={slot.id} data-day={slot.slot_number}>
                  <SlotCard
                    slot={slotWithImg}
                    owned={ownedIds.has(slot.id)}
                    isToday={slot.slot_number === daysPassed}
                    daysPassed={daysPassed}
                    glass={glass}
                    levelColor={levelColor}
                  />
                </div>
              );
            })}
          </div>

          {/* Легенда рідкості */}
          <div className="px-4 mt-5" style={{ animation:"bp-fade-up .5s ease both",animationDelay:"200ms" }}>
            <p className="text-[9px] uppercase tracking-widest mb-3"
              style={{ color:"rgba(255,255,255,0.35)" }}>Рідкості</p>
            <div className="flex flex-wrap gap-2">
              {(["common","rare","legendary","mythic"] as Rarity[]).map(r => {
                const rc   = RARITY_CONFIG[r];
                const Icon = rc.icon;
                const count = sortedSlots.filter(s=>s.rarity===r).length;
                return (
                  <div key={r} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5"
                    style={{ background:`rgba(${rc.rgb},0.1)`,border:`1px solid rgba(${rc.rgb},0.28)` }}>
                    <div className="w-1.5 h-1.5 rounded-full"
                      style={{ background: rc.color }} />

                    <Icon className="w-3 h-3" style={{ color:rc.color }} />
                    <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color:rc.color }}>{rc.label}</span>
                    <span className="text-[8px]" style={{ color:rc.color+"99" }}>×{count}</span>
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

/* Експорт зовнішньої картки авто (як було, без змін) */
export const BattlePassCarCard = ({ reward }: { reward: BattlePassReward }) => {
  const cfg = RARITY_CONFIG[reward.rarity];
  const carName = reward.car_name || reward.prize_value || "АВТО";
  const Icon = cfg.icon;
  return (
    <div className="relative w-full rounded-2xl overflow-hidden"
      style={{
        border: `1.5px solid ${cfg.border}`,
        boxShadow: `0 0 32px ${cfg.glow}, 0 4px 24px rgba(0,0,0,0.5)`,
        background: `radial-gradient(circle at 0% 0%, rgba(${cfg.rgb},0.4) 0%, rgba(${cfg.rgb},0.1) 25%, #000 70%)`,
      }}>
      <div className="relative p-4">
        {reward.image_url ? (
          <img src={reward.image_url} alt={carName}
            className="w-full mb-3 rounded-xl"
            style={{ height:140, objectFit:"cover", animation:"bp-float 4s ease-in-out infinite" }} />
        ) : (
          <div className="flex items-center justify-center mb-3 rounded-xl"
            style={{ height:100, border:`1px dashed ${cfg.border}` }}>
            <span style={{ fontSize:48 }}>🚗</span>
          </div>
        )}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Icon className="w-3.5 h-3.5" style={{ color:cfg.color }} />
            <span className="text-[9px] font-black uppercase tracking-[0.2em]"
              style={{ color:cfg.color }}>{cfg.label}</span>
          </div>
          <p className="text-base font-black uppercase tracking-wider"
            style={{ color:cfg.color, textShadow:`0 0 12px ${cfg.glow}` }}>{carName}</p>
        </div>
      </div>
    </div>
  );
};

export default BattlePass;
