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
  houses: { id: number; name: string; price: number }[];
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
        <div className="mb-4 rounded-2xl p-4 border border-primary/15 liquid-glass animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0"><LogIn className="w-4 h-4 text-primary" /></div>
            <div>
              <p className="text-sm font-semibold">Увійдіть через бота</p>
              <a href="https://t.me/CHERNIHIVSITE_BOT" target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary font-medium">@CHERNIHIVSITE_BOT</a>
            </div>
          </div>
        </div>
      )}

      {/* ═══ PASSPORT CARD ═══ */}
      <div className="mb-4 animate-fade-in">
        <div className="rounded-2xl overflow-hidden relative select-none"
          style={{
            border: "1px solid hsl(0 0% 100% / 0.12)",
            boxShadow: "0 8px 32px hsl(0 0% 0% / 0.5)",
          }}>

          {/* BG image */}
          <div className="absolute inset-0">
            <img
              src="https://i.ibb.co/NbX6ZNs/images-2.jpg"
              alt=""
              className="w-full h-full object-cover"
              style={{ opacity: 0.18 }}
              onError={e => { e.currentTarget.style.display = "none"; }}
            />
            <div className="absolute inset-0" style={{ background: "linear-gradient(145deg, hsl(240 15% 8% / 0.95) 0%, hsl(240 10% 5% / 0.92) 100%)" }} />
          </div>

          {/* Trident watermark */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-24 h-28 pointer-events-none">
            <Trident />
          </div>

          {/* Header strip */}
          <div className="relative flex items-center justify-between px-4 pt-3 pb-2" style={{ borderBottom: "1px solid hsl(0 0% 100% / 0.07)" }}>
            <div>
              <p className="text-[7px] text-muted-foreground/50 tracking-[0.3em] uppercase">Удостоверение</p>
              <p className="text-[8px] text-muted-foreground/70 tracking-[0.15em] font-semibold uppercase">Chernihiv RP</p>
            </div>
            <p className="text-[8px] text-muted-foreground/50 font-mono">#{uid.slice(-6)}</p>
          </div>

          {/* Main row */}
          <div className="relative px-4 py-3 flex items-start gap-3">
            <div className="w-[72px] h-[72px] rounded-xl overflow-hidden shrink-0" style={{ border: "1.5px solid hsl(0 0% 100% / 0.15)" }}>
              {tgUser?.photo_url ? (
                <img src={tgUser.photo_url} alt={name} className="w-full h-full object-cover" onError={e => { e.currentTarget.style.display = "none"; }} />
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ background: "hsl(84 81% 44% / 0.08)" }}>
                  <User className="w-8 h-8 text-primary/30" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[7px] text-muted-foreground/40 tracking-[0.2em] uppercase mb-0.5">Ім'я</p>
              <p className="text-base font-bold text-foreground truncate mb-1.5">{name}</p>
              {uname && <p className="text-[9px] text-primary/50 mb-1.5">{uname}</p>}
              <p className="text-[7px] text-muted-foreground/40 tracking-[0.2em] uppercase mb-0.5">Статус</p>
              <div className="flex items-center gap-1.5 mb-1.5">
                <CheckCircle className="w-3 h-3 text-primary shrink-0" />
                <span className="text-xs text-primary font-semibold">Верифіковано</span>
                <span className="text-[8px] text-muted-foreground/40">{regDate}</span>
              </div>
              <div className="flex items-center gap-1">
                <Coins className="w-3 h-3 text-yellow-400/70" />
                <span className="text-[10px] font-semibold text-yellow-400/80">{balance} CR</span>
              </div>
            </div>
          </div>

          {/* Bottom stats */}
          <div className="relative px-4 pb-3 grid grid-cols-2 gap-2">
            {/* Faction with gradient */}
            <div className="relative overflow-hidden flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{
                background: activeFaction
                  ? "linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--secondary) / 0.08))"
                  : "hsl(0 0% 100% / 0.05)",
                border: activeFaction
                  ? "1px solid hsl(var(--primary) / 0.25)"
                  : "1px solid hsl(0 0% 100% / 0.07)",
              }}>
              <Shield className="w-3 h-3 shrink-0" style={{ color: activeFaction ? "hsl(var(--primary))" : "hsl(0 0% 40%)" }} />
              <div>
                <p className="text-[7px] text-muted-foreground/40 uppercase tracking-wider">Фракція</p>
                <p className="text-[10px] font-medium truncate" style={{ color: activeFaction ? "hsl(var(--primary))" : "hsl(0 0% 60%)" }}>
                  {activeFaction || (pendingFaction ? `${pendingFaction}...` : "Немає")}
                </p>
              </div>
            </div>
            {/* House */}
            <div className="relative overflow-hidden flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{
                background: firstHouse ? "hsl(142 71% 45% / 0.1)" : "hsl(0 0% 100% / 0.05)",
                border: firstHouse ? "1px solid hsl(142 71% 45% / 0.25)" : "1px solid hsl(0 0% 100% / 0.07)",
              }}>
              <Home className="w-3 h-3 shrink-0" style={{
                color: firstHouse ? "hsl(142 71% 45%)" : "hsl(0 0% 40%)",
                filter: firstHouse ? "drop-shadow(0 0 4px hsl(142 71% 45% / 0.8))" : "none",
              }} />
              <div>
                <p className="text-[7px] text-muted-foreground/40 uppercase tracking-wider">Дім</p>
                <p className="text-[10px] font-medium truncate" style={{ color: firstHouse ? "hsl(142 71% 45%)" : "hsl(0 0% 60%)" }}>
                  {firstHouse?.name || "Немає"}
                </p>
              </div>
            </div>
          </div>

          {/* Machine line */}
          <div className="relative px-4 py-1.5" style={{ borderTop: "1px solid hsl(0 0% 100% / 0.05)", background: "hsl(0 0% 100% / 0.02)" }}>
            <p className="text-[6px] text-muted-foreground/20 font-mono tracking-widest text-center truncate">
              CHERNIHIV RP &lt;&lt; {nick.toUpperCase()} &lt;&lt; {uid.slice(-8)}
            </p>
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
                {profileData.houses.map(h => (
                  <div key={h.id} className="flex items-center gap-3 rounded-xl p-2"
                    style={{ background: "hsl(142 71% 45% / 0.06)", border: "1px solid hsl(142 71% 45% / 0.15)" }}>
                    {/* House photo or icon */}
                    {h.image || (h.photos && h.photos.filter((p: string) => p.startsWith("http")).length > 0) ? (
                      <img
                        src={h.photos?.find((p: string) => p.startsWith("http")) || h.image || ""}
                        alt={h.name}
                        className="w-12 h-12 rounded-lg object-cover shrink-0"
                        style={{ border: "1px solid hsl(142 71% 45% / 0.2)" }}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg shrink-0 flex items-center justify-center"
                        style={{ background: "hsl(142 71% 45% / 0.1)", border: "1px solid hsl(142 71% 45% / 0.2)" }}>
                        <Home className="w-6 h-6" style={{ color: "hsl(142 71% 45%)", filter: "drop-shadow(0 0 4px hsl(142 71% 45%))" }} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{h.name}</p>
                      <p className="text-[10px] text-yellow-400 font-bold">{h.price.toLocaleString()}€</p>
                    </div>
                  </div>
                ))}
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
                  <div key={l.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Car className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs text-foreground">{l.license_type}</span>
                    </div>
                    {l.plate_number && <span className="text-[10px] font-mono text-yellow-400">{l.plate_number}</span>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-2">Немає активних ліцензій</p>
            )}
          </div>
        </div>
      </div>



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
