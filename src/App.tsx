import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import BottomNav from "./components/BottomNav";
import Particles from "./components/Particles";
import Index from "./pages/Index";
import Factions from "./pages/Factions";
import FactionDetail from "./pages/FactionDetail";
import Casino from "./pages/Casino";
import Shop from "./pages/Shop";
import Profile from "./pages/Profile";
import News from "./pages/News";
import Licenses from "./pages/Licenses";
import Houses from "./pages/Houses";
import HouseDetail from "./pages/HouseDetail";
import MayorElection from "./pages/MayorElection";
import Documents from "./pages/Documents";
import CityVoice from "./pages/CityVoice";
import Wanted from "./pages/Wanted";
import CarRegistration from "./pages/CarRegistration";
import AdminApplication from "./pages/AdminApplication";
import AdminPanel from "./pages/AdminPanel";
import NotFound from "./pages/NotFound";
import { supabase } from "./lib/store";
import { User, CheckCircle, X, Eye, EyeOff, Shield, AlertTriangle } from "lucide-react";
import GradientButton from "./components/GradientButton";

const queryClient = new QueryClient();

// Telegram user type
type TgUser = { id: number; first_name: string; last_name?: string; username?: string; photo_url?: string };

const getTelegramUser = (): TgUser | null => {
  try {
    const tg = (window as Window & { Telegram?: { WebApp?: { initDataUnsafe?: { user?: TgUser } } } }).Telegram;
    return tg?.WebApp?.initDataUnsafe?.user || null;
  } catch { return null; }
};

// Пароль сервера — зміни тут


// Захист від брутфорсу
const getAttempts = () => parseInt(localStorage.getItem("crp_reg_attempts") || "0");
const getAttemptsTime = () => parseInt(localStorage.getItem("crp_reg_attempts_time") || "0");
const addAttempt = () => {
  const now = Date.now();
  const lastTime = getAttemptsTime();
  // Скидаємо лічильник якщо пройшло > 15 хвилин
  if (now - lastTime > 15 * 60 * 1000) {
    localStorage.setItem("crp_reg_attempts", "1");
  } else {
    localStorage.setItem("crp_reg_attempts", String(getAttempts() + 1));
  }
  localStorage.setItem("crp_reg_attempts_time", String(now));
};
const isBlocked = () => {
  const attempts = getAttempts();
  const lastTime = getAttemptsTime();
  if (attempts >= 5 && Date.now() - lastTime < 15 * 60 * 1000) return true;
  return false;
};

// Login modal — для вже зареєстрованих
const LoginModal = ({ savedNick, onDone, onReset }: { savedNick: string; onDone: () => void; onReset: () => void }) => {
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!password) return;
    setLoading(true);
    setError("");
    const { data } = await supabase.from("users").select("password").ilike("username", savedNick).maybeSingle();
    if (!data?.password) {
      // Старий акаунт без пароля — пускаємо без пароля
      onDone();
      return;
    }
    if (data.password !== password) {
      setError("Невірний пароль!");
      setLoading(false);
      return;
    }
    setLoading(false);
    onDone();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black">
      <Particles />
      <div className="relative w-full max-w-sm animate-fade-in" style={{ zIndex: 1 }}>
        <div className="rounded-2xl p-6"
          style={{ background: "linear-gradient(145deg, hsl(0 0% 8%), hsl(0 0% 5%))", border: "1px solid hsl(84 81% 44% / 0.2)", boxShadow: "0 0 40px hsl(84 81% 44% / 0.1)" }}>
          <div className="text-center mb-6">
            <h1 className="font-display text-2xl font-bold tracking-wider neon-text-lime mb-1">CHERNIHIV RP</h1>
            <p className="text-xs text-muted-foreground">Вхід в акаунт</p>
          </div>

          <div className="flex items-center justify-center mb-5">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: "hsl(84 81% 44% / 0.1)", border: "2px solid hsl(84 81% 44% / 0.3)", boxShadow: "0 0 20px hsl(84 81% 44% / 0.3)" }}>
              <User className="w-8 h-8 text-primary" />
            </div>
          </div>

          <p className="text-center text-sm font-bold text-foreground mb-1">{savedNick}</p>
          <p className="text-center text-xs text-primary/60 mb-5">Введи свій пароль</p>

          <div className="mb-4">
            <div className="relative">
              <input
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Твій пароль..."
                type={showPass ? "text" : "password"}
                className="w-full liquid-glass rounded-xl px-4 py-3 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 bg-transparent text-center font-semibold"
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                autoFocus
              />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-3"
              style={{ background: "hsl(0 70% 50% / 0.1)", border: "1px solid hsl(0 70% 50% / 0.25)" }}>
              <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          <GradientButton variant="green" className="w-full" onClick={handleLogin} disabled={loading || !password}>
            {loading ? "Перевіряю..." : "Увійти"}
          </GradientButton>

          <button onClick={onReset}
            className="w-full mt-3 text-xs text-muted-foreground/40 hover:text-muted-foreground/60 transition-colors py-1">
            Це не я — вийти з акаунту
          </button>
        </div>
      </div>
    </div>
  );
};

