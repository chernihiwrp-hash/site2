import { useState, useEffect, useCallback, useRef } from "react";
import {
  User, Briefcase, Home, Car, FileCheck, Wallet, Lock,
  Bell, ChevronDown, ChevronRight, Shield, CheckCircle,
  LogIn, RefreshCw, Coins, Clock, Settings2, RotateCcw, Zap, X
} from "lucide-react";
import GradientButton from "../components/GradientButton";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { store, supabase, getBalance } from "../lib/store";
import type { Notification } from "../lib/store";

const getTelegramUser = () => {
  try {
    const tg = (window as any).Telegram;
    return tg?.WebApp?.initDataUnsafe?.user || null;
  } catch { return null; }
};

const Trident = () => (
  <svg viewBox="0 0 100 120" fill="currentColor" className="text-white w-full h-full opacity-[0.07]">
    <path d="M50 5 C50 5 42 15 42 28 C42 35 45 40 45 40 L35 40 C35 40 28 35 28 22 C28 10 35 5 35 5 L28 5 C28 5 18 12 18 28 C18 44 28 52 38 54 L38 100 L44 100 L44 60 L56 60 L56 100 L62 100 L62 54 C72 52 82 44 82 28 C82 12 72 5 72 5 L65 5 C65 5 72 10 72 22 C72 35 65 40 65 40 L55 40 C55 40 58 35 58 28 C58 15 50 5 50 5Z"/>
  </svg>
);

type ProfileData = {
  houses: any[];
  factionApps: { faction_name: string; status: string }[];
  licenses: any[];
};

type OrbitSettings = {
  enabled: boolean;
  speed: number;     // секунди на повний оберт (менше = швидше)
  radius: number;    // радіус орбіти в пікселях
};

const DEFAULT_ORBIT: OrbitSettings = { enabled: true, speed: 12, radius: 68 };

const NftBubble = ({ url, size = 38, visible, delay }: { url: string; size?: number; visible: boolean; delay: number }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!visible) { setMounted(false); return; }
    const t = setTimeout(() => setMounted(true), delay);
    return () => clearTimeout(t);
  }, [visible, delay]);

  const svgId = `mask-${Math.random().toString(36).slice(2)}`;

  return (
    <div style={{
      position: "absolute",
      width: size,
      height: size,
      opacity: mounted ? 1 : 0,
      transform: mounted ? "scale(1)" : "scale(0.3)",
      transition: `all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms`,
    }}>
      {/* Glow */}
      <div style={{
        position: "absolute",
        inset: -size * 0.4,
        borderRadius: "50%",
        background: "radial-gradient(circle, hsl(var(--primary) / 0.5) 20%, transparent 70%)",
        filter: "blur(12px)",
        zIndex: -1,
      }} />

      <svg width={size} height={size} style={{ display: "block" }}>
        <defs>
          <radialGradient id={`${svgId}-fade`} cx="50%" cy="50%" r="50%">
            <stop offset="42%" stopColor="white" stopOpacity="1" />
            <stop offset="76%" stopColor="white" stopOpacity="0.45" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <mask id={svgId}>
            <circle cx={size/2} cy={size/2} r={size/2} fill={`url(#${svgId}-fade)`} />
          </mask>
        </defs>
        <image
          href={url}
          x="0" y="0"
          width={size} height={size}
          mask={`url(#${svgId})`}
          preserveAspectRatio="xMidYMid slice"
        />
      </svg>
    </div>
  );
};

