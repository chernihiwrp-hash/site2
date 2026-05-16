import { useState, useEffect } from "react";
import PageHeader from "../components/PageHeader";
import GradientButton from "../components/GradientButton";
import { toast } from "sonner";
import { CheckCircle, Clock, Search, Euro, Coins } from "lucide-react";
import { store, supabase, LICENSE_CR_PRICE, getBalanceFromDB } from "../lib/store";

const LICENSE_COST_EUR = 4000;

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
  const [paymentMethod, setPaymentMethod] = useState<"money" | "cr">("money");
  const [balance, setBalance] = useState(0);

  const [searchNick, setSearchNick] = useState("");
  const [searchResult, setSearchResult] = useState<any>(null);
  const [allLicenses, setAllLicenses] = useState<any[]>([]);
  const [fetchingAll, setFetchingAll] = useState(true);

  useEffect(() => {
    if (nick) getBalanceFromDB(nick).then(setBalance);
  }, [nick]);

  useEffect(() => {
    const fetchAll = async () => {
      setFetchingAll(true);
      const { data: licenses } = await supabase
        .from("license_applications")
        .select("username, license_type, status, created_at")
        .eq("status", "approved")
        .order('created_at', { ascending: false });

      if (licenses && licenses.length > 0) {
        const { data: usersData } = await supabase
          .from("users")
          .select("username, avatar_url")
          .in("username", licenses.map(l => l.username));

        const combined = licenses.map(lic => ({
          ...lic,
          users: usersData?.find(u => u.username === lic.username) || null
        }));
        setAllLicenses(combined);
      }
      setFetchingAll(false);
    };
    fetchAll();
  }, []);

  const handleSearch = () => {
    const cleanNick = searchNick.trim().toLowerCase();
    if (!cleanNick) return;
    const found = allLicenses.find(l => l.username.toLowerCase() === cleanNick);
    if (found) {
      const items = found.license_type.includes("|") ? found.license_type.split("|")[0].trim().split(", ") : [found.license_type];
      setSearchResult({ found: true, items, username: found.username, avatar: found.users?.avatar_url });
    } else {
      setSearchResult({ found: false, username: searchNick });
    }
  };

  const toggleWeapon = (weapon: string) => {
    if (selected.includes(weapon)) setSelected(selected.filter(w => w !== weapon));
    else if (selected.length < 5) setSelected([...selected, weapon]);
    else toast.error("Максимум 5 предметів!");
  };

  const handleSubmit = async () => {
    if (!nick) return toast.error("Нік не знайдено");
    if (selected.length === 0) return toast.error("Виберіть ліцензії");
    if (!roblox) return toast.error("Вкажіть Roblox нік");
    // TG обов'язковий ТІЛЬКИ для оплати грошима
    if (paymentMethod === "money" && !telegram) return toast.error("Telegram обов'язковий при оплаті €");
    setLoading(true);
    try {
      const licenseData = `${selected.join(", ")} | Roblox: ${roblox}`;
      const res = await store.submitLicenseFull(nick, licenseData, telegram, paymentMethod);
      if (!res.ok) {
        toast.error(res.error || "Помилка");
      } else {
        setSubmitted(true);
        if (res.auto) {
          toast.success("✅ Ліцензію видано миттєво!");
          setBalance(b => b - LICENSE_CR_PRICE);
        }
      }
    } catch {
      toast.error("Помилка");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#050505] pb-24 px-4 pt-4 text-white flex flex-col items-center justify-center animate-fade-in">
        <div className="w-28 h-28 rounded-3xl flex items-center justify-center mb-6"
          style={{ background: "hsl(142 71% 45% / 0.12)", border: "2px solid hsl(142 71% 45% / 0.4)", boxShadow: "0 0 60px hsl(142 71% 45% / 0.25)" }}>
          <CheckCircle className="w-14 h-14" style={{ color: "hsl(142 71% 45%)", filter: "drop-shadow(0 0 12px hsl(142 71% 45%))" }} />
        </div>
        <h2 className="font-display text-2xl font-black text-white mb-2 text-center tracking-wide">
          {paymentMethod === "cr" ? "ЛІЦЕНЗІЮ ВИДАНО" : "ЗАЯВКУ ВІДПРАВЛЕНО"}
        </h2>
        <p className="text-xs text-white/40 text-center mb-6 max-w-xs">
          {paymentMethod === "cr"
            ? "Ліцензія активована миттєво за CR. Перевірте профіль."
            : "Адміністрація перевірить оплату і оформить ліцензію."}
        </p>
        <div className="flex items-center gap-2 px-5 py-3 rounded-2xl" style={{ background: "hsl(142 71% 45% / 0.08)", border: "1px solid hsl(142 71% 45% / 0.2)" }}>
          <Clock className="w-4 h-4" style={{ color: "hsl(142 71% 45%)" }} />
          <span className="text-xs font-medium" style={{ color: "hsl(142 71% 45%)" }}>
            {paymentMethod === "cr" ? "Готово!" : "Очікуйте підтвердження"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] pb-24 px-4 pt-4 text-white">
      <PageHeader title="ЛІЦЕНЗІЇ" subtitle="Реєстр МВС" backTo="/" />

      <div className="flex gap-2 mb-6 bg-white/5 p-1 rounded-2xl border border-white/10">
        {[{ id: "search", label: "РЕЄСТР" }, { id: "form", label: "ОФОРМИТИ" }].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as any)}
            className={`flex-1 py-3 rounded-xl text-[10px] font-black tracking-widest transition-all ${activeTab === t.id ? "bg-primary text-black" : "text-white/40"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "search" ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input value={searchNick} onChange={e => setSearchNick(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSearch()}
                placeholder="Пошук за ніком..." className="w-full bg-transparent pl-12 pr-4 py-2 text-sm focus:outline-none" />
            </div>
          </div>

          {searchResult && (
            <div className={`p-6 rounded-3xl border ${searchResult.found ? 'border-primary/30 bg-primary/5' : 'border-destructive/30 bg-destructive/5'}`}>
              {searchResult.found ? (
                <div className="flex flex-col items-center">
                  <h3 className="text-sm font-black uppercase italic">{searchResult.username}</h3>
                  <div className="flex flex-wrap justify-center gap-1 mt-3">
                    {searchResult.items.map((w: string) => <span key={w} className="px-2 py-1 bg-white/5 border border-white/10 rounded-md text-[8px] font-bold text-white/60">{w}</span>)}
                  </div>
                </div>
              ) : (
                <div className="text-center text-destructive text-[10px] font-bold uppercase">Не знайдено</div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-3 ml-1">Активні ({allLicenses.length})</h3>
            {fetchingAll ? (
              <div className="text-center py-10 text-white/10 text-[10px] font-bold uppercase animate-pulse">Завантаження...</div>
            ) : (
              allLicenses.map((lic, index) => (
                <div key={lic.username + index} className="flex items-center gap-3 p-3 bg-white/5 border border-white/5 rounded-2xl">
                  <div className="text-[9px] font-black text-white/10 w-6">#{allLicenses.length - index}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-black uppercase truncate">{lic.username}</div>
                    <div className="text-[8px] text-white/30 truncate">{lic.license_type.split("|")[0]}</div>
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
          {/* Тип оплати */}
          <div>
            <p className="text-[10px] font-black uppercase text-white/40 mb-2 tracking-widest">Тип оплати</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setPaymentMethod("money")}
                className={`p-3 rounded-2xl border text-left transition-all ${paymentMethod === "money" ? "bg-yellow-500/15 border-yellow-500/40" : "bg-white/5 border-white/10"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Euro className="w-4 h-4 text-yellow-400" />
                  <span className="text-[11px] font-black uppercase">Гроші</span>
                </div>
                <p className="text-[9px] text-white/40">{LICENSE_COST_EUR}€ — на розгляд адмінів</p>
              </button>
              <button onClick={() => setPaymentMethod("cr")}
                className={`p-3 rounded-2xl border text-left transition-all ${paymentMethod === "cr" ? "bg-primary/15 border-primary/40" : "bg-white/5 border-white/10"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Coins className="w-4 h-4 text-primary" />
                  <span className="text-[11px] font-black uppercase">CR</span>
                </div>
                <p className="text-[9px] text-white/40">{LICENSE_CR_PRICE.toLocaleString()} CR — миттєва видача</p>
                <p className="text-[9px] text-white/30 mt-0.5">Ваш баланс: {balance.toLocaleString()} CR</p>
              </button>
            </div>
          </div>

          {paymentMethod === "money" && (
            <div className="bg-yellow-500/5 border border-yellow-500/20 p-4 rounded-2xl">
              <div className="flex items-center gap-2 mb-1 text-yellow-500">
                <Euro className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Оплата {LICENSE_COST_EUR}€</span>
              </div>
              <p className="text-[9px] text-yellow-500/60 uppercase">Переказ на нік: <span className="text-yellow-500 font-bold">Vkadosik1234</span></p>
            </div>
          )}

          <div className="space-y-3">
            <input value={roblox} onChange={e => setRoblox(e.target.value)} placeholder="ROBLOX NICK" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-primary/50" />
            <input value={telegram} onChange={e => setTelegram(e.target.value)}
              placeholder={paymentMethod === "money" ? "TELEGRAM @USER (обов'язково)" : "TELEGRAM @USER (необов'язково)"}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-primary/50" />
          </div>

          <div className="space-y-4">
            {weapons.map(cat => (
              <div key={cat.category}>
                <p className="text-[9px] text-primary font-bold mb-2 uppercase tracking-widest">{cat.category}</p>
                <div className="flex flex-wrap gap-2">
                  {cat.items.map(w => (
                    <button key={w} onClick={() => toggleWeapon(w)} className={`px-3 py-2 rounded-xl text-[9px] font-bold border transition-all ${selected.includes(w) ? "bg-primary/20 border-primary/40 text-primary" : "bg-white/5 border-white/10 text-white/40"}`}>{w}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <GradientButton onClick={handleSubmit} variant="green" className="w-full py-4 text-[10px] font-black tracking-widest" disabled={loading}>
            {loading ? "ВІДПРАВКА..." : paymentMethod === "cr" ? `СПЛАТИТИ ${LICENSE_CR_PRICE.toLocaleString()} CR` : "ПІДТВЕРДИТИ ЗАЯВКУ"}
          </GradientButton>
        </div>
      )}
    </div>
  );
};

export default Licenses;
