import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { dbSelect, dbInsert } from "../lib/db";
import { toast } from "sonner";
import {
  Star, Zap, Trophy, Crown, Flame, ChevronLeft, Lock, CheckCircle2,
  Calendar, ShieldCheck, Gift, ChevronRight,
} from "lucide-react";

/* ──────────────────────────────────────────────────────────────────
   Battle Pass v3
   Зміни:
   1. Анімована рамка: 2 glow-смуги що їдуть по контуру (не крутяться).
   2. background_url — фон ВКЛАДКИ (під банером), якщо банер є — він зверху,
      а фон-картинка заповнює всю площу під ним. Картки → liquid glass.
   3. Листання батлпасу (попередній/наступний тиждень) + кнопки-стрілки.
   4. Кнопка клейму: коли сіра — текст "Отримати завтра" під нею, а не всередині.
   5. Рідкість — маленька горизонтальна полоска з заокругленими кінцями.
   6. NFT зображення — з заокругленими краями + fit без обрізки.
   7. Liquid glass на всій сторінці пропуску (більше скла).
   8. Welcome-модалка при першому відкритті (localStorage: bp_season_seen).
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
  border: string; icon: any;
}> = {
  common:    { label:"Звичайний",   color:"#9ca3af", glow:"rgba(156,163,175,0.55)", rgb:"156,163,175", border:"rgba(156,163,175,0.3)", icon:Star   },
  rare:      { label:"Рідкісний",   color:"#3b82f6", glow:"rgba(59,130,246,0.65)",  rgb:"59,130,246",  border:"rgba(59,130,246,0.42)",  icon:Zap    },
  legendary: { label:"Легендарний", color:"#FFD000", glow:"rgba(255,208,0,0.9)",    rgb:"255,208,0",   border:"rgba(255,208,0,0.6)",    icon:Trophy },
  mythic:    { label:"Міфічний",    color:"#FF1A1A", glow:"rgba(255,26,26,0.95)",   rgb:"255,26,26",   border:"rgba(255,26,26,0.65)",   icon:Flame  },
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
const PAGE_SIZE = 7; // карток на "сторінці" листання

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
      className="fixed inset-0 z-[999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(18px)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-3xl overflow-hidden bp-modal-in"
        style={{
          background: "linear-gradient(160deg,rgba(20,10,40,0.95),rgba(5,5,15,0.98))",
          border: `1.5px solid rgba(${accentRgb},0.35)`,
          boxShadow: `0 0 80px rgba(168,85,247,0.3), 0 0 40px rgba(${accentRgb},0.2)`,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Glow верхній */}
        <div className="absolute top-0 left-0 right-0 h-1 pointer-events-none"
          style={{ background: `linear-gradient(90deg, transparent, rgba(168,85,247,0.8), rgba(${accentRgb},0.8), transparent)` }} />

        {/* Банер зверху */}
        {bannerUrl && (
          <div className="relative w-full" style={{ height: 180 }}>
            <img src={bannerUrl} alt="" className="w-full h-full" style={{ objectFit: "cover", objectPosition: "center" }} />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(5,5,15,0.85) 100%)" }} />
          </div>
        )}

        <div className="px-6 pt-5 pb-7 text-center flex flex-col items-center gap-3">
          {/* Заголовок */}
          <div className="flex flex-col items-center gap-1">
            <p className="text-[11px] uppercase tracking-[0.25em] font-bold"
              style={{ color: "rgba(168,85,247,0.7)" }}>новий сезон</p>
            <h2 className="text-xl font-black uppercase tracking-[0.12em] leading-tight bp-modal-title"
              style={{
                color: "#c084fc",
                textShadow: "0 0 30px rgba(168,85,247,0.9), 0 0 60px rgba(168,85,247,0.5), 0 2px 8px rgba(0,0,0,0.9)",
              }}>
              СЕЗОН "ЛІТО 2026"<br />ВЖЕ РОЗПОЧАТО!
            </h2>
          </div>

          {/* Підпис */}
          <p className="text-[12px] font-semibold tracking-[0.08em]"
            style={{ color: "rgba(255,255,255,0.55)" }}>
            Доєднуйся!
          </p>

          {/* Кнопка */}
          <button
            onClick={onClose}
            className="relative mt-2 w-full rounded-2xl py-3.5 font-black uppercase tracking-[0.2em] text-sm overflow-hidden bp-modal-btn"
            style={{
              background: `linear-gradient(135deg, rgba(168,85,247,0.35) 0%, rgba(${accentRgb},0.2) 100%)`,
              border: `1.5px solid rgba(168,85,247,0.6)`,
              color: "#c084fc",
              boxShadow: "0 0 28px rgba(168,85,247,0.4)",
            }}
          >
            <span className="relative z-10">ПОЧАТИ!</span>
          </button>
        </div>

        {/* Glow нижній */}
        <div className="absolute bottom-0 left-0 right-0 h-1 pointer-events-none"
          style={{ background: `linear-gradient(90deg, transparent, rgba(168,85,247,0.5), transparent)` }} />
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

  const cardBg = `radial-gradient(circle at 20% 20%, rgba(${cfg.rgb},0.18) 0%, rgba(${cfg.rgb},0.06) 40%, rgba(0,0,0,0.92) 75%, #060606 100%)`;

  return (
    <div
      className={`bp-card relative flex-shrink-0 rounded-2xl transition-all duration-300 cursor-pointer
        ${isAnimated ? "bp-card-animated" : ""}
        ${glass ? "bp-card-glass" : ""}`}
      style={{
        width: 140,
        background: cardBg,
        border: `1px solid rgba(${cfg.rgb},0.28)`,
        opacity:   locked ? 0.45 : 1,
        transform: isToday ? "scale(1.04)" : "scale(1)",
        "--r":    cfg.color,
        "--rg":   cfg.glow,
        "--rrgb": cfg.rgb,
      } as any}
    >
      {/* Анімовані смуги по периметру картки */}
      {isAnimated && !locked && (
        <div className="bp-anim-border">
          <svg viewBox="0 0 148 238" fill="none" preserveAspectRatio="none">
            <rect x="2" y="2" width="144" height="234" rx="16" className="bp-sweep-line-1" />
            <rect x="2" y="2" width="144" height="234" rx="16" className="bp-sweep-line-2" />
          </svg>
        </div>
      )}

      {/* Полоска рідкості — виходить за верхній край картки */}
      <div style={{
        position: "absolute",
        top: -3,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 40,
        width: 56,
        height: 5,
        borderRadius: 999,
        background: cfg.color,
        opacity: locked ? 0.4 : 1,
        boxShadow: `0 0 8px 2px ${cfg.color}, 0 0 20px 4px ${cfg.color}, 0 0 40px 8px ${cfg.glow}`,
        filter: `blur(0.3px)`,
      }} />

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
          <img
            src={slot.image_url}
            alt={slot.title}
            className={isNft ? "bp-nft-img" : "w-full h-full"}
            style={{
              objectFit: "contain",
              padding: isNft ? 8 : 6,
              borderRadius: isNft ? 12 : 0,
              filter: locked
                ? "grayscale(1) brightness(0.3)"
                : owned
                  ? `drop-shadow(0 4px 14px ${cfg.glow})`
                  : "none",
              animation: owned ? "bp-float 4s ease-in-out infinite" : "none",
              maxWidth: isNft ? "84%" : "100%",
              maxHeight: isNft ? "84%" : "100%",
            }}
          />
        ) : (
          <div className="flex flex-col items-center gap-1">
            <span style={{ fontSize:34, opacity: locked ? 0.2 : 1,
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

      {/* Шкала з номером рівня */}
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
  const pct = slots.length > 0 ? (ownedIds.size / slots.length) * 100 : 0;
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
  const accent      = cfg.accent_color || "#fbbf24";
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
    <div className="min-h-screen pb-24 relative" style={{
      background: (cfg.banner_url || cfg.background_url)
        ? undefined
        : "#050505",
      ...(cfg.banner_url || cfg.background_url ? {
        backgroundImage: `url(${cfg.banner_url || cfg.background_url})`,
        backgroundSize: "cover",
        backgroundPosition: "center top",
        backgroundAttachment: "local",
      } : {}),
    }}>

      {showModal && (
        <div className="fixed inset-0 z-[998] bg-black pointer-events-none" />
      )}

      {showModal && (
        <WelcomeModal
          bannerUrl={cfg.banner_url || cfg.background_url}
          seasonName={cfg.season_name}
          accent={accent}
          onClose={handleCloseModal}
        />
      )}

      {/* CSS Стили и Анимации */}
      <style>{``
       @keyframes bp-fade-up    { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes bp-float      { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        @keyframes bp-claim-glow { 0%,100%{box-shadow:0 0 18px var(--ag),0 0 34px var(--ag)} 50%{box-shadow:0 0 30px var(--ag),0 0 64px var(--ag)} }
        @keyframes bp-btn-sweep  { 0%{transform:translateX(-130%)} 52%,100%{transform:translateX(130%)} }
        @keyframes bp-shimmer-banner { 0%{transform:translateX(-100%)} 100%{transform:translateX(200%)} }
        @keyframes bp-modal-in   { from{opacity:0;transform:scale(0.88) translateY(20px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes bp-modal-btn-sweep { 0%{transform:translateX(-130%)} 52%,100%{transform:translateX(130%)} }
        @keyframes bp-glow-title { 0%,100%{text-shadow:0 0 30px rgba(168,85,247,0.9),0 0 60px rgba(168,85,247,0.5),0 2px 8px rgba(0,0,0,0.9)} 50%{text-shadow:0 0 50px rgba(168,85,247,1),0 0 90px rgba(168,85,247,0.7),0 2px 8px rgba(0,0,0,0.9)} }

        /* Вращение градиента вокруг карточки (эффект неоновой рамки-фонарика) */
        @keyframes bp-rotate-glow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .bp-card-row{ scrollbar-width:none }
        .bp-card-row::-webkit-scrollbar{ display:none }
        .bp-card{ transition:transform .2s, box-shadow .3s, border-color .3s }
        .bp-card:active{ transform:scale(0.97)!important }

        /* Эффект матового стекла (блюр + плотная подложка) для карточек */
        .bp-card-glass {
          background: rgba(10, 10, 10, 0.65) !important;
          backdrop-filter: blur(20px) saturate(140%) !important;
          -webkit-backdrop-filter: blur(20px) saturate(140%) !important;
          box-shadow: 0 12px 40px rgba(0,0,0,0.65), inset 0 1px 1px rgba(255,255,255,0.1);
        }

        /* Мощная неоновая анимация краев как на скриншоте для легендарных/мифических карт */
        .bp-card-animated {
          position: relative;
          overflow: hidden;
        }

        /* Сама светящаяся рамка (фонарик) */
        .bp-anim-border {
          position: absolute;
          inset: 0;
          border-radius: 16px;
          padding: 2px; /* Толщина светящейся линии */
          background: linear-gradient(0deg, var(--r), transparent 60%, var(--r));
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
          z-index: 10;
        }

        .bp-card-animated::before {
          content: "";
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: conic-gradient(from 0deg, transparent, var(--r), transparent 40%, var(--r), transparent);
          animation: bp-rotate-glow 4s linear infinite;
          pointer-events: none;
          z-index: 1;
        }

        /* Размытие и подложка на ВСЕХ кнопках в интерфейсе */
        .bp-claim-btn, button {
          position: relative;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.05) !important;
          backdrop-filter: blur(14px) saturate(120%) !important;
          -webkit-backdrop-filter: blur(14px) saturate(120%) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }

        .bp-claim-btn{ animation: bp-claim-glow 2.2s ease-in-out infinite; }
        .bp-claim-btn::after{ content:""; position:absolute; inset:0; background:linear-gradient(105deg, transparent 25%, rgba(255,255,255,.16) 50%, transparent 75%); animation:bp-btn-sweep 2.9s ease-in-out infinite; pointer-events:none; }

        .bp-modal-in { animation: bp-modal-in 0.5s cubic-bezier(0.34,1.56,0.64,1) both; }
        .bp-modal-title { animation: bp-glow-title 2.5s ease-in-out infinite; }
        .bp-modal-btn { position:relative; overflow:hidden; }
        .bp-modal-btn::after { content:""; position:absolute; inset:0; background:linear-gradient(105deg,transparent 25%,rgba(255,255,255,.2) 50%,transparent 75%); animation:bp-modal-btn-sweep 2.5s ease-in-out infinite; pointer-events:none; }

        .bp-nft-img { border-radius: 12px !important; }

        /* Жидкое стекло для панелей */
        .bp-glass-panel {
          background: rgba(5, 5, 5, 0.55);
          backdrop-filter: blur(24px) saturate(130%);
          -webkit-backdrop-filter: blur(24px) saturate(130%);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
        }
      ``}</style>

      {/* ─── ФОН СТОРІНКИ (fallback градієнт якщо немає зображення) ─── */}
      {!cfg.banner_url && !cfg.background_url && (
        <div className="absolute inset-0 -z-10 pointer-events-none"
          style={{ background:`linear-gradient(180deg, ${cfg.gradient_from}, ${cfg.gradient_to})` }} />
      )}
      {/* Притемнення поверх банера знизу */}
      {(cfg.banner_url || cfg.background_url) && (
        <div className="absolute inset-0 -z-10 pointer-events-none"
          style={{ background:"linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.35) 50%, rgba(5,5,5,0.75) 80%, rgba(5,5,5,0.95) 100%)" }} />
      )}

      {/* ─── ОСНОВНИЙ КОНТЕНТ (ховаємо поки модалка активна) ─── */}
      <div style={{ visibility: showModal ? "hidden" : "visible", opacity: showModal ? 0 : 1, transition: "opacity 0.4s ease" }}>

      {/* ─── ШАПКА ─── */}
      <div className="relative w-full pt-4">
        <button onClick={() => navigate(-1)}
          className="absolute left-4 top-4 w-9 h-9 rounded-xl flex items-center justify-center z-10"
          style={{ background:"rgba(0,0,0,0.55)",border:"1px solid rgba(255,255,255,0.14)",backdropFilter:"blur(12px)" }}>
          <ChevronLeft className="w-4 h-4 text-white" />
        </button>

        <div className="px-4 pb-4 pt-16 text-center">
          {!cfg.banner_url && !cfg.background_url && (
            <div className="relative inline-flex items-center justify-center mb-4">
              <div className="absolute w-24 h-24 rounded-full pointer-events-none"
                style={{ background:`radial-gradient(circle,rgba(${accentRgb},0.35) 0%,transparent 70%)` }} />
              <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg,rgba(${accentRgb},0.18),rgba(${accentRgb},0.08))`,
                  border: `1.5px solid rgba(${accentRgb},0.4)`,
                  boxShadow: `0 0 28px rgba(${accentRgb},0.35)`,
                }}>
                <Crown className="w-8 h-8" style={{ color:accent }} />
              </div>
            </div>
          )}
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

      {/* ─── КНОПКА КЛЕЙМУ (glass панель) ─── */}
      {!loading && slots.length > 0 && (
        <div className="px-4 mb-4" style={{ animation:"bp-fade-up .4s ease both" }}>
          {canClaim && nextSlot ? (
            <button
              onClick={handleDailyClaim}
              disabled={claiming}
              className="w-full rounded-2xl py-3.5 flex items-center justify-center gap-2 font-black uppercase tracking-widest text-sm transition-all active:scale-[0.98] bp-claim-btn"
              style={{
                background: `linear-gradient(135deg, rgba(${accentRgb},0.35), rgba(${accentRgb},0.18))`,
                border: `1.5px solid rgba(${accentRgb},0.55)`,
                color: accent,
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                "--ag": `rgba(${accentRgb},0.45)`,
              } as any}
            >
              <Gift className="w-4 h-4" />
              {claiming ? "Отримання..." : "Отримати нагороду"}
            </button>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <button
                disabled
                className="w-full rounded-2xl py-3.5 flex items-center justify-center gap-2 font-black uppercase tracking-widest text-sm"
                style={{
                  background: "rgba(0,0,0,0.45)",
                  border: "1.5px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.35)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                }}
              >
                <Gift className="w-4 h-4" />
                {!nextSlot ? "Усі нагороди зібрано" : "Нагорода"}
              </button>
              {nextSlot && (
                <p className="text-[10px] font-semibold" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Отримати завтра
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── ПРОГРЕС (glass панель) ─── */}
      {!loading && (
        <div className="px-4 mb-4" style={{ animation:"bp-fade-up .4s ease both" }}>
          <div className="bp-glass-panel px-4 pt-4 pb-3">
            <ProgressTrack slots={sortedSlots} ownedIds={ownedIds} daysPassed={daysPassed} accent={accent} />
          </div>
        </div>
      )}

      {/* ─── КОНТЕНТ ─── */}
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

          {/* Заголовок + навігація сторінок */}
          <div className="px-4 mb-3 flex items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-[0.15em]"
              style={{ color:"rgba(255,255,255,0.55)" }}>
              Нагороди {page * PAGE_SIZE + 1}–{Math.min((page+1)*PAGE_SIZE, sortedSlots.length)}
            </span>
            <div className="flex-1 h-px"
              style={{ background:"linear-gradient(to right,rgba(255,255,255,0.12),transparent)" }} />
            {/* Кнопки листання */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(p => Math.max(0, p-1))}
                disabled={page === 0}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all active:scale-90"
                style={{
                  background: page === 0 ? "rgba(255,255,255,0.04)" : `rgba(${accentRgb},0.15)`,
                  border: `1px solid ${page === 0 ? "rgba(255,255,255,0.08)" : `rgba(${accentRgb},0.4)`}`,
                  color: page === 0 ? "rgba(255,255,255,0.2)" : accent,
                }}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-bold tabular-nums"
                style={{ color:"rgba(255,255,255,0.4)", minWidth:32, textAlign:"center" }}>
                {page+1}/{totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages-1, p+1))}
                disabled={page >= totalPages-1}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all active:scale-90"
                style={{
                  background: page >= totalPages-1 ? "rgba(255,255,255,0.04)" : `rgba(${accentRgb},0.15)`,
                  border: `1px solid ${page >= totalPages-1 ? "rgba(255,255,255,0.08)" : `rgba(${accentRgb},0.4)`}`,
                  color: page >= totalPages-1 ? "rgba(255,255,255,0.2)" : accent,
                }}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Ряд карток поточної сторінки */}
          <div
            ref={scrollRef}
            className="bp-card-row flex gap-3 overflow-x-auto pb-4"
            style={{ paddingLeft:16, paddingRight:16 }}
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

          {/* Легенда рідкості (glass панель) */}
          <div className="px-4 mt-4 mb-4" style={{ animation:"bp-fade-up .5s ease both",animationDelay:"200ms" }}>
            <div className="bp-glass-panel px-4 py-3">
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
                      {/* Полоска замість круга */}
                      <div style={{ width:16, height:4, borderRadius:999, background:rc.color, boxShadow:`0 0 5px ${rc.glow}` }} />
                      <Icon className="w-3 h-3" style={{ color:rc.color }} />
                      <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color:rc.color }}>{rc.label}</span>
                      <span className="text-[8px]" style={{ color:rc.color+"99" }}>×{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Liquid glass інфо-панель (загальна статистика) */}
          {nick && (
            <div className="px-4 mb-4" style={{ animation:"bp-fade-up .5s ease both",animationDelay:"250ms" }}>
              <div className="bp-glass-panel px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" style={{ color:accent }} />
                  <span className="text-[11px] font-bold" style={{ color:"rgba(255,255,255,0.7)" }}>
                    Твій прогрес
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <p className="text-[13px] font-black tabular-nums" style={{ color:accent }}>{ownedIds.size}</p>
                    <p className="text-[8px] uppercase tracking-wider" style={{ color:"rgba(255,255,255,0.35)" }}>отримано</p>
                  </div>
                  <div className="w-px h-8" style={{ background:"rgba(255,255,255,0.1)" }} />
                  <div className="text-center">
                    <p className="text-[13px] font-black tabular-nums" style={{ color:"rgba(255,255,255,0.5)" }}>{sortedSlots.length - ownedIds.size}</p>
                    <p className="text-[8px] uppercase tracking-wider" style={{ color:"rgba(255,255,255,0.35)" }}>залишилось</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      </div>{/* кінець основного контенту */}

      {/* SVG для анімованої рамки (глобальний defs) */}
      <svg width="0" height="0" style={{ position:"absolute" }}>
        <defs>
          <filter id="bp-glow-filter">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
      </svg>
    </div>
  );
};

/* Animated border uses inline SVG per card — rendered inside .bp-anim-border via CSS animation */
// The actual SVG is injected in SlotCard below
const SlotCardWithSVGBorder = SlotCard;

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
