import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { dbSelect, dbInsert } from "../lib/db";
import { toast } from "sonner";
import {
  Star, Zap, Trophy, Crown, Flame, ChevronLeft, Lock, CheckCircle2,
  Calendar, ShieldCheck, Gift, ChevronRight,
} from "lucide-react";

/* ──────────────────────────────────────────────────────────────────
   Battle Pass v3 — Premium Visual Redesign 2026
   ────────────────────────────────────────────────────────────────── */

type Rarity    = "common" | "rare" | "legendary" | "mythic";
type PrizeType = "cr" | "nft" | "car" | "custom";

interface BattlePassConfig {
  season_name:    string;
  banner_url?:    string;
  background_url?: string;
  gradient_from:  string;
  gradient_to:    string;
  accent_color:   string;
  level_color?:   string;
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
  border: string; icon: any; gradient: string;
}> = {
  common: { 
    label: "Звичайний",   
    color: "#e2e8f0",   
    glow: "rgba(226,232,240,0.4)",  
    rgb: "226,232,240", 
    border: "rgba(226,232,240,0.2)",  
    icon: Star,
    gradient: "linear-gradient(135deg, rgba(226,232,240,0.15), rgba(226,232,240,0.02))"
  },
  rare: { 
    label: "Рідкісний",   
    color: "#3b82f6",   
    glow: "rgba(59,130,246,0.6)",   
    rgb: "59,130,246",  
    border: "rgba(59,130,246,0.35)",  
    icon: Zap,
    gradient: "linear-gradient(135deg, rgba(59,130,246,0.2), rgba(59,130,246,0.03))"
  },
  legendary: { 
    label: "Легендарний", 
    color: "#ffaa00",   
    glow: "rgba(255,170,0,0.85)",   
    rgb: "255,170,0",   
    border: "rgba(255,170,0,0.5)",    
    icon: Trophy,
    gradient: "linear-gradient(135deg, rgba(255,170,0,0.25), rgba(255,85,0,0.05))"
  },
  mythic: { 
    label: "Міфічний",    
    color: "#ff0055",   
    glow: "rgba(255,0,85,0.95)",    
    rgb: "255,0,85",    
    border: "rgba(255,0,85,0.6)",     
    icon: Flame,
    gradient: "linear-gradient(135deg, rgba(255,0,85,0.3), rgba(155,0,255,0.05))"
  },
};

