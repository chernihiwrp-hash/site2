import { useState } from "react";
import PageHeader from "../components/PageHeader";
import GradientButton from "../components/GradientButton";
import { toast } from "sonner";
import { CheckCircle, FileText, Clock, AlertCircle, Search, Shield, X, Euro, Copy } from "lucide-react";
import { store, supabase } from "../lib/store";

const LICENSE_COST = 4000; // EUR

const weapons = [
  { category: "Вогнепальна", items: ["Glock 17", "MP5", "M58B Shotgun", "M4 Carbine", "G36", "Sniper"] },
  { category: "Ближній бій", items: ["Bayonet", "Machete", "Baseball Bat", "Metal Bat", "Knuckledusters"] },
  { category: "Спец засоби", items: ["Taser"] },
];

const Licenses = () => {
  const nick = localStorage.getItem("crp_nick") || "";
  const [roblox, setRoblox] = useState("");
  const [telegram, setTelegram] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"form" | "search">("search");

  // Search
  const [searchNick, setSearchNick] = useState("");
  const [searchResult, setSearchResult] = useState<{ found: boolean; items: string[] } | null>(null);
  const [searching, setSearching] = useState(false);


  const toggleWeapon = (weapon: string) => {
    if (selected.includes(weapon)) {
      setSelected(selected.filter(w => w !== weapon));
    } else if (selected.length < 5) {
      setSelected([...selected, weapon]);
    } else {
      toast.error("Максимум 5 предметів!");
    }
  };

  const handleSearch = async () => {
    if (!searchNick.trim()) return toast.error("Введіть нік гравця");
    setSearching(true);
    setSearchResult(null);
    const { data } = await supabase
      .from("license_applications")
      .select("license_type, status")
      .ilike("username", searchNick.trim())
      .eq("status", "approved");
    if (data && data.length > 0) {
      const items = data.map((d: Record<string, unknown>) => d.license_type as string).filter(Boolean);
      setSearchResult({ found: true, items });
    } else {
      setSearchResult({ found: false, items: [] });
    }
    setSearching(false);
  };

  const handleSubmit = async () => {
    if (!nick) return toast.error("Нік не знайдено");
    if (!roblox || !telegram || selected.length === 0) return toast.error("Заповніть усі поля та оберіть зброю");
    setLoading(true);
    try {
      await store.submitLicense(nick, `${selected.join(", ")} | Roblox: ${roblox}`, telegram);
      setSubmitted(true);
    } catch {
      toast.error("Помилка відправки, спробуй ще раз");
    }
    setLoading(false);
  };

  // ── Екран "немає грошей" ──


  // ── Екран підтвердження ──
  if (submitted) {
    return (
      <div className="min-h-screen pb-20 px-4 pt-4">
        <PageHeader title="ЛІЦЕНЗІЇ" subtitle="Вартість: 4000€" backTo="/" />
        <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
          <div className="w-28 h-28 rounded-3xl flex items-center justify-center mb-6"
            style={{ background: "linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--secondary) / 0.08))", border: "2px solid hsl(var(--primary) / 0.4)", boxShadow: "0 0 60px hsl(var(--primary) / 0.25)" }}>
            <CheckCircle className="w-14 h-14 text-primary" style={{ filter: "drop-shadow(0 0 12px hsl(var(--primary)))" }} />
          </div>
          <h2 className="font-display text-2xl font-black tracking-wider text-foreground mb-2 text-center">ЗАЯВКУ ВІДПРАВЛЕНО</h2>
          <p className="text-sm text-muted-foreground text-center mb-3 max-w-xs">Ваша заявка на ліцензію передана адміністрації сервера</p>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl mb-5" style={{ background: "hsl(45 100% 55% / 0.08)", border: "1px solid hsl(45 100% 55% / 0.2)" }}>
            <Euro className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-xs text-yellow-400 font-medium">Оплата {LICENSE_COST}€ на Vkadosik1234</span>
          </div>
          <div className="w-full max-w-xs liquid-glass rounded-2xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-foreground">Обрана зброя</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {selected.map(w => (
                <span key={w} className="text-[10px] px-2.5 py-1 rounded-lg font-medium"
                  style={{ background: "hsl(var(--primary) / 0.12)", border: "1px solid hsl(var(--primary) / 0.25)", color: "hsl(var(--primary))" }}>
                  {w}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 px-5 py-3 rounded-2xl" style={{ background: "hsl(var(--primary) / 0.08)", border: "1px solid hsl(var(--primary) / 0.2)" }}>
            <Clock className="w-4 h-4 text-primary" />
            <span className="text-xs text-primary font-medium">Очікуйте відповіді в профілі</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 px-4 pt-4">
      <PageHeader title="ЛІЦЕНЗІЇ" subtitle="Вартість: 4000€" backTo="/" />

      {/* Tabs */}
      <div className="flex gap-2 mb-4 liquid-glass rounded-2xl p-1">
        {[{ id: "form", label: "Подати заявку" }, { id: "search", label: "Перевірити ліцензію" }].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as "form" | "search")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${activeTab === t.id ? "bg-primary text-black" : "text-muted-foreground"}`}>
            {t.id === "form" ? <FileText className="w-3.5 h-3.5" /> : <Search className="w-3.5 h-3.5" />}
            {t.label}
          </button>
        ))}
      </div>

      {/* SEARCH TAB */}
      {activeTab === "search" && (
        <div className="space-y-4 animate-fade-in">
          <div className="liquid-glass-card rounded-2xl p-4">
            <label className="text-xs text-muted-foreground mb-2 block">Введіть нік гравця</label>
            <div className="flex gap-2">
              <input value={searchNick} onChange={e => setSearchNick(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                placeholder="Нік в грі..." className="flex-1 liquid-glass rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none bg-transparent" />
              <button onClick={handleSearch} disabled={searching}
                className="px-4 py-3 rounded-xl text-sm font-bold transition-all active:scale-95"
                style={{ background: "hsl(var(--primary) / 0.15)", border: "1px solid hsl(var(--primary) / 0.3)", color: "hsl(var(--primary))" }}>
                {searching ? <Clock className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {searchResult && (
            <div className="animate-fade-in">
              {searchResult.found ? (
                <div className="rounded-2xl p-5" style={{ background: "hsl(var(--primary) / 0.06)", border: "1px solid hsl(var(--primary) / 0.25)" }}>
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="w-5 h-5 text-primary" />
                    <span className="text-sm font-bold text-foreground">{searchNick}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-primary/15 text-primary border border-primary/25 font-bold">МАЄ ЛІЦЕНЗІЮ</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">Дозволена зброя:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {searchResult.items.flatMap(item =>
                      item.split("|")[0].split(",").map(w => w.trim())
                    ).filter(w => w).map((w, i) => (
                      <span key={i} className="text-[10px] px-2.5 py-1 rounded-lg font-medium"
                        style={{ background: "hsl(var(--primary) / 0.1)", border: "1px solid hsl(var(--primary) / 0.2)", color: "hsl(var(--primary))" }}>
                        {w}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl p-5 text-center" style={{ background: "hsl(0 70% 50% / 0.06)", border: "1px solid hsl(0 70% 50% / 0.2)" }}>
                  <X className="w-8 h-8 text-destructive mx-auto mb-2" />
                  <p className="text-sm font-bold text-destructive mb-1">ЛІЦЕНЗІЇ НЕМАЄ</p>
                  <p className="text-xs text-muted-foreground">У гравця <span className="text-foreground font-medium">{searchNick}</span> немає активних ліцензій</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* FORM TAB */}
      {activeTab === "form" && (
        <div className="space-y-4">
          {/* No money screen inline */}

          {/* Payment info */}
          <div className="rounded-2xl p-4 space-y-2" style={{ background: "hsl(45 100% 55% / 0.05)", border: "1px solid hsl(45 100% 55% / 0.15)" }}>
            <div className="flex items-center gap-2 mb-1">
              <Euro className="w-4 h-4 text-yellow-400" />
              <span className="text-xs font-bold text-foreground">Оплата {LICENSE_COST}€</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Переведи <span className="text-yellow-400 font-bold">{LICENSE_COST}€</span> на акаунт нижче і надішли заявку. Адмін перевірить оплату і видасть ліцензію.
            </p>
            <div className="flex items-center gap-2 liquid-glass rounded-xl px-3 py-2.5">
              <span className="text-xs text-muted-foreground shrink-0">Перевести на:</span>
              <span className="text-sm font-bold text-primary flex-1">Vkadosik1234</span>
              <button onClick={() => { navigator.clipboard.writeText("Vkadosik1234"); toast.success("Скопійовано!"); }}
                className="p-1.5 liquid-glass rounded-lg active:scale-90 transition-all">
                <Copy className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
            <div className="flex items-start gap-2 px-3 py-2 rounded-xl" style={{ background: "hsl(45 100% 55% / 0.08)", border: "1px solid hsl(45 100% 55% / 0.15)" }}>
              <AlertCircle className="w-3.5 h-3.5 text-yellow-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-yellow-400/80">Вкажи у коментарі свій нік: <span className="font-bold">{nick}</span></p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Нік</label>
              <div className="w-full liquid-glass rounded-xl px-4 py-3 text-sm text-foreground/60">{nick || "—"}</div>
            </div>
            {[
              { label: "Roblox Username", value: roblox, set: setRoblox, placeholder: "Roblox username" },
              { label: "Telegram", value: telegram, set: setTelegram, placeholder: "@username" },
            ].map(f => (
              <div key={f.label}>
                <label className="text-xs text-muted-foreground mb-1 block">{f.label}</label>
                <input value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                  className="w-full liquid-glass rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 bg-transparent" />
              </div>
            ))}
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-3">Оберіть зброю <span className="text-primary font-semibold">({selected.length}/5)</span></p>
            {weapons.map(cat => (
              <div key={cat.category} className="mb-4">
                <p className="text-[11px] text-primary font-semibold mb-2 uppercase tracking-wider">{cat.category}</p>
                <div className="flex flex-wrap gap-2">
                  {cat.items.map(w => (
                    <button key={w} onClick={() => toggleWeapon(w)}
                      className={`text-[11px] px-3 py-1.5 rounded-xl border transition-all active:scale-95 ${selected.includes(w) ? "bg-primary/20 border-primary/40 text-primary" : "liquid-glass text-muted-foreground hover:text-foreground"}`}>
                      {w}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <GradientButton onClick={handleSubmit} variant="green" className="w-full" disabled={loading}>
            {loading ? <><Clock className="w-4 h-4 inline mr-2 animate-spin" />Відправляю...</> : <>Надіслати заявку (після оплати)</>}
          </GradientButton>
        </div>
      )}
    </div>
  );
};

export default Licenses;
