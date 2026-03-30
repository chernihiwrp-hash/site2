import { useState, useEffect, useCallback } from "react";
import {
  User, Briefcase, Home, Car, FileCheck, Wallet, Lock,
  Bell, ChevronDown, ChevronRight, Shield, CheckCircle,
  LogIn, RefreshCw, Coins, Clock, Settings
} from "lucide-react";
import GradientButton from "../components/GradientButton";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { store, supabase, getBalance } from "../lib/store";
import type { Notification } from "../lib/store";

// --- ДОПОМІЖНІ КОМПОНЕНТИ ---

const getTelegramUser = () => {
  try {
    const tg = (window as any).Telegram;
    return tg?.WebApp?.initDataUnsafe?.user || null;
  } catch { return null; }
};

const PlateBadge = ({ plate }: { plate: string }) => (
  <div style={{
    display: "inline-flex",
    alignItems: "stretch",
    borderRadius: 6,
    border: "2px solid #333",
    background: "#fff",
    overflow: "hidden",
    height: 28,
    boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
    flexShrink: 0,
  }}>
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      width: 18,
      borderRight: "1.5px solid #333",
      background: "#fff",
      gap: 1,
    }}>
      <div style={{ width: 12, height: 8, overflow: "hidden", borderRadius: 1, border: "0.5px solid #ccc" }}>
        <div style={{ width: "100%", height: "50%", background: "#005BBB" }} />
        <div style={{ width: "100%", height: "50%", background: "#FFD500" }} />
      </div>
      <span style={{ fontSize: 5, fontWeight: 900, color: "#111", fontFamily: "Arial", lineHeight: 1 }}>UA</span>
    </div>
    <span style={{
      fontFamily: "'Arial Black', Arial, sans-serif",
      fontWeight: 900,
      fontSize: 11,
      color: "#111",
      letterSpacing: "0.08em",
      padding: "0 7px",
      display: "flex",
      alignItems: "center",
      textTransform: "uppercase",
      whiteSpace: "nowrap",
    }}>
      {plate}
    </span>
  </div>
);

const Trident = () => (
  <svg viewBox="0 0 100 120" fill="currentColor" className="text-white w-full h-full opacity-[0.07]">
    <path d="M50 5 C50 5 42 15 42 28 C42 35 45 40 45 40 L35 40 C35 40 28 35 28 22 C28 10 35 5 35 5 L28 5 C28 5 18 12 18 28 C18 44 28 52 38 54 L38 100 L44 100 L44 60 L56 60 L56 100 L62 100 L62 54 C72 52 82 44 82 28 C82 12 72 5 72 5 L65 5 C65 5 72 10 72 22 C72 35 65 40 65 40 L55 40 C55 40 58 35 58 28 C58 15 50 5 50 5Z"/>
  </svg>
);

// Компонент літаючих NFT навколо ави
const FloatingNFT = ({ url, index, total }: { url: string; index: number; total: number }) => {
  const angle = (index / total) * 360;
  return (
    <div 
      className="absolute top-1/2 left-1/2 w-6 h-6 rounded-full border border-white/20 overflow-hidden z-20 shadow-lg animate-float-nft"
      style={{
        '--angle': `${angle}deg`,
        transform: `rotate(${angle}deg) translate(48px) rotate(-${angle}deg)`,
      } as any}
    >
      <img src={url} className="w-full h-full object-cover" alt="nft" />
    </div>
  );
};

// --- ТИПИ ТА КОНСТАНТИ ---

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
  cars?: { id: number; car_model: string; plate_number: string }[];
};

const statusColors: Record<string, string> = {
  approved: "text-primary", pending: "text-yellow-400", rejected: "text-destructive", review: "text-yellow-400",
};
const statusLabels: Record<string, string> = {
  approved: "Прийнято", pending: "На розгляді", rejected: "Відхилено", review: "На розгляді",
};

// --- ОСНОВНИЙ КОМПОНЕНТ ---

