/* ============================================================
   ПАТЧ для src/pages/admin/AdminBattlePassTab.tsx
   Заміни наявні `interface SeasonConfig` та `const SeasonConfigTab`
   на код нижче. Додано поля:
     • background_url — фото-фон батлпасу (liquid-glass режим карток)
     • level_color    — колір шкали номерів рівня
   ============================================================ */

import { useState, useEffect } from "react";
import { dbSelect, dbUpsert } from "../../lib/db";
import { toast } from "sonner";
import { Save, Palette, Image as ImageIcon, Layers } from "lucide-react";

const inputCls = "w-full rounded-xl px-3 py-2.5 text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-white/25 transition-colors";
const labelCls = "block text-[10px] uppercase tracking-widest font-bold text-white/40 mb-1.5";

export interface SeasonConfig {
  season_name:    string;
  banner_url:     string;
  background_url: string;   // NEW
  gradient_from:  string;
  gradient_to:    string;
  accent_color:   string;
  level_color:    string;   // NEW
  description:    string;
}

export const SeasonConfigTab = () => {
  const [form, setForm] = useState<SeasonConfig>({
    season_name:    "",
    banner_url:     "",
    background_url: "",
    gradient_from:  "#1a0a2e",
    gradient_to:    "#0a0a0a",
    accent_color:   "#fbbf24",
    level_color:    "#38bdf8",
    description:    "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const set = (k: keyof SeasonConfig, v: string) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    dbSelect("battlepass_config", { limit: 1 }).then(res => {
      const row = (res.data as any[])?.[0];
      if (row) setForm(p => ({
        ...p,
        season_name:    row.season_name    || "",
        banner_url:     row.banner_url     || "",
        background_url: row.background_url || "",
        gradient_from:  row.gradient_from  || "#1a0a2e",
        gradient_to:    row.gradient_to    || "#0a0a0a",
        accent_color:   row.accent_color   || "#fbbf24",
        level_color:    row.level_color    || "#38bdf8",
        description:    row.description    || "",
      }));
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await dbUpsert("battlepass_config", [{ id: 1, ...form }], { onConflict: "id" });
      if (error) throw error;
      toast.success("Конфіг сезону збережено ✓");
    } catch (e: any) {
      toast.error(e?.message || "Помилка збереження");
    }
    setSaving(false);
  };

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-6 h-6 rounded-full border-2 border-yellow-400/30 border-t-yellow-400 animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Назва / опис */}
      <div className="rounded-2xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Назва та опис</p>
        <div>
          <label className={labelCls}>Назва сезону</label>
          <input className={inputCls} placeholder="БАТЛПАС / СЕЗОН 2"
            value={form.season_name} onChange={e => set("season_name", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Підзаголовок</label>
          <input className={inputCls} placeholder="Сезонні нагороди"
            value={form.description} onChange={e => set("description", e.target.value)} />
        </div>
      </div>

      {/* Banner */}
      <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-3">
          <ImageIcon className="w-3 h-3 inline mr-1.5" />Банер (фото зверху)
        </p>
        <input className={inputCls} placeholder="https://.../banner.jpg"
          value={form.banner_url} onChange={e => set("banner_url", e.target.value)} />
        {form.banner_url && (
          <div className="mt-2 rounded-xl overflow-hidden" style={{ height: 80, border: "1px solid rgba(255,255,255,0.1)" }}>
            <img src={form.banner_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}
      </div>

      {/* NEW: Background (повноекранне фото-фон) */}
      <div className="rounded-2xl p-4" style={{ background: "rgba(168,85,247,0.05)", border: "1px solid rgba(168,85,247,0.25)" }}>
        <p className="text-[10px] font-black uppercase tracking-widest text-purple-300 mb-1.5">
          <Layers className="w-3 h-3 inline mr-1.5" />Фон батлпасу (замість банера)
        </p>
        <p className="text-[9px] text-white/40 mb-3">
          Якщо задано — використовується як повноекранне фото-фон, а картки стають
          <span className="text-purple-300 font-bold"> liquid glass</span> з блюром.
          Банер у такому режимі ховається.
        </p>
        <input className={inputCls} placeholder="https://.../background.jpg"
          value={form.background_url} onChange={e => set("background_url", e.target.value)} />
        {form.background_url && (
          <div className="mt-2 rounded-xl overflow-hidden" style={{ height: 120, border: "1px solid rgba(168,85,247,0.3)" }}>
            <img src={form.background_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}
      </div>

      {/* Gradient (використовується якщо немає background_url) */}
      <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-3">
          <Palette className="w-3 h-3 inline mr-1.5" />Градієнт фону (fallback)
        </p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          {[
            { key: "gradient_from" as const, label: "Зверху" },
            { key: "gradient_to"   as const, label: "Знизу"  },
          ].map(({ key, label }) => (
            <div key={key}>
              <p className="text-[9px] text-white/30 mb-1.5">{label}</p>
              <div className="flex gap-2 items-center">
                <input type="color" value={form[key]} onChange={e => set(key, e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer p-0.5"
                  style={{ border: "1px solid rgba(255,255,255,0.15)", background: "transparent" }} />
                <input className={`${inputCls} text-[11px]`} value={form[key]}
                  onChange={e => set(key, e.target.value)} placeholder="#000000" />
              </div>
            </div>
          ))}
        </div>
        <div className="h-6 rounded-lg"
          style={{ background: `linear-gradient(90deg,${form.gradient_from},${form.gradient_to})`, border: "1px solid rgba(255,255,255,0.08)" }} />
      </div>

      {/* Accent color */}
      <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-3">Акцентний колір</p>
        <div className="flex gap-3 items-center">
          <input type="color" value={form.accent_color} onChange={e => set("accent_color", e.target.value)}
            className="w-12 h-12 rounded-xl cursor-pointer p-0.5"
            style={{ border: "1px solid rgba(255,255,255,0.15)", background: "transparent" }} />
          <input className={inputCls} value={form.accent_color}
            onChange={e => set("accent_color", e.target.value)} placeholder="#fbbf24" />
        </div>
        <p className="text-[9px] text-white/25 mt-1.5">Колір назви, прогрес-бару та кнопки клейму</p>
      </div>

      {/* NEW: Level color */}
      <div className="rounded-2xl p-4" style={{ background: "rgba(56,189,248,0.05)", border: "1px solid rgba(56,189,248,0.25)" }}>
        <p className="text-[10px] font-black uppercase tracking-widest text-sky-300 mb-3">Колір шкали рівнів</p>
        <div className="flex gap-3 items-center">
          <input type="color" value={form.level_color} onChange={e => set("level_color", e.target.value)}
            className="w-12 h-12 rounded-xl cursor-pointer p-0.5"
            style={{ border: "1px solid rgba(255,255,255,0.15)", background: "transparent" }} />
          <input className={inputCls} value={form.level_color}
            onChange={e => set("level_color", e.target.value)} placeholder="#38bdf8" />
        </div>
        <p className="text-[9px] text-white/25 mt-1.5">Колір кружечків з номерами рівня під картками</p>
      </div>

      <button onClick={handleSave} disabled={saving}
        className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-black transition-all active:scale-98"
        style={{ background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.4)", color: "#fbbf24", opacity: saving ? 0.7 : 1 }}>
        <Save className="w-4 h-4" />{saving ? "Зберігається..." : "Зберегти конфіг сезону"}
      </button>
    </div>
  );
};
