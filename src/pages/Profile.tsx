import { useState, useEffect, useCallback } from "react";
import {
  User, Briefcase, Home, Car, FileCheck, Wallet, Lock,
  Bell, ChevronDown, ChevronRight, Shield, CheckCircle,
  LogIn, RefreshCw, Coins, Clock, Settings, X,
  Sparkles, Zap, Star, Timer, Trophy
} from "lucide-react";
import GradientButton from "../components/GradientButton";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { store, supabase, getBalanceFromDB } from "../lib/store";
import type { Notification } from "../lib/store";
import HouseFamilyModal from "../components/HouseFamilyModal";

const getTelegramUser = () => {
  try {
    const tg = (window as Window & { Telegram?: { WebApp?: { initDataUnsafe?: { user?: { id: number; first_name: string; last_name?: string; username?: string; photo_url?: string } } } } }).Telegram;
    return tg?.WebApp?.initDataUnsafe?.user || null;
  } catch { return null; }
};

const PlateBadge = ({ plate }: { plate: string }) => (
  <div style={{
    display: "inline-flex", alignItems: "stretch", borderRadius: 6,
    border: "2px solid #333", background: "#fff", overflow: "hidden",
    height: 28, boxShadow: "0 2px 8px rgba(0,0,0,0.5)", flexShrink: 0,
  }}>
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: 18, borderRight: "1.5px solid #333", background: "#fff", gap: 1 }}>
      <div style={{ width: 12, height: 8, overflow: "hidden", borderRadius: 1, border: "0.5px solid #ccc" }}>
        <div style={{ width: "100%", height: "50%", background: "#005BBB" }} />
        <div style={{ width: "100%", height: "50%", background: "#FFD500" }} />
      </div>
      <span style={{ fontSize: 5, fontWeight: 900, color: "#111", fontFamily: "Arial", lineHeight: 1 }}>UA</span>
    </div>
    <span style={{ fontFamily: "'Arial Black', Arial, sans-serif", fontWeight: 900, fontSize: 11, color: "#111", letterSpacing: "0.08em", padding: "0 7px", display: "flex", alignItems: "center", textTransform: "uppercase", whiteSpace: "nowrap" }}>
      {plate}
    </span>
  </div>
);

const Trident = () => (
  <svg viewBox="0 0 100 120" fill="currentColor" className="text-white w-full h-full opacity-[0.07]">
    <path d="M50 5 C50 5 42 15 42 28 C42 35 45 40 45 40 L35 40 C35 40 28 35 28 22 C28 10 35 5 35 5 L28 5 C28 5 18 12 18 28 C18 44 28 52 38 54 L38 100 L44 100 L44 60 L56 60 L56 100 L62 100 L62 54 C72 52 82 44 82 28 C82 12 72 5 72 5 L65 5 C65 5 72 10 72 22 C72 35 65 40 65 40 L55 40 C55 40 58 35 58 28 C58 15 50 5 50 5Z"/>
  </svg>
);

// ── Skeleton компоненти ───────────────────────────────────────────────────────
const SkeletonLine = ({ w = "100%", h = 10, radius = 6, mb = 0 }: { w?: string | number; h?: number; radius?: number; mb?: number }) => (
  <div style={{ width: w, height: h, borderRadius: radius, marginBottom: mb, background: "hsl(0 0% 100% / 0.07)", animation: "skeletonPulse 1.4s ease-in-out infinite" }} />
);

const SkeletonPassport = () => (
  <div className="rounded-2xl overflow-hidden mb-4" style={{ border: "1px solid hsl(0 0% 100% / 0.08)", background: "hsl(240 15% 8% / 0.9)" }}>
    <div className="px-4 pt-3 pb-2" style={{ borderBottom: "1px solid hsl(0 0% 100% / 0.05)" }}>
      <SkeletonLine w={80} h={7} />
    </div>
    <div className="flex items-start gap-3 px-4 py-3">
      <div style={{ width: 72, height: 72, borderRadius: 12, background: "hsl(0 0% 100% / 0.07)", animation: "skeletonPulse 1.4s ease-in-out infinite", flexShrink: 0 }} />
      <div className="flex-1 pt-1 space-y-2">
        <SkeletonLine w="60%" h={14} />
        <SkeletonLine w="40%" h={9} />
        <SkeletonLine w="50%" h={9} />
        <SkeletonLine w="35%" h={9} />
      </div>
    </div>
    <div className="px-4 pb-3 grid grid-cols-2 gap-2">
      <div style={{ height: 48, borderRadius: 10, background: "hsl(0 0% 100% / 0.05)", animation: "skeletonPulse 1.4s ease-in-out infinite" }} />
      <div style={{ height: 48, borderRadius: 10, background: "hsl(0 0% 100% / 0.05)", animation: "skeletonPulse 1.4s ease-in-out infinite" }} />
    </div>
  </div>
);

const SkeletonBlock = ({ h = 64 }: { h?: number }) => (
  <div style={{ height: h, borderRadius: 16, background: "hsl(0 0% 100% / 0.06)", animation: "skeletonPulse 1.4s ease-in-out infinite", marginBottom: 8 }} />
);
// ─────────────────────────────────────────────────────────────────────────────

