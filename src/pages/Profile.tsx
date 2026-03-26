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

  // --- ОБЪЯВЛЯЕМ ПРОПУЩЕННЫЕ ПЕРЕМЕННЫЕ ТУТ ---
  const themeId = localStorage.getItem("profile_theme") || "lime"; 
  const passportBorder = "hsl(var(--primary) / 0.2)"; // Цвет границы для карточки
  // --------------------------------------------

  const themeId = localStorage.getItem("profile_theme") || "lime";
  
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
  // ─── VFX CONFIG — БОМБА 2026 (ГЛАЗ НЕ СВОДИТЬ) ─────────────────────────────
const THEME_VFX: Record<string, {
  label: string;
  cssClass: string;
  keyframes: string;
}> = {
  lime: { label: "", cssClass: "", keyframes: "" },

  neon_blue: {
    label: "NEON CORE",
    cssClass: "vfx-neon-blue",
    keyframes: `
      @keyframes neonScan { 0% { transform: translateY(-150%); } 100% { transform: translateY(350%); } }
      @keyframes neonFlicker { 0%,100% { opacity: 0.75; } 50% { opacity: 1; } }
      @keyframes neonPulse { 0%,100% { box-shadow: 0 0 25px #67e8f9, 0 0 50px #22d3ee, 0 0 80px #06b6d4; } 50% { box-shadow: 0 0 40px #67e8f9, 0 0 90px #22d3ee, 0 0 120px #06b6d4; } }
    `,
  },

  cyber_red: {
    label: "GLITCH PROTOCOL",
    cssClass: "vfx-cyber-red",
    keyframes: `
      @keyframes glitch { 0%,100% { transform: translate(0); } 20% { transform: translate(-5px,4px); } 40% { transform: translate(5px,-4px); } 60% { transform: translate(-4px,3px); } 80% { transform: translate(4px,-3px); } }
      @keyframes redScan { 0% { top: -100%; opacity: 0; } 50% { opacity: 0.7; } 100% { top: 200%; opacity: 0; } }
      @keyframes redCoreGlow { 0%,100% { box-shadow: 0 0 30px #ef4444, inset 0 0 40px #b91c1c; } 50% { box-shadow: 0 0 70px #f87171, inset 0 0 70px #ef4444; } }
    `,
  },

  gold_vip: {
    label: "LUXURY ELITE",
    cssClass: "vfx-gold-vip",
    keyframes: `
      @keyframes goldShimmer { 0% { background-position: -400% 0; } 100% { background-position: 500% 0; } }
      @keyframes goldSpark { 0%,100% { transform: scale(0.7) rotate(0deg); opacity: 0.7; } 50% { transform: scale(1.6) rotate(25deg); opacity: 1; } }
      @keyframes luxuryPulse { 0%,100% { box-shadow: 0 0 35px #fbbf24, 0 0 80px #fcd34d, 0 0 110px #facc15; } 50% { box-shadow: 0 0 60px #fbbf24, 0 0 110px #fcd34d, 0 0 140px #facc15; } }
    `,
  },

  purple_haze: {
    label: "AURORA VOID",
    cssClass: "vfx-purple-haze",
    keyframes: `
      @keyframes auroraFlow { 0% { background-position: 0% 50%; } 50% { background-position: 120% 50%; } 100% { background-position: 0% 50%; } }
      @keyframes orbFloat { 0%,100% { transform: translate(0,0) rotate(0deg); } 50% { transform: translate(25px,-35px) rotate(15deg); } }
    `,
  },

  arctic: {
    label: "FROST REALM",
    cssClass: "vfx-arctic",
    keyframes: `
      @keyframes snowFall { 0% { transform: translateY(-180px) rotate(0deg); opacity: 0.95; } 100% { transform: translateY(500px) rotate(1080deg); opacity: 0; } }
      @keyframes frostGlow { 0%,100% { box-shadow: 0 0 25px #bae6fd; } 50% { box-shadow: 0 0 65px #e0f2fe; } }
    `,
  },

  matrix: {
    label: "DIGITAL RAIN",
    cssClass: "vfx-matrix",
    keyframes: `
      @keyframes matrixRain { 0% { transform: translateY(-250%); opacity: 0; } 8% { opacity: 0.9; } 92% { opacity: 0.9; } 100% { transform: translateY(500%); opacity: 0; } }
    `,
  },

  sunset: {
    label: "EMBER HORIZON",
    cssClass: "vfx-sunset",
    keyframes: `
      @keyframes emberRise { 0% { transform: translateY(30px) scale(1.1); opacity: 0.9; } 100% { transform: translateY(-280px) scale(0.3); opacity: 0; } }
      @keyframes sunsetPulse { 0%,100% { box-shadow: 0 0 35px #f59e0b, inset 0 0 40px #fb923c; } 50% { box-shadow: 0 0 75px #fb923c, inset 0 0 70px #f59e0b; } }
    `,
  },
};

const vfx = THEME_VFX[themeId] || THEME_VFX.lime;
  const handleAdmin = () => {
    if (adminCode === "5319son") { navigate("/admin-panel"); toast.success("Доступ відкрито"); }
    else toast.error("Невірний код");
    setAdminCode(""); setShowAdminInput(false);
  };
  // Было: ${tgUser.first_name}...
// Стало: `...`
const name = tgUser ? `${tgUser.first_name}${tgUser.last_name ? " " + tgUser.last_name : ""}` : nick;
const uid = tgUser ? String(tgUser.id) : "000001";