const Profile = () => {
  const navigate = useNavigate();
  const nick = localStorage.getItem("crp_nick") || "Гравець";

  // --- СТЕЙТИ ---
  const [showAdminInput, setShowAdminInput] = useState(false);
  const [adminCode, setAdminCode] = useState("");
  const [isApprovedAdmin, setIsApprovedAdmin] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [isTg, setIsTg] = useState(false);
  const [tgUser, setTgUser] = useState<any>(null);
  const [profileData, setProfileData] = useState<ProfileData>({ houses: [], factionApps: [], licenses: [], cars: [] });
  const [balance, setBalanceState] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  
  // NFT стейти
  const [ownedNfts, setOwnedNfts] = useState<any[]>([]);
  const [selectedNfts, setSelectedNfts] = useState<any[]>([]); 
  const [isHovered, setIsHovered] = useState(false);
  const [showEditor, setShowEditor] = useState(false);

  // --- ЛОГІКА ---

  const calculateHouseTime = (createdAt: string | undefined, days: number) => {
    if (!createdAt) return "0 ДН.";
    const start = new Date(createdAt).getTime();
    const expiry = start + (days * 24 * 60 * 60 * 1000);
    const diff = expiry - new Date().getTime();
    if (diff <= 0) return "ЗЛЕТІВ";
    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return d > 0 ? `${d} ДН. ${h} Г.` : `${h} ГОД.`;
  };

  const toggleNft = (nft: any) => {
    const isSelected = selectedNfts.find(n => n.id === nft.id);
    if (isSelected) {
      setSelectedNfts(selectedNfts.filter(n => n.id !== nft.id));
    } else {
      if (selectedNfts.length >= 6) {
        toast.error("Максимум 6 предметів на орбіті!");
        return;
      }
      setSelectedNfts([...selectedNfts, nft]);
    }
  };

  const loadData = useCallback(async () => {
    if (!nick) return;
    setRefreshing(true);
    try {
      const data = await store.getPlayerProfile(nick);
      const carsData = await store.getCarPlates(nick);
      const nfts = await store.getUserNfts(nick); 
      
      setOwnedNfts(nfts || []); 
      setProfileData({ ...data, cars: carsData || [] });
      setBalanceState(getBalance(nick));

      if (store && (store as any).getNotifications) {
        const notifs = await (store as any).getNotifications(nick);
        setNotifications(notifs || []);
      }
    } catch (e) {
      console.error("Помилка завантаження:", e);
    } finally {
      setRefreshing(false);
    }
  }, [nick]);

  const markRead = async () => { 
    await store.markNotificationsRead(nick); 
    setNotifications(notifications.map(n => ({ ...n, read: true }))); 
  };

  useEffect(() => {
    const user = getTelegramUser();
    if (user) { setTgUser(user); setIsTg(true); }
    else {
      const tg = (window as any).Telegram;
      if (tg?.WebApp) setIsTg(true);
    }
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!nick) return;
    if (nick.toLowerCase() === "t1kron1x") { setIsApprovedAdmin(true); return; }
    supabase.from("admin_applications").select("status").ilike("username", nick).eq("status", "approved").maybeSingle()
      .then(({ data }) => { if (data) setIsApprovedAdmin(true); });
  }, [nick]);

  const unread = notifications.filter(n => !n.read).length;
  const name = tgUser ? `${tgUser.first_name}${tgUser.last_name ? " " + tgUser.last_name : ""}` : nick;
  const uid = tgUser ? String(tgUser.id) : "000001";
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

      {/* Сповіщення */}
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
                    <p>{n.text}</p>
                    <span className="text-[8px] text-muted-foreground">{n.date}</span>
                  </div>
                ))}
              </div>
          }
        </div>
      )}

      {/* ПАСПОРТ */}
      <div className="mb-4 animate-fade-in" 
           onMouseEnter={() => setIsHovered(true)} 
           onMouseLeave={() => setIsHovered(false)}>
        <div className="rounded-2xl overflow-hidden relative select-none"
             style={{ border: "1px solid hsl(0 0% 100% / 0.12)", boxShadow: "0 8px 32px hsl(0 0% 0% / 0.5)" }}>
          
          <div className="absolute inset-0">
            <img src="https://i.ibb.co/NbX6ZNs/images-2.jpg" alt="" className="w-full h-full object-cover opacity-20" />
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-900/95 to-black/95" />
          </div>

          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-24 h-28 pointer-events-none">
            <Trident />
          </div>

          {/* Шестерня редактора NFT (з'являється при наведенні) */}
          {isHovered && ownedNfts.length > 0 && (
            <button 
              onClick={() => setShowEditor(true)}
              className="absolute top-2 right-2 z-50 w-7 h-7 bg-black/50 backdrop-blur-md border border-white/10 rounded-lg flex items-center justify-center animate-fade-in"
            >
              <Settings className="w-4 h-4 text-primary" />
            </button>
          )}

          <div className="relative px-4 pt-3 pb-2 border-b border-white/5 flex justify-between">
            <div>
              <p className="text-[7px] text-muted-foreground/50 tracking-widest uppercase">Удостоверение</p>
              <p className="text-[8px] text-primary/70 font-bold uppercase">Chernihiv RP</p>
            </div>
            <p className="text-[8px] text-muted-foreground/50 font-mono">#{uid.slice(-6)}</p>
          </div>

          <div className="relative px-4 py-4 flex items-start gap-4">
            {/* Аватарка з орбітою */}
            <div className="relative shrink-0">
              <div className="w-[72px] h-[72px] rounded-2xl overflow-hidden relative z-10 border-2 border-white/10 shadow-xl">
                {tgUser?.photo_url ? (
                  <img src={tgUser.photo_url} className="w-full h-full object-cover" alt="avatar" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary">
                    <User className="w-8 h-8 opacity-40" />
                  </div>
                )}
              </div>
              {/* Рендер обраних NFT */}
              {selectedNfts.map((nft, i) => (
                <FloatingNFT key={nft.id} url={nft.image_url} index={i} total={selectedNfts.length} />
              ))}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[7px] text-muted-foreground/40 uppercase mb-0.5">Ім'я</p>
              <p className="text-base font-bold truncate">{name}</p>
              <div className="flex items-center gap-1.5 mt-2">
                <CheckCircle className="w-3 h-3 text-primary" />
                <span className="text-[10px] text-primary font-bold">Верифіковано</span>
                <span className="text-[8px] text-muted-foreground/40">{regDate}</span>
              </div>
              <div className="flex items-center gap-1 mt-2">
                <Coins className="w-3 h-3 text-yellow-400/70" />
                <span className="text-xs font-bold text-yellow-400">{balance} CR</span>
              </div>
            </div>
          </div>

          <div className="relative px-4 pb-4 grid grid-cols-2 gap-2">
            <div className="bg-white/5 border border-white/5 p-2 rounded-xl">
              <p className="text-[7px] text-muted-foreground/40 uppercase">Фракція</p>
              <p className="text-[10px] font-bold text-primary truncate">{activeFaction || "Відсутня"}</p>
            </div>
            <div className="bg-white/5 border border-white/5 p-2 rounded-xl">
              <p className="text-[7px] text-muted-foreground/40 uppercase">Дім</p>
              <p className="text-[10px] font-bold text-green-400 truncate">{firstHouse?.name || "Немає"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Діяльність */}
      <div className="mb-2">
        <button onClick={() => setShowActivity(!showActivity)} className="w-full liquid-glass-card rounded-2xl px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center"><Briefcase className="w-4 h-4 text-primary" /></div>
            <div className="text-left">
              <p className="text-sm font-medium">Діяльність</p>
              <p className="text-[10px] text-muted-foreground">{activeFaction ? `Фракція: ${activeFaction}` : "Немає"}</p>
            </div>
          </div>
          {showActivity ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        {showActivity && (
          <div className="mt-1 liquid-glass rounded-2xl p-4 animate-fade-in space-y-2">
            {profileData.factionApps.length > 0 ? profileData.factionApps.map((a, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span>{a.faction_name}</span>
                <span className={statusColors[a.status]}>{statusLabels[a.status]}</span>
              </div>
            )) : <p className="text-xs text-muted-foreground text-center">Діяльність відсутня</p>}
          </div>
        )}
      </div>

      {/* Автомобілі */}
      <div className="space-y-3 mb-6">
        {profileData.cars?.map(car => (
          <div key={car.id} className="liquid-glass-card rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center"><Car className="w-4 h-4 text-primary" /></div>
              <div>
                <p className="text-[8px] text-muted-foreground uppercase">Транспорт</p>
                <p className="text-xs font-bold">{car.car_model}</p>
              </div>
            </div>
            <PlateBadge plate={car.plate_number} />
          </div>
        ))}
      </div>

      {/* МОДАЛКА РЕДАКТОРА NFT */}
      {showEditor && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-end animate-fade-in">
          <div className="w-full bg-zinc-900 rounded-t-[32px] p-6 border-t border-white/10 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold">Ваші NFT предмети</h2>
              <button onClick={() => setShowEditor(false)} className="text-primary font-bold text-sm">Готово</button>
            </div>
            <div className="grid grid-cols-4 gap-3 max-h-[40vh] overflow-y-auto">
              {ownedNfts.map(nft => {
                const isSelected = selectedNfts.find(n => n.id === nft.id);
                return (
                  <button 
                    key={nft.id} 
                    onClick={() => toggleNft(nft)}
                    className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all ${isSelected ? 'border-primary shadow-[0_0_15px_hsl(var(--primary)/0.5)]' : 'border-white/5 opacity-60'}`}
                  >
                    <img src={nft.image_url} className="w-full h-full object-cover" alt="nft" />
                    {isSelected && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-center text-[10px] text-muted-foreground mt-6 uppercase tracking-widest">Обрано {selectedNfts.length} з 6</p>
          </div>
        </div>
      )}

      {/* Адмін-панель */}
      {isApprovedAdmin && (
        <button onClick={() => navigate("/admin-panel")} className="w-full mt-4 flex items-center gap-3 px-4 py-4 rounded-2xl bg-primary/10 border border-primary/20 active:scale-95 transition-all">
          <Shield className="w-5 h-5 text-primary" />
          <span className="text-sm font-bold">Адмін-панель</span>
        </button>
      )}
    </div>
  );
};

export default Profile;
