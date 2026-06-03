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
}: { bannerUrl?: string; seasonName: string; accent: string; onClose: () => void; }) => {
  const accentRgb = hexToRgb(accent);
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="bp-modal-in relative w-full max-w-md rounded-3xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "linear-gradient(160deg, #0b0d14, #050609)",
          border: `1px solid rgba(${accentRgb},0.4)`,
          boxShadow: `0 30px 80px -10px rgba(${accentRgb},0.4)`,
        }}
      >
        {bannerUrl && (
          <div className="relative w-full h-44 overflow-hidden">
            <img src={bannerUrl} alt={seasonName} className="w-full h-full object-cover" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent, #0b0d14)" }} />
          </div>
        )}

        <div className="p-6 text-center">
          <div className="mb-4">
            <div className="inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-3"
              style={{ background: `rgba(${accentRgb},0.15)`, color: accent, border: `1px solid rgba(${accentRgb},0.3)` }}>
              новий сезон
            </div>
            <div className="text-2xl font-black text-white leading-tight">
              СЕЗОН "ЛІТО 2026"<br/>ВЖЕ РОЗПОЧАТО!
            </div>
          </div>

          <p className="text-white/60 text-sm mb-6">Доєднуйся!</p>

          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl font-bold text-black uppercase tracking-wider transition-transform active:scale-95"
            style={{ background: `linear-gradient(135deg, ${accent}, #ff7a00)`, boxShadow: `0 10px 30px -5px rgba(${accentRgb},0.6)` }}>
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
  slot: BattlePassSlot; owned: boolean; isToday: boolean;
  daysPassed: number; glass: boolean; levelColor: string;
}) => {
  const cfg    = RARITY_CONFIG[slot.rarity];
  const Icon   = cfg.icon;
  const locked = slot.slot_number > daysPassed + 1 && !owned;
  const isAnimated = slot.rarity === "legendary" || slot.rarity === "mythic";
  const premiumBg = slot.rarity === "legendary"
    ? "bp-card-premium-legendary"
    : slot.rarity === "mythic" ? "bp-card-premium-mythic" : "";

  return (
    <div
      className={`bp-card relative flex-shrink-0 rounded-2xl overflow-hidden ${premiumBg}`}
      style={{
        width: 142, height: 220,
        background: !isAnimated ? cfg.gradient : undefined,
        border: `1px solid ${cfg.border}`,
        boxShadow: locked
          ? "0 4px 12px rgba(0,0,0,0.4)"
          : `0 8px 24px -4px rgba(${cfg.rgb},0.35)`,
        opacity: locked ? 0.55 : 1,
      }}
    >
      {/* Laser border — для legendary/mythic */}
      {isAnimated && !locked && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 142 220" fill="none" preserveAspectRatio="none"
          style={{ zIndex: 2 }}
        >
          <rect x="1" y="1" width="140" height="218" rx="15" ry="15"
            fill="none" stroke={cfg.border} strokeWidth="1" />
          <rect x="1" y="1" width="140" height="218" rx="15" ry="15"
            fill="none" stroke={cfg.color} strokeWidth="2"
            strokeDasharray="180 520"
            className={slot.rarity === "legendary" ? "bp-laser-fast-legendary" : "bp-laser-fast-mythic"}
            style={{ filter: `drop-shadow(0 0 6px ${cfg.glow})` }} />
          <rect x="1" y="1" width="140" height="218" rx="15" ry="15"
            fill="none" stroke={cfg.color} strokeWidth="1.5"
            strokeDasharray="120 580"
            className={slot.rarity === "legendary" ? "bp-laser-fast-rev-legendary" : "bp-laser-fast-rev-mythic"}
            style={{ filter: `drop-shadow(0 0 4px ${cfg.glow})` }} />
        </svg>
      )}

      {/* Нижня лінія-акцент */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] z-[1]"
        style={{ background: `linear-gradient(90deg, transparent, ${cfg.color}, transparent)` }} />

      {/* Верхній глянцевий блик */}
      <div className="absolute top-0 left-0 right-0 h-[40%] pointer-events-none z-[1]"
        style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.06), transparent)" }} />

      {/* Статус бейдж */}
      <div className="absolute top-2 right-2 z-[3]">
        {owned ? (
          <div className="w-6 h-6 rounded-full flex items-center justify-center"
            style={{ background: "#22c55e", boxShadow: "0 0 12px rgba(34,197,94,0.6)" }}>
            <CheckCircle2 size={14} className="text-white" />
          </div>
        ) : locked ? (
          <div className="w-6 h-6 rounded-full flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.15)" }}>
            <Lock size={12} className="text-white/60" />
          </div>
        ) : isToday ? (
          <div className="px-2 py-[3px] rounded-full text-[9px] font-bold uppercase tracking-wider"
            style={{ background: levelColor, color: "#000" }}>
            СЬОГОДНІ
          </div>
        ) : null}
      </div>

      {/* Зображення — КВАДРАТ з заокругленими краями (NFT та інші) */}
      <div className="relative w-full px-3 pt-3 z-[1]">
        <div className="relative w-full aspect-square rounded-xl overflow-hidden"
          style={{ background: "rgba(0,0,0,0.25)" }}>
          {slot.image_url ? (
            <img
              src={slot.image_url}
              alt={slot.title}
              className="absolute inset-0 w-full h-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-4xl">
              {slot.prize_type === "cr" ? "💰" :
               slot.prize_type === "nft" ? "🎁" :
               slot.prize_type === "car" ? "🚗" : "✨"}
            </div>
          )}
        </div>
      </div>

      {/* Інфо-блок */}
      <div className="absolute bottom-7 left-0 right-0 px-3 z-[2]">
        <div className="text-[11px] font-bold text-white truncate leading-tight">
          {slot.title || "Приз"}
        </div>
        {slot.prize_type === "cr" && slot.prize_value && (
          <div className="text-[10px] font-semibold mt-0.5" style={{ color: cfg.color }}>
            {slot.prize_value} CR
          </div>
        )}
        {slot.prize_type === "car" && slot.car_name && (
          <div className="text-[10px] text-white/70 mt-0.5 truncate">🚗 {slot.car_name}</div>
        )}
      </div>

      {/* Рівень */}
      <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between z-[2]">
        <div className="flex items-center gap-1">
          <Icon size={9} style={{ color: cfg.color }} />
          <span className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: cfg.color }}>
            {cfg.label}
          </span>
        </div>
        <span className="text-[10px] font-black" style={{ color: levelColor }}>
          #{slot.slot_number}
        </span>
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
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Calendar size={14} style={{ color: accent }} />
          <span className="text-xs text-white/70">
            День {Math.min(daysPassed, slots.length)} з {slots.length}
          </span>
        </div>
        <span className="text-xs font-semibold text-white/90">
          {ownedIds.size} / {slots.length} отримано
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${accent}, rgba(${accentRgb},0.6))`,
            boxShadow: `0 0 12px rgba(${accentRgb},0.5)`,
          }} />
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
  const [nftMap, setNftMap] = useState<Record<string,string>>({});
  const [showModal, setShowModal] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── PC slider state ──
  const [sliderPos, setSliderPos] = useState(0);
  const [maxScroll, setMaxScroll] = useState(0);
  const syncingRef = useRef(false);

  const claimKey = `bp_last_claim_${nick}`;
  const seenKey  = `bp_season_seen`;
  const [lastClaim, setLastClaim] = useState(() => localStorage.getItem(claimKey) || "");

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
      const map: Record<string,string> = {};
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

  // ── Recompute slider max + listen scroll ──
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const recompute = () => {
      const max = Math.max(0, el.scrollWidth - el.clientWidth);
      setMaxScroll(max);
    };
    recompute();

    const onScroll = () => {
      if (syncingRef.current) return;
      const max = Math.max(0, el.scrollWidth - el.clientWidth);
      const pct = max > 0 ? (el.scrollLeft / max) * 100 : 0;
      setSliderPos(pct);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", recompute);
    const ro = new ResizeObserver(recompute);
    ro.observe(el);

    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", recompute);
      ro.disconnect();
    };
  }, [slots.length, loading]);

  const handleSliderChange = (val: number) => {
    const el = scrollRef.current;
    if (!el) return;
    syncingRef.current = true;
    setSliderPos(val);
    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    el.scrollLeft = (val / 100) * max;
    requestAnimationFrame(() => { syncingRef.current = false; });
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
    <div className="relative min-h-screen text-white overflow-hidden"
      style={{ background: `linear-gradient(180deg, ${cfg.gradient_from}, ${cfg.gradient_to})` }}>

      {showModal && (
        <WelcomeModal
          bannerUrl={cfg.banner_url}
          seasonName={cfg.season_name}
          accent={accent}
          onClose={() => setShowModal(false)}
        />
      )}

      <style>{`
        /* Legendary — золотий */
        @keyframes bp-laser-legendary {
          0%   { stroke-dashoffset: 700; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes bp-laser-legendary-rev {
          0%   { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -700; }
        }
        .bp-laser-fast-legendary {
          animation: bp-laser-legendary 1.8s linear infinite;
          stroke-dashoffset: 700;
        }
        .bp-laser-fast-rev-legendary {
          animation: bp-laser-legendary-rev 2.6s linear infinite;
          stroke-dashoffset: 0;
          opacity: 0.6;
        }

        /* Mythic — рожево-червоний */
        @keyframes bp-laser-mythic {
          0%   { stroke-dashoffset: 700; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes bp-laser-mythic-rev {
          0%   { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -700; }
        }
        .bp-laser-fast-mythic {
          animation: bp-laser-mythic 1.4s linear infinite;
          stroke-dashoffset: 700;
        }
        .bp-laser-fast-rev-mythic {
          animation: bp-laser-mythic-rev 2.0s linear infinite;
          stroke-dashoffset: 0;
          opacity: 0.5;
        }

        .bp-card { transition: all 0.35s cubic-bezier(0.25, 1, 0.5, 1); }
        .bp-card:hover { transform: translateY(-6px) scale(1.02) !important; }
        .bp-card:active { transform: translateY(-1px) scale(0.99) !important; }

        .bp-card-premium-legendary {
          background: linear-gradient(145deg, rgba(255,170,0,0.12), rgba(6,5,2,0.92)) !important;
        }
        .bp-card-premium-mythic {
          background: linear-gradient(145deg, rgba(255,0,85,0.15), rgba(4,1,5,0.95)) !important;
        }

        .bp-card-row {
          display: flex;
          gap: 14px;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          padding-bottom: 24px;
          padding-top: 8px;
        }
        .bp-card-row::-webkit-scrollbar { display: none; }
        .bp-card-row > * { scroll-snap-align: start; scroll-snap-stop: normal; }

        .bp-glass-luxury {
          background: rgba(10, 11, 18, 0.55) !important;
          backdrop-filter: blur(20px) saturate(150%) !important;
          -webkit-backdrop-filter: blur(20px) saturate(150%) !important;
          border: 1px solid rgba(255, 255, 255, 0.09) !important;
          box-shadow: 0 15px 35px -5px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.1);
        }

        .bp-modal-in { animation: bp-modal-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
        @keyframes bp-modal-in {
          from { opacity: 0; transform: scale(0.9) translateY(30px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }

        /* ── PC scroll slider ── */
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
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: var(--bp-accent, #ffaa00);
          border: 2px solid #000;
          box-shadow: 0 0 12px var(--bp-accent-glow, rgba(255,170,0,0.6));
          cursor: grab;
        }
        .bp-scroll-slider::-webkit-slider-thumb:active { cursor: grabbing; }
        .bp-scroll-slider::-moz-range-thumb {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: var(--bp-accent, #ffaa00);
          border: 2px solid #000;
          box-shadow: 0 0 12px var(--bp-accent-glow, rgba(255,170,0,0.6));
          cursor: grab;
        }
      `}</style>

      {/* Background overlay */}
      {!cfg.banner_url && !cfg.background_url && (
        <div className="absolute inset-0 pointer-events-none opacity-30"
          style={{ background: `radial-gradient(circle at 20% 0%, rgba(${accentRgb},0.18), transparent 50%)` }} />
      )}
      {(cfg.banner_url || cfg.background_url) && (
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url(${cfg.background_url || cfg.banner_url})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.18,
          }} />
      )}

      {/* ── HEADER ── */}
      <div className="relative pt-6 pb-4 px-4">
        <button onClick={() => navigate(-1)}
          className="absolute left-4 top-4 w-10 h-10 rounded-xl flex items-center justify-center z-10 transition-all duration-300 hover:bg-white/10 active:scale-90"
          style={{
            background: "rgba(10,11,18,0.6)",
            border: "1px solid rgba(255,255,255,0.12)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}>
          <ChevronLeft size={20} className="text-white" />
        </button>

        <div className="text-center pt-2">
          {!cfg.banner_url && !cfg.background_url && (
            <div className="flex justify-center mb-3">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${accent}, #ff7a00)`,
                  boxShadow: `0 10px 30px -5px rgba(${accentRgb},0.6)`,
                }}>
                <Crown size={28} className="text-black" />
              </div>
            </div>
          )}
          <h1 className="text-3xl font-black uppercase tracking-wide"
            style={{ color: accent, textShadow: `0 0 24px rgba(${accentRgb},0.5)` }}>
            {cfg.season_name || "БАТЛПАС"}
          </h1>
          {cfg.description && (
            <p className="text-white/60 text-sm mt-1">{cfg.description}</p>
          )}
        </div>
      </div>

      <div className="px-4">
        {/* ── CLAIM BUTTON ── */}
        {!loading && slots.length > 0 && (
          <div className="mb-4">
            {canClaim && nextSlot ? (
              <button onClick={handleDailyClaim} disabled={claiming}
                className="w-full py-3.5 rounded-2xl font-bold text-black uppercase tracking-wider flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
                style={{
                  background: `linear-gradient(135deg, ${accent}, #ff7a00)`,
                  boxShadow: `0 10px 30px -5px rgba(${accentRgb},0.5)`,
                }}>
                <Gift size={18} />
                {claiming ? "Отримання..." : "Отримати нагороду"}
              </button>
            ) : (
              <div className="w-full py-3.5 rounded-2xl flex items-center justify-between px-4 bp-glass-luxury">
                <div className="flex items-center gap-2 text-white/70 text-sm">
                  <ShieldCheck size={16} />
                  {!nextSlot ? "Усі нагороди зібрано" : "Нагорода"}
                </div>
                {nextSlot && (
                  <span className="text-xs text-white/50">Отримати завтра</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── PROGRESS ── */}
        {!loading && (
          <div className="mb-5 p-3 rounded-2xl bp-glass-luxury">
            <ProgressTrack slots={sortedSlots} ownedIds={ownedIds} daysPassed={daysPassed} accent={accent} />
          </div>
        )}
      </div>

      {/* ── REWARDS SCROLL ── */}
      {loading ? (
        <div className="px-4 py-10 text-center">
          <div className="inline-block w-8 h-8 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
        </div>
      ) : slots.length === 0 ? (
        <div className="px-4 py-16 text-center">
          <Gift size={48} className="mx-auto text-white/30 mb-3" />
          <p className="text-white/60">Батлпас поки не налаштований</p>
        </div>
      ) : (
        <div className="pl-4 pr-0">
          {/* Заголовок секції */}
          <div className="flex items-center justify-between pr-4 mb-2">
            <span className="text-[11px] uppercase tracking-widest text-white/40 font-semibold">
              Всі нагороди · свайп →
            </span>
          </div>

          {/* Горизонтальний скрол */}
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

          {/* ── PC SLIDER for scrolling ── */}
          {maxScroll > 0 && (
            <div className="pr-4 mt-1 mb-6">
              <input
                type="range"
                min={0}
                max={100}
                step={0.1}
                value={sliderPos}
                onChange={(e) => handleSliderChange(Number(e.target.value))}
                className="bp-scroll-slider"
                style={{
                  // @ts-ignore custom props
                  ["--bp-accent" as any]: accent,
                  ["--bp-accent-glow" as any]: `rgba(${accentRgb},0.6)`,
                  background: `linear-gradient(90deg, ${accent} 0%, ${accent} ${sliderPos}%, rgba(255,255,255,0.08) ${sliderPos}%, rgba(255,255,255,0.08) 100%)`,
                }}
                aria-label="Прокрутити нагороди"
              />
              <div className="flex justify-between mt-1.5 text-[10px] text-white/40 uppercase tracking-wider">
                <span>початок</span>
                <span>кінець</span>
              </div>
            </div>
          )}

          <div className="px-4 pr-4 mt-2">
            {/* Rarity Legend */}
            <div className="p-4 rounded-2xl bp-glass-luxury mb-4">
              <div className="text-[11px] uppercase tracking-widest text-white/40 font-semibold mb-3">
                Рідкості
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(["common","rare","legendary","mythic"] as Rarity[]).map(r => {
                  const rc   = RARITY_CONFIG[r];
                  const Icon = rc.icon;
                  const count = sortedSlots.filter(s=>s.rarity===r).length;
                  return (
                    <div key={r} className="flex items-center justify-between p-2 rounded-lg"
                      style={{ background: `rgba(${rc.rgb},0.08)`, border: `1px solid rgba(${rc.rgb},0.15)` }}>
                      <div className="flex items-center gap-2">
                        <Icon size={12} style={{ color: rc.color }} />
                        <span className="text-[11px] font-semibold" style={{ color: rc.color }}>
                          {rc.label}
                        </span>
                      </div>
                      <span className="text-[11px] text-white/60 font-bold">×{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Progress analytics */}
            {nick && (
              <div className="p-4 rounded-2xl bp-glass-luxury mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy size={14} style={{ color: accent }} />
                  <span className="text-[11px] uppercase tracking-widest text-white/40 font-semibold">
                    Твій прогрес
                  </span>
                </div>
                <div className="flex items-center justify-around">
                  <div className="text-center">
                    <div className="text-2xl font-black" style={{ color: accent }}>{ownedIds.size}</div>
                    <div className="text-[10px] text-white/50 uppercase tracking-wider">отримано</div>
                  </div>
                  <div className="w-px h-10" style={{ background: "rgba(255,255,255,0.1)" }} />
                  <div className="text-center">
                    <div className="text-2xl font-black text-white/80">{sortedSlots.length - ownedIds.size}</div>
                    <div className="text-[10px] text-white/50 uppercase tracking-wider">залишилось</div>
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
    <div className="relative rounded-2xl overflow-hidden p-3"
      style={{ background: cfg.gradient, border: `1px solid ${cfg.border}` }}>
      <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-2"
        style={{ background: "rgba(0,0,0,0.25)" }}>
        {reward.image_url ? (
          <img src={reward.image_url} alt={carName}
            className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-5xl">🚗</div>
        )}
      </div>
      <div className="flex items-center gap-1 mb-1">
        <Icon size={11} style={{ color: cfg.color }} />
        <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: cfg.color }}>
          {cfg.label}
        </span>
      </div>
      <div className="text-sm font-bold text-white truncate">{carName}</div>
    </div>
  );
};

export default BattlePass;
