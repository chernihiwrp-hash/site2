import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { dbSelect } from "../lib/db";
import { ArrowLeft, Star, Zap, Trophy, Crown, Flame } from "lucide-react";

// ─── ТИПИ ─────────────────────────────────────────────────────────
type Rarity = "common" | "rare" | "legendary" | "mythic";
type PrizeType = "cr" | "nft" | "car" | "custom";

interface BattlePassConfig {
  season_name:   string;
  banner_url?:   string;
  gradient_from: string;
  gradient_to:   string;
  accent_color:  string;
  description?:  string;
}

interface BattlePassSlot {
  id: number;
  slot_number: number;
  title: string;
  rarity: Rarity;
  prize_type: PrizeType;
  prize_value?: string;
  image_url?: string;
  nft_gift_id?: string;
  car_name?: string;
}

interface BattlePassReward {
  slot_id: number;
  rarity: Rarity;
  prize_type: PrizeType;
  prize_value?: string;
  image_url?: string;
  car_name?: string;
}

// ─── КОНФІГ РІДКОСТЕЙ ─────────────────────────────────────────────
const RARITY_CONFIG: Record<Rarity, {
  label: string; color: string; glow: string;
  border: string; bg: string; icon: any; shimmer: string;
}> = {
  common:    { label: "Звичайний",   color: "#9ca3af", glow: "rgba(156,163,175,0.5)", border: "rgba(156,163,175,0.3)", bg: "linear-gradient(135deg,rgba(156,163,175,0.08),rgba(107,114,128,0.05))", icon: Star,   shimmer: "rgba(156,163,175,0.15)" },
  rare:      { label: "Рідкісний",   color: "#38bdf8", glow: "rgba(56,189,248,0.6)",  border: "rgba(56,189,248,0.4)",  bg: "linear-gradient(135deg,rgba(56,189,248,0.1),rgba(14,165,233,0.06))",   icon: Zap,    shimmer: "rgba(56,189,248,0.2)"   },
  legendary: { label: "Легендарний", color: "#fbbf24", glow: "rgba(251,191,36,0.7)",  border: "rgba(251,191,36,0.5)",  bg: "linear-gradient(135deg,rgba(251,191,36,0.12),rgba(245,158,11,0.07))", icon: Trophy, shimmer: "rgba(251,191,36,0.25)"  },
  mythic:    { label: "Міфічний",    color: "#f87171", glow: "rgba(248,113,113,0.8)", border: "rgba(248,113,113,0.55)",bg: "linear-gradient(135deg,rgba(248,113,113,0.13),rgba(239,68,68,0.08))",  icon: Flame,  shimmer: "rgba(248,113,113,0.3)"  },
};

const DEFAULT_CONFIG: BattlePassConfig = {
  season_name:   "БАТЛПАС",
  gradient_from: "#1a0a2e",
  gradient_to:   "#0a0a0a",
  accent_color:  "#fbbf24",
  description:   "Сезонні нагороди",
};