// Registration modal
const RegisterModal = ({ onDone }: { onDone: (nick: string) => void }) => {
  const [nick, setNick] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const tgUser = getTelegramUser();

  const blocked = isBlocked();
  const blockMinutes = blocked
    ? Math.ceil((15 * 60 * 1000 - (Date.now() - getAttemptsTime())) / 60000)
    : 0;

  const handleRegister = async () => {
    if (!nick.trim() || nick.trim().length < 2) return;
    setError("");

    // Перевірка блокування
    if (isBlocked()) {
      setError(`Забагато спроб. Зачекайте ${blockMinutes} хв.`);
      return;
    }

    // Перевірка пароля
    if (password.length < 6) {
      setError("Пароль мінімум 6 символів");
      return;
    }
    if (password !== confirmPass) {
      setError("Паролі не співпадають!");
      return;
    }

    setLoading(true);

    // Перевірка — чи цей Telegram вже прив'язаний до іншого акаунту
    if (tgUser?.id) {
      const { data: tgBound } = await supabase
        .from("users")
        .select("username")
        .eq("telegram_id", String(tgUser.id))
        .maybeSingle();
      if (tgBound?.username && tgBound.username.toLowerCase() !== nick.trim().toLowerCase()) {
        setError(`Твій Telegram вже прив'язаний до акаунту "${tgBound.username}". 1 TG = 1 акаунт.`);
        setLoading(false);
        return;
      }
    }

    // Перевірка нікнейму T1kron1x
    const reserved = "t1kron1x";
    if (nick.trim().toLowerCase() === reserved) {
      const { data: existing } = await supabase
        .from("users")
        .select("id, telegram_id")
        .ilike("username", "T1kron1x")
        .maybeSingle();
      if (existing && tgUser && String(tgUser.id) !== String(existing.telegram_id)) {
        setError("Цей нікнейм зарезервований!");
        setLoading(false);
        return;
      }
    }

    // Перевірка дублікату ніку
    const { data: existingNick } = await supabase
      .from("users")
      .select("id, telegram_id")
      .ilike("username", nick.trim())
      .maybeSingle();
    if (existingNick && tgUser && String(tgUser.id) !== String(existingNick.telegram_id)) {
      setError("Цей нік вже зайнятий!");
      setLoading(false);
      return;
    }

    // Зберігаємо в Supabase з паролем
    const { error: dbError } = await supabase.from("users").upsert({
      username: nick.trim(),
      telegram_id: tgUser ? String(tgUser.id) : null,
      avatar_url: tgUser?.photo_url || null,
      role: "player",
      balance: 0,
      password: password,
    }, { onConflict: "username" });

    if (!dbError) {
      localStorage.setItem("crp_registered", "1");
      localStorage.setItem("crp_nick", nick.trim());
      onDone(nick.trim());
    } else {
      setError("Помилка реєстрації: " + dbError.message);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black">
      <Particles />
      <div className="relative w-full max-w-sm animate-fade-in" style={{ zIndex: 1 }}>
        <div className="rounded-2xl p-6"
          style={{
            background: "linear-gradient(145deg, hsl(0 0% 8%), hsl(0 0% 5%))",
            border: "1px solid hsl(84 81% 44% / 0.2)",
            boxShadow: "0 0 40px hsl(84 81% 44% / 0.1)"
          }}>

          {/* Logo */}
          <div className="text-center mb-6">
            <h1 className="font-display text-2xl font-bold tracking-wider neon-text-lime mb-1">CHERNIHIV RP</h1>
            <p className="text-xs text-muted-foreground">Портал гравця</p>
          </div>

          {/* Avatar preview */}
          <div className="flex justify-center mb-5">
            <div className="relative">
              {tgUser?.photo_url ? (
                <img src={tgUser.photo_url} alt="avatar"
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-primary/30"
                  style={{ boxShadow: "0 0 20px hsl(84 81% 44% / 0.3)" }} />
              ) : (
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
                  style={{ background: "hsl(84 81% 44% / 0.1)", border: "2px solid hsl(84 81% 44% / 0.3)" }}>
                  <User className="w-10 h-10 text-primary/50" />
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center"
                style={{ boxShadow: "0 0 10px hsl(84 81% 44%)" }}>
                <CheckCircle className="w-4 h-4 text-black" />
              </div>
            </div>
          </div>

          {tgUser && (
            <p className="text-center text-sm text-foreground font-semibold mb-1">
              {tgUser.first_name}{tgUser.last_name ? " " + tgUser.last_name : ""}
            </p>
          )}
          {tgUser?.username && (
            <p className="text-center text-xs text-primary/60 mb-5">@{tgUser.username}</p>
          )}

          {/* Blocked warning */}
          {blocked && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-3 animate-fade-in"
              style={{ background: "hsl(0 70% 50% / 0.1)", border: "1px solid hsl(0 70% 50% / 0.3)" }}>
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
              <p className="text-xs text-destructive">Забагато спроб. Зачекайте {blockMinutes} хв.</p>
            </div>
          )}

          <div className="mb-3">
            <label className="text-xs text-muted-foreground mb-2 block uppercase tracking-wider">Ваш ігровий нікнейм</label>
            <input
              value={nick}
              onChange={e => setNick(e.target.value)}
              placeholder="Введіть нік..."
              maxLength={24}
              className="w-full liquid-glass rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 bg-transparent text-center font-semibold"
              onKeyDown={e => e.key === "Enter" && nick.trim().length >= 2 && handleRegister()}
              autoFocus
            />
            <p className="text-[10px] text-muted-foreground/50 text-center mt-1.5">Мінімум 2 символи</p>
          </div>

          {/* Personal password */}
          <div className="mb-3">
            <label className="text-xs text-muted-foreground mb-2 block uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-3 h-3" /> Придумай пароль
            </label>
            <div className="relative">
              <input
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Мінімум 6 символів"
                type={showPass ? "text" : "password"}
                className="w-full liquid-glass rounded-xl px-4 py-3 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 bg-transparent text-center font-semibold"
              />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="mb-4">
            <label className="text-xs text-muted-foreground mb-2 block uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-3 h-3" /> Підтвердження пароля
            </label>
            <input
              value={confirmPass}
              onChange={e => setConfirmPass(e.target.value)}
              placeholder="Повтори пароль"
              type="password"
              className="w-full liquid-glass rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 bg-transparent text-center font-semibold"
              onKeyDown={e => e.key === "Enter" && handleRegister()}
            />
            <p className="text-[10px] text-muted-foreground/50 text-center mt-1.5">Запам'ятай пароль — він потрібен для входу</p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-3 animate-fade-in"
              style={{ background: "hsl(0 70% 50% / 0.1)", border: "1px solid hsl(0 70% 50% / 0.25)" }}>
              <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          <GradientButton
            variant="green"
            className="w-full"
            onClick={handleRegister}
            disabled={loading || nick.trim().length < 2 || password.length < 6 || !confirmPass || blocked}>
            {loading ? "Реєструю..." : "Розпочати гру"}
          </GradientButton>
        </div>
      </div>
    </div>
  );
};

// Перевірка чи відкрито в Telegram WebApp
const isTelegramWebApp = (): boolean => {
  try {
    const tg = (window as Window & { Telegram?: { WebApp?: { initData?: string } } }).Telegram;
    return !!(tg?.WebApp?.initData && tg.WebApp.initData.length > 0);
  } catch { return false; }
};

// Екран блокування браузера
const BrowserBlockScreen = () => (
  <div style={{
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #0a0a0a 0%, #0d1a0d 50%, #0a0a0a 100%)",
    padding: "24px",
    fontFamily: "'Inter', sans-serif",
  }}>
    {/* Telegram icon with glow */}
    <div style={{
      width: 100,
      height: 100,
      borderRadius: 28,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 28,
      background: "linear-gradient(135deg, #229ED9, #1a8ab8)",
      boxShadow: "0 0 40px rgba(34,158,217,0.6), 0 0 80px rgba(34,158,217,0.25), 0 0 120px rgba(34,158,217,0.1)",
      animation: "pulse-glow 2s ease-in-out infinite",
    }}>
      {/* Telegram plane SVG */}
      <svg width="54" height="54" viewBox="0 0 24 24" fill="white">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
      </svg>
    </div>

    <style>{`
      @keyframes pulse-glow {
        0%, 100% { box-shadow: 0 0 40px rgba(34,158,217,0.6), 0 0 80px rgba(34,158,217,0.25); }
        50% { box-shadow: 0 0 60px rgba(34,158,217,0.9), 0 0 120px rgba(34,158,217,0.4), 0 0 180px rgba(34,158,217,0.15); }
      }
      @keyframes fade-in-up {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `}</style>

    {/* Title */}
    <h1 style={{
      fontSize: 22,
      fontWeight: 900,
      color: "#ffffff",
      marginBottom: 8,
      textAlign: "center",
      letterSpacing: "0.05em",
      animation: "fade-in-up 0.6s ease both",
      animationDelay: "0.1s",
    }}>
      CHERNIHIV RP
    </h1>

    {/* Block message */}
    <div style={{
      background: "rgba(239,68,68,0.08)",
      border: "1px solid rgba(239,68,68,0.25)",
      borderRadius: 16,
      padding: "14px 20px",
      marginBottom: 24,
      textAlign: "center",
      animation: "fade-in-up 0.6s ease both",
      animationDelay: "0.2s",
    }}>
      <p style={{ fontSize: 15, fontWeight: 700, color: "#ef4444", marginBottom: 4 }}>
        🚫 Вхід з браузера заблоковано!
      </p>
      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
        Портал доступний тільки через Telegram
      </p>
    </div>

    {/* Bot link */}
    <a
      href="https://t.me/CHERNIHIVSITE_BOT"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "14px 28px",
        borderRadius: 16,
        background: "linear-gradient(135deg, #229ED9, #1a8ab8)",
        boxShadow: "0 0 24px rgba(34,158,217,0.5)",
        color: "white",
        textDecoration: "none",
        fontWeight: 800,
        fontSize: 15,
        letterSpacing: "0.03em",
        animation: "fade-in-up 0.6s ease both",
        animationDelay: "0.3s",
        transition: "transform 0.15s, box-shadow 0.15s",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1.04)";
        (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 0 40px rgba(34,158,217,0.8)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1)";
        (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 0 24px rgba(34,158,217,0.5)";
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
      </svg>
      Відкрити через @CHERNIHIVSITE_BOT
    </a>

    <p style={{
      fontSize: 11,
      color: "rgba(255,255,255,0.2)",
      marginTop: 20,
      textAlign: "center",
      animation: "fade-in-up 0.6s ease both",
      animationDelay: "0.4s",
    }}>
      Натисни кнопку вище або знайди бота в Telegram
    </p>
  </div>
);

// Екран бану
const BanScreen = ({ reason, expiresAt, isPermanent }: { reason: string; expiresAt: string | null; isPermanent: boolean }) => {
  const timeLeft = () => {
    if (!expiresAt || isPermanent) return null;
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return null;
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    if (d > 0) return `${d} днів ${h} годин`;
    if (h > 0) return `${h} годин ${m} хвилин`;
    return `${m} хвилин`;
  };
  const left = timeLeft();

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #0a0a0a, #1a0505, #0a0a0a)", padding: "24px", fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @keyframes ban-pulse { 0%,100% { box-shadow: 0 0 40px rgba(239,68,68,0.5), 0 0 80px rgba(239,68,68,0.2); } 50% { box-shadow: 0 0 70px rgba(239,68,68,0.8), 0 0 140px rgba(239,68,68,0.35); } }
        @keyframes fade-up { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      {/* Ban icon */}
      <div style={{ width: 100, height: 100, borderRadius: 28, background: "linear-gradient(135deg, #dc2626, #991b1b)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 28, animation: "ban-pulse 2s ease-in-out infinite" }}>
        <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
        </svg>
      </div>

      {/* Title */}
      <h1 style={{ fontSize: 26, fontWeight: 900, color: "#ef4444", marginBottom: 6, textAlign: "center", letterSpacing: "0.05em", animation: "fade-up 0.5s ease both 0.1s" }}>ВИ ЗАБЛОКОВАНІ</h1>
      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 28, animation: "fade-up 0.5s ease both 0.15s" }}>CHERNIHIV RP • Портал гравця</p>

      {/* Reason */}
      <div style={{ width: "100%", maxWidth: 340, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 16, padding: "16px 20px", marginBottom: 16, animation: "fade-up 0.5s ease both 0.2s" }}>
        <p style={{ fontSize: 10, color: "rgba(239,68,68,0.6)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Причина блокування</p>
        <p style={{ fontSize: 14, fontWeight: 700, color: "#fca5a5", lineHeight: 1.4 }}>{reason}</p>
      </div>

      {/* Duration */}
      <div style={{ width: "100%", maxWidth: 340, background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "14px 20px", animation: "fade-up 0.5s ease both 0.25s" }}>
        {isPermanent ? (
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 4 }}>Термін</p>
            <p style={{ fontSize: 18, fontWeight: 900, color: "#ef4444" }}>НАЗАВЖДИ</p>
          </div>
        ) : left ? (
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 4 }}>Залишилось</p>
            <p style={{ fontSize: 18, fontWeight: 900, color: "#f97316" }}>{left}</p>
          </div>
        ) : (
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", textAlign: "center" }}>Бан вже закінчився — оновіть сторінку</p>
        )}
      </div>

      <p style={{ fontSize: 10, color: "rgba(255,255,255,0.15)", marginTop: 24, textAlign: "center", animation: "fade-up 0.5s ease both 0.3s" }}>
        Оскаржити бан можна звернувшись до адміністрації сервера
      </p>
    </div>
  );
};

