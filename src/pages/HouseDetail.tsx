import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import PageHeader from "../components/PageHeader";
import GradientButton from "../components/GradientButton";
import {
  ChevronLeft, ChevronRight, Home, Euro,
  CheckCircle, User, Sparkles, Tag, Clock,
  Calendar, Building2, Copy, Check, AlertCircle
} from "lucide-react";
import { store, supabase } from "../lib/store";
import type { HouseItem } from "../lib/store";
import { toast } from "sonner";

// Ціни в євро за термін
// eurPrice буде розраховуватись від house.price
const RENTAL_OPTIONS = [
  { days: 3,  label: "3 дні",   ratio: 0.15 },
  { days: 7,  label: "7 днів",  ratio: 0.30 },
  { days: 15, label: "15 днів", ratio: 0.55 },
  { days: 24, label: "24 дні",  ratio: 1.00 },
];

const PAYMENT_USER = "Vkadosik1234";

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
  const [step, setStep] = useState<"choose" | "payment" | "confirm">("choose");

  useEffect(() => {
    store.getHouses().then(houses => {
      const found = houses.find(h => h.id === Number(id));
      if (found) setHouse(found);
    });
  }, [id]);

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
  const getPrice = (ratio: number) => house ? house.price * ratio : 0;
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
      const { error } = await supabase.from("house_purchase_requests").insert({
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
      setStep("confirm");
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
              <span className="text-yellow-400 font-bold">{selectedPrice}€</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Оплата на</span>
              <span className="text-primary font-semibold">{PAYMENT_USER}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 px-5 py-3 rounded-2xl" style={{ background: "hsl(142 71% 45% / 0.08)", border: "1px solid hsl(142 71% 45% / 0.2)" }}>
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
      <div className="animate-fade-in space-y-4">

        {/* Photo */}
        <div className="relative w-full rounded-2xl overflow-hidden"
          style={{ height: photos.length > 0 ? 220 : 140, border: "1px solid hsl(0 0% 100% / 0.08)" }}>
          {photos.length > 0 ? (
            <img src={photos[photoIdx]} alt={house.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"
              style={{ background: isLux ? "hsl(45 100% 55% / 0.05)" : "hsl(var(--primary) / 0.05)" }}>
              {isLux ? <Building2 className="w-16 h-16 text-yellow-400/20" /> : <Home className="w-16 h-16 text-primary/20" />}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
          <div className="absolute top-3 left-3 flex gap-2">
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-xl backdrop-blur-sm flex items-center gap-1"
              style={{ background: isLux ? "hsl(45 100% 55% / 0.2)" : "hsl(var(--primary) / 0.2)", color: isLux ? "hsl(45 100% 55%)" : "hsl(var(--primary))", border: `1px solid ${isLux ? "hsl(45 100% 55% / 0.4)" : "hsl(var(--primary) / 0.4)"}` }}>
              <Sparkles className="w-3 h-3" /> {house.category}
            </span>
          </div>
          <div className="absolute top-3 right-3">
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-xl backdrop-blur-sm ${isAvailable ? "text-primary" : "text-destructive"}`}
              style={{ background: isAvailable ? "hsl(var(--primary) / 0.2)" : "hsl(0 70% 50% / 0.2)", border: isAvailable ? "1px solid hsl(var(--primary) / 0.4)" : "1px solid hsl(0 70% 50% / 0.4)" }}>
              {isAvailable ? "ВІЛЬНО" : "ЗАЙНЯТО"}
            </span>
          </div>
          <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
            <div>
              <h2 className="text-base font-black text-white">{house.name}</h2>
              <p className="text-[10px] text-white/60">{house.desc}</p>
            </div>
          </div>
          {photos.length > 1 && (
            <>
              <button onClick={() => setPhotoIdx(i => Math.max(0, i - 1))} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center active:scale-90">
                <ChevronLeft className="w-4 h-4 text-white" />
              </button>
              <button onClick={() => setPhotoIdx(i => Math.min(photos.length - 1, i + 1))} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center active:scale-90">
                <ChevronRight className="w-4 h-4 text-white" />
              </button>
            </>
          )}
        </div>

        {isAvailable ? (
          <div className="rounded-2xl overflow-hidden" style={{ background: "hsl(0 0% 0% / 0.4)", border: "1px solid hsl(var(--primary) / 0.15)", backdropFilter: "blur(20px)" }}>
            <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: "hsl(0 0% 100% / 0.06)" }}>
              <Euro className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-semibold">Орендувати будинок</span>
            </div>
            <div className="p-4 space-y-4">

              {/* Nick */}
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 block">Ваш нік</label>
                <div className="flex items-center gap-2 liquid-glass rounded-xl px-4 py-3">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-foreground/80">{nick || "—"}</span>
                </div>
              </div>

              {/* Rental period */}
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 block">Термін оренди</label>
                <div className="grid grid-cols-4 gap-2">
                  {RENTAL_OPTIONS.map(({ days, label, ratio }) => (
                    <button key={days} onClick={() => setRentalDays(days)}
                      className="flex flex-col items-center py-2.5 rounded-xl border transition-all active:scale-95"
                      style={{
                        background: rentalDays === days ? "hsl(var(--primary) / 0.15)" : "hsl(0 0% 100% / 0.03)",
                        borderColor: rentalDays === days ? "hsl(var(--primary) / 0.5)" : "hsl(0 0% 100% / 0.08)",
                        boxShadow: rentalDays === days ? "0 0 12px hsl(var(--primary) / 0.2)" : "none",
                      }}>
                      <span className={`text-xs font-bold ${rentalDays === days ? "text-primary" : "text-foreground"}`}>{label}</span>
                      <span className={`text-[10px] font-bold mt-0.5 ${rentalDays === days ? "text-yellow-400" : "text-muted-foreground"}`}>{house ? (house.price * ratio).toLocaleString() : 0}€</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment block */}
              <div className="rounded-2xl p-4 space-y-3" style={{ background: "hsl(45 100% 55% / 0.05)", border: "1px solid hsl(45 100% 55% / 0.15)" }}>
                <div className="flex items-center gap-2 mb-1">
                  <Euro className="w-4 h-4 text-yellow-400" />
                  <span className="text-xs font-bold text-foreground">Оплата</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Переведи <span className="text-yellow-400 font-bold text-sm">{selectedPrice}€</span> на акаунт нижче і натисни "Підтвердити оплату". Адміністратор перевірить і активує оренду.
                </p>
                <div className="flex items-center gap-2 liquid-glass rounded-xl px-3 py-2.5">
                  <span className="text-xs text-muted-foreground">Перевести на:</span>
                  <span className="text-sm font-bold text-primary flex-1">{PAYMENT_USER}</span>
                  <button onClick={copyPayment} className="p-1.5 liquid-glass rounded-lg active:scale-90 transition-all">
                    {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                  </button>
                </div>
                <div className="flex items-start gap-2 px-3 py-2 rounded-xl" style={{ background: "hsl(45 100% 55% / 0.08)", border: "1px solid hsl(45 100% 55% / 0.15)" }}>
                  <AlertCircle className="w-3.5 h-3.5 text-yellow-400 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-yellow-400/80">Вкажи у коментарі до переказу свій нік: <span className="font-bold">{nick}</span></p>
                </div>
              </div>

              {/* Summary */}
              <div className="flex items-center justify-between px-3 py-2.5 rounded-xl" style={{ background: "hsl(0 0% 100% / 0.03)", border: "1px solid hsl(0 0% 100% / 0.06)" }}>
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{rentalDays} днів</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Euro className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="text-sm font-black text-yellow-400">{selectedPrice}€</span>
                </div>
              </div>

              <GradientButton variant="green" className="w-full" onClick={handleConfirmPayment} disabled={loading || !nick.trim()}>
                {loading
                  ? <span className="flex items-center gap-2 justify-center"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Відправляю...</span>
                  : <span className="flex items-center gap-2 justify-center"><CheckCircle className="w-4 h-4" />Підтвердити оплату</span>
                }
              </GradientButton>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl p-5 text-center" style={{ background: "hsl(0 70% 50% / 0.05)", border: "1px solid hsl(0 70% 50% / 0.2)" }}>
            <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: "hsl(0 70% 50% / 0.1)", border: "1px solid hsl(0 70% 50% / 0.2)" }}>
              <User className="w-6 h-6 text-destructive" />
            </div>
            <p className="text-sm font-bold text-destructive mb-1">Будинок зайнятий</p>
            <p className="text-xs text-muted-foreground">Власник: <span className="text-foreground font-semibold">{house.owner}</span></p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HouseDetail;