// ─── КАРТКА МАШИНИ (export — використовується в Profile) ──────────
export const BattlePassCarCard = ({ reward }: { reward: BattlePassReward }) => {
  const cfg = RARITY_CONFIG[reward.rarity];
  const carName = reward.car_name || reward.prize_value || "АВТО";
  return (
    <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl"
      style={{ border: `1.5px solid ${cfg.border}`, boxShadow: `0 0 32px ${cfg.glow},0 4px 24px rgba(0,0,0,0.5)`, background: cfg.bg }}>
      <style>{`
        @keyframes bp-shimmer{0%{transform:translateX(-100%) rotate(15deg)}100%{transform:translateX(300%) rotate(15deg)}}
        @keyframes bp-glow-pulse{0%,100%{opacity:.6}50%{opacity:1}}
        @keyframes bp-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
      `}</style>
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl" style={{ zIndex:1 }}>
        <div style={{ position:"absolute",inset:0,background:`linear-gradient(105deg,transparent 40%,${cfg.shimmer} 50%,transparent 60%)`,animation:"bp-shimmer 3s ease-in-out infinite" }} />
      </div>
      <div className="absolute inset-x-0 top-0 h-px pointer-events-none" style={{ background:`linear-gradient(90deg,transparent,${cfg.color},transparent)`,zIndex:2 }} />
      <div className="relative z-10 p-4">
        {reward.image_url ? (
          <div className="relative mb-3 rounded-xl overflow-hidden" style={{ height:140 }}>
            <img src={reward.image_url} alt={carName} className="w-full h-full object-cover" style={{ animation:"bp-float 4s ease-in-out infinite" }} />
            <div className="absolute inset-x-0 bottom-0 h-16 pointer-events-none" style={{ background:"linear-gradient(to top,rgba(0,0,0,0.8),transparent)" }} />
            <div className="absolute inset-x-0 bottom-0 h-8 pointer-events-none" style={{ background:`radial-gradient(ellipse at 50% 100%,${cfg.glow} 0%,transparent 70%)`,animation:"bp-glow-pulse 2s ease-in-out infinite" }} />
          </div>
        ) : (
          <div className="flex items-center justify-center mb-3 rounded-xl" style={{ height:100,background:`radial-gradient(circle,${cfg.bg} 0%,rgba(0,0,0,0.4) 100%)`,border:`1px dashed ${cfg.border}` }}>
            <span style={{ fontSize:48 }}>🚗</span>
          </div>
        )}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            {(() => { const Icon = cfg.icon; return <Icon className="w-3.5 h-3.5" style={{ color:cfg.color,filter:`drop-shadow(0 0 4px ${cfg.color})` }} />; })()}
            <span className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color:cfg.color }}>{cfg.label}</span>
          </div>
          <p className="text-base font-black uppercase tracking-wider" style={{ color:cfg.color,textShadow:`0 0 12px ${cfg.glow}` }}>{carName}</p>
          <p className="text-[9px] text-white/40 mt-0.5 uppercase tracking-widest">Батлпас • Авто</p>
        </div>
      </div>
    </div>
  );
};

// ─── КАРТКА СЛОТУ ─────────────────────────────────────────────────
const SlotCard = ({ slot, owned, accent }: { slot: BattlePassSlot; owned: boolean; accent: string }) => {
  const cfg = RARITY_CONFIG[slot.rarity];
  const Icon = cfg.icon;
  return (
    <div className="relative rounded-2xl overflow-hidden transition-all duration-300"
      style={{ border:`1.5px solid ${owned ? cfg.border : "rgba(255,255,255,0.06)"}`, background: owned ? cfg.bg : "rgba(255,255,255,0.02)", boxShadow: owned ? `0 0 20px ${cfg.glow},0 2px 12px rgba(0,0,0,0.4)` : "none", opacity: owned ? 1 : 0.55 }}>
      <style>{`@keyframes bp-slot-shimmer{0%{transform:translateX(-100%) rotate(15deg)}100%{transform:translateX(300%) rotate(15deg)}}`}</style>
      {owned && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div style={{ position:"absolute",inset:0,background:`linear-gradient(105deg,transparent 40%,${cfg.shimmer} 50%,transparent 60%)`,animation:"bp-slot-shimmer 4s ease-in-out infinite" }} />
        </div>
      )}
      {owned && <div className="absolute inset-x-0 top-0 h-px" style={{ background:`linear-gradient(90deg,transparent,${cfg.color},transparent)` }} />}
      <div className="p-3">
        <div className="flex items-start justify-between mb-2">
          <span className="text-[9px] font-black tabular-nums" style={{ color: owned ? cfg.color : "rgba(255,255,255,0.2)" }}>#{slot.slot_number.toString().padStart(2,"0")}</span>
          {owned && (
            <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background:cfg.color,boxShadow:`0 0 8px ${cfg.glow}` }}>
              <span className="text-[8px] font-black text-black">✓</span>
            </div>
          )}
        </div>
        {slot.image_url ? (
          <div className="w-full h-16 rounded-xl overflow-hidden mb-2">
            <img src={slot.image_url} alt="" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-full h-16 rounded-xl flex items-center justify-center mb-2" style={{ background:"rgba(255,255,255,0.03)" }}>
            <Icon className="w-7 h-7" style={{ color: owned ? cfg.color : "rgba(255,255,255,0.15)", filter: owned ? `drop-shadow(0 0 6px ${cfg.color})` : "none" }} />
          </div>
        )}
        <p className="text-[10px] font-bold text-center leading-tight" style={{ color: owned ? cfg.color : "rgba(255,255,255,0.3)" }}>{slot.title || "Приз"}</p>
        <p className="text-[8px] text-center mt-0.5 uppercase tracking-widest" style={{ color: owned ? cfg.color+"99" : "rgba(255,255,255,0.15)" }}>{cfg.label}</p>
        <div className="mt-1.5 text-center">
          {slot.prize_type === "cr"     && <span className="text-[9px] font-black" style={{ color: owned ? "#fbbf24" : "rgba(255,255,255,0.2)" }}>💰 {slot.prize_value || "?"} CR</span>}
          {slot.prize_type === "nft"    && <span className="text-[9px] font-black" style={{ color: owned ? "#a78bfa" : "rgba(255,255,255,0.2)" }}>🎁 NFT</span>}
          {slot.prize_type === "car"    && <span className="text-[9px] font-black" style={{ color: owned ? cfg.color : "rgba(255,255,255,0.2)" }}>🚗 Авто</span>}
          {slot.prize_type === "custom" && <span className="text-[9px] font-black" style={{ color: owned ? cfg.color : "rgba(255,255,255,0.2)" }}>🎁 {slot.prize_value || "Приз"}</span>}
        </div>
      </div>
    </div>
  );
};

