import { useState, useEffect, useCallback } from "react";
import {
  User, Briefcase, Home, Car, FileCheck, Wallet, Lock,
  Bell, ChevronDown, ChevronRight, Shield, CheckCircle,
  LogIn, RefreshCw, Coins, Clock
} from "lucide-react";
import GradientButton from "../components/GradientButton";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { store, supabase, getBalance } from "../lib/store";
import type { Notification } from "../lib/store";

const getTelegramUser = () => {
  try {
    const tg = (window as Window & { Telegram?: { WebApp?: { initDataUnsafe?: { user?: { id: number; first_name: string; last_name?: string; username?: string; photo_url?: string } } } } }).Telegram;
    return tg?.WebApp?.initDataUnsafe?.user || null;
  } catch { return null; }
};

const Trident = () => (
  <svg viewBox="0 0 100 120" fill="currentColor" className="text-white w-full h-full opacity-[0.07]">
    <path d="M50 5 C50 5 42 15 42 28 C42 35 45 40 45 40 L35 40 C35 40 28 35 28 22 C28 10 35 5 35 5 L28 5 C28 5 18 12 18 28 C18 44 28 52 38 54 L38 100 L44 100 L44 60 L56 60 L56 100 L62 100 L62 54 C72 52 82 44 82 28 C82 12 72 5 72 5 L65 5 C65 5 72 10 72 22 C72 35 65 40 65 40 L55 40 C55 40 58 35 58 28 C58 15 50 5 50 5Z"/>
  </svg>
);

type ProfileData = {
  houses: { id: number; name: string; price: number; image_url?: string; image?: string; photos?: string[]; rental_days?: number; pending?: boolean }[];
  factionApps: { faction_name: string; status: string }[];
  licenses: { id: number; license_type: string; plate_number: string | null; status: string }[];
};

const statusColors: Record<string, string> = {
  approved: "text-primary", pending: "text-yellow-400", rejected: "text-destructive", review: "text-yellow-400",
};
const statusLabels: Record<string, string> = {
  approved: "Прийнято", pending: "На розгляді", rejected: "Відхилено", review: "На розгляді",
};

const Profile = () => {
  const navigate = useNavigate();
  const [showAdminInput, setShowAdminInput] = useState(false);
  const [adminCode, setAdminCode] = useState("");
  const [isApprovedAdmin, setIsApprovedAdmin] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [isTg, setIsTg] = useState(false);
  const [tgUser, setTgUser] = useState<{ id: number; first_name: string; last_name?: string; username?: string; photo_url?: string } | null>(null);
  const [profileData, setProfileData] = useState<ProfileData>({ houses: [], factionApps: [], licenses: [] });
  const [balance, setBalanceState] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const nick = localStorage.getItem("crp_nick") || "Гравець";

  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await store.getPlayerProfile(nick);
      setProfileData(data);
      setBalanceState(getBalance(nick));
      const notifs = await store.getNotifications(nick); setNotifications(notifs);
    } catch (e) { console.error(e); }
    setRefreshing(false);
  }, [nick]);

  useEffect(() => {
    const user = getTelegramUser();
    if (user) { setTgUser(user); setIsTg(true); }
    else {
      const tg = (window as Window & { Telegram?: { WebApp?: unknown } }).Telegram;
      if (tg?.WebApp) setIsTg(true);
    }
    loadData();
  }, [loadData]);

  const unread = notifications.filter(n => !n.read).length;
  const markRead = async () => { await store.markNotificationsRead(nick); setNotifications(notifications.map(n => ({ ...n, read: true }))); };
  // Перевіряємо чи прийнятий адміністратором
  useEffect(() => {
    if (!nick) return;
    // Суперадмін завжди має доступ
    if (nick.toLowerCase() === "t1kron1x") { setIsApprovedAdmin(true); return; }
    // Перевіряємо заявку на адміна
    supabase.from("admin_applications")
      .select("status")
      .ilike("username", nick)
      .eq("status", "approved")
      .maybeSingle()
      .then(({ data }) => { if (data) setIsApprovedAdmin(true); });
    // Або перевіряємо права в admin_perms
    supabase.from("admin_perms")
      .select("perms")
      .eq("username", nick.toLowerCase())
      .maybeSingle()
      .then(({ data }) => {
        if (data?.perms) {
          const perms = data.perms as Record<string, boolean>;
          if (Object.values(perms).some(Boolean)) setIsApprovedAdmin(true);
        }
      });
  }, [nick]);

  // Theme reactive state for passport + VFX
  const [themeId, setThemeId] = useState(() =>
    document.documentElement.getAttribute("data-theme-id") || "lime"
  );
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setThemeId(document.documentElement.getAttribute("data-theme-id") || "lime");
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme-id"] });
    return () => observer.disconnect();
  }, []);
  const passportBg = document.documentElement.getAttribute("data-passport-bg") || "linear-gradient(145deg, hsl(240 15% 8% / 0.95), hsl(0 0% 4% / 0.92))";
  const passportBorder = document.documentElement.getAttribute("data-passport-border") || "hsl(84 81% 44% / 0.25)";

