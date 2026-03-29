import { useState, useEffect } from "react"; 
import PageHeader from "../components/PageHeader";
import GradientButton from "../components/GradientButton";
import { toast } from "sonner";
import { CheckCircle, FileText, Clock, AlertCircle, Search, Shield, X, Euro, Copy, UserX, UserCheck } from "lucide-react"; 
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

  // --- ШТАТНІ СТЕЙТИ ---
  const [searchNick, setSearchNick] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [allLicenses, setAllLicenses] = useState<any[]>([]);
  const [fetchingAll, setFetchingAll] = useState(true);

  // Ефект 1: Завантаження списку (БЕЗ ПОМИЛКИ 400)
  useEffect(() => {
    const fetchAll = async () => {
      setFetchingAll(true);
      
      // 1. Беремо тільки ліцензії
      const { data: licenses } = await supabase
        .from("license_applications")
        .select("username, license_type, status")
        .eq("status", "approved")
        .order('created_at', { ascending: false });

      if (licenses && licenses.length > 0) {
        // 2. Беремо аватарки окремо одним запитом
        const { data: usersData } = await supabase
          .from("users")
          .select("username, avatar_url")
          .in("username", licenses.map(l => l.username));

        // 3. Склеюємо дані вручну
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

  // Ефект 2: Живі підказки
  useEffect(() => {
    const fetchSuggestions = async () => {
      const term = searchNick.trim();
      if (term.length < 2) { setSuggestions([]); return; }
      
      const { data: licData } = await supabase
        .from("license_applications")
        .select("username, status, license_type")
        .ilike("username", `%${term}%`)
        .limit(5);

      if (licData) {
        // Довантажуємо аватарки для підказок
        const { data: userData } = await supabase
          .from("users")
          .select("username, avatar_url")
          .in("username", licData.map(l => l.username));

        const merged = licData.map(l => ({
          ...l,
          users: userData?.find(u => u.username === l.username) || null
        }));
        setSuggestions(merged);
      }
    };
    const timer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timer);
  }, [searchNick]);

  const selectUser = (user: any) => {
    setSearchNick(user.username);
    setSuggestions([]);
    
    if (user.status === 'approved') {
      const items = user.license_type.includes("|") 
        ? user.license_type.split("|")[0].trim().split(", ") 
        : [user.license_type];
      setSearchResult({ 
        found: true, 
        items, 
        username: user.username, 
        avatar: user.users?.avatar_url 
      });
    } else {
      setSearchResult({ found: false, username: user.username });
    }
  };

  const handleSearch = async () => {
    const cleanNick = searchNick.trim();
    if (!cleanNick) return;
    setSearching(true);
    setSuggestions([]);

    const { data: lic } = await supabase
      .from("license_applications")
      .select("username, license_type, status")
      .ilike("username", cleanNick) 
      .eq("status", "approved")
      .maybeSingle();

    if (lic) {
      const { data: user } = await supabase
        .from("users")
        .select("avatar_url")
        .eq("username", lic.username)
        .maybeSingle();

      const items = lic.license_type.includes("|") 
        ? lic.license_type.split("|")[0].trim().split(", ") 
        : [lic.license_type];

      setSearchResult({ 
        found: true, 
        items, 
        username: lic.username, 
        avatar: user?.avatar_url 
      });
    } else {
      setSearchResult({ found: false, username: cleanNick });
    }
    setSearching(false);
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
    if (!roblox || !telegram || selected.length === 0) return toast.error("Заповніть усі поля");
    setLoading(true);
    try {
      const licenseData = `${selected.join(", ")} | Roblox: ${roblox}`;
      await store.submitLicense(nick, licenseData, telegram);
      setSubmitted(true);
    } catch (err) {
      toast.error("Помилка відправки");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen pb-20 px-4 pt-4">
        <PageHeader title="ЛІЦЕНЗІЇ" subtitle="Заявка відправлена" backTo="/" />
        <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
          <CheckCircle className="w-16 h-16 text-primary mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">ЗАЯВКУ ОТРИМАНО</h2>
          <p className="text-sm text-muted-foreground mb-6 text-center">Очікуйте перевірки оплати ({LICENSE_COST}€)</p>
          <GradientButton onClick={() => setSubmitted(false)} variant="green">Зрозуміло</GradientButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 px-4 pt-4">
      <PageHeader title="ЛІЦЕНЗІЇ" subtitle="Вартість: 4000€" backTo="/" />

      <div className="flex gap-2 mb-4 liquid-glass rounded-2xl p-1">
        {[{ id: "form", label: "Подати" }, { id: "search", label: "Пошук" }].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as "form" | "search")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${activeTab === t.id ? "bg-primary text-black" : "text-muted-foreground"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "search" && (
        <div className="space-y-4 animate-in fade-in duration-500">
          <div className="relative">
            <div className="liquid-glass-card rounded-2xl p-4 border border-white/5">
              <label className="text-[10px] font-bold text-white/30 uppercase mb-2 block">Перевірка гравця</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input 
                  value={searchNick} 
                  onChange={e => setSearchNick(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                  placeholder="Нік гравця..." 
                  className="w-full liquid-glass rounded-xl pl-12 pr-4 py-3.5 text-sm text-white focus:outline-none bg-transparent" 
                />
              </div>
            </div>

            {suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#0c0c0c] border border-white/10 rounded-2xl overflow-hidden z-50">
                {suggestions.map((s, i) => (
                  <div key={i} onClick={() => selectUser(s)} className="flex items-center gap-3 p-3 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-none">
                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-primary/10 flex items-center justify-center">
                      {s.users?.avatar_url ? <img src={s.users.avatar_url} className="w-full h-full object-cover" /> : <span className="text-primary text-[10px]">{s.username.charAt(0)}</span>}
                    </div>
                    <span className="text-sm text-white">{s.username}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {searchResult && (
            <div className="animate-in zoom-in-95 duration-300">
              {searchResult.found ? (
                <div className="liquid-glass border-primary/20 rounded-[2rem] p-6 text-center">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-2xl overflow-hidden bg-primary/10 flex items-center justify-center border border-primary/20">
                    {searchResult.avatar ? <img src={searchResult.avatar} className="w-full h-full object-cover" /> : <UserCheck className="w-8 h-8 text-primary" />}
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1 uppercase tracking-tight">{searchResult.username}</h3>
                  <div className="text-primary text-[10px] font-black mb-4 uppercase tracking-widest">ЛІЦЕНЗІЯ АКТИВНА</div>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {searchResult.items.map((w: string, i: number) => (
                      <span key={i} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[9px] font-bold text-white/60 uppercase">{w}</span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="liquid-glass border-destructive/20 rounded-[2rem] p-8 text-center">
                  <UserX className="w-10 h-10 text-destructive mx-auto mb-2" />
                  <p className="text-sm font-bold text-white uppercase italic tracking-tighter">Гравця {searchResult.username} не знайдено</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === "form" && (
        <div className="space-y-4 animate-fade-in">
          <div className="liquid-glass rounded-2xl p-4 border border-yellow-500/10">
            <div className="flex items-center gap-2 mb-2">
              <Euro className="w-4 h-4 text-yellow-500" />
              <span className="text-xs font-bold text-white">Оплата {LICENSE_COST}€ на Vkadosik1234</span>
            </div>
            <p className="text-[10px] text-muted-foreground">В коментарі до переказу вкажіть ваш нік: <span className="text-white font-bold">{nick}</span></p>
          </div>

          <div className="space-y-3">
            <input value={roblox} onChange={e => setRoblox(e.target.value)} placeholder="Ваш Roblox Nick" className="w-full liquid-glass rounded-xl px-4 py-3 text-sm text-white focus:outline-none bg-transparent" />
            <input value={telegram} onChange={e => setTelegram(e.target.value)} placeholder="Ваш Telegram @username" className="w-full liquid-glass rounded-xl px-4 py-3 text-sm text-white focus:outline-none bg-transparent" />
          </div>

          <div className="grid grid-cols-1 gap-4">
            {weapons.map(cat => (
              <div key={cat.category}>
                <p className="text-[10px] text-primary font-bold mb-2 uppercase tracking-widest">{cat.category}</p>
                <div className="flex flex-wrap gap-2">
                  {cat.items.map(w => (
                    <button key={w} onClick={() => toggleWeapon(w)} className={`px-3 py-1.5 rounded-xl text-[10px] border transition-all ${selected.includes(w) ? "bg-primary/20 border-primary/40 text-primary" : "liquid-glass text-muted-foreground"}`}>{w}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <GradientButton onClick={handleSubmit} variant="green" className="w-full" disabled={loading}>
            {loading ? "Відправка..." : "Надіслати заявку"}
          </GradientButton>
        </div>
      )}
    </div>
  );
};

export default Licenses;