const NftOrbit = ({
  avatarSize,
  orbitSettings,
  nfts,
  visible,
}: {
  avatarSize: number;
  orbitSettings: OrbitSettings;
  nfts: any[];
  visible: boolean;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const angleRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);

  const nftSize = 38;
  const { enabled, speed, radius } = orbitSettings;
  const count = nfts.length || 0;

  useEffect(() => {
    if (!enabled || speed <= 0 || count === 0) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    const degreesPerMs = 360 / (speed * 1000);

    const animate = (now: number) => {
      if (lastTimeRef.current) {
        const delta = now - lastTimeRef.current;
        angleRef.current = (angleRef.current + degreesPerMs * delta) % 360;

        if (containerRef.current) {
          const items = containerRef.current.querySelectorAll<HTMLDivElement>(".nft-item");
          items.forEach((el, i) => {
            const baseAngle = (360 / count) * i;
            const currentAngle = baseAngle + angleRef.current;
            const rad = (currentAngle * Math.PI) / 180;

            const x = Math.cos(rad) * radius - nftSize / 2;
            const y = Math.sin(rad) * radius - nftSize / 2;

            el.style.transform = `translate(${x}px, ${y}px)`;
          });
        }
      }
      lastTimeRef.current = now;
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [enabled, speed, radius, count]);

  if (count === 0) return null;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none"
      style={{ width: avatarSize, height: avatarSize }}
    >
      {nfts.slice(0, 8).map((nft, i) => (
        <div
          key={nft.id}
          className="nft-item absolute"
          style={{
            width: nftSize,
            height: nftSize,
            left: avatarSize / 2 - nftSize / 2,
            top: avatarSize / 2 - nftSize / 2,
            transform: `translate(0px, 0px)`,
          }}
        >
          <NftBubble
            url={nft.image_url}
            size={nftSize}
            visible={visible}
            delay={i * 80}
          />
        </div>
      ))}
    </div>
  );
};

const OrbitSettingsPanel = ({
  settings,
  onChange,
  onClose,
}: {
  settings: OrbitSettings;
  onChange: (s: OrbitSettings) => void;
  onClose: () => void;
}) => (
  <div className="liquid-glass-card rounded-2xl p-5 mb-4 animate-fade-in">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <RotateCcw className="w-4 h-4 text-primary" />
        <span className="font-semibold">Налаштування орбіти NFT</span>
      </div>
      <button onClick={onClose} className="text-muted-foreground">
        <X size={18} />
      </button>
    </div>

    <div className="space-y-6">
      {/* Toggle */}
      <div className="flex items-center justify-between">
        <span className="text-sm">Обертання увімкнено</span>
        <button
          onClick={() => onChange({ ...settings, enabled: !settings.enabled })}
          className={`w-11 h-6 rounded-full relative transition-colors ${settings.enabled ? "bg-primary" : "bg-zinc-700"}`}
        >
          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${settings.enabled ? "left-6" : "left-0.5"}`} />
        </button>
      </div>

      {/* Speed */}
      <div className={settings.enabled ? "" : "opacity-50 pointer-events-none"}>
        <div className="flex justify-between text-sm mb-2">
          <span>Швидкість обертання</span>
          <span className="font-mono text-primary">{settings.speed.toFixed(1)}s</span>
        </div>
        <input
          type="range"
          min={4}
          max={30}
          step={0.5}
          value={settings.speed}
          onChange={(e) => onChange({ ...settings, speed: parseFloat(e.target.value) })}
          className="w-full accent-primary"
        />
      </div>

      {/* Radius */}
      <div className={settings.enabled ? "" : "opacity-50 pointer-events-none"}>
        <div className="flex justify-between text-sm mb-2">
          <span>Радіус орбіти</span>
          <span className="font-mono text-primary">{settings.radius}px</span>
        </div>
        <input
          type="range"
          min={52}
          max={92}
          step={1}
          value={settings.radius}
          onChange={(e) => onChange({ ...settings, radius: parseFloat(e.target.value) })}
          className="w-full accent-primary"
        />
      </div>
    </div>
  </div>
);

const Profile = () => {
  const navigate = useNavigate();
  const nick = localStorage.getItem("crp_nick") || "Гравець";

  const [orbitSettings, setOrbitSettings] = useState<OrbitSettings>(() => {
    const saved = localStorage.getItem("crp_orbit_settings");
    return saved ? JSON.parse(saved) : DEFAULT_ORBIT;
  });

  const [showOrbitSettings, setShowOrbitSettings] = useState(false);
  const [nftVisible, setNftVisible] = useState(false);
  const [availableNfts, setAvailableNfts] = useState<any[]>([]);
  const [selectedNftIds, setSelectedNftIds] = useState<string[]>([]);

  // ... інші стейти (notifications, tgUser, profileData тощо) — залиш як у тебе було

  const AVATAR_SIZE = 82;

  useEffect(() => {
    localStorage.setItem("crp_orbit_settings", JSON.stringify(orbitSettings));
  }, [orbitSettings]);

  // Завантаження даних + NFT
  const loadData = useCallback(async () => {
    // ... твій існуючий код завантаження профілю

    // Завантаження NFT
    const { data: owned } = await supabase
      .from('nft_owners')
      .select('nft_id')
      .eq('owner_nick', nick);

    const ownedIds = owned?.map(o => o.nft_id) || [];

    if (ownedIds.length > 0) {
      const { data: nfts } = await supabase
        .from('nft_gifts')
        .select('*')
        .in('id', ownedIds);

      if (nfts) {
        setAvailableNfts(nfts);
        // Використовуємо збережені або перші 6
        const saved = localStorage.getItem("orbit_nft_ids");
        const valid = saved ? JSON.parse(saved).filter((id: string) => ownedIds.includes(id)) : [];
        setSelectedNftIds(valid.length ? valid : nfts.slice(0, 6).map((n: any) => n.id));
      }
    }
  }, [nick]);

  useEffect(() => {
    // ... твій код Telegram + loadData
    loadData();
    setTimeout(() => setNftVisible(true), 400);
  }, [loadData]);

  const displayedNfts = availableNfts.filter(n => selectedNftIds.includes(n.id));

  return (
    <div className="min-h-screen pb-24 px-4 pt-4">
      {/* Header з кнопкою налаштувань орбіти */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-display text-xl font-bold tracking-wider neon-text-lime">ПРОФІЛЬ</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowOrbitSettings(true)} className="w-9 h-9 liquid-glass rounded-xl flex items-center justify-center">
            <Settings2 className="w-4 h-4" />
          </button>
          {/* Refresh та Bell — як у тебе */}
        </div>
      </div>

      {/* PASSPORT CARD */}
      <div className="mb-6">
        <div className="rounded-2xl overflow-hidden relative" style={{
          border: "1px solid hsl(0 0% 100% / 0.12)",
          boxShadow: "0 10px 40px hsl(0 0% 0% / 0.6)",
        }}>
          {/* Background */}
          <div className="absolute inset-0">
            <img src="https://i.ibb.co/NbX6ZNs/images-2.jpg" className="w-full h-full object-cover opacity-20" alt="" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(145deg, hsl(240 15% 8% / 0.96), hsl(0 0% 4% / 0.94))" }} />
          </div>

          <Trident />

          {/* Header */}
          <div className="relative px-5 pt-4 pb-2 flex justify-between border-b border-white/10">
            <div>
              <p className="text-[7px] tracking-[2px] text-muted-foreground/60">УДОСТОВЕРЕНИЕ</p>
              <p className="text-[8px] font-semibold text-muted-foreground/70">CHERNIHIV RP</p>
            </div>
            <p className="text-[8px] font-mono text-muted-foreground/60">#{String(tgUser?.id || "000001").slice(-6)}</p>
          </div>

          {/* Avatar + Orbit */}
          <div className="relative px-5 py-6 flex gap-5">
            <div className="relative" style={{ width: AVATAR_SIZE + 60, height: AVATAR_SIZE + 60 }}>
              <NftOrbit
                avatarSize={AVATAR_SIZE}
                orbitSettings={orbitSettings}
                nfts={displayedNfts}
                visible={nftVisible}
              />

              {/* Avatar */}
              <div className="absolute rounded-2xl overflow-hidden border border-white/20 shadow-xl" style={{
                width: AVATAR_SIZE,
                height: AVATAR_SIZE,
                left: 30,
                top: 30,
                zIndex: 10,
              }}>
                {tgUser?.photo_url ? (
                  <img src={tgUser.photo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                    <User className="w-12 h-12 text-primary/40" />
                  </div>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 pt-2">
              <p className="text-base font-bold truncate">{tgUser ? `${tgUser.first_name} ${tgUser.last_name || ''}` : nick}</p>
              <div className="flex items-center gap-2 mt-1 mb-3">
                <CheckCircle className="w-4 h-4 text-primary" />
                <span className="text-xs text-primary font-medium">Верифіковано</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Coins className="text-yellow-400" />
                <span>{getBalance(nick)} CR</span>
              </div>
            </div>
          </div>

          {/* Bottom stats + machine line — залиш як у тебе */}
        </div>
      </div>

      {/* Панель налаштувань орбіти */}
      {showOrbitSettings && (
        <OrbitSettingsPanel
          settings={orbitSettings}
          onChange={setOrbitSettings}
          onClose={() => setShowOrbitSettings(false)}
        />
      )}

      {/* Інша частина профілю (діяльність, будинки тощо) — копіюй з попередньої версії */}
    </div>
  );
};

export default Profile;
