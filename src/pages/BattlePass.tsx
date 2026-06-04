import { useState, useEffect, useRef, useCallback } from "react";
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
  season_name:     string;
  banner_url?:     string;
  background_url?: string;
  gradient_from:   string;
  gradient_to:     string;
  accent_color:    string;
  level_color?:    string;
  description?:    string;
  season_start?:   string;
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
  common: {
    label: "Звичайний", color: "#e2e8f0", glow: "rgba(226,232,240,0.4)",
    rgb: "226,232,240", border: "rgba(226,232,240,0.2)", icon: Star,
  },
  rare: {
    label: "Рідкісний", color: "#3b82f6", glow: "rgba(59,130,246,0.6)",
    rgb: "59,130,246", border: "rgba(59,130,246,0.35)", icon: Zap,
  },
  legendary: {
    label: "Легендарний", color: "#ffaa00", glow: "rgba(255,170,0,0.85)",
    rgb: "255,170,0", border: "rgba(255,170,0,0.5)", icon: Trophy,
  },
  mythic: {
    label: "Міфічний", color: "#ff0055", glow: "rgba(255,0,85,0.95)",
    rgb: "255,0,85", border: "rgba(255,0,85,0.6)", icon: Flame,
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
  return `${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)}`;
}

const todayKey = () => new Date().toISOString().slice(0,10);

/* ─────────────────────────────────────────────────────────────────
   ГЛОБАЛЬНЫЕ СТИЛИ — инжектируем один раз.
   Лазерная рамка: точь-в-точь механика из тест.html
   - div.bp-laser-* = позиционированный слой с overflow:hidden
   - mask-composite:exclude = оставляем только кольцо-рамку
   - filter:drop-shadow на div = ядерный glow наружу
   - ::before = огромный блок 220%×220% с conic-gradient, вращается
   - filter:blur(2px) на ::before = мягкий край луча
   Ползунок: thumb обновляется напрямую через DOM ref — 0 setState → 0 дёрганий
───────────────────────────────────────────────────────────────── */
const GLOBAL_CSS = `
  /* ── ЛАЗЕР: базовый слой (кольцо через mask-composite) ── */
  .bp-laser {
    position: absolute;
    top: -2px; left: -2px;
    width: calc(100% + 4px);
    height: calc(100% + 4px);
    border-radius: 20px;
    z-index: 20;
    pointer-events: none;
    overflow: hidden;
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    padding: 4px;
    box-sizing: border-box;
  }

  /* ::before — огромный вращающийся блок с conic-gradient */
  .bp-laser::before {
    content: '';
    position: absolute;
    top: -60%; left: -60%;
    width: 220%; height: 220%;
    filter: blur(2px);
    animation: bp-rotate 5s linear infinite;
  }

  /* LEGENDARY: золото, 5s */
  .bp-laser-legendary {
    filter:
      drop-shadow(0 0 8px #ffaa00)
      drop-shadow(0 0 20px #ffaa00)
      drop-shadow(0 0 45px #ff8800)
      drop-shadow(0 0 70px #ffaa00);
  }
  .bp-laser-legendary::before {
    background: conic-gradient(
      from 0deg,
      #ffaa00 0deg,   #ffe066 35deg,  #ffaa00 70deg,
      transparent 100deg, transparent 180deg,
      #ffaa00 180deg, #ffe066 215deg, #ffaa00 250deg,
      transparent 280deg, transparent 360deg
    );
    animation-duration: 5s;
  }

  /* MYTHIC: красный/розовый, 3.2s (быстрее = мощнее) */
  .bp-laser-mythic {
    filter:
      drop-shadow(0 0 8px #ff0055)
      drop-shadow(0 0 20px #ff0055)
      drop-shadow(0 0 45px #cc0044)
      drop-shadow(0 0 70px #ff0055);
  }
  .bp-laser-mythic::before {
    background: conic-gradient(
      from 0deg,
      #ff0055 0deg,   #ff66aa 35deg,  #ff0055 70deg,
      transparent 100deg, transparent 180deg,
      #ff0055 180deg, #ff66aa 215deg, #ff0055 250deg,
      transparent 280deg, transparent 360deg
    );
    animation-duration: 3.2s;
  }

  @keyframes bp-rotate {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }

  /* ── Cards ── */
  .bp-card { will-change: transform, opacity; }
  .bp-card:hover  { transform: translateY(-7px) scale(1.03) !important; }
  .bp-card:active { transform: translateY(-1px) scale(0.99) !important; }

  /* ── Scroll row ── */
  .bp-card-row {
    display: flex; gap: 14px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch; scrollbar-width: none;
    padding-bottom: 16px; padding-top: 8px;
    scroll-behavior: auto;
  }
  .bp-card-row::-webkit-scrollbar { display: none; }

  /* ── Scrollbar ── */
  .bp-track {
    position: relative; height: 4px; border-radius: 999px;
    background: rgba(255,255,255,0.07); cursor: pointer; user-select: none;
  }
  .bp-thumb {
    position: absolute; top: 0; height: 100%;
    border-radius: 999px; cursor: grab;
    transition: height 0.15s, top 0.15s;
  }
  .bp-track:hover .bp-thumb { height: 6px; top: -1px; }
  .bp-thumb:active { cursor: grabbing; }

  /* ── Glass ── */
  .bp-glass {
    background: rgba(10,11,18,0.55) !important;
    backdrop-filter: blur(20px) saturate(150%) !important;
    -webkit-backdrop-filter: blur(20px) saturate(150%) !important;
    border: 1px solid rgba(255,255,255,0.09) !important;
    box-shadow: 0 15px 35px -5px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.1);
  }

  /* ── Modal ── */
  .bp-modal-in { animation: _bpmi 0.5s cubic-bezier(0.34,1.56,0.64,1) both; }
  @keyframes _bpmi {
    from { opacity:0; transform:scale(0.9) translateY(30px); }
    to   { opacity:1; transform:scale(1)   translateY(0); }
  }
`;

