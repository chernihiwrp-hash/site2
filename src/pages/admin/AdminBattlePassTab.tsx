import { useState, useEffect } from "react";
import { dbSelect, dbInsert, dbUpdate, dbDelete, dbUpsert, eq } from "../../lib/db";
import { toast } from "sonner";
import {
  Plus, Trash2, Edit3, Save, X, Star, Zap, Trophy, Flame, Crown,
  Settings, List, Palette, Image as ImageIcon, ChevronDown, Check,
} from "lucide-react";

// ─── ТИПИ ─────────────────────────────────────────────────────────
type Rarity    = "common" | "rare" | "legendary" | "mythic";
type PrizeType = "cr" | "nft" | "car" | "custom";
type AdminTab  = "slots" | "config";

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

interface SeasonConfig {
  season_name:   string;
  banner_url:    string;
  gradient_from: string;
  gradient_to:   string;
  accent_color:  string;
  description:   string;
}

interface NftGift { id: string|number; name?: string; title?: string; image_url?: string; price?: number; }

// ─── РІДКОСТІ ─────────────────────────────────────────────────────
const RARITY_CFG: Record<Rarity, { label:string; color:string; bg:string; border:string; glow:string; icon:any }> = {
  common:    { label:"Звичайний",   color:"#9ca3af", bg:"rgba(156,163,175,0.08)", border:"rgba(156,163,175,0.25)", glow:"rgba(156,163,175,0.3)", icon:Star   },
  rare:      { label:"Рідкісний",   color:"#38bdf8", bg:"rgba(56,189,248,0.09)",  border:"rgba(56,189,248,0.3)",   glow:"rgba(56,189,248,0.4)",  icon:Zap    },
  legendary: { label:"Легендарний", color:"#fbbf24", bg:"rgba(251,191,36,0.10)",  border:"rgba(251,191,36,0.35)",  glow:"rgba(251,191,36,0.45)", icon:Trophy },
  mythic:    { label:"Міфічний",    color:"#f87171", bg:"rgba(248,113,113,0.10)", border:"rgba(248,113,113,0.35)", glow:"rgba(248,113,113,0.45)",icon:Flame  },
};

const PRIZE_LABELS: Record<PrizeType,string> = {
  cr:"💰 CR Токени", nft:"🎁 NFT Подарунок", car:"🚗 Машина", custom:"✨ Нагорода",
};

const inputCls = "w-full rounded-xl px-3 py-2.5 text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-white/25 transition-colors";
const labelCls = "block text-[10px] uppercase tracking-widest font-bold text-white/40 mb-1.5";

