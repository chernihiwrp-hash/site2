import { useState, useEffect } from "react";
import { dbSelect, dbInsert, dbUpdate, dbDelete, dbUpsert } from "../../lib/db";
import { toast } from "sonner";
import { eq } from "../../lib/db";
import {
  Plus, Trash2, Edit3, Save, X, Star, Zap, Trophy, Flame, Crown,
  Settings, List, Palette, Image as ImageIcon, Eye,
} from "lucide-react";

// ─── ТИПИ ─────────────────────────────────────────────────────────
type Rarity    = "common" | "rare" | "legendary" | "mythic";
type PrizeType = "cr" | "nft" | "car" | "custom";
type AdminTab  = "slots" | "config";

interface BattlePassSlot {
  id?: number;
  slot_number: number;
  title:       string;
  rarity:      Rarity;
  prize_type:  PrizeType;
  prize_value?: string;
  image_url?:  string;
  nft_gift_id?: string;
  car_name?:   string;
}

interface SeasonConfig {
  season_name:   string;
  banner_url:    string;
  gradient_from: string;
  gradient_to:   string;
  accent_color:  string;
  description:   string;
}

interface NftGift { id: string; name?: string; title?: string; image_url?: string; }

// ─── РІДКОСТІ ─────────────────────────────────────────────────────
const RARITY_CFG: Record<Rarity, { label:string; color:string; bg:string; border:string; icon:any }> = {
  common:    { label:"Звичайний",   color:"#9ca3af", bg:"rgba(156,163,175,0.08)", border:"rgba(156,163,175,0.25)", icon:Star   },
  rare:      { label:"Рідкісний",   color:"#38bdf8", bg:"rgba(56,189,248,0.09)",  border:"rgba(56,189,248,0.3)",   icon:Zap    },
  legendary: { label:"Легендарний", color:"#fbbf24", bg:"rgba(251,191,36,0.10)",  border:"rgba(251,191,36,0.35)",  icon:Trophy },
  mythic:    { label:"Міфічний",    color:"#f87171", bg:"rgba(248,113,113,0.10)", border:"rgba(248,113,113,0.35)", icon:Flame  },
};

const PRIZE_LABELS: Record<PrizeType,string> = {
  cr:"💰 CR Токени", nft:"🎁 NFT Подарунок", car:"🚗 Машина", custom:"✨ Свій приз",
};

const inputCls = "w-full rounded-xl px-3 py-2.5 text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-white/25 transition-colors";
const labelCls = "block text-[10px] uppercase tracking-widest font-bold text-white/40 mb-1.5";

