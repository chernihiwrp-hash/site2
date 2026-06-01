import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { dbSelect, dbInsert } from "../lib/db";
import { toast } from "sonner";
import {
  Star, Zap, Trophy, Crown, Flame, ChevronLeft, Lock, CheckCircle2,
  Calendar, ShieldCheck, Gift, ChevronRight,
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
const PAGE_SIZE = 7;

/* ───────────────── WELCOME MODAL ───────────────── */
const WelcomeModal = ({ bannerUrl, seasonName, accent, onClose }: any) => {
  const accentRgb = hexToRgb(accent);
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(24px)" }}
      onClick={onClose}>
      <div className="relative w-full max-w-sm rounded-3xl overflow-hidden bp-modal-in bp-glass-panel"
        style={{ border: `1px solid rgba(${accentRgb},0.3)` }}
        onClick={e => e.stopPropagation()}>
        {bannerUrl && (
          <div className="relative w-full h-44">
            <img src={bannerUrl} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] to-transparent" />
          </div>
        )}
        <div className="px-6 py-8 text-center">
            <p className="text-[10px] uppercase tracking-[0.3em] text-purple-400 font-bold mb-2">Новий Сезон</p>
            <h2 className="text-2xl font-black uppercase tracking-wider text-white mb-6 bp-modal-title">
              {seasonName}
            </h2>
            <button onClick={onClose} className="w-full py-4 rounded-xl font-bold uppercase tracking-widest text-sm bp-claim-btn"
              style={{ background: accent, color: '#000', '--ag': `rgba(${accentRgb},0.5)` } as any}>
              Почати пригоду
            </button>
        </div>
      </div>
    </div>
  );
};