const App = () => {
  const [registered, setRegistered] = useState<boolean | null>(null);
  const [banInfo, setBanInfo] = useState<{ reason: string; expiresAt: string | null; isPermanent: boolean } | null | undefined>(undefined);

  // Блокуємо браузер — тільки Telegram WebApp
  if (!isTelegramWebApp()) return <BrowserBlockScreen />;

  useEffect(() => {
    const checkBan = async () => {
      const tg = (window as Window & { Telegram?: { WebApp?: { initDataUnsafe?: { user?: { id: number } } } } }).Telegram;
      const tgId = String(tg?.WebApp?.initDataUnsafe?.user?.id || "");
      const nick = localStorage.getItem("crp_nick") || "";

      if (tgId || nick) {
        // Перевіряємо бан по telegram_id або username
        const { data: bans } = await supabase
          .from("bans")
          .select("reason, expires_at, is_permanent")
          .or(tgId ? `identifier.eq.${tgId},identifier.ilike.${nick}` : `identifier.ilike.${nick}`)
          .limit(1);

        if (bans && bans.length > 0) {
          const ban = bans[0] as { reason: string; expires_at: string | null; is_permanent: boolean };
          // Перевіряємо чи бан ще активний
          if (ban.is_permanent || !ban.expires_at || new Date(ban.expires_at) > new Date()) {
            setBanInfo({ reason: ban.reason, expiresAt: ban.expires_at, isPermanent: ban.is_permanent });
            return;
          }
        }
      }
      setBanInfo(null);
      const isReg = localStorage.getItem("crp_registered") === "1";
      setRegistered(isReg && !!nick);
    };
    checkBan();
  }, []);

  // Показуємо екран бану якщо знайдено
  if (banInfo) return <BanScreen reason={banInfo.reason} expiresAt={banInfo.expiresAt} isPermanent={banInfo.isPermanent} />;

  // Ще перевіряємо (banInfo === undefined = loading)
  if (banInfo === undefined || registered === null) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#000" }}>
      <div style={{ width: 32, height: 32, border: "3px solid hsl(84,81%,44%)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
    </div>
  );

  const savedNick = localStorage.getItem("crp_nick") || "";

  if (!registered) {
    // Якщо нік є в localStorage — показуємо логін, інакше реєстрацію
    if (savedNick) {
      return (
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Sonner />
            <LoginModal
              savedNick={savedNick}
              onDone={() => setRegistered(true)}
              onReset={() => {
                localStorage.removeItem("crp_registered");
                localStorage.removeItem("crp_nick");
                window.location.reload();
              }}
            />
          </TooltipProvider>
        </QueryClientProvider>
      );
    }
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Sonner />
          <RegisterModal onDone={() => setRegistered(true)} />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Sonner />
        <BrowserRouter>
          <Particles />
          <div className="max-w-lg mx-auto relative" style={{ zIndex: 1 }}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/news" element={<News />} />
              <Route path="/licenses" element={<Licenses />} />
              <Route path="/houses" element={<Houses />} />
              <Route path="/houses/:id" element={<HouseDetail />} />
              <Route path="/mayor-election" element={<MayorElection />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/city-voice" element={<CityVoice />} />
              <Route path="/wanted" element={<Wanted />} />
              <Route path="/car-registration" element={<CarRegistration />} />
              <Route path="/admin-application" element={<AdminApplication />} />
              <Route path="/factions" element={<Factions />} />
              <Route path="/factions/:id" element={<FactionDetail />} />
              <Route path="/casino" element={<Casino />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/admin-panel" element={<AdminPanel />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <BottomNav />
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
