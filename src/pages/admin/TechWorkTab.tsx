import { useState, useEffect } from "react";
import { dbUpsert, dbSelect } from "../../lib/db";
import { toast } from "sonner";
import {
  Wrench, Power, PowerOff, RefreshCw,
  Settings, Construction, Hammer, Laptop, Monitor,
  Zap, Plug, Globe, Gamepad2, Building2, Lock, Shield, Target,
  Server, Cpu, Database, WifiOff, AlertTriangle,
} from "lucide-react";

// Icon map for rendering
const ICON_MAP: Record<string, React.ElementType> = {
  Wrench, Settings, HardHat: Construction, Construction, Hammer,
  Laptop, Monitor, Zap, Plug, Globe, Gamepad2, Building2, Lock,
  Shield, Target, Server, Cpu, Database, WifiOff, AlertTriangle, Power,
};

const PRESET_ICON_KEYS = [
  "Wrench","Settings","Construction","Hammer","Laptop","Monitor",
  "Zap","Plug","Globe","Gamepad2","Building2","Lock","Shield","Target","Server","Cpu","Database","WifiOff","AlertTriangle","Power"
];
const PRESET_COLORS = ["#f59e0b","#ef4444","#8b5cf6","#06b6d4","#10b981","#f97316","#ec4899","#6366f1","#84cc16","#14b8a6"];

export type MaintenanceConfig = {
  enabled: boolean;
  title: string;
  description: string;
  icon: string;
  color: string;
  updated_at?: string;
};

const DEFAULT: MaintenanceConfig = {
  enabled: false,
  title: "Технічні роботи",
  description: "Зараз проводяться технічні роботи. Зачекайте трохи — ми скоро повернемося!",
  icon: "Wrench",
  color: "#f59e0b",
};

// ─── Мінімалістичний екран тех. робіт ────────────────────────────────────────
export function MaintenanceScreen({ cfg, isPreview = false }: { cfg: MaintenanceConfig; isPreview?: boolean }) {
  const IconComp = ICON_MAP[cfg.icon] || Wrench;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: isPreview ? 360 : "100vh",
        minHeight: isPreview ? 360 : "100vh",
        background: "#0a0a0a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        borderRadius: isPreview ? 16 : 0,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', system-ui, sans-serif",
      }}
    >
      {/* Едина субтильна підсвітка зверху */}
      <div
        style={{
          position: "absolute",
          top: "-40%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "120%",
          height: "80%",
          background: `radial-gradient(ellipse at center, ${cfg.color}10 0%, transparent 60%)`,
          pointerEvents: "none",
        }}
      />

      {/* Контент */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          padding: "0 32px",
          maxWidth: 420,
        }}
      >
        {/* Іконка — чисте коло без зайвих елементів */}
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255,255,255,0.03)",
            border: `1px solid ${cfg.color}30`,
            marginBottom: 32,
            animation: "maint-breath 3s ease-in-out infinite",
          }}
        >
          <IconComp style={{ width: 30, height: 30, color: cfg.color }} strokeWidth={1.5} />
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: isPreview ? 22 : 28,
            fontWeight: 600,
            color: "#fafafa",
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
            marginBottom: 12,
            margin: 0,
          }}
        >
          {cfg.title}
        </h1>

        {/* Description */}
        <p
          style={{
            fontSize: 14,
            color: "rgba(255,255,255,0.5)",
            lineHeight: 1.6,
            maxWidth: 320,
            marginTop: 14,
            marginBottom: 32,
            fontWeight: 400,
          }}
        >
          {cfg.description}
        </p>

        {/* Status badge — тонкий мінімалістичний індикатор */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 14px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: cfg.color,
              animation: "maint-pulse 1.6s ease-in-out infinite",
            }}
          />
          <span
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.55)",
              letterSpacing: "0.08em",
              fontWeight: 500,
              textTransform: "uppercase",
            }}
          >
            CHERNIHIV RP
          </span>
        </div>
      </div>

      {/* Тонка лінія знизу */}
      {!isPreview && (
        <div
          style={{
            position: "absolute",
            bottom: 28,
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: 11,
            color: "rgba(255,255,255,0.25)",
            letterSpacing: "0.05em",
          }}
        >
          Дякуємо за терпіння
        </div>
      )}

      <style>{`
        @keyframes maint-pulse  { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.85)} }
        @keyframes maint-breath { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }
      `}</style>
    </div>
  );
}