// ─── ФОРМА СЛОТУ ──────────────────────────────────────────────────
const SlotForm = ({ initial, nftGifts, onSave, onCancel }: {
  initial?:  BattlePassSlot;
  nftGifts:  NftGift[];
  onSave:    (s: BattlePassSlot) => void;
  onCancel:  () => void;
}) => {
  const [form, setForm] = useState<BattlePassSlot>(
    initial || { slot_number:1, title:"", rarity:"common", prize_type:"cr", prize_value:"", image_url:"" }
  );
  const [saving, setSaving] = useState(false);
  const set = (k: keyof BattlePassSlot, v: any) => setForm(p => ({ ...p, [k]:v }));
  const cfg  = RARITY_CFG[form.rarity];
  const Icon = cfg.icon;

  const handleSave = async () => {
    if (!form.title.trim()) return toast.error("Введи назву призу");
    setSaving(true);
    try {
      if (initial?.id) {
        const { error } = await dbUpdate("battlepass_slots", { match:{ id: initial.id }, values: form });
        if (error) throw error;
        toast.success("Слот оновлено ✓");
      } else {
        const { error } = await dbInsert("battlepass_slots", [form]);
        if (error) throw error;
        toast.success("Слот створено ✓");
      }
      onSave(form);
    } catch (e: any) { toast.error(e?.message || "Помилка"); }
    setSaving(false);
  };

  return (
    <div className="rounded-2xl p-4 mb-4" style={{ border:`1.5px solid ${cfg.border}`, background:cfg.bg, boxShadow:`0 0 20px ${cfg.color}22` }}>
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4" style={{ color:cfg.color }} />
        <span className="text-sm font-bold" style={{ color:cfg.color }}>{initial?.id ? "Редагування слоту" : "Новий слот"}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className={labelCls}>Номер позиції</label>
          <input type="number" min={1} className={inputCls} value={form.slot_number} onChange={e => set("slot_number", parseInt(e.target.value)||1)} />
        </div>
        <div>
          <label className={labelCls}>Назва призу</label>
          <input className={inputCls} placeholder="Наприклад: Елітна нагорода" value={form.title} onChange={e => set("title", e.target.value)} />
        </div>
      </div>

      {/* Рідкість */}
      <div className="mb-3">
        <label className={labelCls}>Рідкість</label>
        <div className="grid grid-cols-4 gap-2">
          {(["common","rare","legendary","mythic"] as Rarity[]).map(r => {
            const c = RARITY_CFG[r]; const Ic = c.icon; const active = form.rarity === r;
            return (
              <button key={r} onClick={() => set("rarity",r)}
                className="rounded-xl py-2 flex flex-col items-center gap-1 text-[9px] font-black uppercase tracking-wider transition-all"
                style={{ border:`1.5px solid ${active?c.color:"rgba(255,255,255,0.08)"}`, background:active?c.bg:"rgba(255,255,255,0.02)", color:active?c.color:"rgba(255,255,255,0.3)", boxShadow:active?`0 0 12px ${c.color}40`:"none" }}>
                <Ic className="w-4 h-4" />{c.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Тип призу */}
      <div className="mb-3">
        <label className={labelCls}>Тип призу</label>
        <div className="grid grid-cols-2 gap-2">
          {(["cr","nft","car","custom"] as PrizeType[]).map(p => (
            <button key={p} onClick={() => set("prize_type",p)}
              className="rounded-xl py-2 px-3 text-[10px] font-bold transition-all text-left"
              style={{ border:`1px solid ${form.prize_type===p?cfg.color:"rgba(255,255,255,0.08)"}`, background:form.prize_type===p?cfg.bg:"rgba(255,255,255,0.02)", color:form.prize_type===p?cfg.color:"rgba(255,255,255,0.35)" }}>
              {PRIZE_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {form.prize_type === "cr" && (
        <div className="mb-3">
          <label className={labelCls}>Кількість CR</label>
          <input type="number" className={inputCls} placeholder="1000" value={form.prize_value||""} onChange={e => set("prize_value",e.target.value)} />
        </div>
      )}
      {form.prize_type === "nft" && (
        <div className="mb-3">
          <label className={labelCls}>Оберіть NFT</label>
          <select className={inputCls} value={form.nft_gift_id||""} onChange={e => set("nft_gift_id",e.target.value||undefined)} style={{ background:"rgba(255,255,255,0.05)" }}>
            <option value="">— Оберіть NFT —</option>
            {nftGifts.map(n => <option key={n.id} value={n.id}>#{n.id} — {n.name||n.title||"NFT"}</option>)}
          </select>
        </div>
      )}
      {(form.prize_type === "car" || form.prize_type === "custom") && (
        <div className="mb-3">
          <label className={labelCls}>{form.prize_type==="car"?"Назва машини":"Назва призу"}</label>
          <input className={inputCls} placeholder={form.prize_type==="car"?"Ferrari 488":"Назва вашого призу"} value={form.prize_value||""} onChange={e => set("prize_value",e.target.value)} />
        </div>
      )}
      {form.prize_type !== "nft" && (
        <div className="mb-4">
          <label className={labelCls}>URL зображення {form.prize_type==="car"?"(фото машини)":"(іконка призу)"}</label>
          <input className={inputCls} placeholder="https://example.com/image.jpg" value={form.image_url||""} onChange={e => set("image_url",e.target.value)} />
          {form.image_url && <div className="mt-2 w-20 h-14 rounded-xl overflow-hidden border border-white/10"><img src={form.image_url} alt="" className="w-full h-full object-cover" /></div>}
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={handleSave} disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all"
          style={{ background:cfg.color,color:"#000",boxShadow:`0 4px 16px ${cfg.color}40`,opacity:saving?.7:1 }}>
          <Save className="w-4 h-4" />{saving?"Зберігається...":"Зберегти"}
        </button>
        <button onClick={onCancel} className="px-4 rounded-xl text-sm font-bold transition-all" style={{ border:"1px solid rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.5)" }}>
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// ─── КАРТКА СЛОТУ В СПИСКУ ────────────────────────────────────────
const AdminSlotCard = ({ slot, onEdit, onDelete }: {
  slot:     BattlePassSlot & { id:number };
  onEdit:   () => void;
  onDelete: () => void;
}) => {
  const cfg  = RARITY_CFG[slot.rarity];
  const Icon = cfg.icon;
  return (
    <div className="relative rounded-xl p-3 flex items-center gap-3" style={{ border:`1px solid ${cfg.border}`,background:cfg.bg }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-black" style={{ background:`${cfg.color}20`,color:cfg.color }}>{slot.slot_number}</div>
      {slot.image_url
        ? <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0"><img src={slot.image_url} alt="" className="w-full h-full object-cover" /></div>
        : <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background:`${cfg.color}12` }}><Icon className="w-5 h-5" style={{ color:cfg.color }} /></div>
      }
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate" style={{ color:cfg.color }}>{slot.title}</p>
        <p className="text-[9px] text-white/35 uppercase tracking-wide">{cfg.label} • {PRIZE_LABELS[slot.prize_type]}{slot.prize_type==="cr"&&slot.prize_value?` • ${slot.prize_value} CR`:""}</p>
      </div>
      <div className="flex gap-1.5 shrink-0">
        <button onClick={onEdit} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)" }}><Edit3 className="w-3.5 h-3.5 text-white/60" /></button>
        <button onClick={onDelete} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)" }}><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
      </div>
    </div>
  );
};

// ─── ПРЕВЬЮ БАНЕРА / ГРАДІЄНТА ────────────────────────────────────
const ConfigPreview = ({ config }: { config: SeasonConfig }) => {
  const accent = config.accent_color || "#fbbf24";
  return (
    <div className="rounded-2xl overflow-hidden mb-4" style={{ border:"1px solid rgba(255,255,255,0.1)" }}>
      <div className="relative" style={{ height:config.banner_url?120:80, background:`linear-gradient(160deg,${config.gradient_from},${config.gradient_to})` }}>
        {config.banner_url && <img src={config.banner_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />}
        <div className="absolute inset-0" style={{ background:`linear-gradient(to bottom,transparent,${config.gradient_from}cc)` }} />
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 text-center">
          <p className="text-sm font-black uppercase tracking-[0.15em]" style={{ color:accent,textShadow:`0 0 12px ${accent}88` }}>{config.season_name||"БАТЛПАС"}</p>
          {config.description && <p className="text-[9px] uppercase tracking-widest mt-0.5" style={{ color:accent+"88" }}>{config.description}</p>}
        </div>
      </div>
      <div className="px-3 py-2 text-[9px] text-white/30 uppercase tracking-widest text-center" style={{ background:"rgba(0,0,0,0.3)" }}>Превью</div>
    </div>
  );
};

// ─── ВКЛАДКА КОНФІГУ СЕЗОНУ ───────────────────────────────────────
const SeasonConfigTab = () => {
  const [form, setForm] = useState<SeasonConfig>({
    season_name: "", banner_url: "", gradient_from: "#1a0a2e", gradient_to: "#0a0a0a", accent_color: "#fbbf24", description: "",
  });
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const set = (k: keyof SeasonConfig, v: string) => setForm(p => ({ ...p, [k]:v }));

  useEffect(() => {
    dbSelect("battlepass_config", { limit:1 }).then(res => {
      const row = (res.data as any[])?.[0];
      if (row) setForm({ season_name: row.season_name||"", banner_url: row.banner_url||"", gradient_from: row.gradient_from||"#1a0a2e", gradient_to: row.gradient_to||"#0a0a0a", accent_color: row.accent_color||"#fbbf24", description: row.description||"" });
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await dbUpsert("battlepass_config", [{ id:1, ...form }], { onConflict: "id" });
      if (error) throw error;
      toast.success("Конфіг сезону збережено ✓");
    } catch (e: any) { toast.error(e?.message || "Помилка збереження"); }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 rounded-full border-2 border-yellow-400/30 border-t-yellow-400 animate-spin" /></div>;

  return (
    <div>
      <ConfigPreview config={form} />

      {/* Назва сезону */}
      <div className="mb-3">
        <label className={labelCls}>Назва сезону</label>
        <input className={inputCls} placeholder="БАТЛПАС / СЕЗОН 2 / ..." value={form.season_name} onChange={e => set("season_name",e.target.value)} />
      </div>
      <div className="mb-3">
        <label className={labelCls}>Підзаголовок</label>
        <input className={inputCls} placeholder="Сезонні нагороди" value={form.description} onChange={e => set("description",e.target.value)} />
      </div>

      {/* Банер */}
      <div className="mb-3">
        <label className={labelCls}><ImageIcon className="w-3 h-3 inline mr-1" />URL банера (фото зверху)</label>
        <input className={inputCls} placeholder="https://example.com/banner.jpg" value={form.banner_url} onChange={e => set("banner_url",e.target.value)} />
        <p className="text-[9px] text-white/25 mt-1">Рекомендований розмір: 800×220px. Залиш пустим якщо не потрібно.</p>
      </div>

      {/* Градієнт */}
      <div className="mb-3">
        <label className={labelCls}><Palette className="w-3 h-3 inline mr-1" />Градієнт фону</label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[9px] text-white/30 mb-1">Початок (зверху)</p>
            <div className="flex gap-2 items-center">
              <input type="color" value={form.gradient_from} onChange={e => set("gradient_from",e.target.value)}
                className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent p-0.5" style={{ border:"1px solid rgba(255,255,255,0.15)" }} />
              <input className={inputCls} value={form.gradient_from} onChange={e => set("gradient_from",e.target.value)} placeholder="#1a0a2e" />
            </div>
          </div>
          <div>
            <p className="text-[9px] text-white/30 mb-1">Кінець (знизу)</p>
            <div className="flex gap-2 items-center">
              <input type="color" value={form.gradient_to} onChange={e => set("gradient_to",e.target.value)}
                className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent p-0.5" style={{ border:"1px solid rgba(255,255,255,0.15)" }} />
              <input className={inputCls} value={form.gradient_to} onChange={e => set("gradient_to",e.target.value)} placeholder="#0a0a0a" />
            </div>
          </div>
        </div>
        {/* Превью градієнта */}
        <div className="mt-2 h-6 rounded-lg" style={{ background:`linear-gradient(90deg,${form.gradient_from},${form.gradient_to})`,border:"1px solid rgba(255,255,255,0.08)" }} />
      </div>

      {/* Акцентний колір */}
      <div className="mb-5">
        <label className={labelCls}>Акцентний колір (назва, іконка, прогрес)</label>
        <div className="flex gap-2 items-center">
          <input type="color" value={form.accent_color} onChange={e => set("accent_color",e.target.value)}
            className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent p-0.5" style={{ border:"1px solid rgba(255,255,255,0.15)" }} />
          <input className={inputCls} value={form.accent_color} onChange={e => set("accent_color",e.target.value)} placeholder="#fbbf24" />
        </div>
      </div>

      <button onClick={handleSave} disabled={saving}
        className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all"
        style={{ background:"rgba(251,191,36,0.15)",border:"1px solid rgba(251,191,36,0.35)",color:"#fbbf24",opacity:saving?.7:1 }}>
        <Save className="w-4 h-4" />{saving?"Зберігається...":"Зберегти конфіг"}
      </button>
    </div>
  );
};

// ─── ГОЛОВНИЙ КОМПОНЕНТ ───────────────────────────────────────────
const AdminBattlePassTab = () => {
  const [adminTab, setAdminTab]   = useState<AdminTab>("slots");
  const [slots, setSlots]         = useState<(BattlePassSlot & { id:number })[]>([]);
  const [nftGifts, setNftGifts]   = useState<NftGift[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editSlot, setEditSlot]   = useState<(BattlePassSlot & { id:number })|null>(null);
  const [filterRarity, setFilterRarity] = useState<Rarity|"all">("all");

  const load = async () => {
    setLoading(true);
    const [slotsRes, nftRes] = await Promise.all([
      dbSelect("battlepass_slots", { order:{ col:"slot_number", dir:"asc" } }),
      dbSelect("nft_gifts"),
    ]);
    setSlots((slotsRes.data as any[]) || []);
    setNftGifts((nftRes.data as any[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Видалити цей слот?")) return;
    const { error } = await dbDelete("battlepass_slots", { id: eq(id) });
    if (error) { toast.error("Помилка видалення"); return; }
    toast.success("Слот видалено");
    setSlots(p => p.filter(s => s.id !== id));
  };

  const handleSaved = () => { setShowForm(false); setEditSlot(null); load(); };
  const filtered = filterRarity === "all" ? slots : slots.filter(s => s.rarity === filterRarity);

  return (
    <div>
      <style>{`.bp-admin-scroll::-webkit-scrollbar{display:none}`}</style>

      {/* ── Заголовок ── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background:"rgba(251,191,36,0.12)",border:"1px solid rgba(251,191,36,0.3)" }}>
            <Crown className="w-4 h-4" style={{ color:"#fbbf24",filter:"drop-shadow(0 0 6px rgba(251,191,36,0.8))" }} />
          </div>
          <div>
            <p className="text-sm font-black text-white">Батлпас</p>
            <p className="text-[9px] text-white/35 uppercase tracking-widest">{slots.length} слотів</p>
          </div>
        </div>
        {adminTab === "slots" && !showForm && !editSlot && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all"
            style={{ background:"rgba(251,191,36,0.12)",border:"1px solid rgba(251,191,36,0.3)",color:"#fbbf24" }}>
            <Plus className="w-3.5 h-3.5" /> Новий слот
          </button>
        )}
      </div>

      {/* ── Внутрішні вкладки ── */}
      <div className="flex gap-2 mb-4">
        {([
          { id:"slots",  label:"Слоти",    icon: List     },
          { id:"config", label:"Сезон",    icon: Settings },
        ] as { id:AdminTab; label:string; icon:any }[]).map(t => {
          const active = adminTab === t.id;
          const Ic = t.icon;
          return (
            <button key={t.id} onClick={() => setAdminTab(t.id)}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all"
              style={{ border:`1px solid ${active?"rgba(251,191,36,0.4)":"rgba(255,255,255,0.08)"}`, background:active?"rgba(251,191,36,0.1)":"rgba(255,255,255,0.02)", color:active?"#fbbf24":"rgba(255,255,255,0.35)" }}>
              <Ic className="w-3.5 h-3.5" />{t.label}
            </button>
          );
        })}
      </div>

      {/* ── Вкладка СЛОТИ ── */}
      {adminTab === "slots" && (
        <div>
          {showForm && <SlotForm nftGifts={nftGifts} onSave={handleSaved} onCancel={() => setShowForm(false)} />}
          {editSlot  && <SlotForm initial={editSlot} nftGifts={nftGifts} onSave={handleSaved} onCancel={() => setEditSlot(null)} />}

          {/* Фільтр */}
          <div className="flex gap-2 mb-4 overflow-x-auto bp-admin-scroll pb-1">
            {(["all","mythic","legendary","rare","common"] as (Rarity|"all")[]).map(r => {
              const rc    = r !== "all" ? RARITY_CFG[r] : null;
              const active = filterRarity === r;
              return (
                <button key={r} onClick={() => setFilterRarity(r)}
                  className="shrink-0 rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all"
                  style={{ border:`1px solid ${active?(rc?.color||"rgba(255,255,255,0.5)"):"rgba(255,255,255,0.08)"}`, background:active?(rc?.bg||"rgba(255,255,255,0.06)"):"rgba(255,255,255,0.02)", color:active?(rc?.color||"#fff"):"rgba(255,255,255,0.3)" }}>
                  {r==="all"?"Всі":rc?.label}
                  {r!=="all" && <span className="ml-1 opacity-60">{slots.filter(s=>s.rarity===r).length}</span>}
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-white/25">
              <Crown className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p className="text-xs">Слоти не знайдені</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filtered.map(slot => (
                <AdminSlotCard key={slot.id} slot={slot}
                  onEdit={() => { setEditSlot(slot); setShowForm(false); }}
                  onDelete={() => handleDelete(slot.id)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Вкладка СЕЗОН ── */}
      {adminTab === "config" && <SeasonConfigTab />}
    </div>
  );
};

export default AdminBattlePassTab;
