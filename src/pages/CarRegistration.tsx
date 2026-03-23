import { useState, useEffect } from "react";
import PageHeader from "../components/PageHeader";
import GradientButton from "../components/GradientButton";
import { Car, Search, Clock, Users } from "lucide-react";
import { toast } from "sonner";
import { store } from "../lib/store";
import type { CarRecord } from "../lib/store";

// ─── Ukrainian license plate visual ──────────────────────────────────────────
const PlatePreview = ({ plate }: { plate: string }) => {
  const display = plate.trim() || "АК 9265 АК";
  const isEmpty = !plate.trim();

  return (
    <div className="flex justify-center my-2">
      {/* Outer border — thin dark frame */}
      <div style={{
        display: "inline-flex",
        alignItems: "stretch",
        borderRadius: 10,
        border: "3px solid #222",
        boxShadow: "0 3px 14px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.15)",
        background: "#fff",
        overflow: "hidden",
        minWidth: 200,
        maxWidth: 280,
        height: 56,
      }}>
        {/* Left flag strip */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: 36,
          flexShrink: 0,
          borderRight: "2px solid #333",
          background: "#fff",
          gap: 0,
          paddingBottom: 2,
        }}>
          {/* Flag */}
          <div style={{ width: 26, height: 18, borderRadius: 2, overflow: "hidden", border: "1px solid #bbb", marginBottom: 3 }}>
            <div style={{ width: "100%", height: "50%", background: "#005BBB" }} />
            <div style={{ width: "100%", height: "50%", background: "#FFD500" }} />
          </div>
          {/* UA text */}
          <span style={{
            fontFamily: "Arial, sans-serif",
            fontWeight: 900,
            fontSize: 9,
            color: "#111",
            letterSpacing: 0.5,
            lineHeight: 1,
          }}>UA</span>
        </div>

        {/* Plate number */}
        <div style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          paddingLeft: 8,
          paddingRight: 10,
          background: "#fff",
        }}>
          <span style={{
            fontFamily: "'Arial Black', Arial, sans-serif",
            fontWeight: 900,
            fontSize: isEmpty ? 20 : Math.max(16, 26 - Math.max(0, display.length - 8) * 1.5),
            color: isEmpty ? "#bbb" : "#111",
            letterSpacing: "0.06em",
            lineHeight: 1,
            whiteSpace: "nowrap",
            textTransform: "uppercase",
          }}>
            {display}
          </span>
        </div>
      </div>
    </div>
  );
};

// ─── Small plate badge for registry list ─────────────────────────────────────
const PlateBadge = ({ plate }: { plate: string }) => (
  <div style={{
    display: "inline-flex",
    alignItems: "stretch",
    borderRadius: 6,
    border: "2px solid #333",
    background: "#fff",
    overflow: "hidden",
    height: 28,
    boxShadow: "0 1px 5px rgba(0,0,0,0.35)",
    flexShrink: 0,
  }}>
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      width: 18,
      borderRight: "1.5px solid #333",
      background: "#fff",
      gap: 1,
    }}>
      <div style={{ width: 12, height: 8, overflow: "hidden", borderRadius: 1, border: "0.5px solid #ccc" }}>
        <div style={{ width: "100%", height: "50%", background: "#005BBB" }} />
        <div style={{ width: "100%", height: "50%", background: "#FFD500" }} />
      </div>
      <span style={{ fontSize: 5, fontWeight: 900, color: "#111", fontFamily: "Arial", lineHeight: 1 }}>UA</span>
    </div>
    <span style={{
      fontFamily: "'Arial Black', Arial, sans-serif",
      fontWeight: 900,
      fontSize: 11,
      color: "#111",
      letterSpacing: "0.08em",
      padding: "0 7px",
      display: "flex",
      alignItems: "center",
      textTransform: "uppercase",
      whiteSpace: "nowrap",
    }}>
      {plate}
    </span>
  </div>
);

