import { useState, useEffect } from "react";
import { X, Car, Crown, Star, Zap, Flame, Shield, Settings } from "lucide-react";

type Rarity = "common" | "rare" | "epic" | "legendary" | "mythic";

const RARITY: Record<Rarity, {
  label: string; color: string; glow: string; rgb: string;
  icon: React.FC<{ style?: React.CSSProperties }>;
}> = {
  common:    { label: "Звичайний",   color: "#9ca3af", glow: "rgba(156,163,175,0.6)", rgb: "156,163,175", icon: Shield  },
  rare:      { label: "Рідкісний",   color: "#3b82f6", glow: "rgba(59,130,246,0.7)",  rgb: "59,130,246",  icon: Zap     },
  epic:      { label: "Епічний",     color: "#a855f7", glow: "rgba(168,85,247,0.7)",  rgb: "168,85,247",  icon: Star    },
  legendary: { label: "Легендарний", color: "#fbbf24", glow: "rgba(251,191,36,0.75)", rgb: "251,191,36",  icon: Crown   },
  mythic:    { label: "Міфічний",    color: "#ef4444", glow: "rgba(239,68,68,0.8)",   rgb: "239,68,68",   icon: Flame   },
};
const RARITY_ORDER: Rarity[] = ["common","rare","epic","legendary","mythic"];

const getRarity = (r?: string): Rarity => {
  const k = (r || "common").toLowerCase() as Rarity;
  return RARITY[k] ? k : "common";
};

export type CarData = {
  id: number | string;
  plate_number?: string;
  car_model?: string;
  image_url?: string;
  rarity?: string;
  car_name?: string;
  prize_value?: string;
  prize_type?: string;
};

const getName = (c: CarData) => c.car_name || c.car_model || c.prize_value || "АВТО";