type ProfileData = {
  houses: { id: number; name: string; price: number; image?: string; rental_days?: number; photos?: string[] }[];
  factionApps: { faction_name: string; status: string }[];
  licenses: { id: number; license_type: string; plate_number: string | null; status: string }[];
};

const statusColors: Record<string, string> = {
  approved: "text-primary", pending: "text-yellow-400", rejected: "text-destructive", review: "text-yellow-400",
};
const statusLabels: Record<string, string> = {
  approved: "Прийнято", pending: "На розгляді", rejected: "Відхилено", review: "На розгляді",
};

const blockAnim = (visible: boolean, delayMs: number) => ({
  animation: visible ? `fadeSlideIn 0.45s ${delayMs}ms ease both` : "none",
  opacity: visible ? undefined : 0,
} as React.CSSProperties);

const Profile = () => {

  const calculateHouseTime = (createdAt: string, days: number) => {
    if (!createdAt) return "0 ДН.";
    const start = new Date(createdAt).getTime();
    const duration = days * 24 * 60 * 60 * 1000;
    const expiry = start + duration;
    const now = new Date().getTime();
    const diff = expiry - now;
    if (diff <= 0) return "ЗЛЕТІВ";
    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return d > 0 ? `${d} ДН. ${h} Г.` : `${h} ГОД.`;
  };

  const navigate = useNavigate();
  const nick = localStorage.getItem("crp_nick") || "Гравець";

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
  const [availableNfts, setAvailableNfts] = useState<any[]>([]);
  const [selectedNftIds, setSelectedNftIds] = useState<string[]>([]);
  const [showOrbitSettings, setShowOrbitSettings] = useState(false);
  const [houseModalId, setHouseModalId] = useState<number | null>(null);
  const [nftVisible, setNftVisible] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);
  // true поки перший loadData ще не завершився
  const [loading, setLoading] = useState(true);
  const [orbitSpeed, setOrbitSpeed] = useState<number>(() => {
    const s = localStorage.getItem("orbit_speed"); return s ? Number(s) : 14;
  });

  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      // Паралельні запити — значно швидше ніж послідовні await
      const [data, carsData, ownedData, balanceResult, userData] = await Promise.all([
        store.getPlayerProfile(nick),
        store.getCarPlates(nick),
        supabase.from('nft_owners').select('nft_id').ilike('owner_nick', nick),
        getBalanceFromDB(nick),
        supabase.from("users").select("role, vip_expires_at").ilike("username", nick).maybeSingle(),
      ]);

      // nft_id может быть как числом, так и UUID-строкой — НЕ кастуем,
      // иначе UUID -> NaN и подарки исчезают из профиля (баг #1).
      const ownedIds = (ownedData.data?.map((item: any) => item.nft_id) || [])
        .filter((id: any) => id !== null && id !== undefined && id !== "");

      if (ownedIds.length > 0) {
        const { data: nfts } = await supabase.from('nft_gifts').select('*').in('id', ownedIds);
        if (nfts) {
          setAvailableNfts(nfts);
          const saved = localStorage.getItem("orbit_nft_ids");
          const parsedSaved = saved ? JSON.parse(saved) : [];
          // Сравнение по строке — id могут быть числом/UUID
          const ownedSet = new Set(ownedIds.map(String));
          const validSelected = parsedSaved.filter((id: any) => ownedSet.has(String(id)));
          setSelectedNftIds(validSelected.length > 0 ? validSelected : nfts.slice(0, 6).map((n: any) => n.id));
        }
      } else {
        setAvailableNfts([]);
        setSelectedNftIds([]);
      }

      setProfileData({ ...data, cars: carsData || [] });
      setBalanceState(balanceResult);
    } catch (e) {
      console.error("Помилка:", e);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [nick]);

  useEffect(() => {
    const user = getTelegramUser();
    if (user) { setTgUser(user); setIsTg(true); }
    else {
      const tg = (window as Window & { Telegram?: { WebApp?: unknown } }).Telegram;
      if (tg?.WebApp) setIsTg(true);
    }
    loadData();
    const t2 = setTimeout(() => setContentVisible(true), 80);
    const t = setTimeout(() => setNftVisible(true), 450);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, [loadData]);

  const unread = notifications.filter(n => !n.read).length;
  const markRead = async () => { await store.markNotificationsRead(nick); setNotifications(notifications.map(n => ({ ...n, read: true }))); };

  useEffect(() => {
    if (!nick) return;
    if (nick.toLowerCase() === "t1kron1x") { setIsApprovedAdmin(true); return; }
    supabase.from("admin_applications").select("status").ilike("username", nick).eq("status", "approved").maybeSingle()
      .then(({ data }) => { if (data) setIsApprovedAdmin(true); });
    supabase.from("admin_perms").select("perms").eq("username", nick.toLowerCase()).maybeSingle()
      .then(({ data }) => {
        if (data?.perms) {
          const perms = data.perms as Record<string, boolean>;
          if (Object.values(perms).some(Boolean)) setIsApprovedAdmin(true);
        }
      });
  }, [nick]);

  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const observer = new MutationObserver(() => forceUpdate(n => n + 1));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme-id"] });
    return () => observer.disconnect();
  }, []);
  const passportBg = document.documentElement.getAttribute("data-passport-bg") || "linear-gradient(145deg, hsl(240 15% 8% / 0.95), hsl(0 0% 4% / 0.92))";
  const passportBorder = document.documentElement.getAttribute("data-passport-border") || "hsl(84 81% 44% / 0.25)";

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

  const orbitRadius = (() => {
    const s = localStorage.getItem("orbit_radius"); return s ? Number(s) : 62;
  })();

  const orbitNfts = availableNfts.filter(n => selectedNftIds.includes(n.id));
  const AV = 72;
  const NW = 36;
  const R = orbitRadius;

  return (
    <div className="min-h-screen pb-24 px-4 pt-4">
      <style>{`
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes orbit-ring-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes orbit-item-counter { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes shimmerSweep {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes skeletonPulse {
          0%, 100% { opacity: 0.5; }
          50%       { opacity: 1; }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between mb-5" style={blockAnim(contentVisible, 0)}>
        <h1 className="font-display text-xl font-bold tracking-wider neon-text-lime">ПРОФІЛЬ</h1>
        <div className="flex items-center gap-2">
          <button onClick={loadData} disabled={refreshing} className="w-9 h-9 liquid-glass rounded-xl flex items-center justify-center active:scale-95 transition-all">
            <RefreshCw className={`w-4 h-4 text-muted-foreground ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => navigate("/top")} className="w-9 h-9 liquid-glass rounded-xl flex items-center justify-center active:scale-95 transition-all">
            <Trophy className="w-4 h-4 text-yellow-400" />
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
        <div
          className="mb-4 rounded-2xl p-4 liquid-glass id-card-animated"
          style={{ border: `1px solid ${passportBorder}`, transition: "border 0.6s ease, box-shadow 0.6s ease", ...blockAnim(contentVisible, 60) }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0"><LogIn className="w-4 h-4 text-primary" /></div>
            <div>
              <p className="text-sm font-semibold">Увійдіть через бота</p>
              <a href="https://t.me/CHERNIHIVSITE_BOT" target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary font-medium">@CHERNIHIVSITE_BOT</a>
            </div>
          </div>
        </div>
      )}

      {/* ═══ PASSPORT CARD — скелетон поки loading ═══ */}
      {loading ? (
        <SkeletonPassport />
      ) : (
        <div className="mb-4" style={blockAnim(contentVisible, 80)}>
          <div className="rounded-2xl overflow-visible relative select-none"
            style={{ border: "1px solid hsl(0 0% 100% / 0.12)", boxShadow: "0 8px 32px hsl(0 0% 0% / 0.5)" }}>

            {/* BG image */}
            <div className="absolute inset-0 rounded-2xl overflow-hidden">
              <img src="https://i.ibb.co/NbX6ZNs/images-2.jpg" alt="" className="w-full h-full object-cover" style={{ opacity: 0.18 }} onError={e => { e.currentTarget.style.display = "none"; }} />
              <div className="absolute inset-0" style={{ background: passportBg || "linear-gradient(145deg, hsl(240 15% 8% / 0.95), hsl(0 0% 4% / 0.92))", transition: "background 0.6s ease" }} />
              <div className="absolute inset-0 rounded-2xl" style={{ background: `radial-gradient(ellipse 80% 50% at 50% 100%, hsl(var(--primary) / 0.08) 0%, transparent 70%)`, transition: "background 0.6s ease" }} />
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

            {/* ── Main row ── */}
            <div className="relative py-3 flex items-start gap-3 px-4">

              <div
                className="shrink-0 cursor-pointer"
                style={{ width: AV, height: AV, position: "relative", zIndex: 30 }}
                onClick={() => setShowOrbitSettings(true)}
              >
                {/* Аватарка */}
                <div
                  className="group absolute rounded-xl overflow-hidden"
                  style={{ width: AV, height: AV, left: 0, top: 0, border: "1.5px solid hsl(0 0% 100% / 0.15)", zIndex: 10 }}
                >
                  {tgUser?.photo_url ? (
                    <img src={tgUser.photo_url} alt={name} className="w-full h-full object-cover" onError={e => { e.currentTarget.style.display = "none"; }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ background: "hsl(84 81% 44% / 0.08)" }}>
                      <User className="w-8 h-8 text-primary/30" />
                    </div>
                  )}
                  <div className="absolute inset-0 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"
                    style={{ background: "linear-gradient(135deg, rgba(0,0,0,0.5), hsl(var(--primary) / 0.2))", backdropFilter: "blur(2px)" }}>
                    <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5"
                      style={{ color: "hsl(var(--primary))", filter: "drop-shadow(0 0 8px hsl(var(--primary)))", animation: "spin-slow 4s linear infinite" }}>
                      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/>
                      <path d="M19.622 10.395l-1.097-2.65L20 6l-2-2-1.735 1.483-2.707-1.113L12.935 2h-1.954l-.632 2.401-2.645 1.115L6 4 4 6l1.453 1.789-1.08 2.657L2 11v2l2.401.655L5.516 16.3 4 18l2 2 1.791-1.46 2.606 1.072L11 22h2l.604-2.387 2.651-1.098C16.697 18.831 18 20 18 20l2-2-1.484-1.75 1.086-2.663L22 13v-2l-2.378-.605Z"/>
                    </svg>
                  </div>
                </div>

                {/* ОРБІТАЛЬНЕ КІЛЬЦЕ */}
                <div
                  style={{
                    position: "absolute",
                    left: AV / 2,
                    top: AV / 2,
                    width: 0,
                    height: 0,
                    animation: `orbit-ring-spin ${orbitSpeed}s linear infinite`,
                    transformOrigin: "0px 0px",
                    zIndex: 5,
                    pointerEvents: "none",
                  }}
                >
                  {orbitNfts.map((nft, index) => {
                    const angleDeg = (index * 360 / orbitNfts.length) - 90;
                    const angleRad = angleDeg * (Math.PI / 180);
                    const px = Math.cos(angleRad) * R;
                    const py = Math.sin(angleRad) * R;
                    const flyDelay = 0.35 + index * 0.15;
                    return (
                      <div key={nft.id} style={{
                        position: "absolute",
                        left: px - NW / 2,
                        top: py - NW / 2,
                        width: NW,
                        height: NW,
                        animation: `orbit-item-counter ${orbitSpeed}s linear infinite`,
                        transformOrigin: `${NW / 2}px ${NW / 2}px`,
                      }}>
                        <div style={{
                          width: NW, height: NW,
                          opacity: nftVisible ? 1 : 0,
                          transform: nftVisible ? "scale(1)" : "scale(0)",
                          transition: `opacity 0.45s ease ${flyDelay}s, transform 0.5s cubic-bezier(0.34,1.56,0.64,1) ${flyDelay}s`,
                        }}>
                          <div style={{
                            position: "absolute", inset: 0, borderRadius: "50%",
                            background: "radial-gradient(circle, hsl(var(--primary) / 0.9) 0%, hsl(var(--primary) / 0.3) 40%, transparent 70%)",
                            filter: "blur(8px)", transform: "scale(2.6)",
                          }} />
                          <img src={nft.image_url} alt="" style={{
                            width: NW, height: NW, borderRadius: "50%", objectFit: "cover",
                            display: "block", position: "relative", zIndex: 1,
                            WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0.9) 22%, rgba(0,0,0,0.35) 50%, rgba(0,0,0,0) 72%)",
                            maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0.9) 22%, rgba(0,0,0,0.35) 50%, rgba(0,0,0,0) 72%)",
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Текст */}
              <div className="flex-1 min-w-0 pt-1">
                <p className="text-[7px] text-muted-foreground/40 tracking-[0.2em] uppercase mb-0.5">Ім'я</p>
                <div className="flex items-center gap-2 mb-1.5">
                  <p className="text-base font-bold text-foreground truncate">{name}</p>
                </div>
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
              <div className="relative overflow-hidden flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{ background: activeFaction ? "linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--secondary) / 0.08))" : "hsl(0 0% 100% / 0.05)", border: activeFaction ? "1px solid hsl(var(--primary) / 0.25)" : "1px solid hsl(0 0% 100% / 0.07)" }}>
                <Shield className="w-3 h-3 shrink-0" style={{ color: activeFaction ? "hsl(var(--primary))" : "hsl(0 0% 40%)" }} />
                <div>
                  <p className="text-[7px] text-muted-foreground/40 uppercase tracking-wider">Фракція</p>
                  <p className="text-[10px] font-medium truncate" style={{ color: activeFaction ? "hsl(var(--primary))" : "hsl(0 0% 60%)" }}>
                    {activeFaction || (pendingFaction ? `${pendingFaction}...` : "Немає")}
                  </p>
                </div>
              </div>
              <div className="relative overflow-hidden flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{ background: firstHouse ? "hsl(142 71% 45% / 0.1)" : "hsl(0 0% 100% / 0.05)", border: firstHouse ? "1px solid hsl(142 71% 45% / 0.25)" : "1px solid hsl(0 0% 100% / 0.07)" }}>
                <Home className="w-3 h-3 shrink-0" style={{ color: firstHouse ? "hsl(142 71% 45%)" : "hsl(0 0% 40%)", filter: firstHouse ? "drop-shadow(0 0 4px hsl(142 71% 45% / 0.8))" : "none" }} />
                <div>
                  <p className="text-[7px] text-muted-foreground/40 uppercase tracking-wider">Дім</p>
                  <p className="text-[10px] font-medium truncate" style={{ color: firstHouse ? "hsl(142 71% 45%)" : "hsl(0 0% 60%)" }}>
                    {firstHouse?.name || "Немає"}
                  </p>
                </div>
              </div>
            </div>

            {/* Machine line */}
            <div className="relative px-4 py-1.5 rounded-b-2xl" style={{ borderTop: "1px solid hsl(0 0% 100% / 0.05)", background: "hsl(0 0% 100% / 0.02)" }}>
              <p className="text-[6px] text-muted-foreground/20 font-mono tracking-widest text-center truncate">
                CHERNIHIV RP &lt;&lt; {nick.toUpperCase()} &lt;&lt; {uid.slice(-8)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Діяльність */}
      {loading ? (
        <SkeletonBlock h={60} />
      ) : (
        <div className="mb-2" style={blockAnim(contentVisible, 160)}>
          <button onClick={() => setShowActivity(!showActivity)}
            className="relative w-full liquid-glass-card rounded-2xl px-4 py-3.5 flex items-center justify-between transition-all active:scale-[0.98] overflow-hidden"
            style={activeFaction ? {
              borderColor: "hsl(var(--primary) / 0.55)",
              boxShadow: "0 0 22px hsl(var(--primary) / 0.45), inset 0 0 18px hsl(var(--primary) / 0.08)",
              background: "linear-gradient(135deg, hsl(var(--primary) / 0.12), hsl(var(--primary) / 0.04))",
            } : showActivity ? { boxShadow: "0 0 18px hsl(var(--primary) / 0.25)", borderColor: "hsl(var(--primary) / 0.3)" } : {}}>
            {activeFaction && (
              <div className="absolute inset-0 pointer-events-none opacity-70"
                   style={{
                     background: "linear-gradient(110deg, transparent 0%, transparent 40%, hsl(var(--primary) / 0.18) 50%, transparent 60%, transparent 100%)",
                     backgroundSize: "200% 100%",
                     animation: "shimmerSweep 3.5s linear infinite",
                   }} />
            )}
            <div className="relative flex items-center gap-3 z-10">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                style={activeFaction
                  ? { background: "hsl(var(--primary) / 0.22)", border: "1px solid hsl(var(--primary) / 0.5)", boxShadow: "0 0 14px hsl(var(--primary) / 0.55)" }
                  : showActivity
                    ? { background: "hsl(var(--primary) / 0.18)", border: "1px solid hsl(var(--primary) / 0.4)", boxShadow: "0 0 12px hsl(var(--primary) / 0.3)" }
                    : { background: "hsl(var(--primary) / 0.1)", border: "1px solid hsl(var(--primary) / 0.12)" }}>
                <Briefcase className="w-4 h-4 text-primary" style={activeFaction ? { filter: "drop-shadow(0 0 6px hsl(var(--primary)))" } : {}} />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold" style={activeFaction || showActivity ? { color: "hsl(var(--primary))" } : {}}>Моя діяльність</p>
                <p className="text-[10px] text-muted-foreground">
                  {activeFaction ? `Фракція: ${activeFaction}` : pendingFaction ? `Очікує: ${pendingFaction}` : "Немає активної діяльності"}
                </p>
              </div>
            </div>
            {showActivity ? <ChevronDown className="w-4 h-4 text-primary relative z-10" /> : <ChevronRight className="w-4 h-4 text-muted-foreground relative z-10" />}
          </button>
          {showActivity && (
            <div className="mt-2 space-y-2 animate-fade-in">
              {profileData.factionApps.length > 0 ? (
                profileData.factionApps.slice(0, 5).map((a, i) => (
                  <div key={i} className="liquid-glass rounded-xl px-4 py-3 flex items-center justify-between"
                       style={{ border: "1px solid hsl(var(--primary) / 0.15)" }}>
                    <div className="flex items-center gap-3">
                      <Shield className="w-4 h-4 text-primary" />
                      <p className="text-xs font-medium">{a.faction_name}</p>
                    </div>
                    <span className={`text-[10px] font-semibold ${statusColors[a.status] || "text-muted-foreground"}`}>
                      {statusLabels[a.status] || a.status}
                    </span>
                  </div>
                ))
              ) : (
                <div className="liquid-glass rounded-2xl p-4" style={{ border: "1px solid hsl(var(--primary) / 0.15)" }}>
                  <p className="text-xs text-muted-foreground text-center py-2 mb-3">Немає активної діяльності</p>
                  <GradientButton variant="green" className="w-full text-xs py-2" onClick={() => navigate("/factions")}>
                    Переглянути фракції
                  </GradientButton>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Дома */}
      {loading ? (
        <SkeletonBlock h={80} />
      ) : (
        <div className="mb-2" style={blockAnim(contentVisible, 230)}>
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
                  {profileData.houses.map(h => {
                    const photo = h.photos?.find((p: string) => p.startsWith("http")) || h.image;
                    return (
                      <div key={h.id} className="rounded-xl overflow-hidden relative"
                        style={{ background: "hsl(142 71% 45% / 0.05)", border: "1px solid hsl(142 71% 45% / 0.2)" }}>
                        {photo && (
                          <div className="relative h-28 overflow-hidden">
                            <img src={photo} alt={h.name} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                            <button
                              onClick={(e) => { e.stopPropagation(); setHouseModalId(h.id); }}
                              title="Управління домом та сім'єю"
                              className="absolute top-2 left-2 flex items-center justify-center transition-all active:scale-90 hover:scale-105 z-20"
                              style={{
                                width: 28, height: 28, borderRadius: 8,
                                background: "linear-gradient(135deg, hsl(142 71% 45% / 0.95), hsl(152 76% 30% / 0.95))",
                                border: "1.5px solid hsl(142 71% 55%)",
                                boxShadow: "0 0 10px hsl(142 71% 45% / 0.55), 0 2px 6px rgba(0,0,0,0.5)",
                              }}
                            >
                              <Settings className="w-3.5 h-3.5 text-white" />
                            </button>
                            <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg border border-white/10">
                              <Clock className="w-3 h-3 text-primary" />
                              <span className="text-[10px] font-bold text-white">{calculateHouseTime(h.created_at, h.rental_days || 7)}</span>
                            </div>
                            <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between">
                              <p className="text-sm font-black text-white drop-shadow">{h.name}</p>
                              <span className="text-[10px] font-bold text-yellow-400">{h.price.toLocaleString()}€</span>
                            </div>
                          </div>
                        )}
                        {!photo && (
                          <div className="flex items-center gap-3 p-3">
                            <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center"
                              style={{ background: "hsl(142 71% 45% / 0.1)", border: "1px solid hsl(142 71% 45% / 0.2)" }}>
                              <Home className="w-5 h-5" style={{ color: "hsl(142 71% 45%)", filter: "drop-shadow(0 0 4px hsl(142 71% 45%))" }} />
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-start">
                                <p className="text-xs font-semibold text-foreground">{h.name}</p>
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-primary" />
                                  <span className="text-[10px] text-primary font-bold">{calculateHouseTime(h.created_at, h.rental_days || 7)}</span>
                                </div>
                              </div>
                              <p className="text-[10px] text-yellow-400 font-bold">{h.price.toLocaleString()}€</p>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); setHouseModalId(h.id); }}
                              title="Управління домом та сім'єю"
                              className="flex items-center justify-center transition-all active:scale-90 hover:scale-105 shrink-0"
                              style={{
                                width: 30, height: 30, borderRadius: 9,
                                background: "linear-gradient(135deg, hsl(142 71% 45% / 0.95), hsl(152 76% 30% / 0.95))",
                                border: "1.5px solid hsl(142 71% 55%)",
                                boxShadow: "0 0 10px hsl(142 71% 45% / 0.55), 0 2px 6px rgba(0,0,0,0.5)",
                              }}
                            >
                              <Settings className="w-3.5 h-3.5 text-white" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="relative overflow-hidden rounded-xl p-4 flex items-center gap-4"
                  style={{ background: "linear-gradient(135deg, hsl(142 71% 45% / 0.06), hsl(142 71% 45% / 0.02))", border: "1px solid hsl(142 71% 45% / 0.15)" }}>
                  <div className="relative w-14 h-14 rounded-2xl shrink-0 flex items-center justify-center"
                    style={{ background: "hsl(142 71% 45% / 0.1)", border: "1.5px solid hsl(142 71% 45% / 0.3)" }}>
                    <Home className="w-7 h-7" style={{ color: "hsl(142 71% 45%)" }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold" style={{ color: "hsl(142 71% 45%)" }}>Немає будинку</p>
                    <button onClick={() => navigate("/houses")}
                      className="mt-2 text-[10px] font-semibold px-2.5 py-1 rounded-lg"
                      style={{ background: "hsl(142 71% 45% / 0.1)", border: "1px solid hsl(142 71% 45% / 0.25)", color: "hsl(142 71% 45%)" }}>
                      Переглянути →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ ЯРУС 1: ЛІЦЕНЗІЇ ═══ */}
      {loading ? (
        <SkeletonBlock h={56} />
      ) : (
        <div className="space-y-4 mb-6 px-1" style={blockAnim(contentVisible, 300)}>
          {profileData.licenses?.filter((l: any) => l.status === "approved" && !l.plate_number).map((item: any) => (
            <div key={item.id} className="relative w-full rounded-2xl p-[1.2px] overflow-hidden shadow-2xl"
                 style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.1) 0%, hsl(var(--primary) / 0.4) 100%)" }}>
              <div className="relative rounded-[15px] overflow-hidden px-5 py-4 flex items-center gap-4" style={{ background: passportBg }}>
                <div className="absolute inset-x-0 bottom-0 h-32 pointer-events-none opacity-40"
                     style={{ background: `radial-gradient(circle at 50% 100%, hsl(var(--primary) / 0.6) 0%, transparent 80%)` }} />
                <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shadow-lg shrink-0 z-10">
                  <FileCheck className="w-5 h-5 text-primary" style={{ filter: "drop-shadow(0 0 8px hsl(var(--primary)))" }} />
                </div>
                <div className="flex-1 min-w-0 z-10">
                  <p className="text-[8px] text-muted-foreground uppercase tracking-[0.2em] font-black mb-2 opacity-60">ЛІЦЕНЗІЯ</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(item.license_type || "Ліцензія").split(',').map((tag: string, i: number) => (
                      <div key={i} className="px-2.5 py-1 rounded-lg border border-primary/20 bg-primary/10 backdrop-blur-md">
                        <span className="text-[9px] font-black uppercase tracking-tight text-primary italic whitespace-nowrap">{tag.trim()}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="opacity-[0.03] absolute right-4 top-1/2 -translate-y-1/2 w-10 h-12 z-0"><Trident /></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ ЯРУС 2: ТРАНСПОРТ ═══ */}
      {loading ? (
        <SkeletonBlock h={72} />
      ) : (
        <div className="space-y-4 mb-10 px-1" style={blockAnim(contentVisible, 360)}>
          {((profileData as any).cars || []).map((car: any) => (
            <div key={car.id} className="relative w-full rounded-2xl p-[1.2px] overflow-hidden shadow-2xl"
                 style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.1) 0%, hsl(var(--primary) / 0.4) 100%)" }}>
              <div className="relative rounded-[15px] overflow-hidden px-5 py-5 flex items-center gap-4" style={{ background: passportBg }}>
                <div className="absolute inset-x-0 bottom-0 h-32 pointer-events-none opacity-30"
                     style={{ background: `radial-gradient(circle at 50% 100%, hsl(var(--primary) / 0.5) 0%, transparent 80%)` }} />
                <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shadow-lg shrink-0 z-10">
                  <Car className="w-5 h-5 text-primary" style={{ filter: "drop-shadow(0 0 8px hsl(var(--primary)))" }} />
                </div>
                <div className="flex-1 flex items-center justify-between min-w-0 z-10">
                  <div>
                    <p className="text-[8px] text-muted-foreground uppercase tracking-widest font-black mb-1 opacity-50">НОМЕРИ АВТО</p>
                    <p className="text-[7px] text-primary/40 uppercase font-bold tracking-tighter mb-0.5">МОДЕЛЬ АВТО</p>
                    <p className="text-sm font-black text-white italic tracking-tighter leading-none truncate max-w-[110px]">{car.car_model || "НЕВІДОМО"}</p>
                  </div>
                  <div className="shrink-0 scale-[1.2] origin-right mr-1 drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]">
                    <PlateBadge plate={car.plate_number} />
                  </div>
                </div>
                <div className="opacity-[0.03] absolute right-4 top-1/2 -translate-y-1/2 w-10 h-12 z-0"><Trident /></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ МОДАЛКА ВИБОРУ НФТ ДЛЯ ОРБІТИ ═══ */}
      {showOrbitSettings && (
        <div className="fixed inset-0 z-[999] flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
          onClick={() => setShowOrbitSettings(false)}>
          <div className="w-full max-w-md rounded-t-3xl p-5 pb-8 animate-fade-in"
            style={{ background: "linear-gradient(160deg, hsl(240 15% 8% / 0.98), hsl(0 0% 4% / 0.96))", border: "1px solid hsl(var(--primary) / 0.2)", borderBottom: "none", boxShadow: "0 -8px 48px hsl(var(--primary) / 0.15)" }}
            onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: "hsl(var(--primary) / 0.12)", border: "1px solid hsl(var(--primary) / 0.25)" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                    className="w-4 h-4" style={{ color: "hsl(var(--primary))", animation: "spin-slow 5s linear infinite" }}>
                    <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/>
                    <path d="M19.622 10.395l-1.097-2.65L20 6l-2-2-1.735 1.483-2.707-1.113L12.935 2h-1.954l-.632 2.401-2.645 1.115L6 4 4 6l1.453 1.789-1.08 2.657L2 11v2l2.401.655L5.516 16.3 4 18l2 2 1.791-1.46 2.606 1.072L11 22h2l.604-2.387 2.651-1.098C16.697 18.831 18 20 18 20l2-2-1.484-1.75 1.086-2.663L22 13v-2l-2.378-.605Z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Орбіта НФТ</p>
                  <p className="text-[10px] text-muted-foreground">Обери до 6 НФТ та налаштуй орбіту</p>
                </div>
              </div>
              <button onClick={() => setShowOrbitSettings(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90"
                style={{ background: "hsl(0 0% 100% / 0.06)", border: "1px solid hsl(0 0% 100% / 0.08)" }}>
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl"
              style={{ background: "hsl(var(--primary) / 0.07)", border: "1px solid hsl(var(--primary) / 0.15)" }}>
              <div className="flex gap-1">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="w-2 h-2 rounded-full transition-all"
                    style={{ background: i < selectedNftIds.length ? "hsl(var(--primary))" : "hsl(0 0% 100% / 0.12)", boxShadow: i < selectedNftIds.length ? "0 0 6px hsl(var(--primary))" : "none" }} />
                ))}
              </div>
              <span className="text-[10px] text-muted-foreground ml-1">{selectedNftIds.length} / 6 вибрано</span>
            </div>

            <div className="mb-3 grid grid-cols-2 gap-2">
              <div className="px-3 py-2.5 rounded-xl" style={{ background: "hsl(var(--primary) / 0.05)", border: "1px solid hsl(var(--primary) / 0.12)" }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">Радіус</span>
                  <span className="text-[9px] font-bold text-primary">{(() => { const s = localStorage.getItem("orbit_radius"); return s ? Number(s) : 62; })()}px</span>
                </div>
                <input type="range" min={44} max={120} step={4}
                  defaultValue={(() => { const s = localStorage.getItem("orbit_radius"); return s ? Number(s) : 62; })()}
                  onChange={e => { localStorage.setItem("orbit_radius", e.target.value); }}
                  className="w-full accent-primary" style={{ height: 3 }} />
                <div className="flex justify-between mt-0.5">
                  <span className="text-[7px] text-muted-foreground/40">Ближче</span>
                  <span className="text-[7px] text-muted-foreground/40">Далі</span>
                </div>
              </div>
              <div className="px-3 py-2.5 rounded-xl" style={{ background: "hsl(var(--primary) / 0.05)", border: "1px solid hsl(var(--primary) / 0.12)" }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">Швидкість</span>
                  <span className="text-[9px] font-bold text-primary">
                    {orbitSpeed <= 6 ? "⚡" : orbitSpeed <= 14 ? "🌀" : "🌙"}
                  </span>
                </div>
                <input type="range" min={4} max={30} step={2}
                  value={orbitSpeed}
                  onChange={e => { const v = Number(e.target.value); setOrbitSpeed(v); localStorage.setItem("orbit_speed", String(v)); }}
                  className="w-full accent-primary" style={{ height: 3 }} />
                <div className="flex justify-between mt-0.5">
                  <span className="text-[7px] text-muted-foreground/40">Швидко</span>
                  <span className="text-[7px] text-muted-foreground/40">Повільно</span>
                </div>
              </div>
            </div>

            {availableNfts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: "hsl(var(--primary) / 0.07)", border: "1px solid hsl(var(--primary) / 0.15)" }}>
                  <Wallet className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground text-center">У тебе поки немає НФТ</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1">
                {availableNfts.map(nft => {
                  const isSelected = selectedNftIds.includes(nft.id);
                  return (
                    <button key={nft.id}
                      onClick={() => {
                        setSelectedNftIds(prev => {
                          if (prev.includes(nft.id)) { const next = prev.filter(id => id !== nft.id); localStorage.setItem("orbit_nft_ids", JSON.stringify(next)); return next; }
                          if (prev.length >= 6) return prev;
                          const next = [...prev, nft.id]; localStorage.setItem("orbit_nft_ids", JSON.stringify(next)); return next;
                        });
                      }}
                      className="relative flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all active:scale-95"
                      style={{ background: isSelected ? "hsl(var(--primary) / 0.12)" : "hsl(0 0% 100% / 0.04)", border: isSelected ? "1.5px solid hsl(var(--primary) / 0.5)" : "1.5px solid hsl(0 0% 100% / 0.08)", boxShadow: isSelected ? "0 0 14px hsl(var(--primary) / 0.2)" : "none" }}>
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center z-20"
                          style={{ background: "hsl(var(--primary))", boxShadow: "0 0 8px hsl(var(--primary))" }}>
                          <svg viewBox="0 0 10 10" className="w-2.5 h-2.5" fill="none" stroke="white" strokeWidth="2">
                            <path d="M2 5l2.5 2.5L8 3" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      )}
                      <div className="relative w-16 h-16 flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full"
                          style={{ background: isSelected ? "radial-gradient(circle, hsl(var(--primary) / 0.5) 0%, hsl(var(--primary) / 0.15) 50%, transparent 75%)" : "radial-gradient(circle, hsl(0 0% 100% / 0.07) 0%, transparent 70%)", filter: "blur(4px)", transform: "scale(1.2)" }} />
                        <img src={nft.image_url} alt={nft.name} className="w-14 h-14 object-cover relative z-10"
                          style={{ borderRadius: "50%", WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 42%, rgba(0,0,0,0.55) 62%, rgba(0,0,0,0) 82%)", maskImage: "radial-gradient(circle, rgba(0,0,0,1) 42%, rgba(0,0,0,0.55) 62%, rgba(0,0,0,0) 82%)" }} />
                      </div>
                      <p className="text-[9px] text-muted-foreground font-medium truncate w-full text-center px-1">{nft.name || "NFT"}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Кнопка перемикання акаунтів */}
      <div className="mt-4" style={blockAnim(contentVisible, 400)}>
        <button onClick={() => window.dispatchEvent(new CustomEvent("crp:open-accounts"))}
          className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl transition-all active:scale-[0.98] hover:scale-[1.01]"
          style={{ background: "hsl(0 0% 8%)", border: "1px solid hsl(0 0% 18%)" }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "hsl(0 0% 12%)", border: "1px solid hsl(0 0% 20%)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-bold text-foreground">Акаунти</p>
            <p className="text-[10px] text-muted-foreground">Перемикання між акаунтами</p>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><path d="m9 18 6-6-6-6"/></svg>
        </button>
      </div>

      {isApprovedAdmin && (
        <div className="mt-4" style={blockAnim(contentVisible, 420)}>
          <button onClick={() => navigate("/admin-panel")}
            className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl transition-all active:scale-[0.98] hover:scale-[1.01]"
            style={{ background: "linear-gradient(135deg, hsl(var(--primary) / 0.12), hsl(var(--secondary) / 0.06))", border: "1px solid hsl(var(--primary) / 0.25)", boxShadow: "0 0 20px hsl(var(--primary) / 0.1)" }}>
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

      {/* ═══ МОДАЛКА ДОМА ТА СІМ'Ї ═══ */}
      <HouseFamilyModal
        open={houseModalId !== null}
        onClose={() => setHouseModalId(null)}
        houses={profileData.houses.filter(h => h.id === houseModalId).map(h => ({
          id: h.id, name: h.name, price: h.price,
          image: h.image, photos: h.photos,
          rental_days: h.rental_days, created_at: (h as any).created_at,
          desc: (h as any).desc,
        }))}
        ownerNick={nick}
      />
    </div>
  );
};

export default Profile;
