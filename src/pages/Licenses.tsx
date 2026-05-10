import { useState, useEffect } from "react"; 
import PageHeader from "../components/PageHeader";
import GradientButton from "../components/GradientButton";
import { toast } from "sonner";
import { CheckCircle, FileText, Clock, Search, Shield, X, Euro, Copy, UserX, UserCheck } from "lucide-react"; 
import { store, supabase } from "../lib/store";

const LICENSE_COST = 4000;

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

  const [searchNick, setSearchNick] = useState("");
  const [searchResult, setSearchResult] = useState<any>(null);
  const [allLicenses, setAllLicenses] = useState<any[]>([]);
  const [fetchingAll, setFetchingAll] = useState(true);

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
    if (selected.includes(weapon)) {
      setSelected(selected.filter(w => w !== weapon));
    } else if (selected.length < 5) {
      setSelected([...selected, weapon]);
    } else {
      toast.error("Максимум 5 предметів!");
    }
  };

  const handleSubmit = async () => {
    if (!nick) return toast.error("Нік не знайдено");
    if (!roblox || !telegram || selected.length === 0) return toast.error("Заповніть поля");
    setLoading(true);
    try {
      const licenseData = `${selected.join(", ")} | Roblox: ${roblox}`;
      await store.submitLicense(nick, licenseData, telegram);
      setSubmitted(true);
      toast.success("Заявку надіслано!");
    } catch (err) {
      toast.error("Помилка");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#050505] pb-24 px-4 pt-4 text-white">
        <PageHeader title="ЛІЦЕНЗІЇ" subtitle="Заявка" backTo="/" />
        <div className="flex flex-col items-center justify-center py-12 animate-in fade-in zoom-in duration-500">
          <div className="w-24 h-24 rounded-3xl bg-secondary/10 border border-secondary/30 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(34,197,94,0.15)]">
            <CheckCircle className="w-12 h-12 text-secondary" style={{ filter: "drop-shadow(0 0 10px rgba(34,197,94,0.5))" }} />
          </div>
          <h2 className="text-xl font-black italic tracking-widest text-center mb-2">ЗАЯВКУ ПРИЙНЯТО</h2>
          <p className="text-[10px] text-white/40 text-center mb-8 uppercase tracking-widest leading-relaxed">
            Ваша анкета на оформлення ліцензії успішно надіслана в МВС. <br/> Очікуйте підтвердження в реєстрі.
          </p>
          
          <div className="w-full space-y-2">
            <GradientButton onClick={() => setSubmitted(false)} variant="green" className="w-full py-4 text-[10px] font-black tracking-[0.2em]">
              ПОВЕРНУТИСЬ ДО РЕЄСТРУ
            </GradientButton>
            <button onClick={() => navigate("/")} className="w-full py-3 text-[9px] font-bold text-white/30 hover:text-white/60 transition-colors tracking-widest">
              НА ГОЛОВНУ
            </button>
          </div>
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
            <div className={`p-6 rounded-3xl border animate-in zoom-in-95 duration-300 ${searchResult.found ? 'border-primary/30 bg-primary/5' : 'border-destructive/30 bg-destructive/5'}`}>
              {searchResult.found ? (
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-2xl border border-primary/30 overflow-hidden mb-3">
                    {searchResult.avatar ? <img src={searchResult.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary font-bold">{searchResult.username[0]}</div>}
                  </div>
                  <h3 className="text-sm font-black uppercase italic">{searchResult.username}</h3>
                  <div className="flex flex-wrap justify-center gap-1 mt-3">
                    {searchResult.items.map((w: string) => <span key={w} className="px-2 py-1 bg-white/5 border border-white/10 rounded-md text-[8px] font-bold text-white/60">{w}</span>)}
                  </div>
                </div>
              ) : (
                <div className="text-center text-destructive text-[10px] font-bold uppercase tracking-widest">Не знайдено</div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-3 ml-1">Активні ліцензії ({allLicenses.length})</h3>
            {fetchingAll ? (
              <div className="text-center py-10 text-white/10 text-[10px] font-bold uppercase animate-pulse italic">Оновлення бази...</div>
            ) : (
              allLicenses.map((lic, index) => (
                <div key={lic.username} className="flex items-center gap-3 p-3 bg-white/5 border border-white/5 rounded-2xl hover:border-white/10 transition-all">
                  <div className="text-[9px] font-black text-white/10 w-6 italic">#{allLicenses.length - index}</div>
                  <div className="w-9 h-9 rounded-xl overflow-hidden bg-white/5 border border-white/10">
                    {lic.users?.avatar_url ? <img src={lic.users.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-primary">{lic.username[0]}</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-black uppercase tracking-tight truncate">{lic.username}</div>
                    <div className="text-[8px] text-white/30 truncate">{lic.license_type.split("|")[0]}</div>
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
           <div className="bg-yellow-500/5 border border-yellow-500/20 p-4 rounded-2xl">
              <div className="flex items-center gap-2 mb-1 text-yellow-500">
                <Euro className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Оплата {LICENSE_COST}€</span>
              </div>
              <p className="text-[9px] text-yellow-500/60 uppercase">Переказ на нік: <span className="text-yellow-500 font-bold">Vkadosik1234</span></p>
           </div>
           
           <div className="space-y-3">
              <input value={roblox} onChange={e => setRoblox(e.target.value)} placeholder="ROBLOX NICK" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-primary/50" />
              <input value={telegram} onChange={e => setTelegram(e.target.value)} placeholder="TELEGRAM @USER" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-primary/50" />
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
              {loading ? "ВІДПРАВКА..." : "ПІДТВЕРДИТИ ЗАЯВКУ"}
           </GradientButton>
        </div>
      )}
    </div>
  );
};

export default Licenses;
