import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import PageHeader from "../components/PageHeader";
import GradientButton from "../components/GradientButton";
import {
  ChevronLeft, ChevronRight, Home, Euro,
  CheckCircle, User, Sparkles, Clock,
  Calendar, Building2, Copy, Check, AlertCircle,
  Crown, Shield
} from "lucide-react";
import { store, supabase } from "../lib/store";
import { dbInsert } from "../lib/db";
import type { HouseItem, FamilyMember, FamilyRole } from "../lib/store";
import HouseFamilyDisplay from "../components/HouseFamilyDisplay";
import { toast } from "sonner";

const RENTAL_OPTIONS = [
  { days: 3,  label: "3 дні",   ratio: 0.15 },
  { days: 7,  label: "7 днів",  ratio: 0.30 },
  { days: 15, label: "15 днів", ratio: 0.55 },
  { days: 24, label: "24 дні",  ratio: 1.00 },
];

const PAYMENT_USER = "Vkadosik1234";

const roleLabels: Record<string, { label: string; color: string; Icon: any }> = {
  owner:    { label: "Власник",      color: "hsl(45 100% 60%)",  Icon: Crown   },
  co_owner: { label: "Співвласник",  color: "hsl(180 80% 55%)",  Icon: Shield  },
  member:   { label: "Сожитель",     color: "hsl(142 71% 50%)",  Icon: User    },
};

const HouseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [house, setHouse] = useState<HouseItem | null>(null);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [nick] = useState(() => localStorage.getItem("crp_nick") || "");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [rentalDays, setRentalDays] = useState(7);
  const [copied, setCopied] = useState(false);
  const [housePurchaseId, setHousePurchaseId] = useState<number | null>(null);
  const [userRole, setUserRole] = useState<FamilyRole | null>(null);

  useEffect(() => {
    store.getHouses().then(houses => {
      const found = houses.find(h => h.id === Number(id));
      if (found) setHouse(found);
    });
  }, [id]);

  useEffect(() => {
    if (!nick || !id) return;
    const loadPurchaseAndRole = async () => {
      const { data: req } = await supabase
        .from("house_purchase_requests")
        .select("id")
        .eq("house_id", Number(id))
        .eq("status", "approved")
        .maybeSingle();
      if (!req) return;
      setHousePurchaseId(req.id);
      const { data: member } = await supabase
        .from("house_families")
        .select("role")
        .eq("house_purchase_id", req.id)
        .ilike("username", nick)
        .maybeSingle();
      if (member?.role) setUserRole(member.role as FamilyRole);
    };
    loadPurchaseAndRole();
  }, [id, nick]);

  if (!house) return (
    <div className="min-h-screen pb-20 px-4 pt-4">
      <PageHeader title="НЕ ЗНАЙДЕНО" backTo="/houses" />
      <div className="text-center py-12">
        <Home className="w-10 h-10 text-muted-foreground opacity-20 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Будинок не знайдено</p>
      </div>
    </div>
  );

  const photos = house.photos?.filter(p => p.startsWith("http") || p.startsWith("data:")) || (house.image ? [house.image] : []);
  const isAvailable = !house.owner;
  const isLux = house.category === "Люкс";
  const getPrice = (ratio: number) => house ? Math.round(house.price * ratio) : 0;
  const selectedOption = RENTAL_OPTIONS.find(o => o.days === rentalDays) || RENTAL_OPTIONS[1];
  const selectedPrice = house ? getPrice(selectedOption.ratio) : 0;

  const copyPayment = () => {
    navigator.clipboard.writeText(PAYMENT_USER);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmPayment = async () => {
    if (!nick.trim()) return toast.error("Нік не знайдено");
    setLoading(true);
    try {
      const { error } = await dbInsert("house_purchase_requests", {
        house_id: house.id,
        username: nick,
        status: "pending",
        rental_days: rentalDays,
      });
      if (error) {
        console.error("House purchase error:", error);
        toast.error("Помилка бази даних: " + error.message);
        setLoading(false);
        return;
      }
      setSubmitted(true);
    } catch (e) {
      console.error("Exception:", e);
      toast.error("Помилка. Спробуйте ще раз.");
    }
    setLoading(false);
  };

  // ── Успішна заявка ──
  if (submitted) {
    return (
      <div className="min-h-screen pb-20 px-4 pt-4">
        <PageHeader title={house.name} backTo="/houses" />
        <div className="flex flex-col items-center justify-center py-12 animate-fade-in">
          <div className="w-28 h-28 rounded-3xl flex items-center justify-center mb-6"
            style={{ background: "hsl(142 71% 45% / 0.12)", border: "2px solid hsl(142 71% 45% / 0.4)", boxShadow: "0 0 60px hsl(142 71% 45% / 0.2)" }}>
            <CheckCircle className="w-14 h-14" style={{ color: "hsl(142 71% 45%)", filter: "drop-shadow(0 0 12px hsl(142 71% 45%))" }} />
          </div>
          <h2 className="font-display text-2xl font-black text-foreground mb-2 text-center">ЗАЯВКУ ВІДПРАВЛЕНО</h2>
          <p className="text-xs text-muted-foreground text-center mb-5 max-w-xs">Адміністрація перевірить оплату і підтвердить оренду</p>
          <div className="liquid-glass rounded-2xl p-4 w-full max-w-xs mb-4 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Будинок</span>
              <span className="text-foreground font-semibold">{house.name}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Термін</span>
              <span className="text-foreground font-semibold">{rentalDays} днів</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Сума</span>
              <span className="text-yellow-400 font-bold">{selectedPrice.toLocaleString()}€</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Оплата на</span>
              <span className="text-primary font-semibold">{PAYMENT_USER}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 px-5 py-3 rounded-2xl"
            style={{ background: "hsl(142 71% 45% / 0.08)", border: "1px solid hsl(142 71% 45% / 0.2)" }}>
            <Clock className="w-4 h-4" style={{ color: "hsl(142 71% 45%)" }} />
            <span className="text-xs font-medium" style={{ color: "hsl(142 71% 45%)" }}>Очікуйте підтвердження в профілі</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28 px-4 pt-4">
      <PageHeader title={house.name} backTo="/houses" />
      <div className="animate-fade-in space-y-3">

        {/* ── Фото ── */}
        <div className="relative w-full rounded-2xl overflow-hidden"
          style={{ height: photos.length > 0 ? 230 : 140, border: "1px solid hsl(0 0% 100% / 0.08)" }}>
          {photos.length > 0 ? (
            <img src={photos[photoIdx]} alt={house.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"
              style={{ background: isLux ? "hsl(45 100% 55% / 0.05)" : "hsl(var(--primary) / 0.05)" }}>
              {isLux ? <Building2 className="w-16 h-16 text-yellow-400/20" /> : <Home className="w-16 h-16 text-primary/20" />}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/10 to-transparent" />

          {/* Категорія */}
          <div className="absolute top-3 left-3">
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-xl backdrop-blur-sm flex items-center gap-1"
              style={{
                background: isLux ? "hsl(45 100% 55% / 0.22)" : "hsl(var(--primary) / 0.22)",
                color: isLux ? "hsl(45 100% 65%)" : "hsl(var(--primary))",
                border: `1px solid ${isLux ? "hsl(45 100% 55% / 0.45)" : "hsl(var(--primary) / 0.45)"}`,
              }}>
              <Sparkles className="w-3 h-3" /> {house.category}
            </span>
          </div>

          {/* Статус */}
          <div className="absolute top-3 right-3">
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-xl backdrop-blur-sm"
              style={{
                background: isAvailable ? "hsl(142 71% 45% / 0.22)" : "hsl(0 70% 50% / 0.22)",
                color: isAvailable ? "hsl(142 71% 65%)" : "hsl(0 70% 65%)",
                border: isAvailable ? "1px solid hsl(142 71% 45% / 0.45)" : "1px solid hsl(0 70% 50% / 0.45)",
              }}>
              {isAvailable ? "● ВІЛЬНО" : "● ЗАЙНЯТО"}
            </span>
          </div>

          {/* Назва + ціна знизу */}
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
            <h2 className="text-lg font-black text-white leading-tight">{house.name}</h2>
            {house.desc && <p className="text-[11px] text-white/50 mt-0.5 line-clamp-1">{house.desc}</p>}
            <div className="flex items-baseline gap-2 mt-1.5">
              <span className="text-yellow-400 font-black text-xl">{house.price.toLocaleString()}€</span>
              <span className="text-white/35 text-[10px]">повна вартість</span>
            </div>
          </div>

          {/* Навігація фото */}
          {photos.length > 1 && (
            <>
              <button onClick={() => setPhotoIdx(i => Math.max(0, i - 1))}
                className="absolute left-2 top-[42%] -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center active:scale-90">
                <ChevronLeft className="w-4 h-4 text-white" />
              </button>
              <button onClick={() => setPhotoIdx(i => Math.min(photos.length - 1, i + 1))}
                className="absolute right-2 top-[42%] -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center active:scale-90">
                <ChevronRight className="w-4 h-4 text-white" />
              </button>
              <div className="absolute bottom-[3.75rem] left-1/2 -translate-x-1/2 flex gap-1">
                {photos.map((_, i) => (
                  <button key={i} onClick={() => setPhotoIdx(i)}
                    className="rounded-full transition-all"
                    style={{ width: i === photoIdx ? 16 : 5, height: 5, background: i === photoIdx ? "white" : "rgba(255,255,255,0.35)" }} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── Роль поточного юзера ── */}
        {userRole && (() => {
          const meta = roleLabels[userRole];
          if (!meta) return null;
          const { Icon } = meta;
          return (
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl"
              style={{ background: `color-mix(in srgb, ${meta.color} 8%, transparent)`, border: `1px solid color-mix(in srgb, ${meta.color} 30%, transparent)` }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `color-mix(in srgb, ${meta.color} 18%, transparent)`, border: `1px solid color-mix(in srgb, ${meta.color} 40%, transparent)` }}>
                <Icon className="w-4 h-4" style={{ color: meta.color }} />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Ваша роль</p>
                <p className="text-[13px] font-bold" style={{ color: meta.color }}>{meta.label}</p>
              </div>
            </div>
          );
        })()}

        {isAvailable ? (
          /* ══════ ВІЛЬНИЙ ══════ */
          <div className="space-y-3">

            {/* Орендар */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl liquid-glass">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "hsl(var(--primary) / 0.12)", border: "1px solid hsl(var(--primary) / 0.25)" }}>
                <User className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Орендар</p>
                <p className="text-[13px] font-bold text-foreground">{nick || "—"}</p>
              </div>
            </div>

            {/* Термін */}
            <div className="rounded-2xl overflow-hidden"
              style={{ background: "hsl(0 0% 0% / 0.4)", border: "1px solid hsl(0 0% 100% / 0.08)", backdropFilter: "blur(20px)" }}>
              <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: "hsl(0 0% 100% / 0.06)" }}>
                <Calendar className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">Термін оренди</span>
              </div>
              <div className="p-3 grid grid-cols-4 gap-2">
                {RENTAL_OPTIONS.map(({ days, label, ratio }) => (
                  <button key={days} onClick={() => setRentalDays(days)}
                    className="flex flex-col items-center py-3 rounded-xl border transition-all active:scale-95"
                    style={{
                      background: rentalDays === days ? "hsl(var(--primary) / 0.15)" : "hsl(0 0% 100% / 0.03)",
                      borderColor: rentalDays === days ? "hsl(var(--primary) / 0.5)" : "hsl(0 0% 100% / 0.08)",
                      boxShadow: rentalDays === days ? "0 0 14px hsl(var(--primary) / 0.2)" : "none",
                    }}>
                    <span className={`text-[11px] font-bold ${rentalDays === days ? "text-primary" : "text-foreground/70"}`}>{label}</span>
                    <span className={`text-[10px] font-bold mt-1 ${rentalDays === days ? "text-yellow-400" : "text-muted-foreground"}`}>
                      {house ? Math.round(house.price * ratio).toLocaleString() : 0}€
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Оплата */}
            <div className="rounded-2xl overflow-hidden"
              style={{ background: "hsl(45 100% 55% / 0.05)", border: "1px solid hsl(45 100% 55% / 0.2)" }}>
              <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: "hsl(45 100% 55% / 0.12)" }}>
                <Euro className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-semibold">Оплата</span>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{rentalDays} днів</span>
                  </div>
                  <span className="text-2xl font-black text-yellow-400">{selectedPrice.toLocaleString()}€</span>
                </div>
                <div className="flex items-center gap-2 liquid-glass rounded-xl px-3 py-2.5">
                  <span className="text-xs text-muted-foreground shrink-0">На акаунт:</span>
                  <span className="text-sm font-bold text-primary flex-1">{PAYMENT_USER}</span>
                  <button onClick={copyPayment} className="p-1.5 liquid-glass rounded-lg active:scale-90 transition-all">
                    {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                  </button>
                </div>
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl"
                  style={{ background: "hsl(45 100% 55% / 0.08)", border: "1px solid hsl(45 100% 55% / 0.18)" }}>
                  <AlertCircle className="w-3.5 h-3.5 text-yellow-400 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-yellow-400/80 leading-relaxed">
                    Вкажи у коментарі до переказу свій нік: <span className="font-bold text-yellow-400">{nick}</span>
                  </p>
                </div>
              </div>
            </div>

            <GradientButton variant="green" className="w-full" onClick={handleConfirmPayment} disabled={loading || !nick.trim()}>
              {loading
                ? <span className="flex items-center gap-2 justify-center">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Відправляю...
                  </span>
                : <span className="flex items-center gap-2 justify-center">
                    <CheckCircle className="w-4 h-4" />
                    Підтвердити оплату
                  </span>
              }
            </GradientButton>
          </div>

        ) : (
          /* ══════ ЗАЙНЯТИЙ ══════ */
          <div className="space-y-3">

            {/* Власник */}
            <div className="rounded-2xl overflow-hidden"
              style={{ background: "hsl(0 0% 0% / 0.4)", border: "1px solid hsl(0 0% 100% / 0.08)", backdropFilter: "blur(20px)" }}>
              <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: "hsl(0 0% 100% / 0.06)" }}>
                <Crown className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-semibold">Власник будинку</span>
              </div>
              <div className="px-4 py-3.5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: "hsl(45 100% 55% / 0.12)", border: "1px solid hsl(45 100% 55% / 0.3)" }}>
                  <Crown className="w-5 h-5 text-yellow-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Гравець</p>
                  <p className="text-[15px] font-bold text-foreground truncate">{house.owner}</p>
                </div>
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-destructive shrink-0"
                  style={{ background: "hsl(0 70% 50% / 0.12)", border: "1px solid hsl(0 70% 50% / 0.3)" }}>
                  ЗАЙНЯТО
                </span>
              </div>
            </div>

            {/* Сім'я */}
            {housePurchaseId && (
              <HouseFamilyDisplay housePurchaseId={housePurchaseId} />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default HouseDetail;
