/* ============================================================
   AdminBattlePassTab
   Дві вкладки:
     • Конфіг сезону (назва, банер, фон, кольори)
     • Слоти (CRUD ячейок: додавання / редагування / видалення)
   ============================================================ */

import { useState, useEffect } from "react";
import { dbSelect, dbUpsert, dbInsert, dbUpdate, dbDelete } from "../../lib/db";
import { toast } from "sonner";
import {
  Save, Palette, Image as ImageIcon, Layers,
  Settings, Grid3x3, Plus, Trash2, Pencil, X, Check,
} from "lucide-react";

const inputCls =
  "w-full rounded-xl px-3 py-2.5 text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-white/25 transition-colors";
const labelCls =
  "block text-[10px] uppercase tracking-widest font-bold text-white/40 mb-1.5";

/* ─────────────────────────── ТИПИ ─────────────────────────── */

export interface SeasonConfig {
  season_name:    string;
  banner_url:     string;
  background_url: string;
  gradient_from:  string;
  gradient_to:    string;
  accent_color:   string;
  level_color:    string;
  description:    string;
}

type Rarity    = "common" | "rare" | "legendary" | "mythic";
type PrizeType = "cr" | "nft" | "car" | "custom";

interface BattlePassSlot {
  id?:          number;
  slot_number:  number;
  title:        string;
  rarity:       Rarity;
  prize_type:   PrizeType;
  prize_value?: string;
  image_url?:   string;
  nft_gift_id?: string;
  car_name?:    string;
}

const RARITY_OPTS: { v: Rarity; label: string; color: string }[] = [
  { v: "common",    label: "Звичайний",   color: "#9ca3af" },
  { v: "rare",      label: "Рідкісний",   color: "#3b82f6" },
  { v: "legendary", label: "Легендарний", color: "#fbbf24" },
  { v: "mythic",    label: "Міфічний",    color: "#ef4444" },
];

const PRIZE_OPTS: { v: PrizeType; label: string }[] = [
  { v: "cr",     label: "CR (валюта)" },
  { v: "nft",    label: "NFT" },
  { v: "car",    label: "Авто" },
  { v: "custom", label: "Інше" },
];

