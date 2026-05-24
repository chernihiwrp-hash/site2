// TechWorkTab — керування режимом технічних робіт.
// Зберігає налаштування в таблиці maintenance_mode (1 рядок, id=1).

import { useState, useEffect } from "react";
import { supabase } from "../../lib/store";
import { dbUpsert } from "../../lib/db";
import NeonCard from "../../components/NeonCard";
import GradientButton from "../../components/GradientButton";
import { toast } from "sonner";
import { Wrench, Power, PowerOff, RefreshCw } from "lucide-react";

const PRESET_ICONS = ["🔧","⚙️","🛠️","🚧","🔨","💻","🖥️","⚡","🔌","🌐","🎮","🏗️"];
const PRESET_COLORS = [
  "#f59e0b","#ef4444","#8b5cf6","#06b6d4","#10b981","#f97316","#ec4899","#6366f1","#84cc16",
];

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

export default function TechWorkTab() {
  const [cfg, setCfg] = useState<MaintenanceConfig>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    supabase.from("maintenance_mode").select("*").eq("id", 1).maybeSingle()
      .then(({ data }) => {
        if (data) setCfg({ ...DEFAULT, ...data });
        setLoading(false);
      });
  }, []);

  const save = async (patch: Partial<MaintenanceConfig>) => {
    const next = { ...cfg, ...patch };
    setCfg(next);
    setSaving(true);
    await dbUpsert("maintenance_mode", { id: 1, ...next, updated_at: new Date().toISOString() }, { onConflict: "id" });
    setSaving(false);
    toast.success(patch.enabled !== undefined
      ? (patch.enabled ? "✅ Режим тех. робіт УВІМКНЕНО" : "✅ Режим тех. робіт ВИМКНЕНО")
      : "✅ Збережено");
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">

      {/* ── Статус ── */}
      <NeonCard glowColor={cfg.enabled ? "red" : "green"}>
        <div className="p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl ${
              cfg.enabled ? "bg-red-500/20 border border-red-500/30" : "bg-emerald-500/20 border border-emerald-500/30"
            }`}>
              {cfg.enabled ? "🔴" : "🟢"}
            </div>
            <div>
              <div className="font-bold text-sm text-foreground">
                {cfg.enabled ? "Технічні роботи АКТИВНІ" : "Сайт працює нормально"}
              </div>
              <div className="text-xs text-muted-foreground">
                {cfg.enabled
                  ? "Гравці бачать екран тех. робіт"
                  : "Всі гравці мають доступ до сайту"}
              </div>
            </div>
          </div>
          <button
            onClick={() => save({ enabled: !cfg.enabled })}
            disabled={saving}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all active:scale-95 ${
              cfg.enabled
                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30"
                : "bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30"
            }`}
          >
            {cfg.enabled ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
            {cfg.enabled ? "Вимкнути" : "Увімкнути"}
          </button>
        </div>
      </NeonCard>

      {/* ── Налаштування ── */}
      <NeonCard>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Wrench className="w-4 h-4 text-primary" /> Налаштування екрану
            </h3>
            <button onClick={() => setPreview(p => !p)}
              className="text-xs text-primary border border-primary/30 px-3 py-1 rounded-lg hover:bg-primary/10 transition-colors">
              {preview ? "Приховати" : "👁 Попередній перегляд"}
            </button>
          </div>

          {/* Назва */}
          <div className="space-y-1.5">
            <label className="text-[11px] text-muted-foreground uppercase tracking-widest font-semibold">Заголовок</label>
            <input
              className="w-full liquid-glass rounded-xl px-3 py-2.5 text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/40 bg-transparent"
              value={cfg.title}
              onChange={e => setCfg(c => ({ ...c, title: e.target.value }))}
              placeholder="Технічні роботи"
            />
          </div>

          {/* Опис */}
          <div className="space-y-1.5">
            <label className="text-[11px] text-muted-foreground uppercase tracking-widest font-semibold">Опис</label>
            <textarea
              rows={3}
              className="w-full liquid-glass rounded-xl px-3 py-2.5 text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/40 bg-transparent resize-none"
              value={cfg.description}
              onChange={e => setCfg(c => ({ ...c, description: e.target.value }))}
              placeholder="Коротке пояснення для гравців..."
            />
          </div>

          {/* Іконка */}
          <div className="space-y-1.5">
            <label className="text-[11px] text-muted-foreground uppercase tracking-widest font-semibold">Іконка</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_ICONS.map(icon => (
                <button key={icon} onClick={() => setCfg(c => ({ ...c, icon }))}
                  className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all active:scale-90 ${
                    cfg.icon === icon
                      ? "border-2 scale-110"
                      : "liquid-glass border border-border hover:border-primary/30"
                  }`}
                  style={cfg.icon === icon ? { borderColor: cfg.color, background: cfg.color + "22" } : {}}>
                  {icon}
                </button>
              ))}
              {/* Кастомна іконка */}
              <input
                className="w-10 h-10 rounded-xl liquid-glass border border-border text-center text-lg bg-transparent focus:outline-none focus:ring-1 focus:ring-primary/40"
                value={cfg.icon}
                onChange={e => setCfg(c => ({ ...c, icon: e.target.value }))}
                maxLength={2}
                title="Власна іконка (emoji)"
              />
            </div>
          </div>

          {/* Колір */}
          <div className="space-y-1.5">
            <label className="text-[11px] text-muted-foreground uppercase tracking-widest font-semibold">Акцентний колір</label>
            <div className="flex flex-wrap gap-2 items-center">
              {PRESET_COLORS.map(color => (
                <button key={color} onClick={() => setCfg(c => ({ ...c, color }))}
                  className={`w-8 h-8 rounded-full transition-all active:scale-90 ${cfg.color === color ? "ring-2 ring-white ring-offset-2 ring-offset-black scale-110" : ""}`}
                  style={{ background: color }}
                />
              ))}
              <input type="color" value={cfg.color}
                onChange={e => setCfg(c => ({ ...c, color: e.target.value }))}
                className="w-8 h-8 rounded-full border-0 cursor-pointer bg-transparent"
                title="Свій колір" />
              <span className="text-xs font-mono text-muted-foreground">{cfg.color}</span>
            </div>
          </div>

          {/* Кнопки */}
          <div className="flex gap-2 pt-1">
            <GradientButton onClick={() => save({})} disabled={saving} className="flex-1">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin mx-auto" /> : "💾 Зберегти налаштування"}
            </GradientButton>
            <button onClick={() => setCfg(DEFAULT)}
              className="px-4 py-2.5 rounded-xl text-xs border border-border text-muted-foreground hover:border-primary/20 transition-colors">
              Скинути
            </button>
          </div>
        </div>
      </NeonCard>

      {/* ── Попередній перегляд ── */}
      {preview && (
        <NeonCard>
          <div className="p-3">
            <div className="text-[11px] text-muted-foreground uppercase tracking-widest font-semibold mb-3">
              👁 Попередній перегляд — так бачать гравці
            </div>
            <MaintenanceScreen cfg={cfg} isPreview />
          </div>
        </NeonCard>
      )}
    </div>
  );
}

// ─── Екран технічних робіт — використовується і в App.tsx ─────────────────
export function MaintenanceScreen({ cfg, isPreview = false }: { cfg: MaintenanceConfig; isPreview?: boolean }) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center px-6 ${
        isPreview ? "py-8 rounded-2xl" : "min-h-screen"
      }`}
      style={{
        background: isPreview
          ? `radial-gradient(ellipse at 50% 0%, ${cfg.color}18 0%, transparent 70%)`
          : `radial-gradient(ellipse at 50% 30%, ${cfg.color}15 0%, #000 65%)`,
      }}
    >
      {/* Іконка */}
      <div className="relative mb-5">
        <div
          className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl"
          style={{
            background: `${cfg.color}20`,
            border: `2px solid ${cfg.color}40`,
            boxShadow: `0 0 40px ${cfg.color}30`,
          }}
        >
          {cfg.icon}
        </div>
        {/* Пульсуючий ореол */}
        <div className="absolute inset-0 rounded-3xl animate-ping opacity-20"
          style={{ background: cfg.color, animationDuration: "2s" }} />
      </div>

      {/* Лінія */}
      <div className="w-16 h-0.5 rounded-full mb-5"
        style={{ background: `linear-gradient(90deg, transparent, ${cfg.color}, transparent)` }} />

      {/* Заголовок */}
      <h1 className="text-2xl font-black text-white mb-3 leading-tight" style={{ letterSpacing: "-0.02em" }}>
        {cfg.title}
      </h1>

      {/* Опис */}
      <p className="text-sm text-muted-foreground leading-relaxed max-w-[280px]">
        {cfg.description}
      </p>

      {/* Анімований рядок знизу */}
      {!isPreview && (
        <div className="mt-8 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: cfg.color, animationDelay: "0ms" }} />
          <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: cfg.color, animationDelay: "150ms" }} />
          <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: cfg.color, animationDelay: "300ms" }} />
        </div>
      )}
    </div>
  );
}
