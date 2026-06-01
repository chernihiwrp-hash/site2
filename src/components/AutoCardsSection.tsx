import { useState, useEffect, useRef } from "react";
import { X, Car, Crown, Star, Zap, Flame, Shield } from "lucide-react";

// ─── Rarity config (shared with BattlePass) ───────────────────────────────────
type Rarity = "common" | "rare" | "epic" | "legendary" | "mythic";

const RARITY_CFG: Record<Rarity, {
  label: string;
  color: string;
  glow: string;
  rgb: string;
  border: string;
  borderRGB: string;
  icon: React.FC<{ className?: string; style?: React.CSSProperties }>;
}> = {
  common:    { label: "Звичайний",   color: "#9ca3af", glow: "rgba(156,163,175,0.7)", rgb: "156,163,175", border: "rgba(156,163,175,0.5)", borderRGB: "156,163,175", icon: Shield },
  rare:      { label: "Рідкісний",   color: "#3b82f6", glow: "rgba(59,130,246,0.8)",  rgb: "59,130,246",  border: "rgba(59,130,246,0.55)", borderRGB: "59,130,246",  icon: Zap    },
  epic:      { label: "Епічний",     color: "#a855f7", glow: "rgba(168,85,247,0.8)",  rgb: "168,85,247",  border: "rgba(168,85,247,0.55)", borderRGB: "168,85,247",  icon: Star   },
  legendary: { label: "Легендарний", color: "#fbbf24", glow: "rgba(251,191,36,0.85)", rgb: "251,191,36",  border: "rgba(251,191,36,0.6)",  borderRGB: "251,191,36",  icon: Crown  },
  mythic:    { label: "Міфічний",    color: "#ef4444", glow: "rgba(239,68,68,0.9)",   rgb: "239,68,68",   border: "rgba(239,68,68,0.65)",  borderRGB: "239,68,68",   icon: Flame  },
};

const getRarity = (car: CarData): Rarity => {
  const r = (car.rarity || "common").toLowerCase() as Rarity;
  return RARITY_CFG[r] ? r : "common";
};

export type CarData = {
  id: number | string;
  plate_number: string;
  car_model?: string;
  image_url?: string;
  rarity?: string;
  // BattlePass reward fields
  prize_value?: string;
  car_name?: string;
  prize_type?: string;
};

// ─── Animated running border ──────────────────────────────────────────────────
const RunningBorder = ({ color, glow }: { color: string; glow: string }) => (
  <>
    <style>{`
      @keyframes rb-travel-1 {
        0%   { stroke-dashoffset: 0; }
        100% { stroke-dashoffset: -700; }
      }
      @keyframes rb-travel-2 {
        0%   { stroke-dashoffset: -350; }
        100% { stroke-dashoffset: -1050; }
      }
    `}</style>
    <svg
      style={{
        position: "absolute", inset: 0, width: "100%", height: "100%",
        borderRadius: 14, overflow: "visible", pointerEvents: "none", zIndex: 5,
      }}
      viewBox="0 0 90 140"
      preserveAspectRatio="none"
    >
      <defs>
        <filter id={`rb-glow-${color.replace("#","")}`}>
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      {/* Strip 1 */}
      <rect x="1" y="1" width="88" height="138" rx="13" ry="13"
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeDasharray="30 670"
        strokeDashoffset="0"
        opacity="0.95"
        filter={`url(#rb-glow-${color.replace("#","")})`}
        style={{ animation: "rb-travel-1 2.4s linear infinite" }}
      />
      {/* Strip 2 — offset by half perimeter */}
      <rect x="1" y="1" width="88" height="138" rx="13" ry="13"
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeDasharray="30 670"
        strokeDashoffset="-350"
        opacity="0.95"
        filter={`url(#rb-glow-${color.replace("#","")})`}
        style={{ animation: "rb-travel-2 2.4s linear infinite" }}
      />
    </svg>
  </>
);

