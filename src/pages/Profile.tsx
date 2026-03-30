import { useState, useEffect, useCallback } from "react";
import {
  User, Briefcase, Home, Car, FileCheck, Wallet, Lock,
  Bell, ChevronDown, ChevronRight, Shield, CheckCircle,
  LogIn, RefreshCw, Coins, Clock, Settings, X
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
  houses: { 
    id: number; 
    name: string; 
    price: number; 
    image?: string;  
    rental_days?: number; 
    photos?: string[];    
    created_at?: string;
  }[];
  factionApps: { faction_name: string; status: string }[];
  licenses: { id: number; license_type: string; plate_number: string | null; status: string }[];
};

const statusColors: Record<string, string> = {
  approved: "text-primary", pending: "text-yellow-400", rejected: "text-destructive", review: "text-yellow-400",
};
const statusLabels: Record<string, string> = {
  approved: "Прийнято", pending: "На розгляді", rejected: "Відхилено", review: "На розгляді",
};

const PlateBadge = ({ plate }: { plate: string }) => (
  <div style={{
    display: "inline-flex", alignItems: "stretch", borderRadius: 6,
    border: "2px solid #333", background: "#fff", overflow: "hidden",
    height: 28, boxShadow: "0 2px 8px rgba(0,0,0,0.5)", flexShrink: 0,
  }}>
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      width: 18, borderRight: "1.5px solid #333", background: "#fff", gap: 1,
    }}>
      <div style={{ width: 12, height: 8, overflow: "hidden", borderRadius: 1, border: "0.5px solid #ccc" }}>
        <div style={{ width: "100%", height: "50%", background: "#005BBB" }} />
        <div style={{ width: "100%", height: "50%", background: "#FFD500" }} />
      </div>
      <span style={{ fontSize: 5, fontWeight: 900, color: "#111", fontFamily: "Arial", lineHeight: 1 }}>UA</span>
    </div>
    <span style={{
      fontFamily: "'Arial Black', Arial, sans-serif", fontWeight: 900, fontSize: 11,
      color: "#111", letterSpacing: "0.08em", padding: "0 7px",
      display: "flex", alignItems: "center", textTransform: "uppercase", whiteSpace: "nowrap",
    }}>
      {plate}
    </span>
  </div>
);