// ─── Таб в адмінці ────────────────────────────────────────────────────────────
export default function TechWorkTab() {
  const [cfg, setCfg]         = useState<MaintenanceConfig>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    dbSelect("maintenance_mode", { filters: [{ col: "id", op: "eq", value: 1 }] })
      .then(({ data }) => {
        const row = Array.isArray(data) ? data[0] : null;
        if (row) setCfg({ ...DEFAULT, ...row });
        setLoading(false);
      });
  }, []);

  const save = async (patch: Partial<MaintenanceConfig>) => {
    const next = { ...cfg, ...patch };
    setCfg(next);
    setSaving(true);
    const { error } = await dbUpsert(
      "maintenance_mode",
      { id: 1, ...next, updated_at: new Date().toISOString() },
      { onConflict: "id" }
    );
    setSaving(false);
    if (error) {
      toast.error("❌ Помилка збереження: " + error.message);
      // Відкочуємо локально, щоб UI відповідав реальному стану
      setCfg(c => ({ ...c, ...(patch.enabled !== undefined ? { enabled: !patch.enabled } : {}) }));
      return;
    }
    toast.success(
      patch.enabled !== undefined
        ? (patch.enabled ? "🔴 Тех. роботи УВІМКНЕНО" : "🟢 Тех. роботи ВИМКНЕНО")
        : "✅ Збережено"
    );
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const statusColor = cfg.enabled ? "hsl(0 80% 60%)" : "hsl(142 70% 50%)";
  const statusGlow  = cfg.enabled ? "hsl(0 80% 60% / 0.25)" : "hsl(142 70% 50% / 0.2)";

  return (
    <div className="space-y-3">
      {/* ─── Статус картка ─── */}
      <div className="relative overflow-hidden rounded-2xl p-4"
        style={{ background: cfg.enabled ? "linear-gradient(135deg, hsl(0 70% 50% / 0.12), hsl(0 0% 5%))" : "linear-gradient(135deg, hsl(142 70% 45% / 0.1), hsl(0 0% 5%))", border: `1px solid ${cfg.enabled ? "hsl(0 70% 50% / 0.3)" : "hsl(142 70% 45% / 0.25)"}`, boxShadow: `0 0 30px ${cfg.enabled ? "hsl(0 70% 50% / 0.1)" : "hsl(142 70% 45% / 0.08)"}` }}>
        <div className="absolute top-0 right-0 w-40 h-40 opacity-15 pointer-events-none"
          style={{ background: `radial-gradient(circle, ${statusColor}, transparent)`, transform: "translate(30%, -30%)" }} />
        <div className="flex items-center justify-between gap-3 relative">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: `${statusColor}20`, border: `1.5px solid ${statusColor}40`, boxShadow: `0 0 20px ${statusGlow}` }}>
              {cfg.enabled
                ? <Wrench className="w-6 h-6" style={{ color: statusColor }} />
                : <Power className="w-6 h-6" style={{ color: statusColor }} />}
            </div>
            <div>
              <p className="text-sm font-black" style={{ color: statusColor }}>
                {cfg.enabled ? "ТЕХ. РОБОТИ АКТИВНІ" : "САЙТ ПРАЦЮЄ"}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {cfg.enabled ? "Гравці бачать екран техробіт" : "Всі гравці мають доступ"}
              </p>
            </div>
          </div>
          <button onClick={() => save({ enabled: !cfg.enabled })} disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all active:scale-90"
            style={{
              background: cfg.enabled ? "hsl(142 70% 45% / 0.15)" : "hsl(0 70% 50% / 0.15)",
              border: `1px solid ${cfg.enabled ? "hsl(142 70% 45% / 0.4)" : "hsl(0 70% 50% / 0.4)"}`,
              color: cfg.enabled ? "hsl(142 70% 55%)" : "hsl(0 70% 60%)",
            }}>
            {cfg.enabled ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
            {cfg.enabled ? "Вимкнути" : "Увімкнути"}
          </button>
        </div>
      </div>

      {/* Налаштування */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "hsl(0 0% 7%)", border: "1px solid hsl(0 0% 14%)" }}>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "hsl(45 90% 55% / 0.15)", border: "1px solid hsl(45 90% 55% / 0.3)" }}>
                <Wrench className="w-3.5 h-3.5" style={{ color: "hsl(45 90% 55%)" }} />
              </div>
              <span className="text-sm font-bold text-white">Налаштування екрану</span>
            </div>
            <button onClick={() => setPreview(p => !p)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl transition-all active:scale-90"
              style={{ background: "hsl(200 80% 55% / 0.1)", border: "1px solid hsl(200 80% 55% / 0.25)", color: "hsl(200 80% 65%)" }}>
              <RefreshCw className="w-3 h-3" />
              {preview ? "Сховати" : "Перегляд"}
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-[0.15em]" style={{ color: "hsl(0 0% 40%)" }}>Заголовок</label>
            <input className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none" style={{ background: "hsl(0 0% 5%)", border: "1px solid hsl(0 0% 18%)", color: "white" }}
              value={cfg.title} onChange={e => setCfg(c => ({ ...c, title: e.target.value }))} placeholder="Технічні роботи" />
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-[0.15em]" style={{ color: "hsl(0 0% 40%)" }}>Опис</label>
            <textarea rows={3} className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none resize-none" style={{ background: "hsl(0 0% 5%)", border: "1px solid hsl(0 0% 18%)", color: "white" }}
              value={cfg.description} onChange={e => setCfg(c => ({ ...c, description: e.target.value }))} />
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-[0.15em]" style={{ color: "hsl(0 0% 40%)" }}>Іконка</label>
            <div className="grid grid-cols-5 gap-2">
              {PRESET_ICON_KEYS.map(key => {
                const IconComp = ICON_MAP[key];
                return (
                  <button key={key} onClick={() => setCfg(c => ({ ...c, icon: key }))}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 ${cfg.icon === key ? "border-2 scale-110" : "liquid-glass border border-border hover:border-primary/30"}`}
                    style={cfg.icon === key ? { borderColor: cfg.color, background: cfg.color + "22" } : {}}>
                    {IconComp ? <IconComp className="w-5 h-5" style={{ color: cfg.icon === key ? cfg.color : undefined }} /> : key}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-[0.15em]" style={{ color: "hsl(0 0% 40%)" }}>Колір</label>
            <div className="flex flex-wrap gap-2 items-center">
              {PRESET_COLORS.map(color => (
                <button key={color} onClick={() => setCfg(c => ({ ...c, color }))}
                  className={`w-8 h-8 rounded-full transition-all active:scale-90 ${cfg.color === color ? "ring-2 ring-white ring-offset-2 ring-offset-black scale-110" : ""}`}
                  style={{ background: color }} />
              ))}
              <input type="color" value={cfg.color} onChange={e => setCfg(c => ({ ...c, color: e.target.value }))}
                className="w-8 h-8 rounded-full cursor-pointer bg-transparent border-0" />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={() => save(cfg)} disabled={saving}
              className="flex-1 py-3 rounded-xl text-sm font-black uppercase tracking-wide transition-all active:scale-[0.97] flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, hsl(84 81% 44% / 0.2), hsl(84 81% 44% / 0.06))", border: "1px solid hsl(84 81% 44% / 0.35)", color: "hsl(84 81% 55%)" }}>
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><Wrench className="w-3.5 h-3.5" /> Зберегти</>}
            </button>
            <button onClick={() => setCfg(DEFAULT)}
              className="px-4 py-3 rounded-xl text-xs transition-all active:scale-90"
              style={{ background: "hsl(0 0% 5%)", border: "1px solid hsl(0 0% 18%)", color: "hsl(0 0% 45%)" }}>
              Скинути
            </button>
          </div>
        </div>
      </div>

      {/* Preview */}
      {preview && (
        <div className="rounded-2xl overflow-hidden border border-border">
          <MaintenanceScreen cfg={cfg} isPreview />
        </div>
      )}
    </div>
  );
}