// ─── ГОЛОВНА СТОРІНКА ─────────────────────────────────────────────
const BattlePass = () => {
  const navigate = useNavigate();
  const nick = localStorage.getItem("crp_nick") || "";
  const [cfg, setCfg]             = useState<BattlePassConfig>(DEFAULT_CONFIG);
  const [slots, setSlots]         = useState<BattlePassSlot[]>([]);
  const [rewards, setRewards]     = useState<BattlePassReward[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    const load = async () => {
      const [configRes, slotsRes, rewardsRes] = await Promise.all([
        dbSelect("battlepass_config", { limit: 1 }),
        dbSelect("battlepass_slots",  { order: { col: "slot_number", dir: "asc" } }),
        nick
          ? dbSelect("battlepass_rewards", { filters: [{ col: "username", op: "ilike", value: nick }] })
          : Promise.resolve({ data: [] }),
      ]);
      const configRow = (configRes.data as any[])?.[0];
      if (configRow) setCfg({ ...DEFAULT_CONFIG, ...configRow });
      setSlots((slotsRes.data as any[]) || []);
      setRewards((rewardsRes.data as any[]) || []);
      setLoading(false);
    };
    load();
  }, [nick]);

  const ownedIds = new Set(rewards.map(r => r.slot_id));

  const rarityGroups: Record<Rarity, BattlePassSlot[]> = { common:[], rare:[], legendary:[], mythic:[] };
  slots.forEach(s => rarityGroups[s.rarity]?.push(s));

  const accent = cfg.accent_color || "#fbbf24";
  const accentGlow = accent + "55";

  return (
    <div className="min-h-screen pb-24" style={{ background: `linear-gradient(160deg, ${cfg.gradient_from} 0%, ${cfg.gradient_to} 100%)` }}>
      <style>{`
        @keyframes bp-header-glow{0%,100%{opacity:.5;transform:scale(1)}50%{opacity:1;transform:scale(1.05)}}
        @keyframes bp-fade-in{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes bp-shimmer-banner{0%{transform:translateX(-100%)}100%{transform:translateX(200%)}}
        .bp-section{animation:bp-fade-in .45s ease both}
      `}</style>

      {/* ── БАНЕР ── */}
      <div className="relative w-full overflow-hidden" style={{ minHeight: cfg.banner_url ? 220 : 0 }}>
        {cfg.banner_url && (
          <>
            <img
              src={cfg.banner_url}
              alt="banner"
              className="w-full object-cover"
              style={{ height: 220, objectPosition: "center top" }}
            />
            {/* Градієнт поверх банера — зверху прозорий, знизу переходить у фон */}
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: `linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, ${cfg.gradient_from}cc 70%, ${cfg.gradient_from} 100%)` }} />
            {/* Блиск */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div style={{ position:"absolute",top:0,left:0,right:0,bottom:0,background:`linear-gradient(105deg,transparent 30%,rgba(255,255,255,0.06) 50%,transparent 70%)`,animation:"bp-shimmer-banner 6s ease-in-out infinite" }} />
            </div>
          </>
        )}

        {/* Кнопка назад */}
        <button onClick={() => navigate(-1)}
          className="absolute left-4 top-4 w-9 h-9 rounded-xl flex items-center justify-center z-10"
          style={{ background:"rgba(0,0,0,0.45)",border:"1px solid rgba(255,255,255,0.15)",backdropFilter:"blur(8px)" }}>
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>

        {/* Заголовок поверх банера */}
        <div className={`${cfg.banner_url ? "absolute bottom-0 left-0 right-0" : "relative pt-14"} px-4 pb-5 text-center`}>
          {!cfg.banner_url && (
            <div className="relative inline-flex items-center justify-center mb-4">
              <div className="absolute w-24 h-24 rounded-full" style={{ background:`radial-gradient(circle,${accentGlow} 0%,transparent 70%)`,animation:"bp-header-glow 3s ease-in-out infinite" }} />
              <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background:`linear-gradient(135deg,${accent}26,${accent}14)`,border:`1.5px solid ${accent}58`,boxShadow:`0 0 24px ${accentGlow},0 4px 16px rgba(0,0,0,0.4)` }}>
                <Crown className="w-8 h-8" style={{ color:accent,filter:`drop-shadow(0 0 8px ${accentGlow})` }} />
              </div>
            </div>
          )}
          <h1 className="text-2xl font-black uppercase tracking-[0.15em] mb-1"
            style={{ color:accent,textShadow:`0 0 24px ${accentGlow},0 2px 8px rgba(0,0,0,0.8)` }}>
            {cfg.season_name || "БАТЛПАС"}
          </h1>
          {cfg.description && (
            <p className="text-[11px] uppercase tracking-widest" style={{ color: accent+"99" }}>{cfg.description}</p>
          )}
          {/* Прогрес */}
          <div className="mt-4 max-w-xs mx-auto">
            <div className="flex justify-between text-[10px] mb-1.5" style={{ color: accent+"80" }}>
              <span>Отримано</span>
              <span className="font-bold" style={{ color:accent }}>{ownedIds.size} / {slots.length}</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background:"rgba(255,255,255,0.06)" }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: slots.length > 0 ? `${(ownedIds.size/slots.length)*100}%` : "0%", background:`linear-gradient(90deg,${accent},${accent}bb)`, boxShadow:`0 0 8px ${accentGlow}` }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── КОНТЕНТ ── */}
      <div className="px-4 mt-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor:`${accent}44`,borderTopColor:accent }} />
          </div>
        ) : slots.length === 0 ? (
          <div className="text-center py-20" style={{ color:"rgba(255,255,255,0.25)" }}>
            <Crown className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Батлпас поки не налаштований</p>
            <p className="text-[10px] mt-1 opacity-60">Адміністратор незабаром додасть нагороди</p>
          </div>
        ) : (
          (["mythic","legendary","rare","common"] as Rarity[]).map((rarity, ri) => {
            const group = rarityGroups[rarity];
            if (group.length === 0) return null;
            const rcfg = RARITY_CONFIG[rarity];
            const Icon = rcfg.icon;
            return (
              <div key={rarity} className="bp-section mb-6" style={{ animationDelay:`${ri*80}ms` }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background:`${rcfg.color}18`,border:`1px solid ${rcfg.border}` }}>
                    <Icon className="w-3.5 h-3.5" style={{ color:rcfg.color,filter:`drop-shadow(0 0 4px ${rcfg.color})` }} />
                  </div>
                  <span className="text-xs font-black uppercase tracking-[0.15em]" style={{ color:rcfg.color }}>{rcfg.label}</span>
                  <div className="flex-1 h-px" style={{ background:`linear-gradient(90deg,${rcfg.border},transparent)` }} />
                  <span className="text-[9px] font-bold" style={{ color:rcfg.color+"80" }}>
                    {group.filter(s => ownedIds.has(s.id)).length}/{group.length}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  {group.map(slot => (
                    <SlotCard key={slot.id} slot={slot} owned={ownedIds.has(slot.id)} accent={accent} />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default BattlePass;