const DEFAULT_CONFIG: BattlePassConfig = {
  season_name:   "БАТЛПАС",
  gradient_from: "#050508",
  gradient_to:   "#0d0e15",
  accent_color:  "#ffaa00",
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
const PAGE_SIZE = 7;

/* ───────────────── WELCOME MODAL ───────────────── */
const WelcomeModal = ({
  bannerUrl, seasonName, accent, onClose,
}: {
  bannerUrl?: string;
  seasonName: string;
  accent: string;
  onClose: () => void;
}) => {
  const accentRgb = hexToRgb(accent);
  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 bp-blur-heavy animate-fade-in"
      style={{ background: "rgba(2,2,5,0.82)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-3xl overflow-hidden bp-modal-in bp-glass-luxury"
        style={{
          border: `1px solid rgba(${accentRgb},0.25)`,
          boxShadow: `0 25px 60px -15px rgba(0,0,0,0.9), 0 0 50px rgba(${accentRgb},0.15), inset 0 1px 2px rgba(255,255,255,0.15)`,
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 right-0 h-[2px] pointer-events-none animate-pulse"
          style={{ background: `linear-gradient(90deg, transparent, rgba(168,85,247,0.8), rgba(${accentRgb},0.8), transparent)` }} />

        {bannerUrl && (
          <div className="relative w-full" style={{ height: 180 }}>
            <img src={bannerUrl} alt="" className="w-full h-full object-cover object-center" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-[#07070c]" />
          </div>
        )}

        <div className="px-6 pt-5 pb-7 text-center flex flex-col items-center gap-3 relative z-10">
          <div className="flex flex-col items-center gap-1">
            <p className="text-[10px] uppercase tracking-[0.3em] font-black animate-pulse"
              style={{ color: "#c084fc" }}>новий сезон</p>
            <h2 className="text-xl font-black uppercase tracking-[0.12em] leading-tight bp-modal-title"
              style={{
                color: "#ffffff",
                textShadow: `0 0 20px rgba(${accentRgb},0.6), 0 2px 10px rgba(0,0,0,0.9)`,
              }}>
              СЕЗОН "ЛІТО 2026"<br />ВЖЕ РОЗПОЧАТО!
            </h2>
          </div>

          <p className="text-[12px] font-semibold tracking-[0.08em] text-white/50">
            Доєднуйся!
          </p>

          <button
            onClick={onClose}
            className="relative mt-2 w-full rounded-xl py-3.5 font-black uppercase tracking-[0.2em] text-xs transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] bp-btn-premium"
            style={{
              background: `linear-gradient(135deg, rgba(168,85,247,0.4) 0%, rgba(${accentRgb},0.2) 100%)`,
              border: `1px solid rgba(168,85,247,0.5)`,
              color: "#ffffff",
              boxShadow: "0 0 20px rgba(168,85,247,0.3), inset 0 1px 1px rgba(255,255,255,0.2)",
            }}
          >
            <span className="relative z-10 drop-shadow-md">ПОЧАТИ!</span>
          </button>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-[1px] pointer-events-none"
          style={{ background: `linear-gradient(90deg, transparent, rgba(${accentRgb},0.3), transparent)` }} />
      </div>
    </div>
  );
};

/* ───────────────────────────── SLOT CARD ─────────────────────────── */
const SlotCard = ({
  slot, owned, isToday, daysPassed, glass, levelColor,
}: {
  slot: BattlePassSlot;
  owned: boolean;
  isToday: boolean;
  daysPassed: number;
  glass: boolean;
  levelColor: string;
}) => {
  const cfg    = RARITY_CONFIG[slot.rarity];
  const Icon    = cfg.icon;
  const locked = slot.slot_number > daysPassed + 1 && !owned;
  const isAnimated = slot.rarity === "legendary" || slot.rarity === "mythic";
  const isNft = slot.prize_type === "nft";

  return (
    <div
      className={`bp-card relative flex-shrink-0 rounded-2xl transition-all duration-300 group
        ${isAnimated ? `bp-card-premium-${slot.rarity}` : "bp-card-standard"} 
        ${owned ? "bp-card-owned" : ""} ${isToday ? "bp-card-today" : ""}`}
      style={{
        width: 142,
        opacity:   locked ? 0.45 : 1,
        transform: isToday ? "scale(1.04)" : "scale(1)",
        border: `1px solid ${locked ? "rgba(255,255,255,0.06)" : cfg.border}`,
        boxShadow: locked ? "none" : `0 10px 25px -5px rgba(0,0,0,0.5), 0 0 15px -3px ${cfg.glow}, inset 0 1px 1px rgba(255,255,255,0.1)`,
        background: locked ? "rgba(10,10,15,0.5)" : `linear-gradient(145deg, rgba(${cfg.rgb}, 0.08), rgba(6,6,10,0.85))`,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        "--rarity-color": cfg.color,
        "--rarity-glow": cfg.glow,
      } as any}
    >
      {/* Контурная лазерная анимация (SVG Stroke Dash-array) для хай-энд карт */}
      {isAnimated && !locked && (
        <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden rounded-2xl">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 142 220" preserveAspectRatio="none">
            <rect x="1" y="1" width="140" height="218" rx="15" fill="none" 
                  stroke={cfg.color} strokeWidth="1.5" className="bp-laser-path" />
          </svg>
        </div>
      )}

      {/* Горизонтальная линия редкости с эффектом неонового стекла */}
      <div style={{
        position: "absolute",
        top: -2,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 40,
        width: 50,
        height: 4,
        borderRadius: 999,
        background: cfg.color,
        opacity: locked ? 0.3 : 1,
        boxShadow: `0 0 10px 2px ${cfg.color}, 0 0 25px ${cfg.glow}`,
      }} />

      {/* Верхний глянцевый блик (Liquid Reflection) */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/[0.06] to-transparent pointer-events-none z-10 h-1/2" />

      {/* Бейдж статуса */}
      <div className="absolute top-2.5 right-2.5 z-30">
        {owned ? (
          <div className="rounded-full p-0.5 bp-blur-light"
            style={{ background:"rgba(0,0,0,0.6)", border:`1px solid ${cfg.color}44` }}>
            <CheckCircle2 className="w-3.5 h-3.5 animate-pulse" style={{ color:cfg.color }} />
          </div>
        ) : locked ? (
          <div className="rounded-full p-0.5 bg-black/40">
            <Lock className="w-3 h-3 text-white/30" />
          </div>
        ) : isToday ? (
          <span className="text-[7px] font-black px-1.5 py-0.5 rounded-md tracking-wider animate-bounce"
            style={{ background: `linear-gradient(90deg, #fff, ${cfg.color})`, color:"#000", boxShadow:`0 0 12px ${cfg.color}` }}>
            СЬОГОДНІ
          </span>
        ) : null}
      </div>

      {/* Изображение / Иконка приза */}
      <div className="relative w-full flex items-center justify-center mt-2 group-hover:scale-105 transition-transform duration-300"
        style={{ height: 104 }}>
        {slot.image_url ? (
          <img
            src={slot.image_url}
            alt={slot.title}
            className={`${isNft ? "bp-nft-img" : "w-full h-full"} object-contain`}
            style={{
              padding: isNft ? 10 : 6,
              borderRadius: isNft ? 14 : 0,
              filter: locked
                ? "grayscale(1) brightness(0.25)"
                : owned
                  ? `drop-shadow(0 6px 16px ${cfg.glow})`
                  : `drop-shadow(0 4px 10px rgba(${cfg.rgb},0.3))`,
              animation: (!locked && (owned || isToday)) ? "bp-premium-float 4s ease-in-out infinite" : "none",
              maxWidth: isNft ? "86%" : "100%",
              maxHeight: isNft ? "86%" : "100%",
            }}
          />
        ) : (
          <div className="flex flex-col items-center gap-1.5 relative">
            <span className="transition-transform duration-300" style={{ 
              fontSize: 36, 
              opacity: locked ? 0.2 : 1,
              filter: locked ? "none" : `drop-shadow(0 0 12px ${cfg.color}88)`
            }}>
              {slot.prize_type === "cr" ? "💰" :
               slot.prize_type === "nft" ? "🎁" :
               slot.prize_type === "car" ? "🚗" : "✨"}
            </span>
            <Icon className="w-3.5 h-3.5 opacity-60" style={{ color: cfg.color }} />
          </div>
        )}
      </div>

      {/* Информационный блок */}
      <div className="px-2.5 pt-1 pb-2 relative z-20 text-center">
        <p className="text-[10px] font-bold leading-tight line-clamp-2 min-h-[24px] tracking-wide"
          style={{ color: locked ? "rgba(255,255,255,0.25)" : "#ffffff" }}>
          {slot.title || "Приз"}
        </p>
        {slot.prize_type === "cr" && slot.prize_value && (
          <p className="text-[9px] mt-1 font-black tracking-wider text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]">
            {slot.prize_value} CR
          </p>
        )}
        {slot.prize_type === "car" && slot.car_name && (
          <p className="text-[9px] mt-1 font-black tracking-wide truncate"
            style={{ color: cfg.color, textShadow: `0 0 8px ${cfg.glow}` }}>🚗 {slot.car_name}</p>
        )}
      </div>

      {/* Нижняя шкала и уровень */}
      <div className="relative pb-3.5 pt-1 flex items-center justify-center">
        <div className="absolute left-4 right-4 h-[1px]"
          style={{
            background: `linear-gradient(90deg, transparent, ${cfg.color}55, transparent)`,
          }} />
        <div className="relative rounded-xl flex items-center justify-center font-black tabular-nums transition-all duration-300 group-hover:border-white/50"
          style={{
            width: 26, height: 26,
            background: `linear-gradient(135deg, #0f1016, #050508)`,
            border: `1.5px solid ${cfg.color}`,
            color: "#ffffff",
            fontSize: 10,
            boxShadow: locked ? "none" : `0 0 10px ${cfg.glow}, inset 0 1px 3px rgba(0,0,0,0.8)`,
            opacity: locked ? 0.4 : 1,
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
  const pct = slots.length > 0 ? (ownedIds.size / slots.length) * 100 : 0;
  return (
    <div className="px-2 mb-2 w-full">
      <div className="flex justify-between items-center mb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-lg bg-white/5 border border-white/10">
            <Calendar className="w-3.5 h-3.5" style={{ color:accent }} />
          </div>
          <span className="text-[10px] uppercase tracking-[0.2em] font-black text-white/70">
            День {Math.min(daysPassed,slots.length)} з {slots.length}
          </span>
        </div>
        <div className="px-2.5 py-0.5 rounded-md bg-white/5 border border-white/10">
          <span className="text-[10px] font-black tracking-widest tabular-nums" style={{ color:accent }}>
            {ownedIds.size} / {slots.length} отримано
          </span>
        </div>
      </div>
      <div className="h-2.5 rounded-full bg-black/50 p-[2px] border border-white/5 shadow-inner overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000 relative bp-progress-glow"
          style={{ 
            width:`${pct}%`, 
            background:`linear-gradient(90deg, ${accent}88, ${accent})`,
          }}>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
        </div>
      </div>
    </div>
  );
};

/* ───────────────────────────── MAIN PAGE ─────────────────────────── */
const BattlePass = () => {
  const navigate = useNavigate();
  const nick = localStorage.getItem("crp_nick") || "";

  const [cfg,     setCfg]     = useState<BattlePassConfig>(DEFAULT_CONFIG);
  const [slots,   setSlots]   = useState<BattlePassSlot[]>([]);
  const [rewards, setRewards] = useState<BattlePassReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [nftMap, setNftMap] = useState<Record<string, string>>({});
  const [page, setPage] = useState(0); 
  const [showModal, setShowModal] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const claimKey = `bp_last_claim_${nick}`;
  const seenKey  = `bp_season_seen`;
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
        dbSelect("nft_gifts", {}).catch(() => ({ data: [], error: null })),
      ]);
      const configRow = (configRes.data as any[])?.[0];
      if (configRow) setCfg({ ...DEFAULT_CONFIG, ...configRow });
      setSlots((slotsRes.data   as any[]) || []);
      setRewards((rewardsRes.data as any[]) || []);

      const nfts = (nftsRes?.data as any[]) || [];
      const map: Record<string, string> = {};
      for (const n of nfts) {
        const img = n.image_url || n.image || n.img || n.url || n.picture || "";
        if (img && n.id != null)       map[String(n.id)]      = img;
        if (img && n.gift_id != null)  map[String(n.gift_id)] = img;
        if (img && n.name)             map[String(n.name)]    = img;
      }
      setNftMap(map);
      setLoading(false);

      const seenVal = localStorage.getItem(seenKey);
      const seasonId = configRow?.id || configRow?.season_name || "default";
      if (seenVal !== String(seasonId)) {
        localStorage.setItem(seenKey, String(seasonId));
        setTimeout(() => setShowModal(true), 150);
      }
    })();
  }, [nick]);

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const ownedIds    = new Set(rewards.map(r => r.slot_id));
  const accent      = cfg.accent_color || "#ffaa00";
  const accentRgb   = hexToRgb(accent);
  const levelColor  = cfg.level_color || "#38bdf8";
  const sortedSlots = [...slots].sort((a,b) => a.slot_number - b.slot_number);
  const glass       = !!cfg.background_url || !!cfg.banner_url;

  const totalPages = Math.ceil(sortedSlots.length / PAGE_SIZE);
  const pageSlots  = sortedSlots.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const canClaim = !!nick && lastClaim !== todayKey();
  const nextSlot = sortedSlots.find(s => !ownedIds.has(s.id));

  const handleDailyClaim = async () => {
    if (!nick)    { toast.error("Увійди в аккаунт"); return; }
    if (!canClaim){ toast("Сьогодні вже отримано — повертайся завтра"); return; }
    if (!nextSlot){ toast.success("Усі нагороди вже зібрано!"); return; }
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
    <div className="min-h-screen pb-24 relative overflow-x-hidden text-white" style={{
      background: (cfg.banner_url || cfg.background_url) ? undefined : "#040406",
      ...(cfg.banner_url || cfg.background_url ? {
        backgroundImage: `url(${cfg.banner_url || cfg.background_url})`,
        backgroundSize: "cover",
        backgroundPosition: "center top",
        backgroundAttachment: "fixed",
      } : {}),
    }}>

      {showModal && (
        <div className="fixed inset-0 z-[998] bg-black/60 bp-blur-heavy transition-opacity duration-500" />
      )}

      {showModal && (
        <WelcomeModal
          bannerUrl={cfg.banner_url || cfg.background_url}
          seasonName={cfg.season_name}
          accent={accent}
          onClose={handleCloseModal}
        />
      )}

      {/* Advanced Liquid Glass, Shimmers & Keyframes Engine */}
      <style>{`
        .bp-blur-heavy { backdrop-filter: blur(24px) saturate(140%); -webkit-backdrop-filter: blur(24px) saturate(140%); }
        .bp-blur-light { backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }
        
        /* Master Liquid Glass Panel Definition */
        .bp-glass-luxury {
          background: rgba(10, 11, 18, 0.55) !important;
          backdrop-filter: blur(20px) saturate(150%) !important;
          -webkit-backdrop-filter: blur(20px) saturate(150%) !important;
          border: 1px solid rgba(255, 255, 255, 0.09) !important;
          box-shadow: 0 15px 35px -5px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.1);
        }

        /* Running Laser Border Keyframe Animation for Legendary/Mythic */
        @keyframes bp-laser-move {
          0% { stroke-dashoffset: 720; }
          100% { stroke-dashoffset: 0; }
        }
        .bp-laser-path {
          stroke-dasharray: 120 240;
          animation: bp-laser-move 6s linear infinite;
        }

        /* Modern Hover Effects & Premium Transitions */
        .bp-card-row { scrollbar-width: none; }
        .bp-card-row::-webkit-scrollbar { display: none; }
        
        .bp-card { transition: all 0.4s cubic-bezier(0.25, 1, 0.5, 1); }
        .bp-card:hover { 
          transform: translateY(-8px) scale(1.02) !important; 
          box-shadow: 0 20px 35px -5px rgba(0, 0, 0, 0.7), 0 0 25px -2px var(--rarity-glow) !important;
          border-color: var(--rarity-color) !important;
        }
        .bp-card:active { transform: translateY(-2px) scale(0.99) !important; }

        /* Premium Case Glow Variants */
        .bp-card-premium-legendary {
          background: linear-gradient(145deg, rgba(255,170,0,0.12), rgba(6,5,2,0.92)) !important;
          text-shadow: 0 0 8px rgba(255,170,0,0.4);
        }
        .bp-card-premium-mythic {
          background: linear-gradient(145deg, rgba(255,0,85,0.15), rgba(4,1,5,0.95)) !important;
          text-shadow: 0 0 8px rgba(255,0,85,0.4);
        }

        /* Core Premium Micro-Animations */
        @keyframes bp-premium-float {
          0%, 100% { transform: translateY(0) scale(1); filter: drop-shadow(0 6px 12px var(--rarity-glow)); }
          50% { transform: translateY(-6px) scale(1.03); filter: drop-shadow(0 12px 20px var(--rarity-glow)); }
        }
        @keyframes bp-shimmer-move {
          0% { transform: translateX(-150%); }
          50% { transform: translateX(150%); }
          100% { transform: translateX(150%); }
        }
        @keyframes bp-glow-pulse {
          0%, 100% { opacity: 0.8; box-shadow: 0 0 15px var(--btn-glow); }
          50% { opacity: 1; box-shadow: 0 0 30px var(--btn-glow), inset 0 1px 2px rgba(255,255,255,0.4); }
        }

        /* Premium Glass Button Engine */
        .bp-btn-premium {
          position: relative;
          overflow: hidden;
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          transition: all 0.3s cubic-bezier(0.25, 1, 0.5, 1);
        }
        .bp-btn-premium::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent);
          transform: translateX(-150%);
          animation: bp-shimmer-move 3.5s infinite ease-in-out;
        }
        .bp-btn-premium:hover:not(:disabled) {
          filter: brightness(1.15);
          box-shadow: 0 0 25px var(--btn-glow), inset 0 1px 2px rgba(255,255,255,0.3);
        }

        .bp-claim-pulse-active {
          animation: bp-glow-pulse 2s infinite ease-in-out;
        }

        /* Global Structural Enhancements */
        .bp-modal-in { animation: bp-modal-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
        @keyframes bp-modal-in { from { opacity: 0; transform: scale(0.9) translateY(30px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .bp-progress-glow { box-shadow: 0 0 12px var(--rarity-color); }
        .bp-nft-img { border-radius: 14px !important; border: 1px solid rgba(255,255,255,0.08); background: rgba(0,0,0,0.3); }
      `}</style>

      {/* ─── BACKGROUND GRADIENT FALLBACK ─── */}
      {!cfg.banner_url && !cfg.background_url && (
        <div className="absolute inset-0 -z-10 pointer-events-none"
          style={{ background:`linear-gradient(180deg, ${cfg.gradient_from}, ${cfg.gradient_to})` }} />
      )}
      {/* High-end cinematic dark overlay layer */}
      {(cfg.banner_url || cfg.background_url) && (
        <div className="absolute inset-0 -z-10 pointer-events-none"
          style={{ background:"linear-gradient(180deg, rgba(2,2,5,0.2) 0%, rgba(3,3,6,0.5) 40%, rgba(4,4,7,0.85) 70%, #040406 100%)" }} />
      )}

      {/* ─── MAIN APP CONTENT CONTAINER ─── */}
      <div style={{ visibility: showModal ? "hidden" : "visible", opacity: showModal ? 0 : 1, transition: "opacity 0.5s cubic-bezier(0.25, 1, 0.5, 1)" }}>

      {/* ─── HEADER SECTION ─── */}
      <div className="relative w-full pt-4 max-w-5xl mx-auto">
        <button onClick={() => navigate(-1)}
          className="absolute left-4 top-4 w-10 h-10 rounded-xl flex items-center justify-center z-10 transition-all duration-300 hover:bg-white/10 active:scale-90"
          style={{ background: "rgba(10,11,18,0.6)", border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>

        <div className="px-4 pb-4 pt-16 text-center">
          {!cfg.banner_url && !cfg.background_url && (
            <div className="relative inline-flex items-center justify-center mb-4">
              <div className="absolute w-28 h-28 rounded-full pointer-events-none blur-xl"
                style={{ background:`radial-gradient(circle, rgba(${accentRgb},0.4) 0%, transparent 70%)` }} />
              <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, rgba(${accentRgb},0.2), rgba(${accentRgb},0.05))`,
                  border: `1px solid rgba(${accentRgb},0.45)`,
                  boxShadow: `0 0 30px rgba(${accentRgb},0.25), inset 0 1px 1px rgba(255,255,255,0.1)`,
                }}>
                <Crown className="w-8 h-8 animate-pulse" style={{ color:accent }} />
              </div>
            </div>
          )}
          <h1 className="text-3xl font-black uppercase tracking-[0.22em] font-sans text-transparent bg-clip-text"
            style={{ 
              backgroundImage: `linear-gradient(135deg, #ffffff 30%, ${accent})`,
              filter: `drop-shadow(0 2px 15px rgba(${accentRgb}, 0.5))` 
            }}>
            {cfg.season_name || "БАТЛПАС"}
          </h1>
          {cfg.description && (
            <p className="text-[9px] uppercase tracking-[0.35em] mt-1.5 font-black text-white/40">
              {cfg.description}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-md mx-auto w-full">
        {/* ─── CLAIM/REWARD TRIGGER BUTTON PANEL ─── */}
        {!loading && slots.length > 0 && (
          <div className="px-4 mb-4">
            {canClaim && nextSlot ? (
              <button
                onClick={handleDailyClaim}
                disabled={claiming}
                className="w-full rounded-2xl py-4 flex items-center justify-center gap-2.5 font-black uppercase tracking-[0.18em] text-xs transition-all bp-btn-premium bp-claim-pulse-active"
                style={{
                  background: `linear-gradient(135deg, rgba(${accentRgb},0.4), rgba(${accentRgb},0.15))`,
                  border: `1px solid rgba(${accentRgb},0.6)`,
                  color: "#ffffff",
                  "--btn-glow": `rgba(${accentRgb},0.45)`,
                } as any}
              >
                <Gift className="w-4 h-4 animate-bounce" style={{ color: accent }} />
                <span className="drop-shadow-md">{claiming ? "Отримання..." : "Отримати нагороду"}</span>
              </button>
            ) : (
              <div className="flex flex-col items-center gap-1.5">
                <button
                  disabled
                  className="w-full rounded-2xl py-4 flex items-center justify-center gap-2.5 font-black uppercase tracking-[0.18em] text-xs border border-white/5 bg-black/40 text-white/30 backdrop-filter blur-md"
                >
                  <Gift className="w-4 h-4 opacity-40" />
                  <span>{!nextSlot ? "Усі нагороди зібрано" : "Нагорода"}</span>
                </button>
                {nextSlot && (
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 animate-pulse">
                    Отримати завтра
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── PROGRESS BAR (Liquid Glass Container) ─── */}
        {!loading && (
          <div className="px-4 mb-5">
            <div className="bp-glass-luxury px-4 py-4 rounded-2xl">
              <ProgressTrack slots={sortedSlots} ownedIds={ownedIds} daysPassed={daysPassed} accent={accent} />
            </div>
          </div>
        )}
      </div>

      {/* ─── MAIN REWARDS GRID/ROW SLIDER ─── */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor:`rgba(${accentRgb},0.15)`, borderTopColor:accent }} />
        </div>
      ) : slots.length === 0 ? (
        <div className="text-center py-20 bg-black/20 backdrop-blur-md border border-white/5 max-w-sm mx-auto rounded-2xl">
          <Crown className="w-12 h-12 mx-auto mb-3 text-white/10" />
          <p className="text-sm font-medium text-white/30 tracking-wider">Батлпас поки не налаштований</p>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto w-full">

          {/* Navigation & Pagination Controls */}
          <div className="px-5 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">
                Нагороди {page * PAGE_SIZE + 1}–{Math.min((page+1)*PAGE_SIZE, sortedSlots.length)}
              </span>
              <div className="w-12 h-[1px] bg-gradient-to-r from-white/10 to-transparent" />
            </div>
            
            <div className="flex items-center gap-2 bp-glass-luxury p-1 rounded-xl">
              <button
                onClick={() => setPage(p => Math.max(0, p-1))}
                disabled={page === 0}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 active:scale-90 disabled:opacity-30 bp-btn-premium"
                style={{
                  background: page === 0 ? "transparent" : `rgba(${accentRgb},0.12)`,
                  border: `1px solid ${page === 0 ? "transparent" : `rgba(${accentRgb},0.35)`}`,
                  color: page === 0 ? "rgba(255,255,255,0.15)" : accent,
                  "--btn-glow": `rgba(${accentRgb},0.2)`,
                } as any}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[10px] font-black tabular-nums text-white/60 px-1" style={{ minWidth: 28, textAlign: "center" }}>
                {page+1}/{totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages-1, p+1))}
                disabled={page >= totalPages-1}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 active:scale-90 disabled:opacity-30 bp-btn-premium"
                style={{
                  background: page >= totalPages-1 ? "transparent" : `rgba(${accentRgb},0.12)`,
                  border: `1px solid ${page >= totalPages-1 ? "transparent" : `rgba(${accentRgb},0.35)`}`,
                  color: page >= totalPages-1 ? "rgba(255,255,255,0.15)" : accent,
                  "--btn-glow": `rgba(${accentRgb},0.2)`,
                } as any}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Cards Active Week Horizon */}
          <div
            ref={scrollRef}
            className="bp-card-row flex gap-3.5 overflow-x-auto pb-6 pt-2"
            style={{ paddingLeft: 20, paddingRight: 20 }}
          >
            {pageSlots.map(slot => {
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

          <div className="max-w-md mx-auto w-full px-4">
            {/* Rarity Legend (Liquid Glass Matrix) */}
            <div className="mb-4">
              <div className="bp-glass-luxury px-4 py-3.5 rounded-2xl">
                <p className="text-[8px] font-black uppercase tracking-[0.25em] mb-2.5 text-white/30">Рідкості</p>
                <div className="grid grid-cols-2 gap-2">
                  {(["common","rare","legendary","mythic"] as Rarity[]).map(r => {
                    const rc   = RARITY_CONFIG[r];
                    const Icon = rc.icon;
                    const count = sortedSlots.filter(s=>s.rarity===r).length;
                    return (
                      <div key={r} className="flex items-center justify-between rounded-xl px-2.5 py-2 border border-white/[0.04] bg-white/[0.02] transition-colors duration-300 hover:bg-white/[0.05]">
                        <div className="flex items-center gap-2">
                          <div style={{ width:12, height:3, borderRadius:999, background:rc.color, boxShadow:`0 0 6px ${rc.color}` }} />
                          <Icon className="w-3.5 h-3.5 opacity-80" style={{ color:rc.color }} />
                          <span className="text-[9px] font-black uppercase tracking-wider" style={{ color:rc.color }}>{rc.label}</span>
                        </div>
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-black/30" style={{ color:rc.color }}>×{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Total Account Analytics Box (Liquid Glass Panel) */}
            {nick && (
              <div className="mb-4">
                <div className="bp-glass-luxury px-4 py-3.5 flex items-center justify-between rounded-2xl">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-xl bg-white/5 border border-white/10">
                      <ShieldCheck className="w-4 h-4" style={{ color:accent }} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/70">
                      Твій прогрес
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-sm font-black tabular-nums drop-shadow-[0_0_6px_rgba(255,255,255,0.3)]" style={{ color:accent }}>{ownedIds.size}</p>
                      <p className="text-[7px] uppercase tracking-widest font-black text-white/30 mt-0.5">отримано</p>
                    </div>
                    <div className="w-[1px] h-6 bg-white/10" />
                    <div className="text-center">
                      <p className="text-sm font-black tabular-nums text-white/60">{sortedSlots.length - ownedIds.size}</p>
                      <p className="text-[7px] uppercase tracking-widest font-black text-white/30 mt-0.5">залишилось</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      </div>

      {/* Global Embedded High-End Filter Definitions */}
      <svg width="0" height="0" style={{ position:"absolute" }}>
        <defs>
          <filter id="bp-glow-filter">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
      </svg>
    </div>
  );
};

export const BattlePassCarCard = ({ reward }: { reward: BattlePassReward }) => {
  const cfg = RARITY_CONFIG[reward.rarity];
  const carName = reward.car_name || reward.prize_value || "АВТО";
  const Icon = cfg.icon;
  return (
    <div className="relative w-full rounded-2xl overflow-hidden bp-blur-heavy"
      style={{
        border: `1px solid ${cfg.border}`,
        boxShadow: `0 15px 35px rgba(0,0,0,0.6), 0 0 25px ${cfg.glow}, inset 0 1px 1px rgba(255,255,255,0.15)`,
        background: `radial-gradient(circle at 10% 10%, rgba(${cfg.rgb},0.15) 0%, rgba(6,6,10,0.92) 80%)`,
      }}>
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/[0.05] to-transparent pointer-events-none h-1/2" />
      <div className="relative p-4 z-10">
        {reward.image_url ? (
          <div className="overflow-hidden rounded-xl bg-black/40 border border-white/5 mb-3.5">
            <img src={reward.image_url} alt={carName}
              className="w-full object-cover transition-transform duration-500 hover:scale-105"
              style={{ height:140, animation: "bp-premium-float 4s ease-in-out infinite", "--rarity-glow": cfg.glow } as any} />
          </div>
        ) : (
          <div className="flex items-center justify-center mb-3.5 rounded-xl bg-black/30 border border-dashed border-white/10"
            style={{ height:120 }}>
            <span className="text-4xl drop-shadow-md">🚗</span>
          </div>
        )}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1.5">
            <Icon className="w-3.5 h-3.5" style={{ color:cfg.color }} />
            <span className="text-[8px] font-black uppercase tracking-[0.25em]"
              style={{ color:cfg.color }}>{cfg.label}</span>
          </div>
          <p className="text-base font-black uppercase tracking-wider truncate text-white"
            style={{ textShadow:`0 0 10px ${cfg.glow}` }}>{carName}</p>
        </div>
      </div>
    </div>
  );
};

export default BattlePass;