// ─── Main page ────────────────────────────────────────────────────────────────
const CarRegistration = () => {
  const [plate, setPlate] = useState("");
  const [model, setModel] = useState("");
  const [nick, setNick] = useState("");
  const [cars, setCars] = useState<CarRecord[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    store.getCars().then(data => { setCars(data); setFetching(false); });
    const savedNick = localStorage.getItem("crp_nick");
    if (savedNick) setNick(savedNick);
  }, []);

  const filtered = cars.filter(c =>
    c.plate.toLowerCase().includes(search.toLowerCase()) ||
    c.model.toLowerCase().includes(search.toLowerCase()) ||
    c.owner.toLowerCase().includes(search.toLowerCase())
  );

  const register = async () => {
    if (!nick.trim()) return toast.error("Вкажіть нікнейм");
    if (!plate.trim()) return toast.error("Введіть номер");
    if (!model.trim()) return toast.error("Введіть модель авто");
    setLoading(true);
    await store.submitLicense(nick.trim(), model.trim(), plate.trim().toUpperCase());
    toast.success("Заявку відправлено! Адміністрація розгляне її.");
    setPlate(""); setModel("");
    setLoading(false);
  };

  return (
    <div className="min-h-screen pb-20 px-4 pt-4">
      <PageHeader title="РЕЄСТР НОМЕРІВ" subtitle="Транспортні засоби" backTo="/" />

      {/* Form card */}
      <div className="rounded-2xl overflow-hidden mb-4 animate-fade-in"
        style={{ background: "hsl(0 0% 0% / 0.5)", border: "1px solid hsl(84 81% 44% / 0.15)", backdropFilter: "blur(20px)" }}>

        <div className="px-4 py-3 border-b flex items-center gap-3" style={{ borderColor: "hsl(0 0% 100% / 0.06)" }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "hsl(84 81% 44% / 0.1)", border: "1px solid hsl(84 81% 44% / 0.2)" }}>
            <Car className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Нова заявка</p>
            <p className="text-[10px] text-muted-foreground">Введіть будь-який формат номера</p>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {/* Nick */}
          <div>
            <label className="text-[10px] text-muted-foreground mb-1.5 block uppercase tracking-wider">Нікнейм</label>
            <input value={nick} onChange={e => setNick(e.target.value)} placeholder="Ваш нік в грі"
              className="w-full liquid-glass rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 bg-transparent" />
          </div>

          {/* Plate input — free format */}
          <div>
            <label className="text-[10px] text-muted-foreground mb-1.5 block uppercase tracking-wider">Номерний знак</label>
            <input
              value={plate}
              onChange={e => setPlate(e.target.value.toUpperCase())}
              placeholder="АК 9265 АК"
              maxLength={16}
              className="w-full liquid-glass rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 bg-transparent font-mono font-bold text-base tracking-widest"
            />
            <p className="text-[10px] text-muted-foreground mt-1">Будь-який формат — адмін підтвердить</p>
          </div>

          {/* Live plate preview */}
          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block uppercase tracking-wider">Попередній вигляд</label>
            <PlatePreview plate={plate} />
          </div>

          {/* Model */}
          <div>
            <label className="text-[10px] text-muted-foreground mb-1.5 block uppercase tracking-wider">Модель авто</label>
            <input value={model} onChange={e => setModel(e.target.value)} placeholder="Напр: BMW M5"
              className="w-full liquid-glass rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 bg-transparent" />
          </div>

          <GradientButton variant="green" className="w-full mt-1" onClick={register} disabled={loading}>
            {loading
              ? <span className="flex items-center gap-2 justify-center"><Clock className="w-4 h-4 animate-spin" /> Відправляю...</span>
              : <span className="flex items-center gap-2 justify-center"><Car className="w-4 h-4" /> Подати заявку</span>
            }
          </GradientButton>
        </div>
      </div>

      {/* Registry */}
      <div className="rounded-2xl overflow-hidden animate-fade-in"
        style={{ background: "hsl(0 0% 0% / 0.4)", border: "1px solid hsl(0 0% 100% / 0.07)", backdropFilter: "blur(20px)" }}>

        <div className="px-4 py-3 border-b flex items-center gap-3" style={{ borderColor: "hsl(0 0% 100% / 0.06)" }}>
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Пошук за номером, моделлю або ніком..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none" />
          <div className="flex items-center gap-1.5 shrink-0">
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">{cars.length}</span>
          </div>
        </div>

        {fetching ? (
          <div className="py-8 text-center">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Завантаження...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center">
            <Car className="w-7 h-7 text-muted-foreground opacity-20 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Нічого не знайдено</p>
          </div>
        ) : (
          <div>
            {filtered.map((c, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 border-b last:border-0"
                style={{ borderColor: "hsl(0 0% 100% / 0.05)" }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "hsl(84 81% 44% / 0.08)", border: "1px solid hsl(84 81% 44% / 0.12)" }}>
                  <Car className="w-4 h-4 text-primary/50" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{c.owner}</p>
                  <p className="text-[10px] text-muted-foreground">{c.model}</p>
                </div>
                <PlateBadge plate={c.plate} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CarRegistration;