/* ───────────────────────────── SLOT CARD ─────────────────────────── */
const SlotCard = ({ slot, owned, isToday, daysPassed, glass, levelColor }: any) => {
  const cfg = RARITY_CONFIG[slot.rarity as Rarity];
  const locked = slot.slot_number > daysPassed + 1 && !owned;
  const isAnimated = slot.rarity === "legendary" || slot.rarity === "mythic";
  const isNft = slot.prize_type === "nft";

  return (
    <div
      className={`bp-card relative flex-shrink-0 rounded-2xl transition-all duration-300 overflow-hidden
        ${locked ? "opacity-50" : "opacity-100"}
        bp-card-dark-glass`}
      style={{
        width: 150,
        height: 220,
        border: `1px solid ${isAnimated ? 'transparent' : 'rgba(255,255,255,0.1)'}`,
        transform: isToday ? "scale(1.05)" : "scale(1)",
        zIndex: isToday ? 10 : 1
      }}
    >
      {/* Animated Neon Border (as requested in the image) */}
      {isAnimated && !locked && (
        <div className="absolute inset-0 pointer-events-none z-10">
           <svg className="absolute inset-0 w-full h-full">
              <rect x="0" y="0" width="100%" height="100%" rx="16" fill="none" 
                    stroke={cfg.color} strokeWidth="4" className="bp-neon-rect"
                    style={{ filter: `drop-shadow(0 0 8px ${cfg.color})` }} />
           </svg>
        </div>
      )}

      {/* Rarity Bar */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 rounded-full z-20"
           style={{ background: cfg.color, boxShadow: `0 0 10px ${cfg.color}` }} />

      {/* Image Container */}
      <div className="h-32 flex items-center justify-center p-4 relative z-0">
        <img src={slot.image_url} alt="" 
             className={`max-w-full max-h-full object-contain ${owned ? 'grayscale-0' : 'grayscale'}`}
             style={{ filter: owned ? `drop-shadow(0 0 15px ${cfg.glow})` : 'none' }} />
      </div>

      {/* Bottom Info Bar (Reference Style) */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-md p-2 border-t border-white/10 z-20">
        <p className="text-[10px] font-bold text-white truncate text-center uppercase tracking-tight">
          {slot.title}
        </p>
        <div className="flex justify-center mt-1">
           <span className="text-[9px] px-2 py-0.5 rounded-full font-black bg-white/10" style={{ color: cfg.color }}>
             LVL {slot.slot_number}
           </span>
        </div>
      </div>

      {/* Overlay Status */}
      <div className="absolute top-2 right-2 z-30">
        {owned ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : locked ? <Lock className="w-4 h-4 text-white/20" /> : null}
      </div>
    </div>
  );
};

/* ───────────────────────────── MAIN PAGE ─────────────────────────── */
const BattlePass = () => {
  const navigate = useNavigate();
  const nick = localStorage.getItem("crp_nick") || "";
  const [cfg, setCfg] = useState<BattlePassConfig>(DEFAULT_CONFIG);
  const [slots, setSlots] = useState<BattlePassSlot[]>([]);
  const [rewards, setRewards] = useState<BattlePassReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [showModal, setShowModal] = useState(false);

  const daysPassed = 10; // Logic for days...
  const ownedIds = new Set(rewards.map(r => r.slot_id));
  const accent = cfg.accent_color;
  const accentRgb = hexToRgb(accent);

  useEffect(() => {
    // Fetch data logic...
    setLoading(false);
  }, []);

  const sortedSlots = [...slots].sort((a,b) => a.slot_number - b.slot_number);
  const totalPages = Math.ceil(sortedSlots.length / PAGE_SIZE);
  const pageSlots  = sortedSlots.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="min-h-screen pb-24 text-white" style={{
      backgroundImage: cfg.background_url ? `url(${cfg.background_url})` : `linear-gradient(180deg, ${cfg.gradient_from}, ${cfg.gradient_to})`,
      backgroundSize: 'cover', backgroundPosition: 'center'
    }}>
      <style>{`
        /* 1. Глубокое темное стекло для карточек */
        .bp-card-dark-glass {
          background: rgba(0, 0, 0, 0.85) !important;
          backdrop-filter: blur(20px) saturate(160%);
          -webkit-backdrop-filter: blur(20px) saturate(160%);
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.05), 0 20px 40px rgba(0,0,0,0.6);
        }

        /* 2. Обычное жидкое стекло для панелей */
        .bp-glass-panel {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        }

        /* 3. Анимация бегущей неоновой рамки (как на фото) */
        .bp-neon-rect {
          stroke-dasharray: 600;
          stroke-dashoffset: 600;
          animation: neon-flow 3s linear infinite;
        }

        @keyframes neon-flow {
          to { stroke-dashoffset: 0; }
        }

        .bp-claim-btn {
          position: relative;
          overflow: hidden;
          box-shadow: 0 0 20px var(--ag);
          transition: all 0.3s ease;
        }

        .bp-claim-btn::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          transform: translateX(-100%);
          animation: sweep 2s infinite;
        }

        @keyframes sweep {
          100% { transform: translateX(100%); }
        }

        .bp-card-row::-webkit-scrollbar { display: none; }
      `}</style>

      {showModal && <WelcomeModal bannerUrl={cfg.banner_url} seasonName={cfg.season_name} accent={accent} onClose={() => setShowModal(false)} />}

      <div className="p-4 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bp-glass-panel flex items-center justify-center">
          <ChevronLeft />
        </button>
        <h1 className="text-xl font-black tracking-tighter uppercase">{cfg.season_name}</h1>
        <div className="w-10" />
      </div>

      {/* Progress Panel (Liquid Glass) */}
      <div className="px-4 mt-6">
        <div className="bp-glass-panel p-6 rounded-3xl">
           <div className="flex justify-between items-end mb-4">
              <div>
                <p className="text-xs opacity-50 uppercase font-bold">Твій прогрес</p>
                <h3 className="text-2xl font-black tabular-nums">{ownedIds.size} / {slots.length}</h3>
              </div>
              <Gift className="w-8 h-8 opacity-20" />
           </div>
           <div className="h-3 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full transition-all duration-1000" 
                   style={{ width: `${(ownedIds.size / slots.length) * 100}%`, background: accent, boxShadow: `0 0 15px ${accent}` }} />
           </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="mt-8">
        <div className="px-4 flex items-center justify-between mb-4">
          <h2 className="font-bold uppercase text-xs tracking-widest opacity-40">Нагороди сезону</h2>
          <div className="flex gap-2">
             <button onClick={() => setPage(p => Math.max(0, p-1))} className="p-1 opacity-50"><ChevronLeft /></button>
             <button onClick={() => setPage(p => Math.min(totalPages-1, p+1))} className="p-1"><ChevronRight /></button>
          </div>
        </div>
        
        <div className="bp-card-row flex gap-4 overflow-x-auto px-4 pb-8">
          {pageSlots.map(slot => (
            <SlotCard key={slot.id} slot={slot} owned={ownedIds.has(slot.id)} daysPassed={daysPassed} isToday={slot.slot_number === daysPassed} />
          ))}
        </div>
      </div>

      {/* Claim Button */}
      <div className="fixed bottom-6 left-0 right-0 px-4">
        <button className="w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] bp-claim-btn"
                style={{ background: accent, color: '#000', '--ag': `rgba(${accentRgb}, 0.5)` } as any}>
          Забрати нагороду
        </button>
        <p className="text-center text-[10px] mt-2 opacity-30 font-bold uppercase tracking-widest">Наступна спроба через 24 години</p>
      </div>
    </div>
  );
};

export default BattlePass;
