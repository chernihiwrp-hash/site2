import { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/store";
import { dbUpsert } from "../../lib/db";
import NeonCard from "../../components/NeonCard";
import GradientButton from "../../components/GradientButton";
import { toast } from "sonner";
import { Wrench, Power, PowerOff, RefreshCw } from "lucide-react";

const PRESET_ICONS = ["fix","⚙️","🛠️","🚧","🔨","💻","🖥️","⚡","🔌","🌐","🎮","🏗️","🔒","🛡️","🎯"];
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
  icon: "🔧",
  color: "#f59e0b",
};

// ─── Анімований екран тех. робіт ─────────────────────────────────────────────
export function MaintenanceScreen({ cfg, isPreview = false }: { cfg: MaintenanceConfig; isPreview?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef   = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Частинки — самі символи
    const COUNT = isPreview ? 18 : 36;
    type Particle = {
      x: number; y: number; vx: number; vy: number;
      size: number; opacity: number; char: string; rotation: number; vr: number;
    };

    const chars = [cfg.icon, "⚙", "✦", "◈", "▸", "◉", "⟳", "✕", "◌", "⬡", cfg.icon, "✦"];

    const make = (): Particle => ({
      x:        Math.random() * canvas.width,
      y:        Math.random() * canvas.height,
      vx:       (Math.random() - 0.5) * 0.4,
      vy:       -Math.random() * 0.6 - 0.2,
      size:     Math.random() * 18 + 10,
      opacity:  Math.random() * 0.35 + 0.05,
      char:     chars[Math.floor(Math.random() * chars.length)],
      rotation: Math.random() * Math.PI * 2,
      vr:       (Math.random() - 0.5) * 0.01,
    });

    const particles: Particle[] = Array.from({ length: COUNT }, make);

    // Hex grid points
    const hex: { x: number; y: number; phase: number }[] = [];
    const GRID = isPreview ? 40 : 55;
    for (let row = 0; row * GRID * 0.866 < 800; row++) {
      for (let col = 0; col * GRID < 400; col++) {
        hex.push({
          x: col * GRID + (row % 2 === 0 ? 0 : GRID / 2),
          y: row * GRID * 0.866,
          phase: Math.random() * Math.PI * 2,
        });
      }
    }

    let t = 0;
    const [r, g, b] = hexToRgb(cfg.color);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      t += 0.016;

      // --- hex grid ---
      hex.forEach(h => {
        const pulse = (Math.sin(t * 0.8 + h.phase) + 1) / 2;
        ctx.strokeStyle = `rgba(${r},${g},${b},${0.04 + pulse * 0.06})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i;
          const hx = h.x + Math.cos(a) * GRID * 0.48;
          const hy = h.y + Math.sin(a) * GRID * 0.48;
          i === 0 ? ctx.moveTo(hx, hy) : ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.stroke();
      });

      // --- floating particles ---
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vr;
        if (p.y < -40) { Object.assign(p, make()); p.y = canvas.height + 20; }
        if (p.x < -40 || p.x > canvas.width + 40) { Object.assign(p, make()); }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.opacity;
        ctx.font = `${p.size}px serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillText(p.char, 0, 0);
        ctx.restore();
      });

      // --- scan line ---
      const scanY = ((t * 60) % (canvas.height + 40)) - 20;
      const grad = ctx.createLinearGradient(0, scanY - 8, 0, scanY + 8);
      grad.addColorStop(0,   `rgba(${r},${g},${b},0)`);
      grad.addColorStop(0.5, `rgba(${r},${g},${b},0.06)`);
      grad.addColorStop(1,   `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, scanY - 8, canvas.width, 16);

      // --- corner brackets ---
      const bSize = 22, bOff = 10;
      ctx.strokeStyle = `rgba(${r},${g},${b},0.35)`;
      ctx.lineWidth = 1.5;
      [[bOff, bOff, 1, 1], [canvas.width - bOff, bOff, -1, 1],
       [bOff, canvas.height - bOff, 1, -1], [canvas.width - bOff, canvas.height - bOff, -1, -1]]
        .forEach(([x, y, sx, sy]) => {
          ctx.beginPath();
          ctx.moveTo(x as number, (y as number) + (sy as number) * bSize);
          ctx.lineTo(x as number, y as number);
          ctx.lineTo((x as number) + (sx as number) * bSize, y as number);
          ctx.stroke();
        });

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(animRef.current); ro.disconnect(); };
  }, [cfg.color, cfg.icon, isPreview]);

  return (
    <div style={{
      position: "relative",
      width: "100%",
      height: isPreview ? 320 : "100vh",
      minHeight: isPreview ? 320 : "100vh",
      background: `radial-gradient(ellipse at 50% 40%, ${cfg.color}12 0%, #000 65%)`,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      borderRadius: isPreview ? 16 : 0,
    }}>
      {/* Canvas background */}
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />

      {/* Vignette */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse at 50% 50%, transparent 40%, #000000cc 100%)",
      }} />

      {/* Content */}
      <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "0 32px" }}>

        {/* Top label */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "4px 12px", borderRadius: 20, marginBottom: 28,
          background: `${cfg.color}18`,
          border: `1px solid ${cfg.color}40`,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.color, boxShadow: `0 0 8px ${cfg.color}`, animation: "maint-blink 1.4s ease-in-out infinite" }} />
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: cfg.color, textTransform: "uppercase" }}>
            CHERNIHIV RP
          </span>
        </div>

        {/* Icon */}
        <div style={{ position: "relative", marginBottom: 24 }}>
          {/* Outer ring */}
          <div style={{
            position: "absolute", inset: -16, borderRadius: "50%",
            border: `1px solid ${cfg.color}30`,
            animation: "maint-spin-slow 8s linear infinite",
          }}>
            {[0, 90, 180, 270].map(deg => (
              <div key={deg} style={{
                position: "absolute", width: 6, height: 6, borderRadius: "50%",
                background: cfg.color, boxShadow: `0 0 6px ${cfg.color}`,
                top: "50%", left: "50%",
                transform: `rotate(${deg}deg) translateX(calc(50% + 8px)) translateY(-50%)`,
              }} />
            ))}
          </div>
          {/* Inner ring */}
          <div style={{
            position: "absolute", inset: -8, borderRadius: "50%",
            border: `1px dashed ${cfg.color}25`,
            animation: "maint-spin-slow 5s linear infinite reverse",
          }} />
          {/* Icon box */}
          <div style={{
            width: 80, height: 80, borderRadius: 22, fontSize: 38,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: `${cfg.color}18`,
            border: `1.5px solid ${cfg.color}50`,
            boxShadow: `0 0 32px ${cfg.color}35, 0 0 64px ${cfg.color}15`,
            animation: "maint-pulse 2.5s ease-in-out infinite",
          }}>
            {cfg.icon}
          </div>
        </div>

        {/* Divider */}
        <div style={{
          width: 48, height: 1, marginBottom: 20,
          background: `linear-gradient(90deg, transparent, ${cfg.color}80, transparent)`,
        }} />

        {/* Title */}
        <h1 style={{
          fontSize: 24, fontWeight: 900, color: "#fff",
          letterSpacing: "-0.02em", lineHeight: 1.15,
          marginBottom: 12, maxWidth: 280,
          textShadow: `0 0 24px ${cfg.color}40`,
        }}>
          {cfg.title}
        </h1>

        {/* Description */}
        <p style={{
          fontSize: 13, color: "rgba(255,255,255,0.45)",
          lineHeight: 1.65, maxWidth: 260, marginBottom: 28,
        }}>
          {cfg.description}
        </p>

        {/* Dots */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 7, height: 7, borderRadius: "50%",
              background: cfg.color,
              boxShadow: `0 0 8px ${cfg.color}`,
              opacity: 0.8,
              animation: `maint-bounce 1.4s ease-in-out ${i * 0.18}s infinite`,
            }} />
          ))}
        </div>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes maint-blink   { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes maint-pulse   { 0%,100%{box-shadow:0 0 32px ${cfg.color}35,0 0 64px ${cfg.color}15} 50%{box-shadow:0 0 48px ${cfg.color}55,0 0 96px ${cfg.color}25} }
        @keyframes maint-bounce  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes maint-spin-slow { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) || 245;
  const g = parseInt(hex.slice(3, 5), 16) || 158;
  const b = parseInt(hex.slice(5, 7), 16) || 11;
  return [r, g, b];
}

