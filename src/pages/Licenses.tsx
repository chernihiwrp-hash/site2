import { useState, useEffect } from "react"; 
import { motion, AnimatePresence } from "framer-motion"; // Для крутих анімацій
import PageHeader from "../components/PageHeader";
import GradientButton from "../components/GradientButton";
import { toast } from "sonner";
import { CheckCircle, FileText, Clock, Search, Shield, X, Euro, Copy, UserX, UserCheck, Hash } from "lucide-react"; 
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

  // --- ЛОГІКА РЕЄСТРУ ТА ПОШУКУ ---
  const [searchNick, setSearchNick] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [searchResult, setSearchResult] = useState<any>(null);
  const [allLicenses, setAllLicenses] = useState<any[]>([]);
  const [fetchingAll, setFetchingAll] = useState(true);

  // Завантаження всього реєстру (Миримо таблиці)
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

  const handleSearch = async () => {
    const cleanNick = searchNick.trim();
    if (!cleanNick) return;
    setSuggestions([]);

    const found = allLicenses.find(l => l.username.toLowerCase() === cleanNick.toLowerCase());
    
    if (found) {
      const items = found.license_type.includes("|") 
        ? found.license_type.split("|")[0].trim().split(", ") 
        : [found.license_type];
      setSearchResult({ found: true, items, username: found.username, avatar: found.users?.avatar_url });
    } else {
      setSearchResult({ found: false, username: cleanNick });
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

  return (
    <div className="min-h-screen bg-[#050505] pb-24 px-4 pt-4 text-white">
      <PageHeader title="ЛІЦЕНЗІЇ" subtitle="Система МВС" backTo="/" />

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-white/5 p-1 rounded-2xl border border-white/10">
        {[{ id: "search", label: "РЕЄСТР", icon: Search }, { id: "form", label: "ОФОРМИТИ", icon: FileText }].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black tracking-widest transition-all ${activeTab === t.id ? "bg-primary text-black shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]" : "text-white/40"}`}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "search" ? (
          <motion.div key="search" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            
            {/* Пошук */}
            <div className="relative group">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 focus-within:border-primary/50 transition-all">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  <input value={searchNick} onChange={e => setSearchNick(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSearch()}
                    placeholder="Пошук за ніком..." className="w-full bg-transparent pl-12 pr-4 py-2 text-sm focus:outline-none" />
                </div>
              </div>
            </div>

            {/* Результат пошуку */}
            {searchResult && (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`p-6 rounded-3xl border ${searchResult.found ? 'border-primary/30 bg-primary/5' : 'border-destructive/30 bg-destructive/5'}`}>
                {searchResult.found ? (
                  <div className="flex flex-col items-center">
                    <div className="w-20 h-20 rounded-2xl border-2 border-primary/50 overflow-hidden mb-3 shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)]">
                      {searchResult.avatar ? <img src={searchResult.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-primary/20 flex items-center justify-center text-primary font-bold">{searchResult.username[0]}</div>}
                    </div>
                    <h3 className="text-lg font-black italic uppercase">{searchResult.username}</h3>
                    <span className="text-[9px] text-primary font-bold tracking-[0.2em] mb-4">VERIFIED HOLDER</span>
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {searchResult.items.map((w: string) => <span key={w} className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] font-bold text-white/70">{w}</span>)}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <UserX className="w-10 h-10 text-destructive mx-auto mb-2" />
                    <p className="text-xs font-bold text-destructive uppercase">Ліцензію не знайдено</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* ВЕСЬ РЕЄСТР З НОМЕРАМИ */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Активні ліцензії ({allLicenses.length})</h3>
                <Shield className="w-3 h-3 text-white/20" />
              </div>
              
              <div className="grid gap-2">
                {fetchingAll ? (
                   <div className="text-center py-10 text-white/20 animate-pulse text-xs font-bold uppercase italic">Завантаження реєстру...</div>
                ) : (
                  allLicenses.map((lic, index) => (
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }} 
                      animate={{ opacity: 1, x: 0 }} 
                      transition={{ delay: index * 0.05 }}
                      key={lic.username} 
                      className="flex items-center gap-3 p-3 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-colors"
                    >
                      <div className="text-[10px] font-black text-white/20 w-6 italic">#{allLicenses.length - index}</div>
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/5 border border-white/10 shrink-0">
                        {lic.users?.avatar_url ? (
                          <img src={lic.users.avatar_url} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-primary bg-primary/10">{lic.username[0]}</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-black uppercase tracking-tight truncate">{lic.username}</div>
                        <div className="text-[8px] text-white/40 truncate">{lic.license_type.split("|")[0]}</div>
                      </div>
                      <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="form" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-5">
             {/* Сюди встав свою логіку форми (handleSubmit, вибір зброї і т.д.) як у попередньому коді */}
             <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-2xl flex items-center gap-3">
                <Euro className="w-5 h-5 text-yellow-500" />
                <div>
                  <div className="text-[10px] font-black text-yellow-500 uppercase">Оплата {LICENSE_COST}€</div>
                  <div className="text-[9px] text-yellow-500/60">Переказ на: Vkadosik1234</div>
                </div>
             </div>
             {/* ... Решта полів форми ... */}
             <GradientButton onClick={handleSubmit} variant="green" className="w-full py-4 shadow-lg shadow-primary/20" disabled={loading}>
                {loading ? "ВІДПРАВКА..." : "ПІДТВЕРДИТИ ЗАЯВКУ"}
             </GradientButton>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Licenses;