// ─── NFT DROPDOWN з картинками ─────────────────────────────────────
const NftDropdown = ({ nftGifts, value, onChange }: {
  nftGifts: NftGift[];
  value:    string;
  onChange: (id: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const selected = nftGifts.find(n => String(n.id) === value);

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm bg-white/5 border border-white/10 text-white transition-colors hover:border-white/25"
        style={{ minHeight: 50 }}>
        {selected ? (
          <>
            {selected.image_url && (
              <img src={selected.image_url} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" style={{ border:"1px solid rgba(255,255,255,0.15)" }} />
            )}
            <div className="flex-1 text-left min-w-0">
              <div className="text-[12px] font-bold text-white truncate">{selected.name || selected.title || `NFT #${selected.id}`}</div>
              {selected.price !== undefined && <div className="text-[10px] text-yellow-400 font-black">{Number(selected.price).toLocaleString()} CR</div>}
            </div>
          </>
        ) : (
          <span className="text-white/30 flex-1 text-left">— Оберіть NFT —</span>
        )}
        <ChevronDown className={`w-4 h-4 text-white/40 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-2xl overflow-hidden"
          style={{ background:"#111", border:"1px solid rgba(255,255,255,0.12)", boxShadow:"0 16px 48px rgba(0,0,0,0.7)", maxHeight:280, overflowY:"auto" }}>
          <div className="p-1">
            <button type="button" onClick={() => { onChange(""); setOpen(false); }}
              className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/5 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                <X className="w-4 h-4 text-white/30" />
              </div>
              <span className="text-[12px] text-white/30">— Не обрано —</span>
            </button>

            {nftGifts.map(nft => (
              <button key={nft.id} type="button"
                onClick={() => { onChange(String(nft.id)); setOpen(false); }}
                className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/6 transition-colors relative"
                style={{ background: String(nft.id) === value ? "rgba(255,255,255,0.06)" : "transparent" }}>
                {/* NFT image */}
                <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0"
                  style={{ border:"1px solid rgba(255,255,255,0.1)", background:"rgba(0,0,0,0.4)" }}>
                  {nft.image_url
                    ? <img src={nft.image_url} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-lg">🎁</div>
                  }
                </div>
                {/* Info */}
                <div className="flex-1 text-left min-w-0">
                  <div className="text-[12px] font-bold text-white truncate">{nft.name || nft.title || `NFT #${nft.id}`}</div>
                  {nft.price !== undefined && (
                    <div className="text-[10px] font-black text-yellow-400">{Number(nft.price).toLocaleString()} CR</div>
                  )}
                </div>
                {/* Selected check */}
                {String(nft.id) === value && (
                  <Check className="w-4 h-4 shrink-0" style={{ color:"#fbbf24" }} />
                )}
              </button>
            ))}

            {nftGifts.length === 0 && (
              <div className="text-center py-6 text-white/25 text-[11px]">NFT не знайдені. Спочатку додай їх у вкладці NFT Gifts.</div>
            )}
          </div>
        </div>
      )}
      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
    </div>
  );
};

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
        const { error } = await dbUpdate("battlepass_slots", form, { id: eq(initial.id) });
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
    <div className="rounded-2xl p-5 mb-5 relative overflow-hidden"
      style={{ border:`1.5px solid ${cfg.border}`, background:`linear-gradient(135deg,#000 0%,#0a0a0a 50%,${cfg.bg} 100%)`, boxShadow:`0 0 24px ${cfg.glow}44` }}>

      {/* Top shimmer line */}
      <div className="absolute inset-x-0 top-0 h-[2px]" style={{ background:`linear-gradient(90deg,transparent,${cfg.color},transparent)` }} />

      <div className="flex items-center gap-2 mb-5">
        <Icon className="w-4 h-4" style={{ color:cfg.color }} />
        <span className="text-sm font-black" style={{ color:cfg.color }}>{initial?.id ? "Редагування слоту" : "Новий слот"}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className={labelCls}>Позиція (день)</label>
          <input type="number" min={1} className={inputCls} value={form.slot_number} onChange={e => set("slot_number", parseInt(e.target.value)||1)} />
        </div>
        <div>
          <label className={labelCls}>Назва призу</label>
          <input className={inputCls} placeholder="Елітна нагорода" value={form.title} onChange={e => set("title", e.target.value)} />
        </div>
      </div>

      {/* Rarity */}
      <div className="mb-4">
        <label className={labelCls}>Рідкість</label>
        <div className="grid grid-cols-4 gap-2">
          {(["common","rare","legendary","mythic"] as Rarity[]).map(r => {
            const c = RARITY_CFG[r]; const Ic = c.icon; const active = form.rarity === r;
            return (
              <button key={r} onClick={() => set("rarity",r)}
                className="rounded-xl py-2.5 flex flex-col items-center gap-1.5 text-[9px] font-black uppercase tracking-wider transition-all active:scale-95"
                style={{ border:`1.5px solid ${active?c.color:"rgba(255,255,255,0.08)"}`, background:active?c.bg:"rgba(255,255,255,0.02)", color:active?c.color:"rgba(255,255,255,0.3)", boxShadow:active?`0 0 14px ${c.glow}`:"none" }}>
                <Ic className="w-4 h-4" />{c.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Prize type */}
      <div className="mb-4">
        <label className={labelCls}>Тип призу</label>
        <div className="grid grid-cols-2 gap-2">
          {(["cr","nft","car","custom"] as PrizeType[]).map(p => (
            <button key={p} onClick={() => set("prize_type",p)}
              className="rounded-xl py-2.5 px-3 text-[11px] font-bold transition-all text-left active:scale-95"
              style={{ border:`1px solid ${form.prize_type===p?cfg.color:"rgba(255,255,255,0.08)"}`, background:form.prize_type===p?cfg.bg:"rgba(255,255,255,0.02)", color:form.prize_type===p?cfg.color:"rgba(255,255,255,0.35)", boxShadow:form.prize_type===p?`0 0 10px ${cfg.glow}`:"none" }}>
              {PRIZE_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {form.prize_type === "cr" && (
        <div className="mb-4">
          <label className={labelCls}>Кількість CR</label>
          <input type="number" className={inputCls} placeholder="1000" value={form.prize_value||""} onChange={e => set("prize_value",e.target.value)} />
        </div>
      )}

      {form.prize_type === "nft" && (
        <div className="mb-4">
          <label className={labelCls}>Оберіть NFT нагороду</label>
          <NftDropdown nftGifts={nftGifts} value={form.nft_gift_id||""} onChange={v => set("nft_gift_id",v||undefined)} />
        </div>
      )}

      {(form.prize_type === "car" || form.prize_type === "custom") && (
        <div className="mb-4">
          <label className={labelCls}>{form.prize_type==="car"?"Назва машини":"Назва призу"}</label>
          <input className={inputCls} placeholder={form.prize_type==="car"?"Ferrari 488":"Назва вашого призу"} value={form.prize_value||""} onChange={e => set("prize_value",e.target.value)} />
        </div>
      )}

      {form.prize_type !== "nft" && (
        <div className="mb-5">
          <label className={labelCls}>URL зображення {form.prize_type==="car"?"(фото машини)":"(іконка призу)"}</label>
          <input className={inputCls} placeholder="https://example.com/image.jpg" value={form.image_url||""} onChange={e => set("image_url",e.target.value)} />
          {form.image_url && (
            <div className="mt-2 w-24 h-16 rounded-xl overflow-hidden" style={{ border:`1px solid ${cfg.border}` }}>
              <img src={form.image_url} alt="" className="w-full h-full object-cover" />
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={handleSave} disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-black transition-all active:scale-95"
          style={{ background:`linear-gradient(135deg,${cfg.color}cc,${cfg.color}88)`, color:"#000", boxShadow:`0 4px 18px ${cfg.glow}`, opacity:saving?.7:1 }}>
          <Save className="w-4 h-4" />{saving?"Зберігається...":"Зберегти"}
        </button>
        <button onClick={onCancel} className="w-12 flex items-center justify-center rounded-xl text-sm font-bold transition-all active:scale-95"
          style={{ border:"1px solid rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.4)" }}>
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
    <div className="relative rounded-2xl p-3 flex items-center gap-3 transition-all hover:brightness-110"
      style={{ border:`1px solid ${cfg.border}`, background:`linear-gradient(135deg,rgba(0,0,0,0.6),${cfg.bg})` }}>
      {/* Day number */}
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-[11px] font-black"
        style={{ background:`${cfg.color}20`, color:cfg.color, border:`1px solid ${cfg.border}` }}>{slot.slot_number}</div>
      {/* Image or icon */}
      {slot.image_url
        ? <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0" style={{ border:`1px solid ${cfg.border}` }}><img src={slot.image_url} alt="" className="w-full h-full object-cover" /></div>
        : <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background:`${cfg.color}12`, border:`1px solid ${cfg.border}44` }}><Icon className="w-6 h-6" style={{ color:cfg.color }} /></div>
      }
      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate" style={{ color:cfg.color }}>{slot.title}</p>
        <p className="text-[9px] text-white/35 uppercase tracking-wide mt-0.5">
          <span className="font-black">{cfg.label}</span> · {PRIZE_LABELS[slot.prize_type]}{slot.prize_type==="cr"&&slot.prize_value?` · ${slot.prize_value} CR`:""}
        </p>
      </div>
      {/* Actions */}
      <div className="flex gap-1.5 shrink-0">
        <button onClick={onEdit} className="w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90"
          style={{ background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)" }}>
          <Edit3 className="w-3.5 h-3.5 text-white/60" />
        </button>
        <button onClick={onDelete} className="w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90"
          style={{ background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)" }}>
          <Trash2 className="w-3.5 h-3.5 text-red-400" />
        </button>
      </div>
    </div>
  );
};

// ─── ПРЕВЬЮ СЕЗОНУ ─────────────────────────────────────────────────
const ConfigPreview = ({ config }: { config: SeasonConfig }) => {
  const accent = config.accent_color || "#fbbf24";
  return (
    <div className="rounded-2xl overflow-hidden mb-5" style={{ border:"1px solid rgba(255,255,255,0.1)" }}>
      <div className="relative" style={{ height:config.banner_url?130:90, background:`linear-gradient(160deg,${config.gradient_from},${config.gradient_to})` }}>
        {config.banner_url && <img src={config.banner_url} alt="" className="absolute inset-0 w-full h-full object-cover" />}
        <div className="absolute inset-0" style={{ background:`linear-gradient(to bottom,transparent 30%,rgba(0,0,0,0.75) 100%)` }} />
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 text-center">
          <p className="text-base font-black uppercase tracking-[0.15em]" style={{ color:accent,textShadow:`0 0 14px ${accent}99` }}>{config.season_name||"БАТЛПАС"}</p>
          {config.description && <p className="text-[9px] uppercase tracking-widest mt-0.5" style={{ color:accent+"88" }}>{config.description}</p>}
        </div>
      </div>
      <div className="px-3 py-1.5 text-[9px] text-white/25 uppercase tracking-widest text-center" style={{ background:"rgba(0,0,0,0.5)" }}>Превью банера</div>
    </div>
  );
};

// ─── ВКЛАДКА КОНФІГ СЕЗОНУ ────────────────────────────────────────
const SeasonConfigTab = () => {
  const [form, setForm] = useState<SeasonConfig>({
    season_name:"", banner_url:"", gradient_from:"#1a0a2e", gradient_to:"#0a0a0a", accent_color:"#fbbf24", description:"",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const set = (k: keyof SeasonConfig, v: string) => setForm(p => ({ ...p, [k]:v }));

  useEffect(() => {
    dbSelect("battlepass_config", { limit:1 }).then(res => {
      const row = (res.data as any[])?.[0];
      if (row) setForm({ season_name:row.season_name||"", banner_url:row.banner_url||"", gradient_from:row.gradient_from||"#1a0a2e", gradient_to:row.gradient_to||"#0a0a0a", accent_color:row.accent_color||"#fbbf24", description:row.description||"" });
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await dbUpsert("battlepass_config", [{ id:1, ...form }], { onConflict:"id" });
      if (error) throw error;
      toast.success("Конфіг сезону збережено ✓");
    } catch (e: any) { toast.error(e?.message || "Помилка збереження"); }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 rounded-full border-2 border-yellow-400/30 border-t-yellow-400 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <ConfigPreview config={form} />

      {/* Season name */}
      <div className="rounded-2xl p-4 space-y-3" style={{ background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)" }}>
        <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Назва та опис</p>
        <div>
          <label className={labelCls}>Назва сезону</label>
          <input className={inputCls} placeholder="БАТЛПАС / СЕЗОН 2" value={form.season_name} onChange={e => set("season_name",e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Підзаголовок</label>
          <input className={inputCls} placeholder="Сезонні нагороди" value={form.description} onChange={e => set("description",e.target.value)} />
        </div>
      </div>

      {/* Banner */}
      <div className="rounded-2xl p-4" style={{ background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)" }}>
        <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-3">
          <ImageIcon className="w-3 h-3 inline mr-1.5" />Банер (фото зверху)
        </p>
        <input className={inputCls} placeholder="https://example.com/banner.jpg" value={form.banner_url} onChange={e => set("banner_url",e.target.value)} />
        <p className="text-[9px] text-white/25 mt-1.5">Рекомендований розмір: 800×220px. Зображення завантажується в оригінальній якості.</p>
        {form.banner_url && (
          <div className="mt-2 rounded-xl overflow-hidden" style={{ height:80,border:"1px solid rgba(255,255,255,0.1)" }}>
            <img src={form.banner_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}
      </div>

      {/* Gradient */}
      <div className="rounded-2xl p-4" style={{ background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)" }}>
        <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-3">
          <Palette className="w-3 h-3 inline mr-1.5" />Градієнт фону
        </p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          {[{ key:"gradient_from" as keyof SeasonConfig, label:"Початок (зверху)" }, { key:"gradient_to" as keyof SeasonConfig, label:"Кінець (знизу)" }].map(({ key, label }) => (
            <div key={key}>
              <p className="text-[9px] text-white/30 mb-1.5">{label}</p>
              <div className="flex gap-2 items-center">
                <input type="color" value={form[key]} onChange={e => set(key, e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer p-0.5" style={{ border:"1px solid rgba(255,255,255,0.15)",background:"transparent" }} />
                <input className={`${inputCls} text-[11px]`} value={form[key]} onChange={e => set(key,e.target.value)} placeholder="#000000" />
              </div>
            </div>
          ))}
        </div>
        <div className="h-6 rounded-lg" style={{ background:`linear-gradient(90deg,${form.gradient_from},${form.gradient_to})`,border:"1px solid rgba(255,255,255,0.08)" }} />
      </div>

      {/* Accent color */}
      <div className="rounded-2xl p-4" style={{ background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)" }}>
        <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-3">Акцентний колір</p>
        <div className="flex gap-3 items-center">
          <input type="color" value={form.accent_color} onChange={e => set("accent_color",e.target.value)}
            className="w-12 h-12 rounded-xl cursor-pointer p-0.5" style={{ border:"1px solid rgba(255,255,255,0.15)",background:"transparent" }} />
          <input className={inputCls} value={form.accent_color} onChange={e => set("accent_color",e.target.value)} placeholder="#fbbf24" />
        </div>
        <p className="text-[9px] text-white/25 mt-1.5">Колір назви, прогрес-бару та акцентів</p>
      </div>

      <button onClick={handleSave} disabled={saving}
        className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-black transition-all active:scale-98"
        style={{ background:"rgba(251,191,36,0.15)",border:"1px solid rgba(251,191,36,0.4)",color:"#fbbf24",opacity:saving?.7:1 }}>
        <Save className="w-4 h-4" />{saving?"Зберігається...":"Зберегти конфіг сезону"}
      </button>
    </div>
  );
};

// ─── ГОЛОВНИЙ КОМПОНЕНТ ────────────────────────────────────────────
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
      dbSelect("nft_gifts", { order:{ col:"price", dir:"asc" } }),
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
      <style>{`
        .bp-admin-scroll::-webkit-scrollbar{display:none}
        @keyframes bp-admin-fadein{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .bp-admin-form{animation:bp-admin-fadein .25s ease}
      `}</style>

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background:"rgba(251,191,36,0.12)",border:"1px solid rgba(251,191,36,0.3)",boxShadow:"0 0 16px rgba(251,191,36,0.2)" }}>
            <Crown className="w-5 h-5" style={{ color:"#fbbf24",filter:"drop-shadow(0 0 8px rgba(251,191,36,0.8))" }} />
          </div>
          <div>
            <p className="text-sm font-black text-white">Батлпас</p>
            <p className="text-[9px] text-white/35 uppercase tracking-widest">{slots.length} слотів · {nftGifts.length} NFT</p>
          </div>
        </div>
        {adminTab === "slots" && !showForm && !editSlot && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black transition-all active:scale-95"
            style={{ background:"rgba(251,191,36,0.12)",border:"1px solid rgba(251,191,36,0.35)",color:"#fbbf24",boxShadow:"0 0 12px rgba(251,191,36,0.15)" }}>
            <Plus className="w-3.5 h-3.5" /> Новий слот
          </button>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-2 mb-5">
        {([
          { id:"slots",  label:"Слоти",  icon: List     },
          { id:"config", label:"Сезон",  icon: Settings },
        ] as { id:AdminTab; label:string; icon:any }[]).map(t => {
          const active = adminTab === t.id;
          const Ic = t.icon;
          return (
            <button key={t.id} onClick={() => { setAdminTab(t.id); setShowForm(false); setEditSlot(null); }}
              className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black transition-all active:scale-95"
              style={{ border:`1px solid ${active?"rgba(251,191,36,0.4)":"rgba(255,255,255,0.08)"}`, background:active?"rgba(251,191,36,0.1)":"rgba(255,255,255,0.02)", color:active?"#fbbf24":"rgba(255,255,255,0.3)" }}>
              <Ic className="w-3.5 h-3.5" />{t.label}
            </button>
          );
        })}
      </div>

      {/* ── Slots tab ── */}
      {adminTab === "slots" && (
        <div>
          {showForm && <div className="bp-admin-form"><SlotForm nftGifts={nftGifts} onSave={handleSaved} onCancel={() => setShowForm(false)} /></div>}
          {editSlot  && <div className="bp-admin-form"><SlotForm initial={editSlot} nftGifts={nftGifts} onSave={handleSaved} onCancel={() => setEditSlot(null)} /></div>}

          {/* Rarity filter */}
          {!showForm && !editSlot && (
            <div className="flex gap-2 mb-4 overflow-x-auto bp-admin-scroll pb-1">
              {(["all","mythic","legendary","rare","common"] as (Rarity|"all")[]).map(r => {
                const rc = r !== "all" ? RARITY_CFG[r] : null;
                const active = filterRarity === r;
                return (
                  <button key={r} onClick={() => setFilterRarity(r)}
                    className="shrink-0 rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all active:scale-95"
                    style={{ border:`1px solid ${active?(rc?.color||"rgba(255,255,255,0.5)"):\"rgba(255,255,255,0.08)\"}`, background:active?(rc?.bg||"rgba(255,255,255,0.06)"):\"rgba(255,255,255,0.02)\", color:active?(rc?.color||"#fff"):\"rgba(255,255,255,0.3)\" }}>
                    {r==="all"?"Всі":rc?.label}
                    {r!=="all" && <span className="ml-1 opacity-50">{slots.filter(s=>s.rarity===r).length}</span>}
                  </button>
                );
              })}
            </div>
          )}

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

      {/* ── Config tab ── */}
      {adminTab === "config" && <SeasonConfigTab />}
    </div>
  );
};

export default AdminBattlePassTab;