/* ─────────────────────────── КОНФІГ СЕЗОНУ ─────────────────────────── */

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
  const set = (k: keyof SeasonConfig, v: string) =>
    setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    dbSelect("battlepass_config", { limit: 1 }).then(res => {
      const row = (res.data as any[])?.[0];
      if (row)
        setForm(p => ({
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
      const { error } = await dbUpsert(
        "battlepass_config",
        [{ id: 1, ...form }],
        { onConflict: "id" },
      );
      if (error) throw error;
      toast.success("Конфіг сезону збережено ✓");
    } catch (e: any) {
      toast.error(e?.message || "Помилка збереження");
    }
    setSaving(false);
  };

  if (loading)
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 rounded-full border-2 border-yellow-400/30 border-t-yellow-400 animate-spin" />
      </div>
    );

  return (
    <div className="space-y-4">
      {/* Назва / опис */}
      <div
        className="rounded-2xl p-4 space-y-3"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <p className="text-[10px] font-black uppercase tracking-widest text-white/50">
          Назва та опис
        </p>
        <div>
          <label className={labelCls}>Назва сезону</label>
          <input
            className={inputCls}
            placeholder="БАТЛПАС / СЕЗОН 2"
            value={form.season_name}
            onChange={e => set("season_name", e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>Підзаголовок</label>
          <input
            className={inputCls}
            placeholder="Сезонні нагороди"
            value={form.description}
            onChange={e => set("description", e.target.value)}
          />
        </div>
      </div>

      {/* Banner — тепер також виконує роль фону */}
      <div
        className="rounded-2xl p-4"
        style={{ background: "rgba(168,85,247,0.05)", border: "1px solid rgba(168,85,247,0.25)" }}>
        <p className="text-[10px] font-black uppercase tracking-widest text-purple-300 mb-1.5">
          <ImageIcon className="w-3 h-3 inline mr-1.5" />
          Банер сторінки
        </p>
        <p className="text-[9px] text-white/40 mb-3">
          Якщо задано — використовується як <span className="text-purple-300 font-bold">повноекранний вертикальний фон</span> сторінки батлпасу,
          а картки автоматично стають <span className="text-purple-300 font-bold">liquid glass</span> (blur + затемнення).
        </p>
        <input
          className={inputCls}
          placeholder="https://.../banner.jpg"
          value={form.banner_url}
          onChange={e => set("banner_url", e.target.value)}
        />
        {form.banner_url && (
          <div
            className="mt-2 rounded-xl overflow-hidden"
            style={{ height: 140, border: "1px solid rgba(168,85,247,0.3)" }}>
            <img src={form.banner_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}
      </div>

      {/* Окреме фото-фон (опційно, перекриває banner_url) */}
      <div
        className="rounded-2xl p-4"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-1.5">
          <Layers className="w-3 h-3 inline mr-1.5" />
          Окремий фон (опційно)
        </p>
        <p className="text-[9px] text-white/40 mb-3">
          Якщо заповнено — перекриває банер у ролі фону.
        </p>
        <input
          className={inputCls}
          placeholder="https://.../background.jpg"
          value={form.background_url}
          onChange={e => set("background_url", e.target.value)}
        />
        {form.background_url && (
          <div
            className="mt-2 rounded-xl overflow-hidden"
            style={{ height: 120, border: "1px solid rgba(255,255,255,0.1)" }}>
            <img src={form.background_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}
      </div>

      {/* Gradient (fallback) */}
      <div
        className="rounded-2xl p-4"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-3">
          <Palette className="w-3 h-3 inline mr-1.5" />
          Градієнт фону (якщо немає фото)
        </p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          {[
            { key: "gradient_from" as const, label: "Зверху" },
            { key: "gradient_to"   as const, label: "Знизу"  },
          ].map(({ key, label }) => (
            <div key={key}>
              <p className="text-[9px] text-white/30 mb-1.5">{label}</p>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={form[key]}
                  onChange={e => set(key, e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer p-0.5"
                  style={{ border: "1px solid rgba(255,255,255,0.15)", background: "transparent" }}
                />
                <input
                  className={`${inputCls} text-[11px]`}
                  value={form[key]}
                  onChange={e => set(key, e.target.value)}
                  placeholder="#000000"
                />
              </div>
            </div>
          ))}
        </div>
        <div
          className="h-6 rounded-lg"
          style={{
            background: `linear-gradient(90deg,${form.gradient_from},${form.gradient_to})`,
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        />
      </div>

      {/* Accent color */}
      <div
        className="rounded-2xl p-4"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-3">
          Акцентний колір
        </p>
        <div className="flex gap-3 items-center">
          <input
            type="color"
            value={form.accent_color}
            onChange={e => set("accent_color", e.target.value)}
            className="w-12 h-12 rounded-xl cursor-pointer p-0.5"
            style={{ border: "1px solid rgba(255,255,255,0.15)", background: "transparent" }}
          />
          <input
            className={inputCls}
            value={form.accent_color}
            onChange={e => set("accent_color", e.target.value)}
            placeholder="#fbbf24"
          />
        </div>
        <p className="text-[9px] text-white/25 mt-1.5">
          Колір назви, прогрес-бару та кнопки клейму
        </p>
      </div>

      {/* Level color */}
      <div
        className="rounded-2xl p-4"
        style={{ background: "rgba(56,189,248,0.05)", border: "1px solid rgba(56,189,248,0.25)" }}>
        <p className="text-[10px] font-black uppercase tracking-widest text-sky-300 mb-3">
          Колір шкали рівнів
        </p>
        <div className="flex gap-3 items-center">
          <input
            type="color"
            value={form.level_color}
            onChange={e => set("level_color", e.target.value)}
            className="w-12 h-12 rounded-xl cursor-pointer p-0.5"
            style={{ border: "1px solid rgba(255,255,255,0.15)", background: "transparent" }}
          />
          <input
            className={inputCls}
            value={form.level_color}
            onChange={e => set("level_color", e.target.value)}
            placeholder="#38bdf8"
          />
        </div>
        <p className="text-[9px] text-white/25 mt-1.5">
          Колір кружечків з номерами рівня під картками
        </p>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-black transition-all active:scale-98"
        style={{
          background: "rgba(251,191,36,0.15)",
          border: "1px solid rgba(251,191,36,0.4)",
          color: "#fbbf24",
          opacity: saving ? 0.7 : 1,
        }}>
        <Save className="w-4 h-4" />
        {saving ? "Зберігається..." : "Зберегти конфіг сезону"}
      </button>
    </div>
  );
};

/* ─────────────────────────── СЛОТИ (CRUD) ─────────────────────────── */

const emptySlot = (next: number): BattlePassSlot => ({
  slot_number: next,
  title:       "",
  rarity:      "common",
  prize_type:  "cr",
  prize_value: "",
  image_url:   "",
  nft_gift_id: "",
  car_name:    "",
});

export const SlotsTab = () => {
  const [slots, setSlots]     = useState<BattlePassSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<BattlePassSlot | null>(null);
  const [saving, setSaving]   = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await dbSelect("battlepass_slots", {
      order: { col: "slot_number", dir: "asc" },
    });
    setSlots(((res.data as any[]) || []) as BattlePassSlot[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const startNew = () => {
    const next = (slots[slots.length - 1]?.slot_number ?? 0) + 1;
    setEditing(emptySlot(next));
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const payload: any = {
        slot_number: Number(editing.slot_number) || 1,
        title:       editing.title || "",
        rarity:      editing.rarity,
        prize_type:  editing.prize_type,
        prize_value: editing.prize_value || null,
        image_url:   editing.image_url   || null,
        nft_gift_id: editing.nft_gift_id || null,
        car_name:    editing.car_name    || null,
      };
      if (editing.id) {
        const { error } = await dbUpdate("battlepass_slots", payload, {
          id: { op: "eq", value: editing.id },
        } as any);
        if (error) throw error;
        toast.success("Ячейку оновлено ✓");
      } else {
        const { error } = await dbInsert("battlepass_slots", [payload]);
        if (error) throw error;
        toast.success("Ячейку створено ✓");
      }
      setEditing(null);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Помилка збереження");
    }
    setSaving(false);
  };

  const remove = async (slot: BattlePassSlot) => {
    if (!slot.id) return;
    if (!confirm(`Видалити ячейку №${slot.slot_number}?`)) return;
    try {
      const { error } = await dbDelete("battlepass_slots", {
        id: { op: "eq", value: slot.id },
      } as any);
      if (error) throw error;
      toast.success("Видалено");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Помилка видалення");
    }
  };

  if (loading)
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 rounded-full border-2 border-yellow-400/30 border-t-yellow-400 animate-spin" />
      </div>
    );

  return (
    <div className="space-y-3">
      {/* Header / Add */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-black uppercase tracking-widest text-white/55">
          Ячейки ({slots.length})
        </p>
        <button
          onClick={startNew}
          className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-black uppercase tracking-widest transition-all active:scale-95"
          style={{
            background: "rgba(251,191,36,0.15)",
            border: "1px solid rgba(251,191,36,0.4)",
            color: "#fbbf24",
          }}>
          <Plus className="w-3.5 h-3.5" />
          Додати ячейку
        </button>
      </div>

      {/* List */}
      {slots.length === 0 && !editing && (
        <div
          className="rounded-2xl py-10 text-center text-[11px] uppercase tracking-widest text-white/35"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.1)" }}>
          Ячейок ще немає
        </div>
      )}

      <div className="space-y-2">
        {slots.map(s => {
          const rc = RARITY_OPTS.find(r => r.v === s.rarity)!;
          return (
            <div
              key={s.id}
              className="rounded-2xl p-3 flex items-center gap-3"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: `1px solid ${rc.color}40`,
              }}>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0"
                style={{
                  background: `${rc.color}22`,
                  color: rc.color,
                  border: `1px solid ${rc.color}66`,
                }}>
                {s.slot_number}
              </div>
              {s.image_url ? (
                <img
                  src={s.image_url}
                  alt=""
                  className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                  style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-xs"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  {s.prize_type === "cr" ? "💰" : s.prize_type === "nft" ? "🎁" : s.prize_type === "car" ? "🚗" : "✨"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold text-white truncate">
                  {s.title || "Без назви"}
                </p>
                <p className="text-[10px] text-white/50 truncate">
                  {rc.label} · {PRIZE_OPTS.find(p => p.v === s.prize_type)?.label}
                  {s.prize_value ? ` · ${s.prize_value}` : ""}
                </p>
              </div>
              <button
                onClick={() => setEditing({ ...s })}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-95"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <Pencil className="w-3.5 h-3.5 text-white/70" />
              </button>
              <button
                onClick={() => remove(s)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-95"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Editor modal */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
          onClick={() => !saving && setEditing(null)}>
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl p-4 max-h-[90vh] overflow-y-auto"
            style={{
              background: "#0c0c0f",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.7)",
            }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-black uppercase tracking-widest text-white">
                {editing.id ? "Редагувати ячейку" : "Нова ячейка"}
              </p>
              <button
                onClick={() => !saving && setEditing(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <X className="w-4 h-4 text-white/70" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Номер дня</label>
                  <input
                    type="number"
                    min={1}
                    className={inputCls}
                    value={editing.slot_number}
                    onChange={e => setEditing({ ...editing, slot_number: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className={labelCls}>Рідкість</label>
                  <select
                    className={inputCls}
                    value={editing.rarity}
                    onChange={e => setEditing({ ...editing, rarity: e.target.value as Rarity })}>
                    {RARITY_OPTS.map(r => (
                      <option key={r.v} value={r.v} style={{ background: "#0c0c0f" }}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelCls}>Назва</label>
                <input
                  className={inputCls}
                  placeholder="Наприклад: 100 CR"
                  value={editing.title}
                  onChange={e => setEditing({ ...editing, title: e.target.value })}
                />
              </div>

              <div>
                <label className={labelCls}>Тип призу</label>
                <select
                  className={inputCls}
                  value={editing.prize_type}
                  onChange={e => setEditing({ ...editing, prize_type: e.target.value as PrizeType })}>
                  {PRIZE_OPTS.map(p => (
                    <option key={p.v} value={p.v} style={{ background: "#0c0c0f" }}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              {editing.prize_type === "cr" && (
                <div>
                  <label className={labelCls}>Кількість CR</label>
                  <input
                    className={inputCls}
                    placeholder="100"
                    value={editing.prize_value || ""}
                    onChange={e => setEditing({ ...editing, prize_value: e.target.value })}
                  />
                </div>
              )}

              {editing.prize_type === "nft" && (
                <div>
                  <label className={labelCls}>ID NFT-подарунку</label>
                  <input
                    className={inputCls}
                    placeholder="nft_001"
                    value={editing.nft_gift_id || ""}
                    onChange={e => setEditing({ ...editing, nft_gift_id: e.target.value })}
                  />
                </div>
              )}

              {editing.prize_type === "car" && (
                <div>
                  <label className={labelCls}>Назва авто</label>
                  <input
                    className={inputCls}
                    placeholder="Bugatti Chiron"
                    value={editing.car_name || ""}
                    onChange={e => setEditing({ ...editing, car_name: e.target.value })}
                  />
                </div>
              )}

              <div>
                <label className={labelCls}>URL картинки (опційно)</label>
                <input
                  className={inputCls}
                  placeholder="https://.../prize.png"
                  value={editing.image_url || ""}
                  onChange={e => setEditing({ ...editing, image_url: e.target.value })}
                />
                {editing.image_url && (
                  <div
                    className="mt-2 w-full rounded-xl overflow-hidden"
                    style={{ height: 120, border: "1px solid rgba(255,255,255,0.1)" }}>
                    <img src={editing.image_url} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => !saving && setEditing(null)}
                className="flex-1 rounded-xl py-3 text-[12px] font-black uppercase tracking-widest"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.7)",
                }}>
                Скасувати
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 rounded-xl py-3 text-[12px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5"
                style={{
                  background: "rgba(251,191,36,0.15)",
                  border: "1px solid rgba(251,191,36,0.4)",
                  color: "#fbbf24",
                  opacity: saving ? 0.7 : 1,
                }}>
                <Check className="w-3.5 h-3.5" />
                {saving ? "Збереження..." : "Зберегти"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────── ОБОЛОНКА З ТАБАМИ ─────────────────────────── */

type AdminTab = "config" | "slots";

const AdminBattlePassTab = () => {
  const [tab, setTab] = useState<AdminTab>("config");

  const tabs: { id: AdminTab; label: string; icon: any }[] = [
    { id: "config", label: "Конфігурація", icon: Settings },
    { id: "slots",  label: "Ячейки",        icon: Grid3x3  },
  ];

  return (
    <div className="space-y-4">
      <div
        className="flex gap-1 p-1 rounded-2xl"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
        {tabs.map(t => {
          const Icon  = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[11px] font-black uppercase tracking-widest transition-all"
              style={{
                background: active ? "rgba(251,191,36,0.18)" : "transparent",
                border:     active ? "1px solid rgba(251,191,36,0.4)" : "1px solid transparent",
                color:      active ? "#fbbf24" : "rgba(255,255,255,0.5)",
              }}>
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "config" ? <SeasonConfigTab /> : <SlotsTab />}
    </div>
  );
};

export default AdminBattlePassTab;