// ─── Mini Card ────────────────────────────────────────────────────────────────
const MiniCarCard = ({ car, onClick }: { car: CarData; onClick: () => void }) => {
  const rarity = getRarity(car);
  const cfg = RARITY_CFG[rarity];
  const Icon = cfg.icon;
  const name = car.car_name || car.car_model || car.prize_value || "АВТО";

  return (
    <button
      onClick={onClick}
      className="relative shrink-0"
      style={{
        width: 90,
        height: 140,
        borderRadius: 14,
        overflow: "hidden",
        border: `1.5px solid ${cfg.border}`,
        boxShadow: `0 0 18px ${cfg.glow}, 0 4px 16px rgba(0,0,0,0.6)`,
        background: `radial-gradient(ellipse at 50% 0%, rgba(${cfg.rgb},0.35) 0%, rgba(${cfg.rgb},0.08) 45%, #060606 100%)`,
        cursor: "pointer",
        transition: "transform 0.18s ease, box-shadow 0.18s ease",
      }}
      onTouchStart={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.94)"; }}
      onTouchEnd={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
    >
      {/* Running border */}
      <RunningBorder color={cfg.color} glow={cfg.glow} />

      {/* Car image — scaled, not cropped */}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "10px 6px 40px" }}>
        {car.image_url ? (
          <img
            src={car.image_url}
            alt={name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              objectPosition: "center",
              filter: `drop-shadow(0 4px 12px ${cfg.glow})`,
            }}
          />
        ) : (
          <div style={{ opacity: 0.3 }}>
            <Car style={{ width: 36, height: 36, color: cfg.color }} />
          </div>
        )}
      </div>

      {/* Rarity glow bottom */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 50,
        background: `linear-gradient(to top, rgba(${cfg.rgb},0.45) 0%, transparent 100%)`,
        pointerEvents: "none",
      }} />

      {/* Rarity badge */}
      <div style={{
        position: "absolute", bottom: 8, left: 0, right: 0,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 2, zIndex: 10,
      }}>
        <Icon style={{ width: 10, height: 10, color: cfg.color, filter: `drop-shadow(0 0 4px ${cfg.glow})` }} />
        <span style={{
          fontSize: 7, fontWeight: 900, color: cfg.color,
          textTransform: "uppercase", letterSpacing: "0.12em",
          textShadow: `0 0 8px ${cfg.glow}`,
        }}>{cfg.label}</span>
      </div>

      {/* Shimmer sweep */}
      <div style={{
        position: "absolute", inset: 0, borderRadius: 14,
        background: `linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.07) 50%, transparent 100%)`,
        backgroundSize: "200% 100%",
        animation: "shimmerSweep 3s linear infinite",
        pointerEvents: "none",
      }} />
    </button>
  );
};