// ─── ADVANCED VISUAL EFFECTS CONFIG ─────────────────────────────────────
const THEME_VFX: Record<string, {
  label: string;
  color: string;
  glow: string;
  type: 'blue_crown' | 'red_demon' | 'gold_stars' | 'purple_space' | 'arctic' | 'matrix' | 'sunset' | 'standard';
}> = {
  lime: { label: "STANDARD", color: "#84cc16", glow: "transparent", type: 'standard' },
  
  neon_blue: { 
    label: "ROYAL", 
    color: "#3b82f6", 
    glow: "rgba(59, 130, 246, 0.5)", 
    type: 'blue_crown' 
  },
  
  cyber_red: { 
    label: "HELLISH", 
    color: "#ef4444", 
    glow: "rgba(239, 68, 68, 0.5)", 
    type: 'red_demon' 
  },
  
  gold_vip: { 
    label: "TREASURE", 
    color: "#fbbf24", 
    glow: "rgba(251, 191, 36, 0.5)", 
    type: 'gold_stars' 
  },
  
  purple_haze: { 
    label: "COSMOS", 
    color: "#a855f7", 
    glow: "rgba(168, 85, 247, 0.5)", 
    type: 'purple_space' 
  },
  
  arctic: { 
    label: "FROST", 
    color: "#7dd3fc", 
    glow: "rgba(125, 211, 252, 0.4)", 
    type: 'arctic' 
  },
  
  matrix: { 
    label: "HACKER", 
    color: "#22c55e", 
    glow: "rgba(34, 197, 94, 0.5)", 
    type: 'matrix' 
  },
  
  sunset: { 
    label: "RESORT", 
    color: "#f97316", 
    glow: "rgba(249, 115, 22, 0.4)", 
    type: 'sunset' 
  },
};