// Было: @${tgUser.username}
// Стало: `@${tgUser.username}`
const uname = tgUser?.username ? `@${tgUser.username}` : null;
  const regDate = new Date().toLocaleDateString("uk-UA");
  const activeFaction = profileData.factionApps.find(a => a.status === "approved")?.faction_name || null;
  const pendingFaction = profileData.factionApps.find(a => a.status === "pending")?.faction_name || null;
  const getRentProgress = (days: number | undefined) => {
  
    if (!days) return 0;
  // Рассчитываем процент (максимум 24 дня)
  const progress = (days / 24) * 100;
  return Math.min(Math.max(progress, 5), 100); // Чтобы полоска не была совсем 0%
};
  
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
            {/* ═══ PASSPORT CARD — БОМБА VFX 2026 ═══ */}
      <div className="mb-4 animate-fade-in group">
        {/* Inject keyframes for the current theme */}
        {vfx.keyframes && <style>{vfx.keyframes}</style>}

        <div 
          className="rounded-2xl overflow-hidden relative select-none group-hover:scale-[1.015] transition-transform duration-700"
          style={{
            border: "1px solid hsl(0 0% 100% / 0.15)",
            boxShadow: "0 10px 50px hsl(0 0% 0% / 0.65)",
          }}
        >
          {/* Background Image + Dark Overlay */}
          <div className="absolute inset-0">
            <img
              src="https://i.ibb.co/NbX6ZNs/images-2.jpg"
              alt=""
              className="w-full h-full object-cover opacity-30"
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-black/95 via-black/85 to-black/95" />
          </div>

          {/* Glassmorphism Base Layer */}
          <div className="absolute inset-0 bg-white/5 backdrop-blur-2xl" />

          {/* VFX Container */}
          <div className={`absolute inset-0 pointer-events-none overflow-hidden rounded-2xl ${vfx.cssClass}`} />

          {/* ────── THEME VFX LAYERS ────── */}

          {/* Neon Blue */}
          {themeId === "neon_blue" && (
            <>
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/15 to-transparent animate-[neonScan_3.2s_linear_infinite]" />
              <div className="absolute inset-0 border border-cyan-400/30 animate-[neonFlicker_2.2s_ease-in-out_infinite]" />
            </>
          )}

          {/* Cyber Red */}
          {themeId === "cyber_red" && (
            <>
              <div className="absolute inset-0 border-2 border-red-500/60 animate-[glitch_0.45s_linear_infinite]" />
              <div className="absolute inset-x-4 h-px bg-gradient-to-r from-transparent via-red-400 to-transparent animate-[redScan_1.6s_linear_infinite]" />
            </>
          )}

          {/* Gold VIP */}
          {themeId === "gold_vip" && (
            <>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-300/60 to-transparent bg-[length:280%_100%] animate-[goldShimmer_2.5s_linear_infinite]" />
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute text-3xl text-amber-200 drop-shadow animate-[goldSpark_1.7s_ease-in-out_infinite]"
                  style={{
                    left: `${10 + i * 11}%`,
                    top: `${18 + (i % 3) * 22}%`,
                    animationDelay: `${i * 180}ms`,
                  }}
                >
                  ✨
                </div>
              ))}
            </>
          )}

          {/* Purple Haze Aurora */}
          {themeId === "purple_haze" && (
            <div className="absolute inset-0 bg-[radial-gradient(at_35%_25%,#c026d3_10%,#6b21a8_50%,transparent_80%)] bg-[length:200%_200%] animate-[auroraFlow_13s_linear_infinite]" />
          )}

          {/* Arctic Snow */}
          {themeId === "arctic" && (
            Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="absolute text-sky-100/90 text-xl animate-[snowFall_6s_linear_infinite]"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDuration: `${4.5 + Math.random() * 8}s`,
                  animationDelay: `-${Math.random() * 12}s`,
                }}
              >
                ❄
              </div>
            ))
          )}

          {/* Matrix Rain */}
          {themeId === "matrix" && (
            Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="absolute font-mono text-xs text-emerald-400/75 tracking-[2px] animate-[matrixRain_1.8s_linear_infinite]"
                style={{
                  left: `${6 + i * 8}%`,
                  animationDelay: `-${i * 0.22}s`,
                }}
              >
                {["01","10","11","00","101","110","001","111"][i % 8]}
              </div>
            ))
          )}

          {/* Sunset Embers */}
          {themeId === "sunset" && (
            Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-orange-400 rounded-full animate-[emberRise_2.4s_ease-out_infinite]"
                style={{
                  left: `${15 + i * 7.5}%`,
                  bottom: "-10px",
                  animationDelay: `-${i * 0.3}s`,
                  boxShadow: "0 0 16px #fb923c",
                }}
              />
            ))
          )}

          {/* Trident Watermark */}
          <div className="absolute right-6 top-1/2 -translate-y-1/2 w-32 h-36 pointer-events-none opacity-10">
            <Trident />
          </div>

          {/* Тут починається твій основний контент паспорта (Header strip, Main row, Bottom stats тощо) */}
          {/* ... встав сюди весь свій старий вміст картки (від <div className="relative flex items-center..."> і нижче) ... */}

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
                          {!isPending && rentalDays && (
                          <div className="absolute bottom-12 left-3 right-3">
                            <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary shadow-[0_0_8px_rgba(16,185,129,0.6)]" 
                                style={{ width: `${getRentProgress(rentalDays)}%` }} 
                              />
                            </div>
                          </div>
                        )}
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