// ─── Modal ────────────────────────────────────────────────────────────────────
const CarModal = ({ car, onClose }: { car: CarData; onClose: () => void }) => {
  const rarity = getRarity(car);
  const cfg = RARITY_CFG[rarity];
  const Icon = cfg.icon;
  const name = car.car_name || car.car_model || car.prize_value || "АВТО";
  const plate = car.plate_number;

  // Close on backdrop
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)",
        animation: "fadeIn 0.2s ease",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%", maxWidth: 480,
          borderRadius: "28px 28px 0 0",
          overflow: "hidden",
          border: `1.5px solid ${cfg.border}`,
          borderBottom: "none",
          boxShadow: `0 -12px 60px ${cfg.glow}, 0 -4px 24px rgba(0,0,0,0.8)`,
          background: `linear-gradient(160deg, rgba(${cfg.rgb},0.18) 0%, #090909 35%, #060606 100%)`,
          animation: "slideUpModal 0.32s cubic-bezier(0.32,0.72,0,1)",
        }}
        onClick={e => e.stopPropagation()}
      >
        <style>{`
          @keyframes slideUpModal {
            from { transform: translateY(100%); opacity: 0; }
            to   { transform: translateY(0);    opacity: 1; }
          }
          @keyframes carFloat {
            0%, 100% { transform: translateY(0px); }
            50%       { transform: translateY(-8px); }
          }
        `}</style>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 20px 0",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 12,
              background: `rgba(${cfg.rgb},0.15)`,
              border: `1px solid ${cfg.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 0 14px ${cfg.glow}`,
            }}>
              <Icon style={{ width: 18, height: 18, color: cfg.color, filter: `drop-shadow(0 0 6px ${cfg.glow})` }} />
            </div>
            <div>
              <p style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.2em", fontWeight: 700 }}>Авто</p>
              <p style={{ fontSize: 11, color: cfg.color, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 900, textShadow: `0 0 8px ${cfg.glow}` }}>{cfg.label}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 34, height: 34, borderRadius: 10,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X style={{ width: 16, height: 16, color: "rgba(255,255,255,0.5)" }} />
          </button>
        </div>

        {/* Car image */}
        <div style={{
          margin: "20px 20px 0",
          borderRadius: 20,
          overflow: "hidden",
          border: `1px solid ${cfg.border}`,
          background: `radial-gradient(ellipse at 50% 30%, rgba(${cfg.rgb},0.22) 0%, rgba(${cfg.rgb},0.06) 50%, #0a0a0a 100%)`,
          boxShadow: `inset 0 0 40px rgba(${cfg.rgb},0.12)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 200,
          position: "relative",
        }}>
          {/* Glow orb behind car */}
          <div style={{
            position: "absolute", width: 180, height: 120, borderRadius: "50%",
            background: `radial-gradient(circle, rgba(${cfg.rgb},0.35) 0%, transparent 70%)`,
            filter: "blur(24px)",
          }} />
          {car.image_url ? (
            <img
              src={car.image_url}
              alt={name}
              style={{
                width: "90%",
                maxHeight: 200,
                objectFit: "contain",
                filter: `drop-shadow(0 8px 30px ${cfg.glow})`,
                animation: "carFloat 4s ease-in-out infinite",
                position: "relative", zIndex: 1,
              }}
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, opacity: 0.4 }}>
              <Car style={{ width: 72, height: 72, color: cfg.color }} />
            </div>
          )}
        </div>

        {/* Car info */}
        <div style={{ padding: "20px 20px 32px" }}>
          {/* Name */}
          <h2 style={{
            fontSize: 26, fontWeight: 900, color: "#fff",
            textTransform: "uppercase", letterSpacing: "0.04em",
            textShadow: `0 0 20px ${cfg.glow}`,
            marginBottom: 6, lineHeight: 1.1,
          }}>{name}</h2>

          {/* Plate */}
          {plate && (
            <div style={{ marginBottom: 16 }}>
              <PlateModalBadge plate={plate} />
            </div>
          )}

          {/* Rarity bar */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "12px 16px", borderRadius: 14,
            background: `rgba(${cfg.rgb},0.1)`,
            border: `1px solid ${cfg.border}`,
            boxShadow: `0 0 20px rgba(${cfg.rgb},0.15)`,
          }}>
            <Icon style={{ width: 20, height: 20, color: cfg.color, filter: `drop-shadow(0 0 8px ${cfg.glow})` }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 3 }}>Рідкість</p>
              <p style={{ fontSize: 15, fontWeight: 900, color: cfg.color, textShadow: `0 0 10px ${cfg.glow}` }}>{cfg.label}</p>
            </div>
            {/* Rarity dots */}
            <div style={{ display: "flex", gap: 4 }}>
              {(["common","rare","epic","legendary","mythic"] as Rarity[]).map((r, i) => (
                <div key={r} style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: i <= (["common","rare","epic","legendary","mythic"] as Rarity[]).indexOf(rarity)
                    ? cfg.color : "rgba(255,255,255,0.12)",
                  boxShadow: i <= (["common","rare","epic","legendary","mythic"] as Rarity[]).indexOf(rarity)
                    ? `0 0 8px ${cfg.glow}` : "none",
                  transition: "all 0.3s ease",
                }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Plate badge for modal
const PlateModalBadge = ({ plate }: { plate: string }) => (
  <div style={{
    display: "inline-flex", alignItems: "stretch", borderRadius: 8,
    border: "2.5px solid #333", background: "#fff", overflow: "hidden",
    height: 36, boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
  }}>
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: 26, borderRight: "1.5px solid #333", background: "#fff", gap: 2 }}>
      <div style={{ width: 18, height: 12, overflow: "hidden", borderRadius: 2, border: "0.5px solid #ccc" }}>
        <div style={{ width: "100%", height: "50%", background: "#005BBB" }} />
        <div style={{ width: "100%", height: "50%", background: "#FFD500" }} />
      </div>
      <span style={{ fontSize: 7, fontWeight: 900, color: "#111", fontFamily: "Arial", lineHeight: 1 }}>UA</span>
    </div>
    <span style={{
      fontFamily: "'Arial Black', Arial, sans-serif", fontWeight: 900, fontSize: 15,
      color: "#111", letterSpacing: "0.08em", padding: "0 12px",
      display: "flex", alignItems: "center", textTransform: "uppercase", whiteSpace: "nowrap",
    }}>{plate}</span>
  </div>
);

// ─── Main section ─────────────────────────────────────────────────────────────
interface AutoCardsSectionProps {
  cars: CarData[];
  bpCars?: CarData[];
  visible?: boolean;
}

const SLOT_COUNT = 6;

const AutoCardsSection = ({ cars, bpCars = [], visible = true }: AutoCardsSectionProps) => {
  const allCars = [...cars, ...bpCars];
  const [selectedCar, setSelectedCar] = useState<CarData | null>(null);
  const [showManage, setShowManage] = useState(false);
  const [selectedIds, setSelectedIds] = useState<(number | string)[]>(() => {
    try { return JSON.parse(localStorage.getItem("auto_cards_selected") || "[]"); } catch { return []; }
  });

  // keep only valid ids
  useEffect(() => {
    const validIds = selectedIds.filter(id => allCars.some(c => String(c.id) === String(id)));
    if (validIds.length !== selectedIds.length) {
      setSelectedIds(validIds);
      localStorage.setItem("auto_cards_selected", JSON.stringify(validIds));
    }
  }, [allCars]); // eslint-disable-line

  const displayedCars = allCars.filter(c => selectedIds.some(id => String(id) === String(c.id))).slice(0, SLOT_COUNT);

  const toggleCar = (id: number | string) => {
    setSelectedIds(prev => {
      let next: (number | string)[];
      if (prev.some(x => String(x) === String(id))) {
        next = prev.filter(x => String(x) !== String(id));
      } else {
        if (prev.length >= SLOT_COUNT) return prev;
        next = [...prev, id];
      }
      localStorage.setItem("auto_cards_selected", JSON.stringify(next));
      return next;
    });
  };

  if (allCars.length === 0) return null;

  return (
    <div style={{ marginBottom: 8 }}>
      <style>{`
        @keyframes shimmerSweep {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, paddingLeft: 4, paddingRight: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 9,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Car style={{ width: 14, height: 14, color: "rgba(255,255,255,0.6)" }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 900, color: "rgba(255,255,255,0.8)", textTransform: "uppercase", letterSpacing: "0.15em" }}>
            Авто карти
          </span>
          <span style={{
            fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.3)",
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 6, padding: "2px 6px",
          }}>{displayedCars.length}/{SLOT_COUNT}</span>
        </div>
        <button
          onClick={() => setShowManage(true)}
          style={{
            fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.45)",
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8, padding: "4px 10px", cursor: "pointer",
          }}
        >
          Змінити
        </button>
      </div>

      {/* Cards row */}
      {displayedCars.length > 0 ? (
        <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4, paddingLeft: 2, paddingRight: 2, scrollbarWidth: "none" }}>
          {displayedCars.map(car => (
            <MiniCarCard key={car.id} car={car} onClick={() => setSelectedCar(car)} />
          ))}
        </div>
      ) : (
        <div
          style={{
            borderRadius: 16, padding: "20px 16px",
            background: "rgba(255,255,255,0.03)",
            border: "1px dashed rgba(255,255,255,0.1)",
            textAlign: "center", cursor: "pointer",
          }}
          onClick={() => setShowManage(true)}
        >
          <Car style={{ width: 28, height: 28, color: "rgba(255,255,255,0.2)", margin: "0 auto 8px" }} />
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 600 }}>Оберіть авто для відображення</p>
        </div>
      )}

      {/* Car detail modal */}
      {selectedCar && <CarModal car={selectedCar} onClose={() => setSelectedCar(null)} />}

      {/* Manage modal */}
      {showManage && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            display: "flex", alignItems: "flex-end", justifyContent: "center",
            background: "rgba(0,0,0,0.75)", backdropFilter: "blur(10px)",
            animation: "fadeIn 0.2s ease",
          }}
          onClick={() => setShowManage(false)}
        >
          <div
            style={{
              width: "100%", maxWidth: 480,
              borderRadius: "28px 28px 0 0", padding: "20px 20px 36px",
              background: "linear-gradient(160deg, hsl(240 15% 8% / 0.98), hsl(0 0% 4% / 0.97))",
              border: "1px solid rgba(255,255,255,0.1)", borderBottom: "none",
              boxShadow: "0 -8px 48px rgba(0,0,0,0.6)",
              animation: "slideUpModal 0.32s cubic-bezier(0.32,0.72,0,1)",
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>Авто карти</p>
                <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Обери до {SLOT_COUNT} авто для профілю</p>
              </div>
              <button
                onClick={() => setShowManage(false)}
                style={{
                  width: 34, height: 34, borderRadius: 10,
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                  display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                }}
              >
                <X style={{ width: 16, height: 16, color: "rgba(255,255,255,0.5)" }} />
              </button>
            </div>

            {/* Slot dots */}
            <div style={{
              display: "flex", alignItems: "center", gap: 6, marginBottom: 16,
              padding: "8px 12px", borderRadius: 12,
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
            }}>
              {Array.from({ length: SLOT_COUNT }).map((_, i) => {
                const car = displayedCars[i];
                const rarity = car ? getRarity(car) : null;
                const col = rarity ? RARITY_CFG[rarity].color : "rgba(255,255,255,0.12)";
                const glow = rarity ? RARITY_CFG[rarity].glow : "none";
                return (
                  <div key={i} style={{
                    width: 10, height: 10, borderRadius: "50%",
                    background: col,
                    boxShadow: rarity ? `0 0 8px ${glow}` : "none",
                    transition: "all 0.3s ease",
                  }} />
                );
              })}
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginLeft: 4 }}>{selectedIds.length} / {SLOT_COUNT}</span>
            </div>

            {/* Car list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 320, overflowY: "auto" }}>
              {allCars.map(car => {
                const rarity = getRarity(car);
                const cfg = RARITY_CFG[rarity];
                const Icon = cfg.icon;
                const name = car.car_name || car.car_model || car.prize_value || "АВТО";
                const isSelected = selectedIds.some(x => String(x) === String(car.id));
                return (
                  <button
                    key={car.id}
                    onClick={() => toggleCar(car.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "10px 12px", borderRadius: 14, cursor: "pointer",
                      background: isSelected ? `rgba(${cfg.rgb},0.12)` : "rgba(255,255,255,0.04)",
                      border: isSelected ? `1.5px solid ${cfg.border}` : "1.5px solid rgba(255,255,255,0.08)",
                      boxShadow: isSelected ? `0 0 16px rgba(${cfg.rgb},0.2)` : "none",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {/* Thumb */}
                    <div style={{
                      width: 50, height: 36, borderRadius: 8, flexShrink: 0, overflow: "hidden",
                      background: `rgba(${cfg.rgb},0.12)`, border: `1px solid ${cfg.border}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {car.image_url ? (
                        <img src={car.image_url} alt={name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                      ) : (
                        <Car style={{ width: 20, height: 20, color: cfg.color, opacity: 0.5 }} />
                      )}
                    </div>
                    {/* Info */}
                    <div style={{ flex: 1, textAlign: "left" }}>
                      <p style={{ fontSize: 12, fontWeight: 800, color: "#fff", marginBottom: 2 }}>{name}</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Icon style={{ width: 9, height: 9, color: cfg.color }} />
                        <span style={{ fontSize: 9, color: cfg.color, fontWeight: 700 }}>{cfg.label}</span>
                        {car.plate_number && (
                          <span style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", marginLeft: 4 }}>{car.plate_number}</span>
                        )}
                      </div>
                    </div>
                    {/* Checkbox */}
                    <div style={{
                      width: 22, height: 22, borderRadius: 7, flexShrink: 0,
                      background: isSelected ? cfg.color : "rgba(255,255,255,0.06)",
                      border: isSelected ? `1.5px solid ${cfg.color}` : "1.5px solid rgba(255,255,255,0.15)",
                      boxShadow: isSelected ? `0 0 10px ${cfg.glow}` : "none",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.2s ease",
                    }}>
                      {isSelected && (
                        <svg viewBox="0 0 10 10" style={{ width: 12, height: 12 }} fill="none" stroke="#000" strokeWidth="2">
                          <path d="M2 5l2.5 2.5L8 3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutoCardsSection;