const vfx = THEME_VFX[themeId] || THEME_VFX.lime;

  const handleAdmin = () => {
    if (adminCode === "5319son") { navigate("/admin-panel"); toast.success("Доступ відкрито"); }
    else toast.error("Невірний код");
    setAdminCode(""); setShowAdminInput(false);
  };

  const name = tgUser ? `${tgUser.first_name}${tgUser.last_name ? " " + tgUser.last_name : ""}` : nick;
  const uid = tgUser ? String(tgUser.id) : "000001";
  const uname = tgUser?.username ? `@${tgUser.username}` : null;
  const regDate = new Date().toLocaleDateString("uk-UA");

  const activeFaction = profileData.factionApps.find(a => a.status === "approved")?.faction_name || null;
  const pendingFaction = profileData.factionApps.find(a => a.status === "pending")?.faction_name || null;
  const firstHouse = profileData.houses[0] || null;

  return (
    <div className="min-h-screen pb-24 px-4 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-display text-xl font-bold tracking-wider neon-text-lime">ПРОФІЛЬ</h1>
        <div className="flex items-center gap-2">
          <button onClick={loadData} disabled={refreshing} className="w-9 h-9 liquid-glass rounded-xl flex items-center justify-center active:scale-95 transition-all">
            <RefreshCw className={`w-4 h-4 text-muted-foreground ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => setShowNotifs(!showNotifs)} className="relative w-9 h-9 liquid-glass rounded-xl flex items-center justify-center active:scale-95 transition-all">
            <Bell className="w-4 h-4 text-primary" />
            {unread > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full text-[8px] flex items-center justify-center text-white font-bold">{unread}</span>}
          </button>
        </div>
      </div>

      {/* Notifications */}
      {showNotifs && (
        <div className="mb-4 liquid-glass-card rounded-2xl p-3 animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold">Сповіщення</span>
            {unread > 0 && <button onClick={markRead} className="text-[9px] text-primary">Прочитати всі</button>}
          </div>
          {notifications.length === 0
            ? <p className="text-xs text-muted-foreground text-center py-2">Немає сповіщень</p>
            : <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {notifications.slice(0, 8).map(n => (
                  <div key={n.id} className={`text-[10px] p-2 rounded-xl ${n.read ? "text-muted-foreground" : "text-foreground bg-primary/8 border border-primary/12"}`}>
                    <p>{n.text}</p><span className="text-[8px] text-muted-foreground">{n.date}</span>
                  </div>
                ))}
              </div>
          }
        </div>
      )}

      {/* Not Telegram */}
      {!isTg && (
        <div className="mb-4 rounded-2xl p-4 liquid-glass animate-fade-in id-card-animated" style={{
          border: `1px solid ${passportBorder}`,
          transition: "border 0.6s ease, box-shadow 0.6s ease"
        }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0"><LogIn className="w-4 h-4 text-primary" /></div>
            <div>
              <p className="text-sm font-semibold">Увійдіть через бота</p>
              <a href="https://t.me/CHERNIHIVSITE_BOT" target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary font-medium">@CHERNIHIVSITE_BOT</a>
            </div>
          </div>
        </div>
      )}

                     {/* ═══ ULTIMATE PASSPORT CARD ═══ */}
<div className="mb-4 animate-fade-in group perspective-1000">
  <style>{`
    @keyframes crown-move { 0%, 100% { transform: translateY(0) rotate(5deg); } 50% { transform: translateY(-5px) rotate(-5deg); } }
    @keyframes fire-rise { 0% { transform: translateY(0) scale(1); opacity: 1; } 100% { transform: translateY(-40px) scale(0.5); opacity: 0; } }
    @keyframes star-twinkle { 0%, 100% { opacity: 0.3; transform: scale(0.8) rotate(0deg); } 50% { opacity: 1; transform: scale(1.2) rotate(90deg); } }
    @keyframes matrix-scroll { 0% { transform: translateY(-100%); } 100% { transform: translateY(100%); } }
    @keyframes snow-fall { 0% { transform: translateY(-10px) translateX(0); } 100% { transform: translateY(120px) translateX(10px); } }
    .glow-border { box-shadow: 0 0 15px ${vfx.glow}, inset 0 0 10px ${vfx.glow}; border: 1px solid ${vfx.color}; }
  `}</style>

  <div className={`rounded-2xl overflow-hidden relative transition-all duration-500 bg-slate-950 ${vfx.type !== 'standard' ? 'glow-border' : 'border border-white/10'}`}>
    
    {/* ─── ДИНАМИЧЕСКИЕ ФОНЫ ─── */}
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      
      {/* КРАСНЫЙ: Искры огня */}
      {vfx.type === 'red_demon' && Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="absolute w-1 h-2 bg-orange-500 blur-[1px] rounded-full animate-[fire-rise_2s_infinite]"
             style={{ left: `${Math.random() * 100}%`, bottom: '-10px', animationDelay: `${Math.random() * 2}s` }} />
      ))}

      {/* МАТРИЦА: Командная строка */}
      {vfx.type === 'matrix' && (
        <div className="absolute inset-0 opacity-20 font-mono text-[8px] text-green-500 p-2 overflow-hidden leading-tight">
          <div className="animate-[matrix-scroll_10s_linear_infinite]">
            {"> system.init()\n> connection_secure\n> access_granted\n> loading_profile...\n> decrypting_id\n> root@chernihiv_rp\n> data_sync_ok"}
          </div>
        </div>
      )}

      {/* АРКТИКА: Снежинки */}
      {vfx.type === 'arctic' && Array.from({ length: 15 }).map((_, i) => (
        <div key={i} className="absolute text-white/40 animate-[snow-fall_4s_linear_infinite]"
             style={{ left: `${Math.random() * 100}%`, top: '-20px', fontSize: `${Math.random() * 10 + 5}px`, animationDelay: `${Math.random() * 4}s` }}>❄</div>
      ))}

      {/* КОСМОС: Звезды */}
      {vfx.type === 'purple_space' && Array.from({ length: 20 }).map((_, i) => (
        <div key={i} className="absolute w-0.5 h-0.5 bg-white rounded-full animate-pulse"
             style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, opacity: Math.random() }} />
      ))}
    </div>

    {/* ─── ГРАФИЧЕСКИЕ ЭЛЕМЕНТЫ (РОГА, КОРОНЫ И Т.Д.) ─── */}
    <div className="relative z-10 passport-glass">
      
      {/* СИНИЙ: Корона */}
      {vfx.type === 'blue_crown' && (
        <div className="absolute -top-1 left-4 z-20 text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)] animate-[crown-move_3s_infinite_ease-in-out]">
          <Crown size={16} fill="currentColor" />
        </div>
      )}

      {/* КРАСНЫЙ: Рога */}
      {vfx.type === 'red_demon' && (
        <>
          <div className="absolute -top-2 left-6 text-red-600 blur-[0.5px] rotate-[-20deg] drop-shadow-[0_0_5px_red]"><Flame size={20} /></div>
          <div className="absolute -top-2 right-6 text-red-600 blur-[0.5px] rotate-[20deg] drop-shadow-[0_0_5px_red]"><Flame size={20} /></div>
        </>
      )}

      {/* ЗОЛОТО: Звезды и Слитки */}
      {vfx.type === 'gold_stars' && (
        <>
          <div className="absolute top-2 right-10 animate-[star-twinkle_2s_infinite] text-yellow-300 drop-shadow-[0_0_5px_gold]"><Star size={12} fill="currentColor" /></div>
          <div className="absolute bottom-2 right-4 opacity-30 text-yellow-600"><Database size={24} /></div> {/* Типа слитки */}
        </>
      )}

      {/* ЗАКАЗ: Солнце */}
      {vfx.type === 'sunset' && (
        <div className="absolute inset-0 bg-gradient-to-t from-orange-600/20 via-rose-500/10 to-transparent pointer-events-none" />
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-black/40 backdrop-blur-md">
        <div className="flex flex-col">
          <span className="text-[7px] text-white/40 tracking-[3px] uppercase font-bold">Chernihiv ID</span>
          <span className="text-[10px] font-black italic text-white" style={{ textShadow: `0 0 10px ${vfx.color}` }}>
            {vfx.label} EDITION
          </span>
        </div>
        {/* Синий блик (универсальный, меняет цвет) */}
        <div className="w-20 h-full absolute top-0 left-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-[-20deg] animate-[shimmer_3s_infinite]" />
      </div>

      {/* Твоя основная инфо-панель (имя, аватар и т.д.) */}
      <div className="p-4 flex gap-4 relative">
        <div className="w-20 h-20 rounded-xl overflow-hidden border border-white/20 bg-slate-900 shadow-2xl relative z-10">
          <img src={tgUser?.photo_url || "https://i.ibb.co/placeholder.jpg"} className="w-full h-full object-cover" />
        </div>
        
        <div className="flex-1 flex flex-col justify-center">
          <h2 className="text-xl font-black text-white leading-none tracking-tight mb-1" style={{ color: vfx.color }}>
            {name}
          </h2>
          <div className="flex items-center gap-2">
             <div className="px-2 py-0.5 rounded bg-black/50 border border-white/5 flex items-center gap-1">
                <Coins size={10} className="text-yellow-500" />
                <span className="text-[11px] font-bold text-white">{balance}</span>
             </div>
             {vfx.type === 'arctic' && <div className="text-[8px] text-blue-200 uppercase font-bold">Заморожено</div>}
          </div>
        </div>
      </div>

      {/* Нижние статы */}
      <div className="px-4 pb-4 grid grid-cols-2 gap-2">
        <div className="bg-black/40 p-2 rounded-lg border border-white/5">
          <p className="text-[7px] uppercase text-white/30 font-bold">Фракція</p>
          <p className="text-[10px] font-medium text-white/80">{activeFaction || "Цивільний"}</p>
        </div>
        <div className="bg-black/40 p-2 rounded-lg border border-white/5">
          <p className="text-[7px] uppercase text-white/30 font-bold">Нерухомість</p>
          <p className="text-[10px] font-medium text-white/80">{firstHouse?.name || "Немає"}</p>
        </div>
      </div>
      
      {/* Сосульки для арктической темы */}
      {vfx.type === 'arctic' && (
        <div className="absolute top-0 left-0 right-0 flex justify-around opacity-40 pointer-events-none">
          {[1,2,3,4,5].map(i => <div key={i} className="w-1 h-4 bg-gradient-to-b from-white to-transparent rounded-b-full" />)}
        </div>
      )}

    </div>
  </div>
</div>
      {/* Діяльність */}
      <div className="mb-2">
        <button onClick={() => setShowActivity(!showActivity)}
          className="w-full liquid-glass-card rounded-2xl px-4 py-3.5 flex items-center justify-between transition-all active:scale-[0.98]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/12 flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium">Моя діяльність</p>
              <p className="text-[10px] text-muted-foreground">
                {activeFaction ? `Фракція: ${activeFaction}` : pendingFaction ? `Очікує: ${pendingFaction}` : "Немає активної діяльності"}
              </p>
            </div>
          </div>
          {showActivity ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </button>
        {showActivity && (
          <div className="mt-1 liquid-glass rounded-2xl p-4 animate-fade-in">
            {profileData.factionApps.length > 0 ? (
              <div className="space-y-2">
                {profileData.factionApps.slice(0, 5).map((a, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs text-foreground">{a.faction_name}</span>
                    </div>
                    <span className={`text-[10px] font-semibold ${statusColors[a.status] || "text-muted-foreground"}`}>
                      {statusLabels[a.status] || a.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <p className="text-xs text-muted-foreground text-center py-2 mb-3">Немає активної діяльності</p>
                <GradientButton variant="green" className="w-full text-xs py-2" onClick={() => navigate("/factions")}>
                  Переглянути фракції
                </GradientButton>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Дома */}
      <div className="mb-2">
        <div className="liquid-glass-card rounded-2xl overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid hsl(0 0% 100% / 0.04)" }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "hsl(142 71% 45% / 0.12)", border: "1px solid hsl(142 71% 45% / 0.25)", boxShadow: "0 0 12px hsl(142 71% 45% / 0.2)" }}>
                <Home className="w-4 h-4" style={{ color: "hsl(142 71% 45%)", filter: "drop-shadow(0 0 4px hsl(142 71% 45%))" }} />
              </div>
              <p className="text-sm font-medium">Мої дома</p>
            </div>
            <button onClick={() => navigate("/houses")} className="text-[10px] text-primary flex items-center gap-0.5">
              Переглянути <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="px-4 py-3">
            {profileData.houses.length > 0 ? (
              <div className="space-y-2">
                {profileData.houses.map((h: Record<string, unknown>) => {
                  const photo = (h.image_url as string) || (h.image as string) || ((h.photos as string[])?.find((p: string) => p.startsWith("http")));
                  const isPending = (h.pending as boolean) || false;
                  const rentalDays = h.rental_days as number | undefined;
                  return (
                    <div key={h.id as number} className="rounded-xl overflow-hidden"
                      style={{ background: "hsl(142 71% 45% / 0.05)", border: `1px solid hsl(142 71% 45% / ${isPending ? "0.1" : "0.25"})` }}>
                      {photo ? (
                        <div className="relative h-32 overflow-hidden">
                          <img src={photo} alt={h.name as string} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                          {isPending && (
                            <div className="absolute top-2 right-2 px-2 py-0.5 rounded-lg text-[9px] font-bold"
                              style={{ background: "hsl(45 100% 55% / 0.2)", border: "1px solid hsl(45 100% 55% / 0.4)", color: "hsl(45 100% 55%)" }}>
                              НА РОЗГЛЯДІ
                            </div>
                          )}
                          <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between">
                            <div>
                              <p className="text-sm font-black text-white drop-shadow">{h.name as string}</p>
                              {rentalDays && <p className="text-[9px] text-white/60">{rentalDays} днів</p>}
                            </div>
                            <span className="text-[10px] font-bold text-yellow-400">{(h.price as number).toLocaleString()}€</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 p-3">
                          <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center"
                            style={{ background: "hsl(142 71% 45% / 0.1)", border: "1px solid hsl(142 71% 45% / 0.2)" }}>
                            <Home className="w-5 h-5" style={{ color: "hsl(142 71% 45%)", filter: "drop-shadow(0 0 4px hsl(142 71% 45%))" }} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-semibold text-foreground">{h.name as string}</p>
                              {isPending && <span className="text-[8px] px-1.5 py-0.5 rounded font-bold" style={{ background: "hsl(45 100% 55% / 0.15)", color: "hsl(45 100% 55%)" }}>НА РОЗГЛЯДІ</span>}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-[10px] text-yellow-400 font-bold">{(h.price as number).toLocaleString()}€</p>
                              {rentalDays && <p className="text-[10px] text-muted-foreground">{rentalDays} днів</p>}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="relative overflow-hidden rounded-xl p-4 flex items-center gap-4"
                style={{ background: "linear-gradient(135deg, hsl(142 71% 45% / 0.06), hsl(142 71% 45% / 0.02))", border: "1px solid hsl(142 71% 45% / 0.15)" }}>
                {/* Glow orb */}
                <div className="absolute right-0 top-0 w-24 h-24 rounded-full pointer-events-none"
                  style={{ background: "radial-gradient(circle, hsl(142 71% 45% / 0.15) 0%, transparent 70%)", transform: "translate(30%, -30%)" }} />
                {/* Icon */}
                <div className="relative w-14 h-14 rounded-2xl shrink-0 flex items-center justify-center"
                  style={{ background: "hsl(142 71% 45% / 0.1)", border: "1.5px solid hsl(142 71% 45% / 0.3)", boxShadow: "0 0 20px hsl(142 71% 45% / 0.2)" }}>
                  <Home className="w-7 h-7" style={{ color: "hsl(142 71% 45%)", filter: "drop-shadow(0 0 6px hsl(142 71% 45%))" }} />
                  {/* Pulse ring */}
                  <div className="absolute inset-0 rounded-2xl animate-pulse" style={{ border: "1px solid hsl(142 71% 45% / 0.4)", scale: "1.15" }} />
                </div>
                {/* Text */}
                <div className="flex-1">
                  <p className="text-sm font-bold" style={{ color: "hsl(142 71% 45%)" }}>Немає будинку</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Перейди до розділу Будинки</p>
                  <button onClick={() => navigate("/houses")}
                    className="mt-2 text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-all active:scale-95"
                    style={{ background: "hsl(142 71% 45% / 0.1)", border: "1px solid hsl(142 71% 45% / 0.25)", color: "hsl(142 71% 45%)" }}>
                    Переглянути →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ліцензії */}
      <div className="mb-2">
        <div className="liquid-glass-card rounded-2xl overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid hsl(0 0% 100% / 0.04)" }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "hsl(210 80% 55% / 0.12)", border: "1px solid hsl(210 80% 55% / 0.2)" }}>
                <Car className="w-4 h-4" style={{ color: "hsl(210 80% 55%)" }} />
              </div>
              <p className="text-sm font-medium">Мої ліцензії</p>
            </div>
            <button onClick={() => navigate("/licenses")} className="text-[10px] text-primary flex items-center gap-0.5">
              Отримати <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="px-4 py-3">
            {profileData.licenses.length > 0 ? (
              <div className="space-y-1.5">
                {profileData.licenses.map(l => (
                  <div key={l.id} className="flex items-center gap-2 px-2 py-1.5 rounded-xl liquid-glass">
                    <Car className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="text-xs text-foreground">{l.license_type}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-2">Немає активних ліцензій</p>
            )}
          </div>
        </div>
      </div>



      {/* Номери авто */}
      {(() => {
        const cars = profileData.licenses.filter((l: { plate_number: string | null; status: string }) => l.plate_number && l.status === "approved");
        if (cars.length === 0) return null;
        return (
          <div className="mb-2">
            <div className="liquid-glass-card rounded-2xl overflow-hidden">
              <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid hsl(0 0% 100% / 0.04)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: "hsl(45 100% 55% / 0.1)", border: "1px solid hsl(45 100% 55% / 0.2)" }}>
                    <Car className="w-4 h-4 text-yellow-400" />
                  </div>
                  <p className="text-sm font-medium">Мої автомобілі</p>
                </div>
                <button onClick={() => navigate("/car-registration")} className="text-[10px] text-primary flex items-center gap-0.5">
                  Управління <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <div className="px-4 py-3 space-y-2.5">
                {cars.map((c: { id: number; license_type: string; plate_number: string | null }) => (
                  <div key={c.id} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground truncate flex-1">{c.license_type?.split("|")[0]?.trim() || "Авто"}</span>
                    <div style={{ display: "inline-flex", alignItems: "stretch", borderRadius: 6, border: "2px solid #333", background: "#fff", overflow: "hidden", height: 26, boxShadow: "0 1px 5px rgba(0,0,0,0.4)", flexShrink: 0 }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: 16, borderRight: "1.5px solid #333", background: "#fff", gap: 1 }}>
                        <div style={{ width: 11, height: 7, overflow: "hidden", borderRadius: 1, border: "0.5px solid #ccc" }}>
                          <div style={{ width: "100%", height: "50%", background: "#005BBB" }} />
                          <div style={{ width: "100%", height: "50%", background: "#FFD500" }} />
                        </div>
                        <span style={{ fontSize: 4.5, fontWeight: 900, color: "#111", fontFamily: "Arial", lineHeight: 1 }}>UA</span>
                      </div>
                      <span style={{ fontFamily: "'Arial Black', Arial, sans-serif", fontWeight: 900, fontSize: 10, color: "#111", letterSpacing: "0.08em", padding: "0 6px", display: "flex", alignItems: "center", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                        {c.plate_number}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Кнопка адмін панелі — тільки для прийнятих адмінів */}
      {isApprovedAdmin && (
        <div className="mt-4 animate-fade-in">
          <button onClick={() => navigate("/admin-panel")}
            className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl transition-all active:scale-[0.98] hover:scale-[1.01]"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary) / 0.12), hsl(var(--secondary) / 0.06))",
              border: "1px solid hsl(var(--primary) / 0.25)",
              boxShadow: "0 0 20px hsl(var(--primary) / 0.1)",
            }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "hsl(var(--primary) / 0.15)", border: "1px solid hsl(var(--primary) / 0.3)", boxShadow: "0 0 12px hsl(var(--primary) / 0.3)" }}>
              <Shield className="w-5 h-5 text-primary" style={{ filter: "drop-shadow(0 0 4px hsl(var(--primary)))" }} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-bold text-foreground">Адмін панель</p>
              <p className="text-[10px] text-muted-foreground">Управління сервером</p>
            </div>
            <ChevronRight className="w-4 h-4 text-primary" />
          </button>
        </div>
      )}
    </div>
  );
};

export default Profile;