const Profile = () => {
  const navigate = useNavigate();
  const nick = localStorage.getItem("crp_nick") || "Гравець";

  // === Орбіта налаштування ===
  const [orbitSpeed, setOrbitSpeed] = useState<number>(() => {
    return parseFloat(localStorage.getItem("orbit_speed") || "25");
  });
  const [orbitRadius, setOrbitRadius] = useState<number>(() => {
    return parseFloat(localStorage.getItem("orbit_radius") || "75");
  });

  const [showAdminInput, setShowAdminInput] = useState(false);
  const [adminCode, setAdminCode] = useState("");
  const [isApprovedAdmin, setIsApprovedAdmin] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [isTg, setIsTg] = useState(false);
  const [tgUser, setTgUser] = useState<any>(null);
  const [profileData, setProfileData] = useState<ProfileData>({ houses: [], factionApps: [], licenses: [] });
  const [balance, setBalanceState] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [availableNfts, setAvailableNfts] = useState<any[]>([]);
  const [selectedNftIds, setSelectedNftIds] = useState<string[]>([]);
  const [showOrbitSettings, setShowOrbitSettings] = useState(false);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await store.getPlayerProfile(nick);
      const carsData = await store.getCarPlates(nick);

      const { data: ownedData } = await supabase
        .from('nft_owners')
        .select('nft_id')
        .eq('owner_nick', nick);

      const ownedIds = ownedData?.map(item => item.nft_id) || [];

      if (ownedIds.length > 0) {
        const { data: nfts } = await supabase
          .from('nft_gifts')
          .select('*')
          .in('id', ownedIds);

        if (nfts) {
          setAvailableNfts(nfts);
          
          const saved = localStorage.getItem("orbit_nft_ids");
          const parsedSaved = saved ? JSON.parse(saved) : [];
          const validSelected = parsedSaved.filter((id: string) => ownedIds.includes(id));
          
          setSelectedNftIds(validSelected.length > 0 ? validSelected : nfts.slice(0, 6).map((n: any) => n.id));
        }
      } else {
        setAvailableNfts([]);
        setSelectedNftIds([]);
      }

      setProfileData({ ...data, cars: carsData || [] });
      setBalanceState(getBalance(nick));
    } catch (e) {
      console.error("Помилка завантаження профілю:", e);
    } finally {
      setRefreshing(false);
    }
  }, [nick]);

  useEffect(() => {
    const user = getTelegramUser();
    if (user) {
      setTgUser(user);
      setIsTg(true);
    } else {
      const tg = (window as any).Telegram;
      if (tg?.WebApp) setIsTg(true);
    }
    loadData();
  }, [loadData]);

  // Збереження налаштувань орбіти
  useEffect(() => {
    localStorage.setItem("orbit_speed", orbitSpeed.toString());
    localStorage.setItem("orbit_radius", orbitRadius.toString());
  }, [orbitSpeed, orbitRadius]);

  // === Паспорт теми ===
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const observer = new MutationObserver(() => forceUpdate(n => n + 1));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme-id"] });
    return () => observer.disconnect();
  }, []);

  const passportBg = document.documentElement.getAttribute("data-passport-bg") || "linear-gradient(145deg, hsl(240 15% 8% / 0.95), hsl(0 0% 4% / 0.92))";
  const passportBorder = document.documentElement.getAttribute("data-passport-border") || "hsl(84 81% 44% / 0.25)";

  const name = tgUser ? `${tgUser.first_name}${tgUser.last_name ? " " + tgUser.last_name : ""}` : nick;
  const uid = tgUser ? String(tgUser.id) : "000001";
  const regDate = new Date().toLocaleDateString("uk-UA");

  const activeFaction = profileData.factionApps.find(a => a.status === "approved")?.faction_name || null;
  const pendingFaction = profileData.factionApps.find(a => a.status === "pending")?.faction_name || null;
  const firstHouse = profileData.houses[0] || null;

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
            {notifications.filter(n => !n.read).length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full text-[8px] flex items-center justify-center text-white font-bold">
                {notifications.filter(n => !n.read).length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* PASSPORT CARD — оновлений дизайн */}
      <div className="mb-4 animate-fade-in">
        <div className="rounded-2xl overflow-hidden relative select-none"
          style={{
            border: "1px solid hsl(0 0% 100% / 0.12)",
            boxShadow: "0 8px 32px hsl(0 0% 0% / 0.5)",
          }}>

          {/* Background */}
          <div className="absolute inset-0">
            <img src="https://i.ibb.co/NbX6ZNs/images-2.jpg" alt="" className="w-full h-full object-cover" style={{ opacity: 0.18 }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
            <div className="absolute inset-0" style={{ background: passportBg, transition: "background 0.6s ease" }} />
            <div className="absolute inset-0 rounded-2xl" style={{
              background: `radial-gradient(ellipse 80% 50% at 50% 100%, hsl(var(--primary) / 0.08) 0%, transparent 70%)`,
            }} />
          </div>

          <Trident watermark />

          {/* Header strip */}
          <div className="relative flex items-center justify-between px-4 pt-3 pb-2" style={{ borderBottom: "1px solid hsl(0 0% 100% / 0.07)" }}>
            <div>
              <p className="text-[7px] text-muted-foreground/50 tracking-[0.3em] uppercase">Удостоверение</p>
              <p className="text-[8px] text-muted-foreground/70 tracking-[0.15em] font-semibold uppercase">Chernihiv RP</p>
            </div>
            <p className="text-[8px] text-muted-foreground/50 font-mono">#{uid.slice(-6)}</p>
          </div>

          {/* Main content */}
          <div className="relative px-4 py-6 flex items-start gap-4">
            {/* Аватарка + Орбіта */}
            <div className="relative w-[110px] h-[110px] flex items-center justify-center shrink-0">
              {/* Аватарка */}
              <div 
                className="relative w-[78px] h-[78px] rounded-2xl overflow-hidden z-30 cursor-pointer group"
                style={{ border: "2px solid hsl(var(--primary) / 0.35)" }}
                onClick={() => setShowOrbitSettings(true)}
              >
                {tgUser?.photo_url ? (
                  <img src={tgUser.photo_url} alt={name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary/5">
                    <User className="w-10 h-10 text-primary/40" />
                  </div>
                )}

                {/* Hover ефект з шестернею */}
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center rounded-2xl">
                  <Settings className="w-5 h-5 text-white" />
                </div>
              </div>

              {/* Орбіта NFT */}
              <div className="absolute inset-0 pointer-events-none">
                {availableNfts
                  .filter(n => selectedNftIds.includes(n.id))
                  .map((nft, index, arr) => {
                    const angle = (index * (360 / arr.length) - 90) * (Math.PI / 180);
                    const x = Math.cos(angle) * orbitRadius;
                    const y = Math.sin(angle) * orbitRadius;

                    return (
                      <div
                        key={nft.id}
                        className="absolute left-1/2 top-1/2 nft-orbit-item"
                        style={{
                          transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                          animation: `orbit ${orbitSpeed}s linear infinite`,
                          animationDelay: `-${index * (orbitSpeed / arr.length)}s`,
                        } as any}
                      >
                        <div className="relative w-11 h-11">
                          {/* Посилене свічення */}
                          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/60 via-primary/30 to-transparent blur-md scale-125" />
                          
                          {/* NFT з сильною розтушовкою */}
                          <img 
                            src={nft.image_url} 
                            className="w-full h-full object-cover rounded-full relative z-10"
                            style={{
                              maskImage: "radial-gradient(circle, black 38%, transparent 72%)",
                              WebkitMaskImage: "radial-gradient(circle, black 38%, transparent 72%)",
                              boxShadow: "0 0 12px hsl(var(--primary) / 0.6)",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Інформація */}
            <div className="flex-1 min-w-0 pt-1">
              <p className="text-[7px] text-muted-foreground/40 tracking-[0.2em] uppercase mb-0.5">ІМ'Я</p>
              <p className="text-lg font-bold text-foreground truncate leading-none mb-3">{name}</p>

              <div className="flex items-center gap-1.5 mb-3">
                <CheckCircle className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary tracking-wide">ВЕРИФІКОВАНО</span>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-1">
                  <Coins className="w-4 h-4 text-yellow-400" />
                  <span className="font-semibold">{balance} CR</span>
                </div>
                <span className="text-xs text-muted-foreground/60">•</span>
                <span className="text-xs text-muted-foreground">{regDate}</span>
              </div>
            </div>
          </div>

          {/* Bottom stats */}
          <div className="relative px-4 pb-4 grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{
              background: activeFaction ? "linear-gradient(135deg, hsl(var(--primary)/0.15), transparent)" : "hsl(0 0% 100% / 0.04)",
              border: activeFaction ? "1px solid hsl(var(--primary)/0.3)" : "1px solid hsl(0 0% 100% / 0.08)",
            }}>
              <Shield className="w-4 h-4" style={{ color: activeFaction ? "hsl(var(--primary))" : "#666" }} />
              <div>
                <p className="text-[7px] text-muted-foreground/50">ФРАКЦІЯ</p>
                <p className="text-xs font-medium" style={{ color: activeFaction ? "hsl(var(--primary))" : "#888" }}>
                  {activeFaction || (pendingFaction ? `${pendingFaction}...` : "—")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{
              background: firstHouse ? "hsl(142 71% 45% / 0.08)" : "hsl(0 0% 100% / 0.04)",
              border: firstHouse ? "1px solid hsl(142 71% 45% / 0.3)" : "1px solid hsl(0 0% 100% / 0.08)",
            }}>
              <Home className="w-4 h-4" style={{ color: firstHouse ? "hsl(142 71% 45%)" : "#666" }} />
              <div>
                <p className="text-[7px] text-muted-foreground/50">БУДИНОК</p>
                <p className="text-xs font-medium" style={{ color: firstHouse ? "hsl(142 71% 45%)" : "#888" }}>
                  {firstHouse?.name || "—"}
                </p>
              </div>
            </div>
          </div>

          <div className="px-4 py-2 text-center border-t border-white/5 bg-black/30">
            <p className="text-[6px] text-muted-foreground/30 font-mono tracking-[2px]">
              CHERNIHIV RP • {nick.toUpperCase()} • {uid.slice(-8)}
            </p>
          </div>
        </div>
      </div>

      {/* === МОДАЛКА НАЛАШТУВАННЯ ОРБІТИ === */}
      {showOrbitSettings && (
        <div className="fixed inset-0 z-[999] flex items-end justify-center bg-black/80 backdrop-blur-xl" onClick={() => setShowOrbitSettings(false)}>
          <div className="w-full max-w-md bg-zinc-950 border-t border-primary/30 rounded-t-3xl p-6 pb-10" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-bold">Налаштування орбіти</h2>
                <p className="text-xs text-muted-foreground">Персоналізація NFT орбіти</p>
              </div>
              <button onClick={() => setShowOrbitSettings(false)} className="text-muted-foreground">
                <X size={22} />
              </button>
            </div>

            {/* Швидкість обертання */}
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span>Швидкість обертання</span>
                <span className="text-primary font-mono">{orbitSpeed.toFixed(1)}s</span>
              </div>
              <input
                type="range"
                min="8"
                max="60"
                step="0.5"
                value={orbitSpeed}
                onChange={(e) => setOrbitSpeed(parseFloat(e.target.value))}
                className="w-full accent-primary"
              />
            </div>

            {/* Радіус орбіти */}
            <div className="mb-8">
              <div className="flex justify-between text-sm mb-2">
                <span>Радіус орбіти</span>
                <span className="text-primary font-mono">{orbitRadius}px</span>
              </div>
              <input
                type="range"
                min="55"
                max="95"
                step="1"
                value={orbitRadius}
                onChange={(e) => setOrbitRadius(parseFloat(e.target.value))}
                className="w-full accent-primary"
              />
            </div>

            {/* Попередній перегляд (міні) */}
            <p className="text-xs text-muted-foreground mb-3">Попередній перегляд:</p>
            <div className="mx-auto w-28 h-28 relative flex items-center justify-center border border-white/10 rounded-2xl bg-black/40">
              {availableNfts.slice(0, 4).map((nft, i) => (
                <div key={i} className="absolute w-8 h-8" style={{
                  transform: `rotate(${i * 90}deg) translateX(${orbitRadius - 25}px)`,
                  animation: `orbit ${orbitSpeed}s linear infinite`,
                }}>
                  <img src={nft.image_url} className="w-full h-full object-cover rounded-full" style={{
                    maskImage: "radial-gradient(circle, black 35%, transparent 75%)",
                  }} />
                </div>
              ))}
              <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-primary/30 flex items-center justify-center z-10">
                <User className="w-8 h-8 text-primary/50" />
              </div>
            </div>

            {/* Кнопка закриття */}
            <button onClick={() => setShowOrbitSettings(false)} className="mt-8 w-full py-3.5 bg-primary text-black font-semibold rounded-2xl active:scale-[0.985]">
              Зберегти та закрити
            </button>
          </div>
        </div>
      )}

      {/* Решта компонентів (діяльність, будинки, ліцензії, транспорт тощо) — залиш без змін або додай за потребою */}
      {/* ... (твій попередній код для домов, фракцій, ліцензій, авто) ... */}

      {isApprovedAdmin && (
        <div className="mt-6">
          <button onClick={() => navigate("/admin-panel")} className="w-full flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-transparent border border-primary/30">
            <Shield className="w-6 h-6 text-primary" />
            <div className="text-left">
              <p className="font-bold">Адмін панель</p>
              <p className="text-xs text-muted-foreground">Управління сервером</p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};

export default Profile;