// ─── Таб в адмінці ────────────────────────────────────────────────────────────
export default function TechWorkTab() {
  const [cfg, setCfg]       = useState<MaintenanceConfig>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    supabase.from("maintenance_mode").select("*").eq("id", 1).maybeSingle()
      .then(({ data }) => { if (data) setCfg({ ...DEFAULT, ...data }); setLoading(false); });
  }, []);

  const save = async (patch: Partial<MaintenanceConfig>) => {
    const next = { ...cfg, ...patch };
    setCfg(next);
    setSaving(true);
    await dbUpsert("maintenance_mode", { id: 1, ...next, updated_at: new Date().toISOString() }, { onConflict: "id" });
    setSaving(false);
    toast.success(patch.enabled !== undefined
      ? (patch.enabled ? "🔴 Тех. роботи УВІМКНЕНО" : "🟢 Тех. роботи ВИМКНЕНО")
      : "✅ Збережено");
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Статус */}
      <NeonCard glowColor={cfg.enabled ? "red" : "green"}>
        <div className="p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl ${cfg.enabled ? "bg-red-500/20 border border-red-500/30" : "bg-emerald-500/20 border border-emerald-500/30"}`}>
              {cfg.enabled ? "🔴" : "🟢"}
            </div>
            <div>
              <div className="font-bold text-sm">{cfg.enabled ? "Тех. роботи АКТИВНІ" : "Сайт працює нормально"}</div>
              <div className="text-xs text-muted-foreground">{cfg.enabled ? "Гравці бачать екран тех. робіт" : "Всі гравці мають доступ"}</div>
            </div>
          </div>
          <button onClick={() => save({ enabled: !cfg.enabled })} disabled={saving}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all active:scale-95 ${cfg.enabled ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30" : "bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30"}`}>
            {cfg.enabled ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
            {cfg.enabled ? "Вимкнути" : "Увімкнути"}
          </button>
        </div>
      </NeonCard>

      {/* Налаштування */}
      <NeonCard>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm flex items-center gap-2"><Wrench className="w-4 h-4 text-primary" /> Налаштування екрану</h3>
            <button onClick={() => setPreview(p => !p)} className="text-xs text-primary border border-primary/30 px-3 py-1 rounded-lg hover:bg-primary/10 transition-colors">
              {preview ? "Сховати" : "👁 Перегляд"}
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] text-muted-foreground uppercase tracking-widest font-semibold">Заголовок</label>
            <input className="w-full liquid-glass rounded-xl px-3 py-2.5 text-sm border border-border focus:outline-none focus:ring-1 focus:ring-primary/40 bg-transparent"
              value={cfg.title} onChange={e => setCfg(c => ({ ...c, title: e.target.value }))} placeholder="Технічні роботи" />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] text-muted-foreground uppercase tracking-widest font-semibold">Опис</label>
            <textarea rows={3} className="w-full liquid-glass rounded-xl px-3 py-2.5 text-sm border border-border focus:outline-none focus:ring-1 focus:ring-primary/40 bg-transparent resize-none"
              value={cfg.description} onChange={e => setCfg(c => ({ ...c, description: e.target.value }))} />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] text-muted-foreground uppercase tracking-widest font-semibold">Іконка</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_ICONS.map(icon => (
                <button key={icon} onClick={() => setCfg(c => ({ ...c, icon }))}
                  className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all active:scale-90 ${cfg.icon === icon ? "border-2 scale-110" : "liquid-glass border border-border hover:border-primary/30"}`}
                  style={cfg.icon === icon ? { borderColor: cfg.color, background: cfg.color + "22" } : {}}>
                  {icon}
                </button>
              ))}
              <input className="w-10 h-10 rounded-xl liquid-glass border border-border text-center text-lg bg-transparent focus:outline-none focus:ring-1 focus:ring-primary/40"
                value={cfg.icon} onChange={e => setCfg(c => ({ ...c, icon: e.target.value }))} maxLength={2} title="Свій emoji" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] text-muted-foreground uppercase tracking-widest font-semibold">Колір</label>
            <div className="flex flex-wrap gap-2 items-center">
              {PRESET_COLORS.map(color => (
                <button key={color} onClick={() => setCfg(c => ({ ...c, color }))}
                  className={`w-8 h-8 rounded-full transition-all active:scale-90 ${cfg.color === color ? "ring-2 ring-white ring-offset-2 ring-offset-black scale-110" : ""}`}
                  style={{ background: color }} />
              ))}
              <input type="color" value={cfg.color} onChange={e => setCfg(c => ({ ...c, color: e.target.value }))}
                className="w-8 h-8 rounded-full border-0 cursor-pointer bg-transparent" />
              <span className="text-xs font-mono text-muted-foreground">{cfg.color}</span>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <GradientButton onClick={() => save({})} disabled={saving} className="flex-1">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin mx-auto" /> : "💾 Зберегти"}
            </GradientButton>
            <button onClick={() => setCfg(DEFAULT)} className="px-4 py-2.5 rounded-xl text-xs border border-border text-muted-foreground hover:border-primary/20 transition-colors">
              Скинути
            </button>
          </div>
        </div>
      </NeonCard>

      {/* Preview */}
      {preview && (
        <div className="rounded-2xl overflow-hidden border border-border">
          <MaintenanceScreen cfg={cfg} isPreview />
        </div>
      )}
    </div>
  );
}
