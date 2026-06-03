import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { dbSelect, dbInsert } from "../lib/db";
import { toast } from "sonner";
import {
  Star, Zap, Trophy, Crown, Flame, ChevronLeft, Lock, CheckCircle2,
  Calendar, ShieldCheck, Gift,
} from "lucide-react";

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

const RARITY_CONFIG: Record<Rarity, any> = {
  common: {
    label: "Звичайний", color: "#e2e8f0", glow: "rgba(226,232,240,0.4)",
    rgb: "226,232,240", border: "rgba(226,232,240,0.2)", icon: Star,
    gradient: "linear-gradient(135deg, rgba(226,232,240,0.15), rgba(226,232,240,0.02))",
  },
  rare: {
    label: "Рідкісний", color: "#3b82f6", glow: "rgba(59,130,246,0.6)",
    rgb: "59,130,246", border: "rgba(59,130,246,0.35)", icon: Zap,
    gradient: "linear-gradient(135deg, rgba(59,130,246,0.2), rgba(59,130,246,0.03))",
  },
  legendary: {
    label: "Легендарний", color: "#ffaa00", glow: "rgba(255,170,0,0.85)",
    rgb: "255,170,0", border: "rgba(255,170,0,0.5)", icon: Trophy,
    gradient: "linear-gradient(135deg, rgba(255,170,0,0.25), rgba(255,85,0,0.05))",
  },
  mythic: {
    label: "Міфічний", color: "#ff0055", glow: "rgba(255,0,85,0.95)",
    rgb: "255,0,85", border: "rgba(255,0,85,0.6)", icon: Flame,
    gradient: "linear-gradient(135deg, rgba(255,0,85,0.3), rgba(155,0,255,0.05))",
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
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)" }}
      onClick={onClose}
    >
      <div
        className="bp-modal-in relative w-full max-w-md rounded-3xl overflow-hidden"
        style={{
          background: "linear-gradient(160deg, #0d0e15, #050508)",
          border: `1px solid rgba(${accentRgb},0.4)`,
          boxShadow: `0 30px 80px -10px rgba(${accentRgb},0.4)`,
        }}
        onClick={e => e.stopPropagation()}
      >
        {bannerUrl && (
          <div className="w-full h-44 overflow-hidden relative">
            <img src={bannerUrl} alt={seasonName} className="w-full h-full object-cover" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent, #0d0e15)" }} />
          </div>
        )}

        <div className="p-6 text-center">
          <div className="text-xs font-bold tracking-[0.3em] mb-2" style={{ color: accent }}>
            новий сезон
          </div>
          <div className="text-2xl font-extrabold text-white mb-3 leading-tight">
            СЕЗОН «{seasonName}»<br/>ВЖЕ РОЗПОЧАТО!
          </div>
          <p className="text-sm text-white/70 mb-6">Доєднуйся!</p>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl font-bold text-black transition-transform active:scale-95"
            style={{ background: accent, boxShadow: `0 10px 30px -5px rgba(${accentRgb},0.6)` }}
          >
            ПОЧАТИ!
          </button>
        </div>
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
  const Icon   = cfg.icon;
  const locked = slot.slot_number > daysPassed + 1 && !owned;
  const isAnimated = slot.rarity === "legendary" || slot.rarity === "mythic";

  return (
    <div
      className={`bp-card relative flex-shrink-0 w-[160px] h-[240px] rounded-2xl overflow-visible ${
        slot.rarity === "legendary" ? "bp-card-premium-legendary" : ""
      } ${slot.rarity === "mythic" ? "bp-card-premium-mythic" : ""}`}
      style={{
        background: cfg.gradient,
        border: `1px solid ${cfg.border}`,
      }}
    >
      {/* === NEW: Conic-gradient rotating glow border (legendary / mythic) === */}
      {isAnimated && !locked && (
        <div
          className={`bp-glow-layer ${slot.rarity === "mythic" ? "bp-glow-mythic" : "bp-glow-legendary"}`}
        >
          <div className="bp-glow-spinner" />
        </div>
      )}

      {/* Inner content sits above glow */}
      <div className="relative z-[5] w-full h-full rounded-2xl overflow-hidden flex flex-col"
           style={{ background: "linear-gradient(145deg, rgba(8,9,14,0.85), rgba(4,4,8,0.95))" }}>

        {/* Status badge */}
        <div className="absolute top-2 right-2 z-10">
          {owned ? (
            <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(34,197,94,0.9)" }}>
              <CheckCircle2 size={16} className="text-white" />
            </div>
          ) : locked ? (
            <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.15)" }}>
              <Lock size={14} className="text-white/60" />
            </div>
          ) : isToday ? (
            <div className="px-2 py-1 rounded-md text-[9px] font-bold text-black" style={{ background: cfg.color }}>
              СЬОГОДНІ
            </div>
          ) : null}
        </div>

        {/* === FIX 1: NFT / image as square with rounded corners === */}
        <div className="px-3 pt-3">
          <div
            className="w-full aspect-square rounded-xl overflow-hidden flex items-center justify-center"
            style={{
              background: "rgba(0,0,0,0.35)",
              border: `1px solid ${cfg.border}`,
            }}
          >
            {slot.image_url ? (
              <img
                src={slot.image_url}
                alt={slot.title}
                className="w-full h-full object-cover"
                draggable={false}
              />
            ) : (
              <div className="text-4xl opacity-70">
                {slot.prize_type === "cr" ? "💰" :
                 slot.prize_type === "nft" ? "🎁" :
                 slot.prize_type === "car" ? "🚗" : "✨"}
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="px-3 pt-2 pb-2 flex-1 flex flex-col justify-end">
          <div className="text-[12px] font-semibold text-white truncate" title={slot.title}>
            {slot.title || "Приз"}
          </div>
          {slot.prize_type === "cr" && slot.prize_value && (
            <div className="text-[11px] mt-0.5" style={{ color: cfg.color }}>
              {slot.prize_value} CR
            </div>
          )}
          {slot.prize_type === "car" && slot.car_name && (
            <div className="text-[11px] text-white/70 mt-0.5 truncate">🚗 {slot.car_name}</div>
          )}
        </div>

        {/* Level */}
        <div className="flex items-center justify-between px-3 py-2 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-1">
            <Icon size={11} style={{ color: cfg.color }} />
            <span className="text-[10px] uppercase tracking-wider" style={{ color: cfg.color }}>{cfg.label}</span>
          </div>
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold text-white"
            style={{ background: `rgba(${hexToRgb(levelColor)},0.18)`, border: `1px solid rgba(${hexToRgb(levelColor)},0.35)` }}
          >
            {slot.slot_number}
          </div>
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
  const accentRgb = hexToRgb(accent);
  return (
    <div className="bp-glass-luxury rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar size={14} style={{ color: accent }} />
          <span className="text-xs text-white/80">День {Math.min(daysPassed, slots.length)} з {slots.length}</span>
        </div>
        <span className="text-xs text-white/60">{ownedIds.size} / {slots.length} отримано</span>
      </div>
      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${accent}, rgba(${accentRgb},0.6))`,
            boxShadow: `0 0 12px rgba(${accentRgb},0.6)`,
          }}
        />
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
  const [showModal, setShowModal] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // === FIX 2: slider state for PC scrolling ===
  const [sliderPos, setSliderPos] = useState(0);

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

  // Sync slider <-> scroll position
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0) { setSliderPos(0); return; }
      setSliderPos((el.scrollLeft / max) * 100);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, [loading, slots.length]);

  const handleSliderChange = (val: number) => {
    setSliderPos(val);
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    el.scrollLeft = (val / 100) * max;
  };

  const ownedIds    = new Set(rewards.map(r => r.slot_id));
  const accent      = cfg.accent_color || "#ffaa00";
  const accentRgb   = hexToRgb(accent);
  const levelColor  = cfg.level_color || "#38bdf8";
  const sortedSlots = [...slots].sort((a,b) => a.slot_number - b.slot_number);
  const glass       = !!cfg.background_url || !!cfg.banner_url;

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
    <div
      className="min-h-screen pb-24 relative overflow-hidden"
      style={{ background: `linear-gradient(160deg, ${cfg.gradient_from}, ${cfg.gradient_to})` }}
    >
      {showModal && (
        <WelcomeModal
          bannerUrl={cfg.banner_url}
          seasonName={cfg.season_name}
          accent={accent}
          onClose={() => setShowModal(false)}
        />
      )}

      <style>{`
        /* === Legendary laser keyframes (kept for compatibility) === */
        @keyframes bp-laser-legendary { 0%{stroke-dashoffset:700} 100%{stroke-dashoffset:0} }
        @keyframes bp-laser-legendary-rev { 0%{stroke-dashoffset:0} 100%{stroke-dashoffset:-700} }
        .bp-laser-fast-legendary { animation: bp-laser-legendary 1.8s linear infinite; }
        .bp-laser-fast-rev-legendary { animation: bp-laser-legendary-rev 2.6s linear infinite; opacity:.6; }
        @keyframes bp-laser-mythic { 0%{stroke-dashoffset:700} 100%{stroke-dashoffset:0} }
        @keyframes bp-laser-mythic-rev { 0%{stroke-dashoffset:0} 100%{stroke-dashoffset:-700} }
        .bp-laser-fast-mythic { animation: bp-laser-mythic 1.4s linear infinite; }
        .bp-laser-fast-rev-mythic { animation: bp-laser-mythic-rev 2.0s linear infinite; opacity:.5; }

        /* === FIX 3: rotating conic-gradient glow border (from тест.html) === */
        .bp-glow-layer {
          position: absolute;
          inset: -2px;
          border-radius: 18px;
          z-index: 1;
          pointer-events: none;
          overflow: hidden;
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
                  mask-composite: exclude;
          padding: 4px;
          box-sizing: border-box;
        }
        .bp-glow-legendary {
          filter: drop-shadow(0 0 6px #ffaa00)
                  drop-shadow(0 0 14px #ffaa00)
                  drop-shadow(0 0 28px rgba(255,170,0,0.8))
                  drop-shadow(0 0 45px rgba(255,140,0,0.55));
        }
        .bp-glow-mythic {
          filter: drop-shadow(0 0 6px #ff0055)
                  drop-shadow(0 0 14px #ff0055)
                  drop-shadow(0 0 30px #ff0055)
                  drop-shadow(0 0 50px rgba(255,0,85,0.7));
        }
        .bp-glow-spinner {
          position: absolute;
          top: -60%; left: -60%;
          width: 220%; height: 220%;
          filter: blur(2px);
          animation: bp-rotate-border 6s linear infinite;
        }
        .bp-glow-legendary .bp-glow-spinner {
          background: conic-gradient(
            from 0deg,
            #ffaa00 0deg, #ffd966 35deg, #ffaa00 70deg,
            transparent 100deg, transparent 180deg,
            #ffaa00 180deg, #ffd966 215deg, #ffaa00 250deg,
            transparent 280deg, transparent 360deg
          );
        }
        .bp-glow-mythic .bp-glow-spinner {
          background: conic-gradient(
            from 0deg,
            #ff0055 0deg, #ff66a3 35deg, #ff0055 70deg,
            transparent 100deg, transparent 180deg,
            #ff0055 180deg, #ff66a3 215deg, #ff0055 250deg,
            transparent 280deg, transparent 360deg
          );
          animation-duration: 4.5s;
        }
        @keyframes bp-rotate-border {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Card hover */
        .bp-card { transition: all 0.35s cubic-bezier(0.25, 1, 0.5, 1); }
        .bp-card:hover { transform: translateY(-6px) scale(1.02); }
        .bp-card:active { transform: translateY(-1px) scale(0.99); }

        .bp-card-premium-legendary {
          background: linear-gradient(145deg, rgba(255,170,0,0.12), rgba(6,5,2,0.92)) !important;
        }
        .bp-card-premium-mythic {
          background: linear-gradient(145deg, rgba(255,0,85,0.15), rgba(4,1,5,0.95)) !important;
        }

        /* Horizontal scroll with snap */
        .bp-card-row {
          display: flex;
          gap: 14px;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          padding: 8px 4px 24px;
          scroll-behavior: smooth;
        }
        .bp-card-row::-webkit-scrollbar { display: none; }
        .bp-card-row > * { scroll-snap-align: start; }

        /* === FIX 2: custom range slider for PC scrolling === */
        .bp-scroll-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 6px;
          border-radius: 999px;
          background: rgba(255,255,255,0.08);
          outline: none;
          cursor: pointer;
        }
        .bp-scroll-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px; height: 18px;
          border-radius: 50%;
          background: ${accent};
          border: 2px solid #fff;
          box-shadow: 0 0 12px rgba(${accentRgb},0.7);
          cursor: grab;
        }
        .bp-scroll-slider::-moz-range-thumb {
          width: 18px; height: 18px;
          border-radius: 50%;
          background: ${accent};
          border: 2px solid #fff;
          box-shadow: 0 0 12px rgba(${accentRgb},0.7);
          cursor: grab;
        }

        .bp-glass-luxury {
          background: rgba(10, 11, 18, 0.55);
          backdrop-filter: blur(20px) saturate(150%);
          -webkit-backdrop-filter: blur(20px) saturate(150%);
          border: 1px solid rgba(255, 255, 255, 0.09);
          box-shadow: 0 15px 35px -5px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.1);
        }

        .bp-modal-in { animation: bp-modal-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
        @keyframes bp-modal-in {
          from { opacity: 0; transform: scale(0.9) translateY(30px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>

      {/* Background overlay */}
      {(cfg.banner_url || cfg.background_url) && (
        <div
          className="absolute inset-0 opacity-25 pointer-events-none"
          style={{
            backgroundImage: `url(${cfg.background_url || cfg.banner_url})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      )}

      {/* HEADER */}
      <div className="relative px-4 pt-14 pb-6">
        <button
          onClick={() => navigate(-1)}
          className="absolute left-4 top-4 w-10 h-10 rounded-xl flex items-center justify-center z-10 transition-all duration-300 hover:bg-white/10 active:scale-90"
          style={{
            background: "rgba(10,11,18,0.6)",
            border: "1px solid rgba(255,255,255,0.12)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          <ChevronLeft size={20} className="text-white" />
        </button>

        <div className="text-center">
          <div className="text-3xl font-extrabold text-white tracking-wider">
            {cfg.season_name || "БАТЛПАС"}
          </div>
          {cfg.description && (
            <div className="text-sm text-white/60 mt-1">{cfg.description}</div>
          )}
        </div>
      </div>

      <div className="px-4 space-y-4">
        {/* CLAIM */}
        {!loading && slots.length > 0 && (
          <div>
            {canClaim && nextSlot ? (
              <button
                onClick={handleDailyClaim}
                disabled={claiming}
                className="w-full py-3 rounded-2xl font-bold text-black flex items-center justify-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-60"
                style={{
                  background: accent,
                  boxShadow: `0 10px 30px -5px rgba(${accentRgb},0.5)`,
                }}
              >
                <Gift size={18} />
                {claiming ? "Отримання..." : "Отримати нагороду"}
              </button>
            ) : (
              <div className="bp-glass-luxury rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-white/80">
                  <ShieldCheck size={18} style={{ color: accent }} />
                  <span className="text-sm">{!nextSlot ? "Усі нагороди зібрано" : "Нагорода отримана"}</span>
                </div>
                {nextSlot && <span className="text-xs text-white/50">Отримати завтра</span>}
              </div>
            )}
          </div>
        )}

        {/* PROGRESS */}
        {!loading && (
          <ProgressTrack slots={sortedSlots} ownedIds={ownedIds} daysPassed={daysPassed} accent={accent} />
        )}
      </div>

      {/* REWARDS */}
      {loading ? (
        <div className="px-4 py-10 text-center text-white/50 text-sm">Завантаження...</div>
      ) : slots.length === 0 ? (
        <div className="px-4 py-10 text-center">
          <Crown size={36} className="text-white/30 mx-auto mb-2" />
          <p className="text-white/60 text-sm">Батлпас поки не налаштований</p>
        </div>
      ) : (
        <div className="mt-6 px-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase tracking-widest text-white/50">
              Всі нагороди · свайп →
            </span>
            <span className="text-[10px] text-white/40">{sortedSlots.length} шт.</span>
          </div>

          {/* Scrollable row */}
          <div ref={scrollRef} className="bp-card-row">
            {sortedSlots.map(slot => {
              const resolvedImg =
                slot.image_url ||
                (slot.prize_type === "nft"
                  ? (slot.nft_gift_id ? nftMap[String(slot.nft_gift_id)] : "") ||
                    (slot.title ? nftMap[String(slot.title)] : "")
                  : "") ||
                "";
              const slotWithImg = { ...slot, image_url: resolvedImg };
              return (
                <SlotCard
                  key={slot.id}
                  slot={slotWithImg}
                  owned={ownedIds.has(slot.id)}
                  isToday={slot.slot_number === daysPassed + 1}
                  daysPassed={daysPassed}
                  glass={glass}
                  levelColor={levelColor}
                />
              );
            })}
          </div>

          {/* === FIX 2: PC slider control === */}
          <div className="mt-1 mb-6 px-1 flex items-center gap-3">
            <span className="text-[10px] text-white/40 select-none">←</span>
            <input
              type="range"
              min={0}
              max={100}
              step={0.1}
              value={sliderPos}
              onChange={e => handleSliderChange(Number(e.target.value))}
              className="bp-scroll-slider flex-1"
              aria-label="Прокрутити батл пас"
            />
            <span className="text-[10px] text-white/40 select-none">→</span>
          </div>

          {/* Legend + analytics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div className="bp-glass-luxury rounded-2xl p-4">
              <div className="text-xs uppercase tracking-widest text-white/50 mb-3">Рідкості</div>
              <div className="space-y-2">
                {(["common","rare","legendary","mythic"] as Rarity[]).map(r => {
                  const rc = RARITY_CONFIG[r];
                  const Icon = rc.icon;
                  const count = sortedSlots.filter(s => s.rarity === r).length;
                  return (
                    <div key={r} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Icon size={14} style={{ color: rc.color }} />
                        <span className="text-white/80">{rc.label}</span>
                      </div>
                      <span className="text-white/50 text-xs">×{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {nick && (
              <div className="bp-glass-luxury rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy size={14} style={{ color: accent }} />
                  <span className="text-xs uppercase tracking-widest text-white/50">Твій прогрес</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div>
                    <div className="text-2xl font-bold text-white">{ownedIds.size}</div>
                    <div className="text-[10px] text-white/50 uppercase">отримано</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">{sortedSlots.length - ownedIds.size}</div>
                    <div className="text-[10px] text-white/50 uppercase">залишилось</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const BattlePassCarCard = ({ reward }: { reward: BattlePassReward }) => {
  const cfg = RARITY_CONFIG[reward.rarity];
  const carName = reward.car_name || reward.prize_value || "АВТО";
  const Icon = cfg.icon;
  return (
    <div
      className="relative rounded-2xl overflow-hidden p-3"
      style={{ background: cfg.gradient, border: `1px solid ${cfg.border}` }}
    >
      <div className="w-full aspect-square rounded-xl overflow-hidden mb-2"
           style={{ background: "rgba(0,0,0,0.35)" }}>
        {reward.image_url ? (
          <img src={reward.image_url} alt={carName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">🚗</div>
        )}
      </div>
      <div className="flex items-center gap-1 mb-1">
        <Icon size={12} style={{ color: cfg.color }} />
        <span className="text-[10px] uppercase tracking-wider" style={{ color: cfg.color }}>{cfg.label}</span>
      </div>
      <div className="text-sm font-semibold text-white truncate">{carName}</div>
    </div>
  );
};

export default BattlePass;