// ─── Анімована рамка — дві смуги біжать по контуру ───────────────────────────
const GlowBorder = ({ color, size }: { color: string; size: { w: number; h: number; r: number } }) => {
  const { w, h, r } = size;
  // Периметр прямокутника із заокругленнями (приблизно)
  const perim = 2 * (w + h) - (8 - 2 * Math.PI) * r;
  const dash = perim * 0.18;
  const gap  = perim - dash;

  return (
    <svg
      style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none", zIndex:4, overflow:"visible" }}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
    >
      <defs>
        <filter id={`gf-${color.replace("#","")}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      {/* Смуга 1 */}
      <rect x="1.5" y="1.5" width={w-3} height={h-3} rx={r-1} ry={r-1}
        fill="none" stroke={color} strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${gap}`}
        strokeDashoffset="0"
        filter={`url(#gf-${color.replace("#","")})`}
        style={{ animation: "gb-spin1 2.8s linear infinite" }}
      />
      {/* Смуга 2 — зміщена на половину периметру */}
      <rect x="1.5" y="1.5" width={w-3} height={h-3} rx={r-1} ry={r-1}
        fill="none" stroke={color} strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${gap}`}
        strokeDashoffset={`${-perim / 2}`}
        filter={`url(#gf-${color.replace("#","")})`}
        style={{ animation: "gb-spin2 2.8s linear infinite" }}
      />
    </svg>
  );
};

// ─── Мінікарточка ─────────────────────────────────────────────────────────────
const MiniCard = ({ car, onClick }: { car: CarData; onClick: () => void }) => {
  const r = getRarity(car.rarity);
  const cfg = RARITY[r];
  const Icon = cfg.icon;

  return (
    <button
      onClick={onClick}
      style={{
        position: "relative",
        width: 88, height: 136,
        borderRadius: 14,
        background: `radial-gradient(ellipse at 50% 10%, rgba(${cfg.rgb},0.28) 0%, rgba(${cfg.rgb},0.06) 50%, #080808 100%)`,
        border: `1.5px solid rgba(${cfg.rgb},0.45)`,
        boxShadow: `0 0 20px rgba(${cfg.rgb},0.25), 0 6px 20px rgba(0,0,0,0.7)`,
        cursor: "pointer",
        overflow: "hidden",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-end",
        padding: "0 0 10px",
        WebkitTapHighlightColor: "transparent",
      }}
      onTouchStart={e => (e.currentTarget.style.transform = "scale(0.93)")}
      onTouchEnd={e => (e.currentTarget.style.transform = "scale(1)")}
    >
      <style>{`
        @keyframes gb-spin1 { from { stroke-dashoffset: 0; } to { stroke-dashoffset: -${2*(88+136)}px; } }
        @keyframes gb-spin2 { from { stroke-dashoffset: ${-(88+136)}px; } to { stroke-dashoffset: ${-3*(88+136)}px; } }
        @keyframes card-shimmer { 0%,100%{opacity:0.4} 50%{opacity:0.7} }
        @keyframes car-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        @keyframes modal-up { from{transform:translateY(100%);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes fade-bg { from{opacity:0} to{opacity:1} }
      `}</style>

      {/* Бігуча рамка */}
      <GlowBorder color={cfg.color} size={{ w: 88, h: 136, r: 14 }} />

      {/* Фото авто */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "10px 6px 38px",
      }}>
        {car.image_url ? (
          <img src={car.image_url} alt="" style={{
            width: "100%", height: "100%",
            objectFit: "contain", objectPosition: "center",
            filter: `drop-shadow(0 4px 10px rgba(${cfg.rgb},0.5))`,
          }} />
        ) : (
          <Car style={{ width: 32, height: 32, color: cfg.color, opacity: 0.35 }} />
        )}
      </div>

      {/* Нижнє сяйво */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 56,
        background: `linear-gradient(to top, rgba(${cfg.rgb},0.55) 0%, transparent 100%)`,
        pointerEvents: "none",
      }} />

      {/* Іконка + лейбл редкості */}
      <div style={{ position: "relative", zIndex: 5, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
        <Icon style={{ width: 11, height: 11, color: cfg.color, filter: `drop-shadow(0 0 4px ${cfg.glow})` }} />
        <span style={{
          fontSize: 7, fontWeight: 900, color: cfg.color,
          textTransform: "uppercase", letterSpacing: "0.1em",
          textShadow: `0 0 8px ${cfg.glow}`,
        }}>{cfg.label}</span>
      </div>
    </button>
  );
};

// ─── Модалка деталей авто ─────────────────────────────────────────────────────
const CarModal = ({ car, onClose }: { car: CarData; onClose: () => void }) => {
  const r = getRarity(car.rarity);
  const cfg = RARITY[r];
  const Icon = cfg.icon;
  const name = getName(car);
  const rarityIdx = RARITY_ORDER.indexOf(r);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        animation: "fade-bg 0.22s ease",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 440,
          background: `linear-gradient(170deg, rgba(${cfg.rgb},0.14) 0%, #0b0b0b 30%)`,
          borderTop: `1.5px solid rgba(${cfg.rgb},0.4)`,
          borderLeft: `1.5px solid rgba(${cfg.rgb},0.15)`,
          borderRight: `1.5px solid rgba(${cfg.rgb},0.15)`,
          borderRadius: "24px 24px 0 0",
          boxShadow: `0 -16px 60px rgba(${cfg.rgb},0.18), 0 -4px 20px rgba(0,0,0,0.8)`,
          animation: "modal-up 0.3s cubic-bezier(0.32,0.72,0,1)",
          overflow: "hidden",
          paddingBottom: 36,
        }}
      >
        {/* Шапка */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 18px 0" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{
              width:38, height:38, borderRadius:12,
              background: `rgba(${cfg.rgb},0.14)`,
              border: `1px solid rgba(${cfg.rgb},0.35)`,
              display:"flex", alignItems:"center", justifyContent:"center",
              boxShadow: `0 0 12px rgba(${cfg.rgb},0.2)`,
            }}>
              <Icon style={{ width:18, height:18, color:cfg.color, filter:`drop-shadow(0 0 6px ${cfg.glow})` }} />
            </div>
            <div>
              <p style={{ fontSize:8, color:"rgba(255,255,255,0.3)", textTransform:"uppercase", letterSpacing:"0.22em", fontWeight:700, lineHeight:1.2 }}>Авто</p>
              <p style={{ fontSize:11, color:cfg.color, textTransform:"uppercase", letterSpacing:"0.12em", fontWeight:900, textShadow:`0 0 8px ${cfg.glow}` }}>{cfg.label}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width:34, height:34, borderRadius:10,
              background:"rgba(255,255,255,0.05)",
              border:"1px solid rgba(255,255,255,0.1)",
              display:"flex", alignItems:"center", justifyContent:"center",
              cursor:"pointer",
            }}
          >
            <X style={{ width:15, height:15, color:"rgba(255,255,255,0.45)" }} />
          </button>
        </div>

        {/* Фото */}
        <div style={{
          margin:"16px 18px 0",
          borderRadius:18,
          background: `radial-gradient(ellipse at 50% 30%, rgba(${cfg.rgb},0.2) 0%, rgba(${cfg.rgb},0.05) 55%, #0e0e0e 100%)`,
          border: `1px solid rgba(${cfg.rgb},0.2)`,
          display:"flex", alignItems:"center", justifyContent:"center",
          minHeight:190, position:"relative", overflow:"hidden",
        }}>
          {/* Ambient glow */}
          <div style={{
            position:"absolute", width:200, height:120, borderRadius:"50%",
            background: `radial-gradient(circle, rgba(${cfg.rgb},0.3) 0%, transparent 70%)`,
            filter:"blur(28px)",
          }} />
          {car.image_url ? (
            <img src={car.image_url} alt={name} style={{
              width:"85%", maxHeight:185,
              objectFit:"contain",
              filter:`drop-shadow(0 10px 32px rgba(${cfg.rgb},0.55))`,
              animation:"car-float 4s ease-in-out infinite",
              position:"relative", zIndex:1,
            }} />
          ) : (
            <Car style={{ width:72, height:72, color:cfg.color, opacity:0.25 }} />
          )}
        </div>

        {/* Назва */}
        <div style={{ padding:"16px 18px 0" }}>
          <h2 style={{
            fontSize:28, fontWeight:900, color:"#fff",
            textTransform:"uppercase", letterSpacing:"0.02em",
            lineHeight:1.05, marginBottom:14,
            textShadow:`0 0 24px rgba(${cfg.rgb},0.35)`,
          }}>{name}</h2>

          {/* Рядок редкості */}
          <div style={{
            display:"flex", alignItems:"center", justifyContent:"space-between",
            padding:"11px 14px",
            borderRadius:14,
            background:`rgba(${cfg.rgb},0.09)`,
            border:`1px solid rgba(${cfg.rgb},0.22)`,
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:9 }}>
              <Icon style={{ width:18, height:18, color:cfg.color, filter:`drop-shadow(0 0 6px ${cfg.glow})` }} />
              <div>
                <p style={{ fontSize:8, color:"rgba(255,255,255,0.35)", textTransform:"uppercase", letterSpacing:"0.18em", marginBottom:2 }}>Рідкість</p>
                <p style={{ fontSize:14, fontWeight:900, color:cfg.color, textShadow:`0 0 10px ${cfg.glow}` }}>{cfg.label}</p>
              </div>
            </div>
            {/* Точки рівня */}
            <div style={{ display:"flex", gap:5 }}>
              {RARITY_ORDER.map((_, i) => (
                <div key={i} style={{
                  width:9, height:9, borderRadius:"50%",
                  background: i <= rarityIdx ? cfg.color : "rgba(255,255,255,0.1)",
                  boxShadow: i <= rarityIdx ? `0 0 8px ${cfg.glow}` : "none",
                }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Модалка вибору авто ──────────────────────────────────────────────────────
const ManageModal = ({
  allCars, selectedIds, onToggle, onClose,
}: {
  allCars: CarData[];
  selectedIds: (number | string)[];
  onToggle: (id: number | string) => void;
  onClose: () => void;
}) => {
  const SLOTS = 6;
  const selCars = allCars.filter(c => selectedIds.some(x => String(x) === String(c.id)));

  return (
    <div
      onClick={onClose}
      style={{
        position:"fixed", inset:0, zIndex:9999,
        display:"flex", alignItems:"flex-end", justifyContent:"center",
        background:"rgba(0,0,0,0.72)",
        backdropFilter:"blur(14px)",
        WebkitBackdropFilter:"blur(14px)",
        animation:"fade-bg 0.22s ease",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width:"100%", maxWidth:440,
          background:"#0d0d0d",
          borderTop:"1.5px solid rgba(255,255,255,0.1)",
          borderLeft:"1.5px solid rgba(255,255,255,0.06)",
          borderRight:"1.5px solid rgba(255,255,255,0.06)",
          borderRadius:"24px 24px 0 0",
          boxShadow:"0 -8px 40px rgba(0,0,0,0.7)",
          animation:"modal-up 0.3s cubic-bezier(0.32,0.72,0,1)",
          paddingBottom:36,
        }}
      >
        {/* Шапка */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 18px 14px" }}>
          <div>
            <p style={{ fontSize:15, fontWeight:800, color:"#fff" }}>Авто карти</p>
            <p style={{ fontSize:10, color:"rgba(255,255,255,0.35)" }}>Обери до {SLOTS} авто для профілю</p>
          </div>
          <button onClick={onClose} style={{
            width:34, height:34, borderRadius:10,
            background:"rgba(255,255,255,0.05)",
            border:"1px solid rgba(255,255,255,0.1)",
            display:"flex", alignItems:"center", justifyContent:"center",
            cursor:"pointer",
          }}>
            <X style={{ width:15, height:15, color:"rgba(255,255,255,0.45)" }} />
          </button>
        </div>

        {/* Слот-індикатори */}
        <div style={{
          display:"flex", alignItems:"center", gap:5, padding:"8px 18px 14px",
          borderBottom:"1px solid rgba(255,255,255,0.06)",
        }}>
          {Array.from({ length: SLOTS }).map((_, i) => {
            const c = selCars[i];
            const col = c ? RARITY[getRarity(c.rarity)].color : "rgba(255,255,255,0.1)";
            const glow = c ? RARITY[getRarity(c.rarity)].glow : "none";
            return <div key={i} style={{ width:10, height:10, borderRadius:"50%", background:col, boxShadow:c?`0 0 7px ${glow}`:"none", transition:"all 0.25s" }} />;
          })}
          <span style={{ fontSize:10, color:"rgba(255,255,255,0.3)", marginLeft:6 }}>{selectedIds.length} / {SLOTS}</span>
        </div>

        {/* Список */}
        <div style={{ display:"flex", flexDirection:"column", gap:6, padding:"12px 18px 0", maxHeight:320, overflowY:"auto" }}>
          {allCars.map(car => {
            const r = getRarity(car.rarity);
            const cfg = RARITY[r];
            const Icon = cfg.icon;
            const sel = selectedIds.some(x => String(x) === String(car.id));
            const name = getName(car);
            return (
              <button
                key={car.id}
                onClick={() => onToggle(car.id)}
                style={{
                  display:"flex", alignItems:"center", gap:12,
                  padding:"10px 12px", borderRadius:14, cursor:"pointer",
                  background: sel ? `rgba(${cfg.rgb},0.1)` : "rgba(255,255,255,0.03)",
                  border: sel ? `1.5px solid rgba(${cfg.rgb},0.4)` : "1.5px solid rgba(255,255,255,0.07)",
                  boxShadow: sel ? `0 0 14px rgba(${cfg.rgb},0.15)` : "none",
                  transition:"all 0.2s",
                  textAlign:"left",
                }}
              >
                {/* Мініатюра */}
                <div style={{
                  width:52, height:38, borderRadius:9, flexShrink:0,
                  background:`rgba(${cfg.rgb},0.1)`,
                  border:`1px solid rgba(${cfg.rgb},0.2)`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  overflow:"hidden",
                }}>
                  {car.image_url
                    ? <img src={car.image_url} alt="" style={{ width:"100%", height:"100%", objectFit:"contain" }} />
                    : <Car style={{ width:20, height:20, color:cfg.color, opacity:0.4 }} />
                  }
                </div>
                {/* Текст */}
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:12, fontWeight:800, color:"#fff", marginBottom:2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{name}</p>
                  <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                    <Icon style={{ width:9, height:9, color:cfg.color }} />
                    <span style={{ fontSize:9, color:cfg.color, fontWeight:700 }}>{cfg.label}</span>
                  </div>
                </div>
                {/* Чекбокс */}
                <div style={{
                  width:22, height:22, borderRadius:7, flexShrink:0,
                  background: sel ? cfg.color : "rgba(255,255,255,0.05)",
                  border: sel ? `1.5px solid ${cfg.color}` : "1.5px solid rgba(255,255,255,0.12)",
                  boxShadow: sel ? `0 0 8px ${cfg.glow}` : "none",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  transition:"all 0.2s",
                }}>
                  {sel && <svg viewBox="0 0 10 10" style={{ width:12, height:12 }} fill="none" stroke="#000" strokeWidth="2.2"><path d="M2 5l2.5 2.5L8 3" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ─── Головний компонент ───────────────────────────────────────────────────────
interface AutoCardsSectionProps {
  cars: CarData[];
  bpCars?: CarData[];
  visible?: boolean;
}

const SLOTS = 6;

const AutoCardsSection = ({ cars, bpCars = [] }: AutoCardsSectionProps) => {
  // Тільки батлпас авто — номери машин не входять
  const allCars = [...bpCars, ...cars.filter(c => c.image_url)];

  const [selected, setSelected] = useState<CarData | null>(null);
  const [managing, setManaging] = useState(false);
  const [selectedIds, setSelectedIds] = useState<(number | string)[]>(() => {
    try { return JSON.parse(localStorage.getItem("auto_cards_v2") || "[]"); } catch { return []; }
  });

  // Ініціалізація: якщо нічого не вибрано — беремо перші SLOTS
  useEffect(() => {
    if (selectedIds.length === 0 && allCars.length > 0) {
      const ids = allCars.slice(0, SLOTS).map(c => c.id);
      setSelectedIds(ids);
      localStorage.setItem("auto_cards_v2", JSON.stringify(ids));
    }
  }, [allCars.length]); // eslint-disable-line

  const toggle = (id: number | string) => {
    setSelectedIds(prev => {
      let next: (number | string)[];
      if (prev.some(x => String(x) === String(id))) {
        next = prev.filter(x => String(x) !== String(id));
      } else {
        if (prev.length >= SLOTS) return prev;
        next = [...prev, id];
      }
      localStorage.setItem("auto_cards_v2", JSON.stringify(next));
      return next;
    });
  };

  const displayed = allCars.filter(c => selectedIds.some(x => String(x) === String(c.id))).slice(0, SLOTS);

  if (allCars.length === 0) return null;

  return (
    <div style={{ padding: "10px 0 4px" }}>
      {/* Заголовок */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
        <span style={{ fontSize:9, fontWeight:700, color:"rgba(255,255,255,0.3)", textTransform:"uppercase", letterSpacing:"0.2em" }}>
          Авто · {displayed.length}/{SLOTS}
        </span>
        <button
          onClick={() => setManaging(true)}
          style={{
            display:"flex", alignItems:"center", gap:4,
            fontSize:9, fontWeight:600, color:"rgba(255,255,255,0.35)",
            background:"transparent", border:"none", cursor:"pointer", padding:0,
          }}
        >
          <Settings style={{ width:10, height:10 }} />
          Змінити
        </button>
      </div>

      {/* Горизонтальна стрічка карток */}
      {displayed.length > 0 ? (
        <div style={{
          display:"flex", gap:8,
          overflowX:"auto", paddingBottom:2,
          scrollbarWidth:"none",
          msOverflowStyle:"none",
        }}>
          {displayed.map(car => (
            <MiniCard key={car.id} car={car} onClick={() => setSelected(car)} />
          ))}
        </div>
      ) : (
        <button
          onClick={() => setManaging(true)}
          style={{
            width:"100%", padding:"16px 0",
            borderRadius:12, cursor:"pointer",
            background:"rgba(255,255,255,0.02)",
            border:"1px dashed rgba(255,255,255,0.1)",
            color:"rgba(255,255,255,0.3)", fontSize:11,
          }}
        >
          Обрати авто →
        </button>
      )}

      {selected && <CarModal car={selected} onClose={() => setSelected(null)} />}
      {managing && (
        <ManageModal
          allCars={allCars}
          selectedIds={selectedIds}
          onToggle={toggle}
          onClose={() => setManaging(false)}
        />
      )}
    </div>
  );
};

export default AutoCardsSection;
