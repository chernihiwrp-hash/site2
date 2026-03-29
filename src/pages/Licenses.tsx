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

  // --- ЛОГІКА РОЗУМНОГО ПОШУКУ ТА РЕЄСТРУ ---
  const [searchNick, setSearchNick] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [allLicenses, setAllLicenses] = useState<any[]>([]);
  const [fetchingAll, setFetchingAll] = useState(true);

  // Ефект 1: Завантаження всього списку
  useEffect(() => {
    const fetchAll = async () => {
      setFetchingAll(true);
      const { data } = await supabase
        .from("license_applications")
        .select(`
          username,
          license_type,
          status,
          users ( avatar_url )
        `)
        .eq("status", "approved")
        .order('created_at', { ascending: false });

      if (data) setAllLicenses(data);
      setFetchingAll(false);
    };
    fetchAll();
  }, []);

  // Ефект 2: Живі підказки
  useEffect(() => {
    const fetchSuggestions = async () => {
      const term = searchNick.trim();
      if (term.length < 2) { setSuggestions([]); return; }
      const { data } = await supabase
        .from("license_applications")
        .select(`username, status, license_type, users ( avatar_url )`)
        .ilike("username", `%${term}%`)
        .limit(5);
      if (data) setSuggestions(data);
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
      setSearchResult({ found: true, items, username: user.username, avatar: user.users?.avatar_url });
    } else {
      setSearchResult({ found: false, username: user.username });
    }
  };

  const handleSearch = async () => {
    const cleanNick = searchNick.trim();
    if (!cleanNick) return;
    setSearching(true);
    setSuggestions([]);
    const { data } = await supabase
      .from("license_applications")
      .select(`username, license_type, status, users ( avatar_url )`)
      .ilike("username", cleanNick) 
      .eq("status", "approved")
      .maybeSingle();

    if (data) {
      const items = data.license_type.includes("|") 
        ? data.license_type.split("|")[0].trim().split(", ") 
        : [data.license_type];
      setSearchResult({ found: true, items, username: data.username, avatar: data.users?.avatar_url });
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
      toast.success("Заявку відправлено!");
    } catch (err) {
      toast.error("Помилка відправки");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen pb-20 px-4 pt-4">
        <PageHeader title="ЛІЦЕНЗІЇ" subtitle="Вартість: 4000€" backTo="/" />
        <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
          <div className="w-28 h-28 rounded-3xl flex items-center justify-center mb-6"
            style={{ background: "linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--secondary) / 0.08))", border: "2px solid hsl(var(--primary) / 0.4)", boxShadow: "0 0 60px hsl(var(--primary) / 0.25)" }}>
            <CheckCircle className="w-14 h-14 text-primary" />
          </div>
          <h2 className="font-display text-2xl font-black tracking-wider text-foreground mb-2 text-center uppercase">Заявку відправлено</h2>
          <p className="text-sm text-muted-foreground text-center mb-5 max-w-xs">Оплата {LICENSE_COST}€ на Vkadosik1234</p>
          <div className="w-full max-w-xs liquid-glass rounded-2xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-foreground">Ваш вибір:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {selected.map(w => (
                <span key={w} className="text-[10px] px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary">{w}</span>
              ))}
            </div>
          </div>
          <GradientButton onClick={() => window.location.href = "/"} variant="green" className="px-8">На головну</GradientButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 px-4 pt-4">
      <PageHeader title="ЛІЦЕНЗІЇ" subtitle="Вартість: 4000€" backTo="/" />

      <div className="flex gap-2 mb-4 liquid-glass rounded-2xl p-1">
        {[{ id: "form", label: "Подати заявку" }, { id: "search", label: "Перевірити ліцензію" }].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as "form" | "search")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${activeTab === t.id ? "bg-primary text-black" : "text-muted-foreground"}`}>
            {t.id === "form" ? <FileText className="w-3.5 h-3.5" /> : <Search className="w-3.5 h-3.5" />}
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "search" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="relative group">
            <div className="liquid-glass-card rounded-2xl p-4 border border-white/5 transition-all focus-within:border-primary/30">
              <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-2 block ml-1">Пошук ліцензії</label>
              <div className="relative">
                <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${searchNick ? 'text-primary' : 'text-white/20'}`} />
                <input 
                  value={searchNick} 
                  onChange={e => setSearchNick(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                  placeholder="Нік гравця..." 
                  className="w-full liquid-glass rounded-xl pl-12 pr-4 py-3.5 text-sm text-white placeholder:text-white/10 focus:outline-none bg-transparent" 
                />
              </div>
            </div>

            {suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-3 bg-[#0c0c0c] border border-white/10 rounded-[2rem] overflow-hidden z-[100] shadow-2xl">
                {suggestions.map((s, i) => (
                  <div key={i} onClick={() => selectUser(s)} className="flex items-center justify-between p-4 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-none">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 overflow-hidden flex items-center justify-center">
                        {s.users?.avatar_url ? <img src={s.users.avatar_url} className="w-full h-full object-cover" /> : <span className="text-primary font-black">{s.username.charAt(0)}</span>}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-white">{s.username}</span>
                        <span className={`text-[9px] uppercase font-black ${s.status === 'approved' ? 'text-primary' : 'text-orange-400'}`}>
                          {s.status === 'approved' ? 'Active' : 'Pending'}
                        </span>
                      </div>
                    </div>
                    <Shield className="w-4 h-4 text-primary/20" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {searchResult && (
            <div className="animate-in zoom-in-95 duration-300">
              {searchResult.found ? (
                <div className="liquid-glass border-primary/20 rounded-[2.5rem] p-8 text-center relative overflow-hidden group">
                   <div className="absolute inset-0 bg-primary/5 opacity-20" />
                   <div className="relative">
                      <div className="w-20 h-20 mx-auto mb-4 rounded-[2.2rem] bg-primary/10 border border-primary/20 overflow-hidden flex items-center justify-center">
                        {searchResult.avatar ? <img src={searchResult.avatar} className="w-full h-full object-cover" /> : <UserCheck className="w-10 h-10 text-primary" />}
                      </div>
                      <h3 className="text-xl font-black text-white uppercase italic tracking-tighter mb-1">{searchResult.username}</h3>
                      <div className="flex items-center justify-center gap-2 mb-6">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">Verified Holder</span>
                      </div>
                      <div className="flex flex-wrap justify-center gap-2">
                        {searchResult.items.map((w: string, i: number) => (
                          <span key={i} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold text-white/70 uppercase">
                            {w}
                          </span>
                        ))}
                      </div>
                   </div>
                </div>
              ) : (
                <div className="liquid-glass border-destructive/20 rounded-[2.5rem] p-10 text-center opacity-80">
                  <UserX className="w-12 h-12 text-destructive mx-auto mb-4" />
                  <p className="text-sm font-black text-white uppercase italic">License Not Found</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === "form" && (
        <div className="space-y-4 animate-fade-in">
          <div className="rounded-2xl p-4 space-y-2" style={{ background: "hsl(45 100% 55% / 0.05)", border: "1px solid hsl(45 100% 55% / 0.15)" }}>
            <div className="flex items-center gap-2 mb-1">
              <Euro className="w-4 h-4 text-yellow-400" />
              <span className="text-xs font-bold text-foreground">Оплата {LICENSE_COST}€</span>
            </div>
            <div className="flex items-center gap-2 liquid-glass rounded-xl px-3 py-2.5">
              <span className="text-xs text-muted-foreground shrink-0 text-white">Vkadosik1234</span>
              <button onClick={() => { navigator.clipboard.writeText("Vkadosik1234"); toast.success("Скопійовано!"); }}
                className="ml-auto p-1.5 liquid-glass rounded-lg">
                <Copy className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block uppercase font-bold tracking-widest text-[10px]">Ваш Нік</label>
              <div className="w-full liquid-glass rounded-xl px-4 py-3 text-sm text-foreground/60">{nick || "—"}</div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block uppercase font-bold tracking-widest text-[10px]">Roblox Username</label>
              <input value={roblox} onChange={e => setRoblox(e.target.value)} placeholder="Roblox Nick"
                className="w-full liquid-glass rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none bg-transparent" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block uppercase font-bold tracking-widest text-[10px]">Telegram</label>
              <input value={telegram} onChange={e => setTelegram(e.target.value)} placeholder="@username"
                className="w-full liquid-glass rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none bg-transparent" />
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-3 font-bold uppercase tracking-widest text-[10px]">Оберіть зброю <span className="text-primary">({selected.length}/5)</span></p>
            {weapons.map(cat => (
              <div key={cat.category} className="mb-4">
                <p className="text-[11px] text-primary font-semibold mb-2 uppercase tracking-wider">{cat.category}</p>
                <div className="flex flex-wrap gap-2">
                  {cat.items.map(w => (
                    <button key={w} onClick={() => toggleWeapon(w)}
                      className={`text-[11px] px-3 py-1.5 rounded-xl border transition-all ${selected.includes(w) ? "bg-primary/20 border-primary/40 text-primary" : "liquid-glass text-muted-foreground"}`}>
                      {w}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <GradientButton onClick={handleSubmit} variant="green" className="w-full" disabled={loading}>
            {loading ? "Відправляю..." : "Надіслати заявку"}
          </GradientButton>
        </div>
      )}
    </div>
  );
};

export default Licenses;
