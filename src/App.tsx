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
import BalanceTop from "./pages/BalanceTop";
import Vip from "./pages/Vip";
import { supabase } from "./lib/store";
import { User, CheckCircle, Eye, EyeOff, Shield, AlertTriangle } from "lucide-react";
import GradientButton from "./components/GradientButton";

const queryClient = new QueryClient();

type TgUser = { id: number; first_name: string; last_name?: string; username?: string; photo_url?: string };

const getTelegramUser = (): TgUser | null => {
  try {
    const tg = (window as Window & { Telegram?: { WebApp?: { initDataUnsafe?: { user?: TgUser } } } }).Telegram;
    return tg?.WebApp?.initDataUnsafe?.user || null;
  } catch { return null; }
};

const getAttempts = () => parseInt(localStorage.getItem("crp_reg_attempts") || "0");
const getAttemptsTime = () => parseInt(localStorage.getItem("crp_reg_attempts_time") || "0");
const addAttempt = () => {
  const now = Date.now();
  const lastTime = getAttemptsTime();
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

const LoginModal = ({ savedNick, onDone, onReset }: { savedNick: string; onDone: () => void; onReset: () => void }) => {
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!password) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "verify", nick: savedNick, password, tgId: String(getTelegramUser()?.id || "") }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error === "Wrong password" ? "Невірний пароль!" : (json?.error || "Помилка входу"));
        setLoading(false);
        return;
      }
      localStorage.setItem("crp_password", password);
      setLoading(false);
      onDone();
    } catch (e: any) {
      setError("Помилка з'єднання: " + (e?.message || "Network error"));
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4" style={{ background: "radial-gradient(ellipse at 50% 0%, hsl(84 81% 44% / 0.08) 0%, #000 60%)" }}>
      <style>{`
        @keyframes crp-fade-up { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes crp-glow-pulse { 0%,100% { box-shadow: 0 0 0 0 hsl(84 81% 44% / 0); } 50% { box-shadow: 0 0 32px 4px hsl(84 81% 44% / 0.18); } }
        @keyframes crp-scanline { 0% { background-position: 0 0; } 100% { background-position: 0 4px; } }
        .crp-card { animation: crp-fade-up 0.45s cubic-bezier(.22,1,.36,1) both; }
        .crp-input:focus { border-color: hsl(84 81% 44% / 0.6) !important; box-shadow: 0 0 0 3px hsl(84 81% 44% / 0.1), inset 0 1px 0 hsl(84 81% 44% / 0.05) !important; }
        .crp-btn-main { position: relative; overflow: hidden; transition: all 0.2s; }
        .crp-btn-main:not(:disabled):hover { transform: translateY(-1px); box-shadow: 0 8px 32px hsl(84 81% 44% / 0.4) !important; }
        .crp-btn-main:not(:disabled):active { transform: translateY(0); }
        .crp-btn-main::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 100%); pointer-events: none; }
        .crp-avatar-ring { animation: crp-glow-pulse 3s ease-in-out infinite; }
      `}</style>
      <Particles />
      <div className="relative w-full max-w-[340px] crp-card" style={{ zIndex: 1 }}>
        {/* Top accent line */}
        <div style={{ height: 2, borderRadius: "2px 2px 0 0", background: "linear-gradient(90deg, transparent, hsl(84 81% 44%), transparent)", marginBottom: -1 }} />
        <div style={{
          background: "linear-gradient(160deg, hsl(0 0% 9%) 0%, hsl(0 0% 6%) 100%)",
          border: "1px solid hsl(84 81% 44% / 0.15)",
          borderTop: "none",
          borderRadius: "0 0 20px 20px",
          padding: "28px 24px 24px",
          backdropFilter: "blur(20px)",
        }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 8, padding: "3px 10px", borderRadius: 20, background: "hsl(84 81% 44% / 0.08)", border: "1px solid hsl(84 81% 44% / 0.15)" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "hsl(84 81% 44%)", boxShadow: "0 0 6px hsl(84 81% 44%)" }} />
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "hsl(84 81% 44%)", textTransform: "uppercase" }}>Chernihiv RP</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-0.01em", lineHeight: 1.2 }}>З поверненням</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>Введи пароль для входу</div>
          </div>

          {/* Avatar */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
            <div className="crp-avatar-ring" style={{
              width: 72, height: 72, borderRadius: 18,
              background: "linear-gradient(135deg, hsl(84 81% 44% / 0.15), hsl(84 81% 44% / 0.05))",
              border: "1.5px solid hsl(84 81% 44% / 0.35)",
              display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 2,
            }}>
              <User style={{ width: 28, height: 28, color: "hsl(84 81% 44%)" }} />
            </div>
          </div>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", letterSpacing: "0.01em" }}>{savedNick}</div>
            <div style={{ fontSize: 11, color: "hsl(84 81% 44% / 0.6)", marginTop: 2 }}>Гравець</div>
          </div>

          {/* Password field */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ position: "relative" }}>
              <input
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Пароль..."
                type={showPass ? "text" : "password"}
                className="crp-input"
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: "hsl(0 0% 5%)", border: "1.5px solid hsl(0 0% 18%)",
                  borderRadius: 12, padding: "12px 40px 12px 14px",
                  fontSize: 14, fontWeight: 600, color: "#fff",
                  outline: "none", transition: "all 0.2s",
                  letterSpacing: "0.02em",
                }}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                autoFocus
              />
              <button type="button" onClick={() => setShowPass(!showPass)} style={{
                position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", padding: 0, display: "flex",
              }}>
                {showPass ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 10, marginBottom: 12, background: "hsl(0 70% 50% / 0.08)", border: "1px solid hsl(0 70% 50% / 0.2)" }}>
              <AlertTriangle style={{ width: 14, height: 14, color: "#ef4444", flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "#ef4444" }}>{error}</span>
            </div>
          )}

          {/* Login button */}
          <button className="crp-btn-main" onClick={handleLogin} disabled={loading || !password} style={{
            width: "100%", padding: "13px 0", borderRadius: 12, border: "none", cursor: loading || !password ? "not-allowed" : "pointer",
            background: loading || !password ? "hsl(0 0% 15%)" : "linear-gradient(135deg, hsl(84 81% 44%), hsl(100 70% 38%))",
            color: loading || !password ? "rgba(255,255,255,0.3)" : "#000",
            fontSize: 14, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase",
            boxShadow: loading || !password ? "none" : "0 4px 20px hsl(84 81% 44% / 0.3)",
            transition: "all 0.2s",
          }}>
            {loading ? "Перевіряю..." : "Увійти"}
          </button>

          {/* Reset link */}
          <button onClick={onReset} style={{
            width: "100%", marginTop: 12, background: "none", border: "none", cursor: "pointer",
            fontSize: 11, color: "rgba(255,255,255,0.2)", padding: "4px 0", transition: "color 0.2s",
          }}
            onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.45)")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.2)")}>
            Це не я — змінити акаунт
          </button>
        </div>
      </div>
    </div>
  );
};

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
    if (isBlocked()) { setError(`Забагато спроб. Зачекайте ${blockMinutes} хв.`); return; }
    if (password.length < 6) { setError("Пароль мінімум 6 символів"); return; }
    if (password !== confirmPass) { setError("Паролі не співпадають!"); return; }
    setLoading(true);

    if (tgUser?.id) {
      const { data: tgBound } = await supabase.from("users").select("username").eq("telegram_id", String(tgUser.id)).maybeSingle();
      if (tgBound?.username && tgBound.username.toLowerCase() !== nick.trim().toLowerCase()) {
        setError(`Твій Telegram вже прив'язаний до акаунту "${tgBound.username}". 1 TG = 1 акаунт.`);
        setLoading(false); return;
      }
    }

    const reserved = "t1kron1x";
    if (nick.trim().toLowerCase() === reserved) {
      const { data: existing } = await supabase.from("users").select("id, telegram_id").ilike("username", "T1kron1x").maybeSingle();
      if (existing && tgUser && String(tgUser.id) !== String(existing.telegram_id)) {
        setError("Цей нікнейм зарезервований!"); setLoading(false); return;
      }
    }

    const { data: existingNick } = await supabase.from("users").select("id, telegram_id").ilike("username", nick.trim()).maybeSingle();
    if (existingNick && tgUser && String(tgUser.id) !== String(existingNick.telegram_id)) {
      setError("Цей нік вже зайнятий!"); setLoading(false); return;
    }

    try {
      const regRes = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          op: "register",
          values: {
            username: nick.trim(),
            telegram_id: tgUser ? String(tgUser.id) : null,
            avatar_url: tgUser?.photo_url || null,
            role: "player",
            balance: 0,
            password: password,
          },
        }),
      });
      const regJson = await regRes.json().catch(() => ({}));
      if (!regRes.ok) {
        setError("Помилка реєстрації: " + (regJson?.error || `HTTP ${regRes.status}`));
        setLoading(false); return;
      }
      localStorage.setItem("crp_registered", "1");
      localStorage.setItem("crp_nick", nick.trim());
      localStorage.setItem("crp_password", password);
      onDone(nick.trim());
    } catch (e: any) {
      setError("Помилка реєстрації: " + (e?.message || "Network error"));
    }
    setLoading(false);
  };

  const regReady = !loading && nick.trim().length >= 2 && password.length >= 6 && !!confirmPass && !blocked;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4" style={{ background: "radial-gradient(ellipse at 50% 0%, hsl(84 81% 44% / 0.07) 0%, #000 55%)" }}>
      <style>{`
        @keyframes crp-fade-up { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes crp-glow-pulse { 0%,100% { box-shadow: 0 0 0 0 hsl(84 81% 44% / 0); } 50% { box-shadow: 0 0 32px 4px hsl(84 81% 44% / 0.18); } }
        .crp-card { animation: crp-fade-up 0.45s cubic-bezier(.22,1,.36,1) both; }
        .crp-input { transition: border-color 0.2s, box-shadow 0.2s; }
        .crp-input:focus { border-color: hsl(84 81% 44% / 0.55) !important; box-shadow: 0 0 0 3px hsl(84 81% 44% / 0.09) !important; outline: none; }
        .crp-input::placeholder { color: rgba(255,255,255,0.2); }
        .crp-btn-main { position: relative; overflow: hidden; transition: all 0.2s; }
        .crp-btn-main:not(:disabled):hover { transform: translateY(-1px); filter: brightness(1.08); }
        .crp-btn-main:not(:disabled):active { transform: translateY(0); }
        .crp-btn-main::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(255,255,255,0.09) 0%, transparent 60%); pointer-events: none; }
        .crp-avatar-ring { animation: crp-glow-pulse 3s ease-in-out infinite; }
        .crp-field-label { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255,255,255,0.3); margin-bottom: 6px; display: block; }
      `}</style>
      <Particles />
      <div className="relative w-full max-w-[340px] crp-card" style={{ zIndex: 1 }}>
        {/* Top lime accent */}
        <div style={{ height: 2, borderRadius: "2px 2px 0 0", background: "linear-gradient(90deg, transparent, hsl(84 81% 44%), transparent)" }} />
        <div style={{
          background: "linear-gradient(160deg, hsl(0 0% 9%) 0%, hsl(0 0% 6%) 100%)",
          border: "1px solid hsl(84 81% 44% / 0.14)",
          borderTop: "none",
          borderRadius: "0 0 20px 20px",
          padding: "24px 22px 22px",
        }}>
          {/* Badge + title */}
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 10, padding: "3px 10px", borderRadius: 20, background: "hsl(84 81% 44% / 0.08)", border: "1px solid hsl(84 81% 44% / 0.15)" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "hsl(84 81% 44%)", boxShadow: "0 0 6px hsl(84 81% 44%)" }} />
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "hsl(84 81% 44%)", textTransform: "uppercase" }}>Chernihiv RP</span>
            </div>
            <div style={{ fontSize: 19, fontWeight: 800, color: "#fff", letterSpacing: "-0.01em" }}>Реєстрація</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 3 }}>Створи свій акаунт гравця</div>
          </div>

          {/* Avatar */}
          {(tgUser) && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 18 }}>
              <div className="crp-avatar-ring" style={{ position: "relative", width: 64, height: 64 }}>
                {tgUser.photo_url ? (
                  <img src={tgUser.photo_url} alt="avatar" style={{ width: 64, height: 64, borderRadius: 16, objectFit: "cover", border: "1.5px solid hsl(84 81% 44% / 0.4)", display: "block" }} />
                ) : (
                  <div style={{ width: 64, height: 64, borderRadius: 16, background: "hsl(84 81% 44% / 0.1)", border: "1.5px solid hsl(84 81% 44% / 0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <User style={{ width: 26, height: 26, color: "hsl(84 81% 44% / 0.7)" }} />
                  </div>
                )}
                <div style={{ position: "absolute", bottom: -4, right: -4, width: 20, height: 20, borderRadius: "50%", background: "hsl(84 81% 44%)", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #000" }}>
                  <CheckCircle style={{ width: 12, height: 12, color: "#000" }} />
                </div>
              </div>
              <div style={{ marginTop: 10, textAlign: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{tgUser.first_name}{tgUser.last_name ? " " + tgUser.last_name : ""}</div>
                {tgUser.username && <div style={{ fontSize: 11, color: "hsl(84 81% 44% / 0.55)", marginTop: 1 }}>@{tgUser.username}</div>}
              </div>
            </div>
          )}

          {/* Blocked warning */}
          {blocked && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 10, marginBottom: 12, background: "hsl(0 70% 50% / 0.08)", border: "1px solid hsl(0 70% 50% / 0.2)" }}>
              <AlertTriangle style={{ width: 14, height: 14, color: "#ef4444", flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "#ef4444" }}>Забагато спроб. Зачекайте {blockMinutes} хв.</span>
            </div>
          )}

          {/* Divider */}
          <div style={{ height: 1, background: "hsl(0 0% 18%)", marginBottom: 16 }} />

          {/* Nick */}
          <div style={{ marginBottom: 10 }}>
            <label className="crp-field-label">Ігровий нікнейм</label>
            <input value={nick} onChange={e => setNick(e.target.value)} placeholder="Введи нік..." maxLength={24}
              className="crp-input"
              style={{ width: "100%", boxSizing: "border-box", background: "hsl(0 0% 5%)", border: "1.5px solid hsl(0 0% 18%)", borderRadius: 11, padding: "11px 14px", fontSize: 14, fontWeight: 600, color: "#fff" }}
              onKeyDown={e => e.key === "Enter" && nick.trim().length >= 2 && handleRegister()} autoFocus />
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 5, textAlign: "center" }}>Мінімум 2 символи · макс. 24</div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: 10 }}>
            <label className="crp-field-label">Пароль</label>
            <div style={{ position: "relative" }}>
              <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Мінімум 6 символів" type={showPass ? "text" : "password"}
                className="crp-input"
                style={{ width: "100%", boxSizing: "border-box", background: "hsl(0 0% 5%)", border: "1.5px solid hsl(0 0% 18%)", borderRadius: 11, padding: "11px 40px 11px 14px", fontSize: 14, fontWeight: 600, color: "#fff" }} />
              <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.25)", padding: 0, display: "flex" }}>
                {showPass ? <EyeOff style={{ width: 15, height: 15 }} /> : <Eye style={{ width: 15, height: 15 }} />}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div style={{ marginBottom: 14 }}>
            <label className="crp-field-label">Підтвердження</label>
            <input value={confirmPass} onChange={e => setConfirmPass(e.target.value)} placeholder="Повтори пароль" type="password"
              className="crp-input"
              style={{ width: "100%", boxSizing: "border-box", background: "hsl(0 0% 5%)", border: "1.5px solid hsl(0 0% 18%)", borderRadius: 11, padding: "11px 14px", fontSize: 14, fontWeight: 600, color: "#fff" }}
              onKeyDown={e => e.key === "Enter" && handleRegister()} />
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 5, textAlign: "center" }}>Запам'ятай — він потрібен для входу</div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 10, marginBottom: 12, background: "hsl(0 70% 50% / 0.08)", border: "1px solid hsl(0 70% 50% / 0.2)" }}>
              <AlertTriangle style={{ width: 14, height: 14, color: "#ef4444", flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "#ef4444" }}>{error}</span>
            </div>
          )}

          {/* Register button */}
          <button className="crp-btn-main" onClick={handleRegister} disabled={!regReady} style={{
            width: "100%", padding: "13px 0", borderRadius: 12, border: "none", cursor: regReady ? "pointer" : "not-allowed",
            background: regReady ? "linear-gradient(135deg, hsl(84 81% 44%), hsl(100 70% 38%))" : "hsl(0 0% 14%)",
            color: regReady ? "#000" : "rgba(255,255,255,0.25)",
            fontSize: 14, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase",
            boxShadow: regReady ? "0 4px 24px hsl(84 81% 44% / 0.3)" : "none",
          }}>
            {loading ? "Реєструю..." : "Розпочати гру →"}
          </button>
        </div>
      </div>
    </div>
  );
};