let _injected = false;
function useGlobalStyles() {
  if (!_injected && typeof document !== "undefined") {
    const el = document.createElement("style");
    el.textContent = GLOBAL_CSS;
    document.head.appendChild(el);
    _injected = true;
  }
}

/* ─────────────────────────────────────────────────────────────────
   SLOT CARD
   ВАЖНО: на корневом div карточки НЕТ overflow:hidden —
   иначе лазерный слой с top:-2px/left:-2px обрежется.
───────────────────────────────────────────────────────────────── */
const SlotCard = ({
  slot, owned, isToday, daysPassed, levelColor, visible,
}: {
  slot: BattlePassSlot; owned: boolean; isToday: boolean;
  daysPassed: number; levelColor: string; visible: boolean;
}) => {
  const cfg      = RARITY_CONFIG[slot.rarity];
  const Icon     = cfg.icon;
  const locked   = slot.slot_number > daysPassed + 1 && !owned;
  const isLaser  = slot.rarity === "legendary" || slot.rarity === "mythic";
  const isNft    = slot.prize_type === "nft";

  return (
    <div
      className="bp-card relative flex-shrink-0 rounded-2xl group"
      style={{
        width: 142,
        /* НЕТ overflow:hidden — лазерный слой должен выходить за края */
        /* Чёрная подложка — как в тест.html */
        background: "#000",
        opacity:   visible ? (locked ? 0.45 : 1) : 0,
        transform: visible
          ? (isToday ? "scale(1.04) translateY(0)" : "scale(1) translateY(0)")
          : "translateY(28px) scale(0.94)",
        transition: "opacity 0.45s cubic-bezier(0.22,1,0.36,1), transform 0.45s cubic-bezier(0.22,1,0.36,1)",
        border: `1px solid ${locked ? "rgba(255,255,255,0.06)" : cfg.border}`,
        boxShadow: locked
          ? "none"
          : isLaser
            ? "0 10px 30px -5px rgba(0,0,0,0.7), inset 0 1px 1px rgba(255,255,255,0.1)"
            : `0 10px 25px -5px rgba(0,0,0,0.5), 0 0 14px -3px ${cfg.glow}, inset 0 1px 1px rgba(255,255,255,0.1)`,
      }}
    >
      {/* ── ЛАЗЕРНАЯ РАМКА — точь-в-точь механика тест.html ── */}
      {isLaser && !locked && (
        <div className={`bp-laser bp-laser-${slot.rarity}`} />
      )}

      {/* Внутренняя подложка с градиентом (как card-content в тест.html) */}
      <div style={{
        position: "absolute", top: 3, left: 3, right: 3, bottom: 3,
        borderRadius: 13,
        background: locked
          ? "rgba(10,10,15,0.95)"
          : `linear-gradient(145deg, rgba(${cfg.rgb},0.10), rgba(6,6,10,0.96))`,
        zIndex: 1,
      }} />

      {/* Верхний глянцевый блик */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/[0.06] to-transparent pointer-events-none z-10 h-1/2" />

      {/* ── ПОЛОСКА РАРНОСТИ — верхний левый угол, горизонтальные пилюли ── */}
      <div style={{
        position: "absolute", top: 10, left: 10, zIndex: 30,
        display: "flex", flexDirection: "column", gap: 4,
      }}>
        <div style={{
          width: 28, height: 4, borderRadius: 999,
          background: cfg.color, opacity: locked ? 0.25 : 1,
          boxShadow: locked ? "none" : `0 0 8px 1px ${cfg.color}, 0 0 16px ${cfg.glow}`,
        }} />
        <div style={{
          width: 18, height: 4, borderRadius: 999,
          background: cfg.color, opacity: locked ? 0.15 : 0.6,
          boxShadow: locked ? "none" : `0 0 6px ${cfg.color}`,
        }} />
      </div>

      {/* Статус-бейдж */}
      <div className="absolute top-2.5 right-2.5 z-30">
        {owned ? (
          <div className="rounded-full p-0.5"
            style={{ background:"rgba(0,0,0,0.6)", border:`1px solid ${cfg.color}44` }}>
            <CheckCircle2 className="w-3.5 h-3.5 animate-pulse" style={{ color:cfg.color }} />
          </div>
        ) : locked ? (
          <div className="rounded-full p-0.5 bg-black/40">
            <Lock className="w-3 h-3 text-white/30" />
          </div>
        ) : isToday ? (
          <span
            className="text-[7px] font-black px-1.5 py-0.5 rounded-md tracking-wider animate-bounce"
            style={{ background:`linear-gradient(90deg,#fff,${cfg.color})`, color:"#000", boxShadow:`0 0 12px ${cfg.color}` }}>
            СЬОГОДНІ
          </span>
        ) : null}
      </div>

      {/* Изображение */}
      <div
        className="relative w-full overflow-hidden mt-2 flex items-center justify-center group-hover:scale-105 transition-transform duration-300"
        style={{ height: 104 }}
      >
        {slot.image_url ? (
          isNft ? (
            <div style={{
              width: 86, height: 86, borderRadius: 12, overflow: "hidden", flexShrink: 0,
              border: `1.5px solid rgba(${cfg.rgb},0.3)`,
              boxShadow: locked ? "none" : `0 0 0 1px rgba(${cfg.rgb},0.1), 0 4px 16px rgba(${cfg.rgb},0.25)`,
            }}>
              <img src={slot.image_url} alt={slot.title}
                style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"center",
                  filter: locked ? "grayscale(1) brightness(0.25)" : "none" }} />
            </div>
          ) : (
            <img src={slot.image_url} alt={slot.title} style={{
              width:"100%", height:"100%", objectFit:"contain", objectPosition:"center", padding:6,
              filter: locked
                ? "grayscale(1) brightness(0.25)"
                : owned
                  ? `drop-shadow(0 4px 12px rgba(${cfg.rgb},0.5))`
                  : `drop-shadow(0 4px 10px rgba(${cfg.rgb},0.3))`,
            }} />
          )
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-1.5">
            <span style={{ fontSize:36, opacity:locked?0.2:1,
              filter:locked?"none":`drop-shadow(0 0 12px ${cfg.color}88)` }}>
              {slot.prize_type==="cr"?"💰":slot.prize_type==="nft"?"🎁":slot.prize_type==="car"?"🚗":"✨"}
            </span>
            <Icon className="w-3.5 h-3.5 opacity-60" style={{ color:cfg.color }} />
          </div>
        )}
      </div>

      {/* Текст */}
      <div className="px-2.5 pt-1 pb-2 relative z-20 text-center">
        <p className="text-[10px] font-bold leading-tight line-clamp-2 min-h-[24px] tracking-wide"
          style={{ color:locked?"rgba(255,255,255,0.25)":"#ffffff" }}>
          {slot.title || "Приз"}
        </p>
        {slot.prize_type==="cr" && slot.prize_value && (
          <p className="text-[9px] mt-1 font-black tracking-wider text-amber-400">{slot.prize_value} CR</p>
        )}
        {slot.prize_type==="car" && slot.car_name && (
          <p className="text-[9px] mt-1 font-black tracking-wide truncate" style={{ color:cfg.color }}>
            🚗 {slot.car_name}
          </p>
        )}
      </div>

      {/* Уровень */}
      <div className="relative pb-3.5 pt-1 flex items-center justify-center">
        <div className="absolute left-4 right-4 h-[1px]"
          style={{ background:`linear-gradient(90deg,transparent,${cfg.color}55,transparent)` }} />
        <div className="relative rounded-xl flex items-center justify-center font-black tabular-nums"
          style={{
            width:26, height:26,
            background:"linear-gradient(135deg,#0f1016,#050508)",
            border:`1.5px solid ${cfg.color}`,
            color:"#ffffff", fontSize:10,
            boxShadow: locked?"none":`0 0 10px ${cfg.glow},inset 0 1px 3px rgba(0,0,0,0.8)`,
            opacity: locked?0.4:1,
          }}>
          {slot.slot_number}
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────
   PROGRESS
───────────────────────────────────────────────────────────────── */
const ProgressTrack = ({ slots, ownedIds, daysPassed, accent }: {
  slots: BattlePassSlot[]; ownedIds: Set<number>; daysPassed: number; accent: string;
}) => {
  const pct = slots.length > 0 ? (ownedIds.size / slots.length) * 100 : 0;
  return (
    <div className="px-2 mb-2 w-full">
      <div className="flex justify-between items-center mb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-lg bg-white/5 border border-white/10">
            <Calendar className="w-3.5 h-3.5" style={{ color:accent }} />
          </div>
          <span className="text-[10px] uppercase tracking-[0.2em] font-black text-white/70">
            День {Math.min(daysPassed, slots.length)} з {slots.length}
          </span>
        </div>
        <div className="px-2.5 py-0.5 rounded-md bg-white/5 border border-white/10">
          <span className="text-[10px] font-black tracking-widest tabular-nums" style={{ color:accent }}>
            {ownedIds.size} / {slots.length} отримано
          </span>
        </div>
      </div>
      <div className="h-2.5 rounded-full bg-black/50 p-[2px] border border-white/5 shadow-inner overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000"
          style={{ width:`${pct}%`, background:`linear-gradient(90deg,${accent}88,${accent})`, boxShadow:`0 0 12px ${accent}` }} />
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────
   WELCOME MODAL
───────────────────────────────────────────────────────────────── */
const WelcomeModal = ({ bannerUrl, seasonName, accent, onClose }: {
  bannerUrl?: string; seasonName: string; accent: string; onClose: () => void;
}) => {
  const ar = hexToRgb(accent);
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4"
      style={{ background:"rgba(2,2,5,0.82)", backdropFilter:"blur(24px)" }}
      onClick={onClose}>
      <div className="relative w-full max-w-sm rounded-3xl overflow-hidden bp-modal-in bp-glass"
        style={{ border:`1px solid rgba(${ar},0.25)`,
          boxShadow:`0 25px 60px -15px rgba(0,0,0,0.9),0 0 50px rgba(${ar},0.15),inset 0 1px 2px rgba(255,255,255,0.15)` }}
        onClick={e => e.stopPropagation()}>
        <div className="absolute top-0 left-0 right-0 h-[2px] pointer-events-none animate-pulse"
          style={{ background:`linear-gradient(90deg,transparent,rgba(168,85,247,0.8),rgba(${ar},0.8),transparent)` }} />
        {bannerUrl && (
          <div className="relative w-full" style={{ height:180 }}>
            <img src={bannerUrl} alt="" className="w-full h-full object-cover object-center" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-[#07070c]" />
          </div>
        )}
        <div className="px-6 pt-5 pb-7 text-center flex flex-col items-center gap-3 relative z-10">
          <p className="text-[10px] uppercase tracking-[0.3em] font-black animate-pulse" style={{ color:"#c084fc" }}>новий сезон</p>
          <h2 className="text-xl font-black uppercase tracking-[0.12em] leading-tight"
            style={{ color:"#ffffff", textShadow:`0 0 20px rgba(${ar},0.6),0 2px 10px rgba(0,0,0,0.9)` }}>
            СЕЗОН "ЛІТО 2026"<br />ВЖЕ РОЗПОЧАТО!
          </h2>
          <p className="text-[12px] font-semibold tracking-[0.08em] text-white/50">Доєднуйся!</p>
          <button onClick={onClose}
            className="relative mt-2 w-full rounded-xl py-3.5 font-black uppercase tracking-[0.2em] text-xs transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            style={{ background:`linear-gradient(135deg,rgba(168,85,247,0.4),rgba(${ar},0.2))`,
              border:"1px solid rgba(168,85,247,0.5)", color:"#ffffff",
              boxShadow:"0 0 20px rgba(168,85,247,0.3),inset 0 1px 1px rgba(255,255,255,0.2)" }}>
            ПОЧАТИ!
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────
   MAIN
───────────────────────────────────────────────────────────────── */
const BattlePass = () => {
  useGlobalStyles();
  const navigate = useNavigate();
  const nick = localStorage.getItem("crp_nick") || "";

  const [cfg,       setCfg]       = useState<BattlePassConfig>(DEFAULT_CONFIG);
  const [slots,     setSlots]     = useState<BattlePassSlot[]>([]);
  const [rewards,   setRewards]   = useState<BattlePassReward[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [claiming,  setClaiming]  = useState(false);
  const [nftMap,    setNftMap]    = useState<Record<string, string>>({});
  const [showModal, setShowModal] = useState(false);
  const [visibleIds,setVisibleIds]= useState<Set<number>>(new Set());

  const scrollRef  = useRef<HTMLDivElement>(null);
  const trackRef   = useRef<HTMLDivElement>(null);
  const thumbRef   = useRef<HTMLDivElement>(null);  // DOM ref для ползунка — без setState
  const isDragging = useRef(false);

  const claimKey = `bp_last_claim_${nick}`;
  const [lastClaim, setLastClaim] = useState<string>(() => localStorage.getItem(claimKey) || "");

  const getDaysPassed = (s?: string) =>
    s ? Math.max(0, Math.floor((Date.now() - new Date(s).getTime()) / 86_400_000)) : 0;
  const daysPassed = getDaysPassed(cfg.season_start);

  useEffect(() => {
    (async () => {
      const [cfgR, slotsR, rewR, nftsR] = await Promise.all([
        dbSelect("battlepass_config", { limit: 1 }),
        dbSelect("battlepass_slots",  { order: { col:"slot_number", dir:"asc" } }),
        nick
          ? dbSelect("battlepass_rewards", { filters: [{ col:"username", op:"ilike", value:nick }] })
          : Promise.resolve({ data:[], error:null }),
        dbSelect("nft_gifts", {}).catch(() => ({ data:[], error:null })),
      ]);
      const row = (cfgR.data as any[])?.[0];
      if (row) setCfg({ ...DEFAULT_CONFIG, ...row });
      setSlots((slotsR.data  as any[]) || []);
      setRewards((rewR.data  as any[]) || []);

      const map: Record<string, string> = {};
      for (const n of (nftsR?.data as any[]) || []) {
        const img = n.image_url || n.image || n.img || n.url || n.picture || "";
        if (img && n.id != null)      map[String(n.id)]      = img;
        if (img && n.gift_id != null) map[String(n.gift_id)] = img;
        if (img && n.name)            map[String(n.name)]    = img;
      }
      setNftMap(map);
      setLoading(false);

      const sid = row?.id || row?.season_name || "default";
      if (localStorage.getItem("bp_season_seen") !== String(sid)) {
        localStorage.setItem("bp_season_seen", String(sid));
        setTimeout(() => setShowModal(true), 150);
      }
    })();
  }, [nick]);

  /* Staggered reveal */
  useEffect(() => {
    if (loading || slots.length === 0) return;
    const container = scrollRef.current;
    if (!container) return;
    const cards = container.querySelectorAll<HTMLElement>("[data-slot-id]");
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const id  = Number((e.target as HTMLElement).dataset.slotId);
          const off = Math.max(0, e.boundingClientRect.left - container.getBoundingClientRect().left);
          setTimeout(() => setVisibleIds(p => { const n = new Set(p); n.add(id); return n; }),
            Math.min(off / 1200 * 120, 200));
          obs.unobserve(e.target);
        }
      });
    }, { root:container, threshold:0.1 });
    cards.forEach(c => obs.observe(c));
    return () => obs.disconnect();
  }, [loading, slots]);

  const thumbPctRef = useRef(20);

  /* ── Ползунок: thumb напрямую в DOM, без setState ── */
  const updateThumb = useCallback(() => {
    const el    = scrollRef.current;
    const thumb = thumbRef.current;
    if (!el || !thumb) return;
    const max  = el.scrollWidth - el.clientWidth;
    if (max <= 0) return;
    const pct  = el.scrollLeft / max;
    const tpct = Math.max(10, (el.clientWidth / el.scrollWidth) * 100);
    thumbPctRef.current = tpct;
    thumb.style.width = `${tpct}%`;
    thumb.style.left  = `${pct * (100 - tpct)}%`;
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateThumb, { passive: true });
    window.addEventListener("resize", updateThumb);
    // задержка чтобы DOM успел посчитать scrollWidth после рендера карточек
    const t = setTimeout(updateThumb, 60);
    return () => {
      el.removeEventListener("scroll", updateThumb);
      window.removeEventListener("resize", updateThumb);
      clearTimeout(t);
    };
  }, [loading, updateThumb]);

  /* Drag по треку — прямой расчёт без RAF, thumb обновится сам через scroll event */
  const applyDrag = useCallback((clientX: number) => {
    const track   = trackRef.current;
    const scroller = scrollRef.current;
    if (!track || !scroller) return;
    const rect   = track.getBoundingClientRect();
    const tpct   = thumbPctRef.current;
    const thumbW = rect.width * tpct / 100;
    const usable = rect.width - thumbW;
    if (usable <= 0) return;
    const raw = (clientX - rect.left - thumbW / 2) / usable;
    scroller.scrollLeft = Math.max(0, Math.min(1, raw)) * (scroller.scrollWidth - scroller.clientWidth);
  }, []);

  const onPD = (e: React.PointerEvent) => {
    e.preventDefault();
    isDragging.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    applyDrag(e.clientX);
  };
  const onPM = (e: React.PointerEvent) => { if (isDragging.current) applyDrag(e.clientX); };
  const onPU = () => { isDragging.current = false; };

  const ownedIds    = new Set(rewards.map(r => r.slot_id));
  const accent      = cfg.accent_color || "#ffaa00";
  const accentRgb   = hexToRgb(accent);
  const levelColor  = cfg.level_color  || "#38bdf8";
  const sortedSlots = [...slots].sort((a,b) => a.slot_number - b.slot_number);
  const canClaim    = !!nick && lastClaim !== todayKey();
  const nextSlot    = sortedSlots.find(s => !ownedIds.has(s.id));

  const handleClaim = async () => {
    if (!nick)     { toast.error("Увійди в аккаунт"); return; }
    if (!canClaim) { toast("Сьогодні вже отримано"); return; }
    if (!nextSlot) { toast.success("Усі нагороди зібрано!"); return; }
    setClaiming(true);
    try {
      const p = {
        username: nick, slot_id: nextSlot.id, rarity: nextSlot.rarity,
        prize_type: nextSlot.prize_type, prize_value: nextSlot.prize_value ?? null,
        image_url: nextSlot.image_url ?? null, car_name: nextSlot.car_name ?? null,
        claimed_at: new Date().toISOString(),
      };
      const { error } = await dbInsert("battlepass_rewards", [p]);
      if (error) throw error;
      const today = todayKey();
      localStorage.setItem(claimKey, today);
      setLastClaim(today);
      setRewards(r => [...r, p as any]);
      toast.success(`+1 рівень: ${nextSlot.title || "Нагорода"}`);
    } catch (e: any) {
      toast.error(e?.message || "Помилка");
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="min-h-screen pb-24 relative overflow-x-hidden text-white" style={{
      background: (cfg.banner_url || cfg.background_url) ? undefined : "#040406",
      ...((cfg.banner_url || cfg.background_url) ? {
        backgroundImage:`url(${cfg.banner_url || cfg.background_url})`,
        backgroundSize:"cover", backgroundPosition:"center top", backgroundAttachment:"fixed",
      } : {}),
    }}>
      {showModal && (
        <WelcomeModal bannerUrl={cfg.banner_url||cfg.background_url}
          seasonName={cfg.season_name} accent={accent} onClose={() => setShowModal(false)} />
      )}

      {!cfg.banner_url && !cfg.background_url && (
        <div className="absolute inset-0 -z-10 pointer-events-none"
          style={{ background:`linear-gradient(180deg,${cfg.gradient_from},${cfg.gradient_to})` }} />
      )}
      {(cfg.banner_url || cfg.background_url) && (
        <div className="absolute inset-0 -z-10 pointer-events-none"
          style={{ background:"linear-gradient(180deg,rgba(2,2,5,0.2) 0%,rgba(3,3,6,0.5) 40%,rgba(4,4,7,0.85) 70%,#040406 100%)" }} />
      )}

      {/* HEADER */}
      <div className="relative w-full pt-4 max-w-5xl mx-auto">
        <button onClick={() => navigate(-1)}
          className="absolute left-4 top-4 w-10 h-10 rounded-xl flex items-center justify-center z-10 transition-all duration-300 hover:bg-white/10 active:scale-90"
          style={{ background:"rgba(10,11,18,0.6)", border:"1px solid rgba(255,255,255,0.12)",
            backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)" }}>
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <div className="px-4 pb-4 pt-16 text-center">
          {!cfg.banner_url && !cfg.background_url && (
            <div className="relative inline-flex items-center justify-center mb-4">
              <div className="absolute w-28 h-28 rounded-full pointer-events-none blur-xl"
                style={{ background:`radial-gradient(circle,rgba(${accentRgb},0.4) 0%,transparent 70%)` }} />
              <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background:`linear-gradient(135deg,rgba(${accentRgb},0.2),rgba(${accentRgb},0.05))`,
                  border:`1px solid rgba(${accentRgb},0.45)`,
                  boxShadow:`0 0 30px rgba(${accentRgb},0.25),inset 0 1px 1px rgba(255,255,255,0.1)` }}>
                <Crown className="w-8 h-8 animate-pulse" style={{ color:accent }} />
              </div>
            </div>
          )}
          <h1 className="text-3xl font-black uppercase tracking-[0.22em] text-transparent bg-clip-text"
            style={{ backgroundImage:`linear-gradient(135deg,#ffffff 30%,${accent})`,
              filter:`drop-shadow(0 2px 15px rgba(${accentRgb},0.5))` }}>
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
        {/* CLAIM */}
        {!loading && slots.length > 0 && (
          <div className="px-4 mb-4">
            {canClaim && nextSlot ? (
              <button onClick={handleClaim} disabled={claiming}
                className="w-full rounded-2xl py-4 flex items-center justify-center gap-2.5 font-black uppercase tracking-[0.18em] text-xs transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                style={{ background:`linear-gradient(135deg,rgba(${accentRgb},0.4),rgba(${accentRgb},0.15))`,
                  border:`1px solid rgba(${accentRgb},0.6)`, color:"#ffffff",
                  boxShadow:`0 0 20px rgba(${accentRgb},0.3)` }}>
                <Gift className="w-4 h-4" style={{ color:accent }} />
                <span>{claiming ? "Отримання..." : "Отримати нагороду"}</span>
              </button>
            ) : (
              <div className="flex flex-col items-center gap-1.5">
                <button disabled
                  className="w-full rounded-2xl py-4 flex items-center justify-center gap-2.5 font-black uppercase tracking-[0.18em] text-xs border border-white/5 bg-black/40 text-white/30"
                  style={{ backdropFilter:"blur(8px)" }}>
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

        {/* PROGRESS */}
        {!loading && (
          <div className="px-4 mb-5">
            <div className="bp-glass px-4 py-4 rounded-2xl">
              <ProgressTrack slots={sortedSlots} ownedIds={ownedIds} daysPassed={daysPassed} accent={accent} />
            </div>
          </div>
        )}
      </div>

      {/* CARDS */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor:`rgba(${accentRgb},0.15)`, borderTopColor:accent }} />
        </div>
      ) : slots.length === 0 ? (
        <div className="text-center py-20 bg-black/20 border border-white/5 max-w-sm mx-auto rounded-2xl"
          style={{ backdropFilter:"blur(12px)" }}>
          <Crown className="w-12 h-12 mx-auto mb-3 text-white/10" />
          <p className="text-sm font-medium text-white/30 tracking-wider">Батлпас поки не налаштований</p>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto w-full">
          <div className="px-5 mb-3">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
              Всі нагороди · свайп →
            </span>
          </div>

          <div ref={scrollRef} className="bp-card-row" style={{ paddingLeft:20, paddingRight:20 }}>
            {sortedSlots.map(slot => {
              const img =
                slot.image_url ||
                (slot.prize_type === "nft"
                  ? (slot.nft_gift_id ? nftMap[String(slot.nft_gift_id)] : "") ||
                    (slot.title ? nftMap[String(slot.title)] : "")
                  : "") || "";
              return (
                <div key={slot.id} data-slot-id={slot.id}>
                  <SlotCard
                    slot={{ ...slot, image_url: img }}
                    owned={ownedIds.has(slot.id)}
                    isToday={slot.slot_number === daysPassed}
                    daysPassed={daysPassed}
                    levelColor={levelColor}
                    visible={visibleIds.has(slot.id)}
                  />
                </div>
              );
            })}
          </div>

          {/* ПОЛЗУНОК — thumb через DOM ref, 0 ре-рендеров */}
          <div className="px-5 mt-2 mb-6">
            <div
              ref={trackRef}
              className="bp-track"
              onPointerDown={onPD}
              onPointerMove={onPM}
              onPointerUp={onPU}
              onPointerCancel={onPU}
            >
              <div
                ref={thumbRef}
                className="bp-thumb"
                style={{
                  width: "20%",
                  left: "0%",
                  background: `linear-gradient(90deg,rgba(${accentRgb},0.5),${accent})`,
                  boxShadow: `0 0 10px rgba(${accentRgb},0.7), 0 0 3px rgba(${accentRgb},0.9)`,
                }}
              />
            </div>
          </div>

          <div className="max-w-md mx-auto w-full px-4">
            {/* Rarity legend */}
            <div className="mb-4">
              <div className="bp-glass px-4 py-3.5 rounded-2xl">
                <p className="text-[8px] font-black uppercase tracking-[0.25em] mb-2.5 text-white/30">Рідкості</p>
                <div className="grid grid-cols-2 gap-2">
                  {(["common","rare","legendary","mythic"] as Rarity[]).map(r => {
                    const rc = RARITY_CONFIG[r]; const RI = rc.icon;
                    const count = sortedSlots.filter(s => s.rarity === r).length;
                    return (
                      <div key={r} className="flex items-center justify-between rounded-xl px-2.5 py-2 border border-white/[0.04] bg-white/[0.02]">
                        <div className="flex items-center gap-2">
                          <div style={{ width:12, height:3, borderRadius:999, background:rc.color, boxShadow:`0 0 6px ${rc.color}` }} />
                          <RI className="w-3.5 h-3.5 opacity-80" style={{ color:rc.color }} />
                          <span className="text-[9px] font-black uppercase tracking-wider" style={{ color:rc.color }}>{rc.label}</span>
                        </div>
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-black/30" style={{ color:rc.color }}>×{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {nick && (
              <div className="mb-4">
                <div className="bp-glass px-4 py-3.5 flex items-center justify-between rounded-2xl">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-xl bg-white/5 border border-white/10">
                      <ShieldCheck className="w-4 h-4" style={{ color:accent }} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/70">Твій прогрес</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-sm font-black tabular-nums" style={{ color:accent }}>{ownedIds.size}</p>
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
  );
};

export const BattlePassCarCard = ({ reward }: { reward: BattlePassReward }) => {
  const cfg     = RARITY_CONFIG[reward.rarity];
  const carName = reward.car_name || reward.prize_value || "АВТО";
  const Icon    = cfg.icon;
  return (
    <div className="relative w-full rounded-2xl overflow-hidden"
      style={{ backdropFilter:"blur(20px)", border:`1px solid ${cfg.border}`,
        boxShadow:`0 15px 35px rgba(0,0,0,0.6),0 0 25px ${cfg.glow},inset 0 1px 1px rgba(255,255,255,0.15)`,
        background:`radial-gradient(circle at 10% 10%,rgba(${cfg.rgb},0.15) 0%,rgba(6,6,10,0.92) 80%)` }}>
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/[0.05] to-transparent pointer-events-none h-1/2" />
      <div className="relative p-4 z-10">
        {reward.image_url ? (
          <div className="overflow-hidden rounded-xl bg-black/40 border border-white/5 mb-3.5">
            <img src={reward.image_url} alt={carName}
              className="w-full object-cover hover:scale-105 transition-transform duration-500" style={{ height:140 }} />
          </div>
        ) : (
          <div className="flex items-center justify-center mb-3.5 rounded-xl bg-black/30 border border-dashed border-white/10" style={{ height:120 }}>
            <span className="text-4xl"></span>
          </div>
        )}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1.5">
            <Icon className="w-3.5 h-3.5" style={{ color:cfg.color }} />
            <span className="text-[8px] font-black uppercase tracking-[0.25em]" style={{ color:cfg.color }}>{cfg.label}</span>
          </div>
          <p className="text-base font-black uppercase tracking-wider truncate text-white"
            style={{ textShadow:`0 0 10px ${cfg.glow}` }}>{carName}</p>
        </div>
      </div>
    </div>
  );
};

export default BattlePass;
