import { useState, useEffect, useCallback, useRef } from "react";
import {
  X, Home, Clock, Coins, Users, Search, Plus, Trash2,
  Crown, Shield, User as UserIcon, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { store } from "../lib/store";
import type { FamilyMember, FamilyRole, UserSearchResult } from "../lib/store";

type HouseInfo = {
  id: number;          // house_purchase_requests.id
  name: string;
  price: number;
  image?: string;
  photos?: string[];
  rental_days?: number;
  created_at?: string;
  desc?: string;
};

interface Props {
  open: boolean;
  onClose: () => void;
  houses: HouseInfo[];
  ownerNick: string;
}

const roleMeta: Record<FamilyRole, { label: string; icon: any; color: string }> = {
  owner:    { label: "Власник",       icon: Crown,    color: "hsl(45 100% 60%)" },
  co_owner: { label: "Співвласник",   icon: Shield,   color: "hsl(180 80% 55%)" },
  member:   { label: "Сожитель",      icon: UserIcon, color: "hsl(142 71% 50%)" },
};

const calcTime = (createdAt?: string, days = 7) => {
  if (!createdAt) return "—";
  const start = new Date(createdAt).getTime();
  const expiry = start + days * 86400000;
  const diff = expiry - Date.now();
  if (diff <= 0) return "Прострочено";
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  return d > 0 ? `${d} дн. ${h} год.` : `${h} год.`;
};

const HouseFamilyModal = ({ open, onClose, houses, ownerNick }: Props) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounce = useRef<number | null>(null);

  const house = houses[activeIdx];

  const load = useCallback(async () => {
    if (!house) return;
    setLoading(true);
    const list = await store.getFamily(house.id);
    setMembers(list);
    setLoading(false);
  }, [house]);

  useEffect(() => { if (open) load(); }, [open, load]);
  useEffect(() => { if (open) { setActiveIdx(0); setShowAdd(false); setSearch(""); setResults([]); } }, [open]);

  // Розумний пошук з debounce
  useEffect(() => {
    if (debounce.current) window.clearTimeout(debounce.current);
    if (!search.trim()) { setResults([]); return; }
    setSearching(true);
    debounce.current = window.setTimeout(async () => {
      const r = await store.searchUsers(search, 10);
      setResults(r.filter(u => !members.some(m => m.username.toLowerCase() === u.username.toLowerCase())));
      setSearching(false);
    }, 220);
  }, [search, members]);

  const handleCreate = async () => {
    if (!house) return;
    const ok = await store.createFamily(house.id, ownerNick);
    if (ok) { toast.success("Сім'ю створено"); load(); }
    else toast.error("Не вдалося створити сім'ю");
  };

  const handleAdd = async (username: string) => {
    if (!house) return;
    const ok = await store.addFamilyMember(house.id, username, "member");
    if (ok) {
      toast.success(`${username} доданий до сім'ї`);
      setSearch(""); setResults([]); setShowAdd(false);
      load();
    } else toast.error("Не вдалося додати");
  };

  const handleRoleChange = async (m: FamilyMember, role: FamilyRole) => {
    await store.updateFamilyRole(m.id, role);
    setMembers(prev => prev.map(x => x.id === m.id ? { ...x, role } : x));
  };

  const handleRemove = async (m: FamilyMember) => {
    await store.removeFamilyMember(m.id);
    setMembers(prev => prev.filter(x => x.id !== m.id));
    toast.success("Видалено");
  };

  if (!open) return null;

  const familyExists = members.length > 0;

  return (
    <div
      className="fixed inset-0 z-[999] flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl pb-8 animate-fade-in max-h-[92vh] overflow-y-auto"
        style={{
          background: "linear-gradient(160deg, hsl(240 15% 8% / 0.98), hsl(0 0% 4% / 0.96))",
          border: "1px solid hsl(142 71% 45% / 0.25)",
          borderBottom: "none",
          boxShadow: "0 -8px 48px hsl(142 71% 45% / 0.15)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 pt-5 pb-3"
          style={{ background: "linear-gradient(180deg, hsl(240 15% 8% / 0.98) 70%, transparent)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "hsl(142 71% 45% / 0.12)", border: "1px solid hsl(142 71% 45% / 0.3)", boxShadow: "0 0 12px hsl(142 71% 45% / 0.25)" }}>
              <Home className="w-4 h-4" style={{ color: "hsl(142 71% 50%)", filter: "drop-shadow(0 0 4px hsl(142 71% 50%))" }} />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Управління домом</p>
              <p className="text-[10px] text-muted-foreground">Інформація та сім'я</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90"
            style={{ background: "hsl(0 0% 100% / 0.06)", border: "1px solid hsl(0 0% 100% / 0.08)" }}>
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {!house ? (
          <div className="px-5 py-12 text-center">
            <Home className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">У вас ще немає дому</p>
          </div>
        ) : (
          <div className="px-5">
            {/* Tabs (если домов несколько) */}
            {houses.length > 1 && (
              <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
                {houses.map((h, i) => (
                  <button key={h.id} onClick={() => setActiveIdx(i)}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-semibold whitespace-nowrap transition-all"
                    style={{
                      background: i === activeIdx ? "hsl(142 71% 45% / 0.15)" : "hsl(0 0% 100% / 0.04)",
                      border: i === activeIdx ? "1px solid hsl(142 71% 45% / 0.4)" : "1px solid hsl(0 0% 100% / 0.08)",
                      color: i === activeIdx ? "hsl(142 71% 60%)" : "hsl(0 0% 60%)",
                    }}>
                    {h.name}
                  </button>
                ))}
              </div>
            )}

            {/* Інфо про дом */}
            <div className="rounded-2xl overflow-hidden mb-4"
              style={{ background: "hsl(142 71% 45% / 0.05)", border: "1px solid hsl(142 71% 45% / 0.18)" }}>
              {(house.image || house.photos?.[0]) && (
                <div className="relative h-32 overflow-hidden">
                  <img src={house.photos?.[0] || house.image} alt={house.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                  <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between">
                    <p className="text-base font-black text-white drop-shadow">{house.name}</p>
                    <span className="text-xs font-bold text-yellow-400">{house.price.toLocaleString()}€</span>
                  </div>
                </div>
              )}
              <div className="px-4 py-3 grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                  <div>
                    <p className="text-[8px] text-muted-foreground/60 uppercase tracking-wider">До кінця оренди</p>
                    <p className="text-[11px] font-bold text-primary">{calcTime(house.created_at, house.rental_days || 7)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Coins className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                  <div>
                    <p className="text-[8px] text-muted-foreground/60 uppercase tracking-wider">Вартість</p>
                    <p className="text-[11px] font-bold text-yellow-400">{house.price.toLocaleString()}€</p>
                  </div>
                </div>
                {house.rental_days != null && (
                  <div className="flex items-center gap-2 col-span-2">
                    <Home className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <p className="text-[10px] text-muted-foreground">Термін оренди: <span className="text-foreground font-semibold">{house.rental_days} дн.</span></p>
                  </div>
                )}
                {house.desc && (
                  <p className="col-span-2 text-[10px] text-muted-foreground/80 leading-relaxed mt-1">{house.desc}</p>
                )}
              </div>
            </div>

            {/* Сім'я */}
            <div className="mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold">Сім'я</p>
              {familyExists && <span className="text-[10px] text-muted-foreground">· {members.length} учасн.</span>}
            </div>

            {loading ? (
              <div className="text-center py-6">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : !familyExists ? (
              <div className="rounded-2xl p-5 text-center"
                style={{ background: "hsl(142 71% 45% / 0.04)", border: "1px dashed hsl(142 71% 45% / 0.25)" }}>
                <Users className="w-8 h-8 text-primary/50 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground mb-3">Ще немає сім'ї для цього дому</p>
                <button onClick={handleCreate}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all active:scale-95"
                  style={{
                    background: "linear-gradient(135deg, hsl(84,81%,44%), hsl(142,71%,45%))",
                    boxShadow: "0 4px 16px hsl(142 71% 45% / 0.4)",
                  }}>
                  + Створити сім'ю
                </button>
              </div>
            ) : (
              <>
                {/* Список членів */}
                <div className="space-y-2 mb-3">
                  {members.map(m => {
                    const meta = roleMeta[m.role];
                    const Icon = meta.icon;
                    const isOwner = m.role === "owner";
                    return (
                      <div key={m.id}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                        style={{ background: "hsl(0 0% 100% / 0.04)", border: `1px solid ${meta.color}40` }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: `${meta.color}1a`, border: `1px solid ${meta.color}40` }}>
                          <Icon className="w-4 h-4" style={{ color: meta.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{m.username}</p>
                          <p className="text-[9px]" style={{ color: meta.color }}>{meta.label}</p>
                        </div>
                        <RolePicker
                          value={m.role}
                          onChange={(r) => handleRoleChange(m, r)}
                          disabled={isOwner && members.filter(x => x.role === "owner").length === 1}
                        />
                        {!isOwner && (
                          <button onClick={() => handleRemove(m)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center active:scale-90 transition-all"
                            style={{ background: "hsl(0 70% 50% / 0.1)", border: "1px solid hsl(0 70% 50% / 0.25)" }}>
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Додавання учасника */}
                {!showAdd ? (
                  <button onClick={() => setShowAdd(true)}
                    className="w-full px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-2"
                    style={{
                      background: "hsl(142 71% 45% / 0.1)",
                      border: "1px solid hsl(142 71% 45% / 0.3)",
                      color: "hsl(142 71% 55%)",
                    }}>
                    <Plus className="w-4 h-4" /> Додати учасника
                  </button>
                ) : (
                  <div className="rounded-2xl p-3 space-y-2"
                    style={{ background: "hsl(0 0% 100% / 0.03)", border: "1px solid hsl(0 0% 100% / 0.08)" }}>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                      style={{ background: "hsl(0 0% 100% / 0.05)", border: "1px solid hsl(0 0% 100% / 0.08)" }}>
                      <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <input
                        autoFocus
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Ім'я гравця (наприклад: t)"
                        className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
                      />
                      {searching && <div className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin" />}
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {results.length === 0 && search.trim() && !searching && (
                        <p className="text-[10px] text-muted-foreground text-center py-3">Нікого не знайдено</p>
                      )}
                      {!search.trim() && (
                        <p className="text-[10px] text-muted-foreground text-center py-3">Почніть вводити нік...</p>
                      )}
                      {results.map(u => (
                        <button key={u.username}
                          onClick={() => handleAdd(u.username)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all active:scale-[0.98]"
                          style={{ background: "hsl(0 0% 100% / 0.03)", border: "1px solid hsl(0 0% 100% / 0.06)" }}>
                          <div className="w-7 h-7 rounded-lg overflow-hidden bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                            {u.avatar_url
                              ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                              : <UserIcon className="w-3.5 h-3.5 text-primary/70" />}
                          </div>
                          <span className="flex-1 text-left text-xs font-semibold text-foreground truncate">{u.username}</span>
                          <Plus className="w-3.5 h-3.5 text-primary" />
                        </button>
                      ))}
                    </div>

                    <button onClick={() => { setShowAdd(false); setSearch(""); setResults([]); }}
                      className="w-full text-[10px] text-muted-foreground py-1">Скасувати</button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Role picker ─────────────────────────────────────────────────────────────
const RolePicker = ({
  value, onChange, disabled,
}: { value: FamilyRole; onChange: (r: FamilyRole) => void; disabled?: boolean }) => {
  const [open, setOpen] = useState(false);
  const meta = roleMeta[value];
  return (
    <div className="relative">
      <button
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        className="px-2 py-1.5 rounded-lg flex items-center gap-1 text-[10px] font-semibold transition-all active:scale-95"
        style={{
          background: `${meta.color}14`,
          border: `1px solid ${meta.color}40`,
          color: meta.color,
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {meta.label}
        {!disabled && <ChevronDown className="w-3 h-3" />}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 rounded-xl overflow-hidden min-w-[130px]"
            style={{
              background: "hsl(240 15% 10% / 0.98)",
              border: "1px solid hsl(0 0% 100% / 0.1)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            }}>
            {(["owner","co_owner","member"] as FamilyRole[]).map(r => {
              const m = roleMeta[r];
              const Icon = m.icon;
              return (
                <button key={r}
                  onClick={() => { onChange(r); setOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-semibold text-left transition-all hover:bg-white/5"
                  style={{ color: m.color }}>
                  <Icon className="w-3.5 h-3.5" />
                  {m.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default HouseFamilyModal;