const isTelegramWebApp = (): boolean => {
  try {
    const tg = (window as Window & { Telegram?: { WebApp?: { initData?: string } } }).Telegram;
    return !!(tg?.WebApp?.initData && tg.WebApp.initData.length > 0);
  } catch { return false; }
};

const BrowserBlockScreen = () => (
  <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #0a0a0a 0%, #0d1a0d 50%, #0a0a0a 100%)", padding: "24px", fontFamily: "'Inter', sans-serif" }}>
    <div style={{ width: 100, height: 100, borderRadius: 28, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 28, background: "linear-gradient(135deg, #229ED9, #1a8ab8)", boxShadow: "0 0 40px rgba(34,158,217,0.6), 0 0 80px rgba(34,158,217,0.25)", animation: "pulse-glow 2s ease-in-out infinite" }}>
      <svg width="54" height="54" viewBox="0 0 24 24" fill="white"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
    </div>
    <style>{`@keyframes pulse-glow { 0%,100%{box-shadow:0 0 40px rgba(34,158,217,0.6),0 0 80px rgba(34,158,217,0.25);}50%{box-shadow:0 0 60px rgba(34,158,217,0.9),0 0 120px rgba(34,158,217,0.4);} } @keyframes fade-in-up{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}`}</style>
    <h1 style={{ fontSize: 22, fontWeight: 900, color: "#ffffff", marginBottom: 8, textAlign: "center", letterSpacing: "0.05em" }}>CHERNIHIV RP</h1>
    <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 16, padding: "14px 20px", marginBottom: 24, textAlign: "center" }}>
      <p style={{ fontSize: 15, fontWeight: 700, color: "#ef4444", marginBottom: 4 }}>🚫 Вхід з браузера заблоковано!</p>
      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>Портал доступний тільки через Telegram</p>
    </div>
    <a href="https://t.me/CHERNIHIVSITE_BOT" style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 28px", borderRadius: 16, background: "linear-gradient(135deg, #229ED9, #1a8ab8)", boxShadow: "0 0 24px rgba(34,158,217,0.5)", color: "white", textDecoration: "none", fontWeight: 800, fontSize: 15 }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
      Відкрити через @CHERNIHIVSITE_BOT
    </a>
    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", marginTop: 20, textAlign: "center" }}>Натисни кнопку вище або знайди бота в Telegram</p>
  </div>
);

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
      <style>{`@keyframes ban-pulse{0%,100%{box-shadow:0 0 40px rgba(239,68,68,0.5),0 0 80px rgba(239,68,68,0.2);}50%{box-shadow:0 0 70px rgba(239,68,68,0.8),0 0 140px rgba(239,68,68,0.35);}} @keyframes fade-up{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}`}</style>
      <div style={{ width: 100, height: 100, borderRadius: 28, background: "linear-gradient(135deg, #dc2626, #991b1b)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 28, animation: "ban-pulse 2s ease-in-out infinite" }}>
        <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
      </div>
      <h1 style={{ fontSize: 26, fontWeight: 900, color: "#ef4444", marginBottom: 6, textAlign: "center", letterSpacing: "0.05em" }}>ВИ ЗАБЛОКОВАНІ</h1>
      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 28 }}>CHERNIHIV RP • Портал гравця</p>
      <div style={{ width: "100%", maxWidth: 340, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 16, padding: "16px 20px", marginBottom: 16 }}>
        <p style={{ fontSize: 10, color: "rgba(239,68,68,0.6)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Причина блокування</p>
        <p style={{ fontSize: 14, fontWeight: 700, color: "#fca5a5", lineHeight: 1.4 }}>{reason}</p>
      </div>
      <div style={{ width: "100%", maxWidth: 340, background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "14px 20px" }}>
        {isPermanent ? (
          <div style={{ textAlign: "center" }}><p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 4 }}>Термін</p><p style={{ fontSize: 18, fontWeight: 900, color: "#ef4444" }}>НАЗАВЖДИ</p></div>
        ) : left ? (
          <div style={{ textAlign: "center" }}><p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 4 }}>Залишилось</p><p style={{ fontSize: 18, fontWeight: 900, color: "#f97316" }}>{left}</p></div>
        ) : (
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", textAlign: "center" }}>Бан вже закінчився — оновіть сторінку</p>
        )}
      </div>
      <p style={{ fontSize: 10, color: "rgba(255,255,255,0.15)", marginTop: 24, textAlign: "center" }}>Оскаржити бан можна звернувшись до адміністрації сервера</p>
    </div>
  );
};

const App = () => {
  const [registered, setRegistered] = useState<boolean | null>(null);
  const [banInfo, setBanInfo] = useState<{ reason: string; expiresAt: string | null; isPermanent: boolean } | null | undefined>(undefined);

  if (!isTelegramWebApp()) return <BrowserBlockScreen />;

  useEffect(() => {
    const checkBan = async () => {
      const tg = (window as Window & { Telegram?: { WebApp?: { initDataUnsafe?: { user?: { id: number } } } } }).Telegram;
      const tgId = String(tg?.WebApp?.initDataUnsafe?.user?.id || "");
      const nick = localStorage.getItem("crp_nick") || "";

      if (tgId || nick) {
        let q = supabase.from("bans").select("reason, expires_at, is_permanent").limit(1);
        if (tgId && nick) {
          q = q.or(`identifier.eq.${tgId},identifier.ilike.${nick}`) as any;
        } else if (tgId) {
          q = q.eq("identifier", tgId) as any;
        } else {
          q = q.ilike("identifier", nick) as any;
        }
        const { data: bans } = await q;

        if (bans && bans.length > 0) {
          const ban = bans[0] as { reason: string; expires_at: string | null; is_permanent: boolean };
          if (ban.is_permanent || !ban.expires_at || new Date(ban.expires_at) > new Date()) {
            setBanInfo({ reason: ban.reason, expiresAt: ban.expires_at, isPermanent: ban.is_permanent });
            return;
          }
        }
      }
      setBanInfo(null);
      const isReg = localStorage.getItem("crp_registered") === "1";
      const savedNickCheck = localStorage.getItem("crp_nick") || "";
      const hasPassword = !!localStorage.getItem("crp_password");
      setRegistered(isReg && !!savedNickCheck && hasPassword);
    };
    checkBan();
  }, []);

  if (banInfo) return <BanScreen reason={banInfo.reason} expiresAt={banInfo.expiresAt} isPermanent={banInfo.isPermanent} />;

  if (banInfo === undefined || registered === null) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#000" }}>
      <div style={{ width: 32, height: 32, border: "3px solid hsl(84,81%,44%)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
    </div>
  );

  const savedNick = localStorage.getItem("crp_nick") || "";

  if (!registered) {
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
                localStorage.removeItem("crp_password");
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
              <Route path="/top" element={<BalanceTop />} />
              <Route path="/vip" element={<Vip />} />
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
