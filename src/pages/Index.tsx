import {
  Newspaper, Vote, Megaphone, ScrollText,
  Shield, FileText, Home,
  Search, UserPlus, Car,
  AlertTriangle, X, Gamepad2, Copy, Check,
  Swords, Bug, UserX, HelpCircle,
  Landmark, Scale, ShieldAlert,
  Server, ChevronRight, ArrowLeft, KeyRound,
  Citrus, Leaf
} from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import PulseCity from "../components/PulseCity";
import GradientButton from "../components/GradientButton";
import { toast } from "sonner";
import { store } from "../lib/store";

const SERVERS = [
  {
    id: 1,
    label: "Сервер 1",
    code: "5319vick",
    url: "https://www.roblox.com/games/start?placeId=7711635737&launchData=joinCode%3D5319vick",
  },
  {
    id: 2,
    label: "Сервер 2",
    code: "daaarnte",
    url: "https://www.roblox.com/games/start?placeId=7711635737&launchData=joinCode=daaarnte",
  },
];

const BG_GIF = "https://s13.gifyu.com/images/b7rM8.gif";

const menuSections = [
  {
    labelIcon: Landmark,
    label: "Місто",
    items: [
      { icon: Newspaper,  label: "Новини",      desc: "Останні події",    path: "/news",            badgeKey: "news" },
      { icon: Vote,       label: "Вибори мера", desc: "Голосування",      path: "/mayor-election" },
      { icon: Megaphone,  label: "Голос міста", desc: "Скарги та ідеї",   path: "/city-voice",      badgeKey: "voice", clearKey: "crp_voice_seen" },
      { icon: ScrollText, label: "Правила",     desc: "Офіційні папери",  path: "/documents" },
    ],
  },
  {
    labelIcon: Scale,
    label: "Сервер",
    items: [
      { icon: Shield,   label: "Фракції",  desc: "Вступ та склад",   path: "/factions" },
      { icon: FileText, label: "Ліцензії", desc: "Зброя та дозволи", path: "/licenses" },
      { icon: Home,     label: "Будинки",  desc: "Нерухомість",      path: "/houses" },
    ],
  },
  {
    labelIcon: ShieldAlert,
    label: "Інше",
    items: [
      { icon: Search,   label: "Розшук",      desc: "Список розшуку",  path: "/wanted",           red: true },
      { icon: UserPlus, label: "В адмін",     desc: "Подати заявку",   path: "/admin-application" },
      { icon: Car,      label: "Номери авто", desc: "Реєстрація авто", path: "/car-registration" },
    ],
  },
] as const;

const sosTypes = [
  { id: "raid",    label: "РЕЙД",  icon: Swords,    activeBg: "rgba(251,146,60,0.15)", activeBorder: "rgba(251,146,60,0.4)", activeColor: "#fb923c" },
  { id: "cheater", label: "ЧИТЕР", icon: Bug,        activeBg: "rgba(248,113,113,0.15)", activeBorder: "rgba(248,113,113,0.4)", activeColor: "#f87171" },
  { id: "nrp",     label: "НРП",   icon: UserX,      activeBg: "rgba(250,204,21,0.15)", activeBorder: "rgba(250,204,21,0.4)", activeColor: "#facc15" },
  { id: "other",   label: "ІНШЕ",  icon: HelpCircle, activeBg: "rgba(255,255,255,0.08)", activeBorder: "rgba(255,255,255,0.2)", activeColor: "#e2e8f0" },
] as const;

const OnlineDot = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
    <span style={{ position: "relative", display: "inline-flex", width: 7, height: 7, flexShrink: 0 }}>
      <span style={{
        position: "absolute", inset: 0, borderRadius: "50%",
        background: "#4ade80", opacity: 0.7,
        animation: "ping 1.2s cubic-bezier(0,0,0.2,1) infinite",
      }} />
      <span style={{ position: "relative", borderRadius: "50%", background: "#4ade80", width: "100%", height: "100%", display: "block" }} />
    </span>
    <span style={{ fontSize: 10, fontWeight: 600, color: "#4ade80", letterSpacing: "0.04em" }}>Онлайн</span>
  </div>
);

// Секция-лейбл с летней цветовой полоской
const SectionLabel = ({ icon: Icon, label, accent }: { icon: React.ElementType; label: string; accent: string }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, padding: "0 2px" }}>
    <div style={{
      width: 24, height: 24, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
      background: `${accent}18`, border: `1px solid ${accent}30`,
    }}>
      <Icon style={{ width: 12, height: 12, color: accent }} />
    </div>
    <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.45)", letterSpacing: "0.16em", textTransform: "uppercase" }}>
      {label}
    </span>
    <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${accent}30, transparent)` }} />
  </div>
);

// Preload gif
if (typeof window !== "undefined") {
  const img = new Image();
  img.src = BG_GIF;
}

const GLOBAL_CSS = `
  @keyframes ping {
    75%, 100% { transform: scale(2); opacity: 0; }
  }
  @keyframes slideUp {
    from { transform: translateY(100%); opacity: 0; }
    to   { transform: translateY(0);   opacity: 1; }
  }
  @keyframes slideDown {
    from { transform: translateY(0);   opacity: 1; }
    to   { transform: translateY(100%); opacity: 0; }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes fadeOut {
    from { opacity: 1; }
    to   { opacity: 0; }
  }
  @keyframes scaleIn {
    from { transform: scale(0.92); opacity: 0; }
    to   { transform: scale(1);    opacity: 1; }
  }
  @keyframes floatLeaf {
    0%,100% { transform: translateY(0) rotate(0deg); }
    50%     { transform: translateY(-6px) rotate(8deg); }
  }
  .modal-slide-up   { animation: slideUp  0.32s cubic-bezier(0.32,0.72,0,1) forwards; }
  .modal-slide-down { animation: slideDown 0.28s cubic-bezier(0.4,0,1,1) forwards; }
  .modal-fade-in    { animation: fadeIn  0.22s ease forwards; }
  .modal-fade-out   { animation: fadeOut 0.22s ease forwards; }
  .view-enter       { animation: fadeIn  0.18s ease forwards; }
  .menu-card {
    position: relative;
    overflow: hidden;
    border-radius: 18px;
    padding: 14px 12px 12px;
    display: flex;
    flex-direction: column;
    gap: 9px;
    transition: transform 0.18s ease, box-shadow 0.18s ease;
    cursor: pointer;
    text-align: left;
    width: 100%;
    background: linear-gradient(145deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.03) 100%);
    backdrop-filter: blur(20px) saturate(1.8);
    -webkit-backdrop-filter: blur(20px) saturate(1.8);
    border: 1px solid rgba(255,255,255,0.14);
    box-shadow: 0 4px 20px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.14);
  }
  .menu-card:hover {
    transform: scale(1.04) translateY(-1px);
  }
  .menu-card:active {
    transform: scale(0.96);
  }
  .menu-card-sm {
    padding: 11px 9px 9px;
    gap: 7px;
    border-radius: 16px;
  }
  /* glossy top highlight */
  .menu-card::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: linear-gradient(180deg, rgba(255,255,255,0.11) 0%, transparent 45%);
    pointer-events: none;
  }
`;

// Летний акцент по секции
const SECTION_ACCENTS = ["#34d399", "#fb923c", "#f472b6"];

const Index = () => {
  const navigate = useNavigate();
  const [showSos, setShowSos]         = useState(false);
  const [sosType, setSosType]         = useState<"raid"|"cheater"|"nrp"|"other">("raid");
  const [sosDesc, setSosDesc]         = useState("");
  const [sosNick, setSosNick]         = useState("");
  const [sosViolator, setSosViolator] = useState("");
  const [sosSending, setSosSending]   = useState(false);
  const [badges, setBadges]           = useState<Record<string, boolean>>({});

  const [showServers, setShowServers]       = useState(false);
  const [serversClosing, setServersClosing] = useState(false);
  const [activeServer, setActiveServer]     = useState<typeof SERVERS[0] | null>(null);
  const [serverView, setServerView]         = useState<"list"|"detail">("list");
  const [copiedCode, setCopiedCode]         = useState(false);

  const closeServers = () => {
    setServersClosing(true);
    setTimeout(() => { setShowServers(false); setServersClosing(false); setActiveServer(null); setServerView("list"); }, 280);
  };

  const openServerDetail = (srv: typeof SERVERS[0]) => { setActiveServer(srv); setServerView("detail"); };
  const backToList = () => { setServerView("list"); setTimeout(() => setActiveServer(null), 180); };

  const checkBadges = async () => {
    const { supabase } = await import("../lib/store");
    const nick = localStorage.getItem("crp_nick") || "";
    const next: Record<string, boolean> = {};
    const [newsRes, voiceRes] = await Promise.all([
      supabase.from("news").select("created_at").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("city_voice").select("created_at").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    const lastNews  = parseInt(localStorage.getItem("crp_news_seen")  || "0");
    const lastVoice = parseInt(localStorage.getItem("crp_voice_seen") || "0");
    if (newsRes.data?.created_at)  next["news"]  = new Date(newsRes.data.created_at).getTime()  > lastNews;
    if (voiceRes.data?.created_at) next["voice"] = new Date(voiceRes.data.created_at).getTime() > lastVoice;
    if (nick) {
      const { count } = await supabase
        .from("notifications").select("id", { count: "exact", head: true })
        .ilike("username", nick).eq("read", false);
      next["notifs"] = (count || 0) > 0;
    }
    setBadges(next);
  };

  useEffect(() => {
    checkBadges();
    const id = setInterval(checkBadges, 30_000);
    return () => clearInterval(id);
  }, []);

  const handleSos = async () => {
    if (!sosDesc.trim()) return toast.error("Опишіть ситуацію");
    setSosSending(true);
    const reporter = sosNick || localStorage.getItem("crp_nick") || "Гравець";
    const ok = await store.addSosFull(reporter, sosViolator.trim(), sosType, sosDesc, sosType);
    setSosSending(false);
    if (!ok) { toast.error("Помилка відправки. Перевір чи ти увійшов у систему"); return; }
    setShowSos(false);
    setSosDesc(""); setSosNick(""); setSosViolator("");
    toast.success("Виклик відправлено адміністрації!");
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    toast.success("Код скопійовано!");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 96, paddingLeft: 16, paddingRight: 16, paddingTop: 16, position: "relative" }}>
      <style>{GLOBAL_CSS}</style>

      {/* ── Background: gif без мигания ── */}
      {/* Слой 1: статичный цвет (рендерится сразу, нет чёрного мигания) */}
      <div aria-hidden style={{
        position: "fixed", inset: 0, zIndex: 0,
        background: "#0c1a0e", // тёмно-зелёный — цвет похожий на гиф, нет чёрного мигания
      }} />
      {/* Слой 2: гиф поверх — появляется плавно */}
      <div aria-hidden style={{
        position: "fixed", inset: 0, zIndex: 1,
        backgroundImage: `url('${BG_GIF}')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        willChange: "transform",
        transform: "translateZ(0)",
        animation: "fadeIn 0.6s ease forwards",
      }} />
      {/* Слой 3: летний тёплый оверлей вместо чистого чёрного */}
      <div aria-hidden style={{
        position: "fixed", inset: 0, zIndex: 2,
        background: "linear-gradient(180deg, rgba(5,12,5,0.72) 0%, rgba(8,18,8,0.55) 50%, rgba(5,10,5,0.75) 100%)",
      }} />

      <div style={{ position: "relative", zIndex: 3 }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <Leaf style={{ width: 14, height: 14, color: "#4ade80", animation: "floatLeaf 3s ease-in-out infinite" }} />
              <h1 style={{
                fontFamily: "'DM Mono', 'Fira Mono', monospace",
                fontSize: 20,
                fontWeight: 800,
                letterSpacing: "0.12em",
                background: "linear-gradient(135deg, #86efac 0%, #34d399 40%, #fbbf24 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                margin: 0,
              }}>
                CHERNIHIV RP
              </h1>
            </div>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", marginTop: 3, letterSpacing: "0.2em", fontWeight: 600 }}>
              ПОРТАЛ ГРАВЦЯ
            </p>
          </div>

          {/* SOS button */}
          <button
            onClick={() => setShowSos(true)}
            style={{
              position: "relative", width: 46, height: 46, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(239,68,68,0.1)",
              boxShadow: "0 0 20px rgba(239,68,68,0.25)",
              border: "1px solid rgba(239,68,68,0.25)",
              cursor: "pointer", transition: "transform 0.18s ease",
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.12)")}
            onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
          >
            <AlertTriangle style={{ width: 18, height: 18, color: "#f87171" }} />
            <span style={{
              position: "absolute", top: -2, right: -2, width: 10, height: 10, borderRadius: "50%",
              background: "#ef4444", animation: "ping 1.2s cubic-bezier(0,0,0.2,1) infinite",
              opacity: 0.75,
            }} />
            <span style={{
              position: "absolute", top: -2, right: -2, width: 10, height: 10, borderRadius: "50%",
              background: "#ef4444",
            }} />
          </button>
        </div>

        {/* ── Servers button ── */}
        <div style={{ marginBottom: 18 }}>
          <button
            onClick={() => { setShowServers(true); setActiveServer(null); setServerView("list"); }}
            style={{
              position: "relative", overflow: "hidden", width: "100%",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 18px", borderRadius: 20,
              background: "linear-gradient(135deg, rgba(52,211,153,0.12) 0%, rgba(251,191,36,0.07) 100%)",
              border: "1px solid rgba(52,211,153,0.28)",
              boxShadow: "0 0 28px rgba(52,211,153,0.12), inset 0 1px 0 rgba(255,255,255,0.1)",
              cursor: "pointer", transition: "transform 0.18s ease, box-shadow 0.18s ease",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.02)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 36px rgba(52,211,153,0.22), inset 0 1px 0 rgba(255,255,255,0.12)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 28px rgba(52,211,153,0.12), inset 0 1px 0 rgba(255,255,255,0.1)";
            }}
          >
            {/* shine */}
            <span style={{
              position: "absolute", inset: 0, borderRadius: 20, pointerEvents: "none",
              background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.05) 50%, transparent 70%)",
            }} />
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 12,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(52,211,153,0.12)",
                border: "1px solid rgba(52,211,153,0.28)",
              }}>
                <Server style={{ width: 18, height: 18, color: "#34d399" }} />
              </div>
              <div style={{ textAlign: "left" }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#34d399", margin: 0, letterSpacing: "0.06em" }}>СЕРВЕРИ</p>
                <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", margin: "2px 0 0", fontWeight: 500 }}>
                  Обери сервер та підключись
                </p>
              </div>
            </div>
            <ChevronRight style={{ width: 18, height: 18, color: "rgba(52,211,153,0.6)" }} />
          </button>
        </div>

        {/* ── PulseCity ── */}
        <div style={{ marginBottom: 22 }}>
          <PulseCity />
        </div>

        {/* ── SOS Modal ── */}
        {showSos && (
          <div className="modal-fade-in" style={{
            position: "fixed", inset: 0, zIndex: 50,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "0 16px",
          }} onClick={() => setShowSos(false)}>
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(12px)" }} />
            <div
              onClick={e => e.stopPropagation()}
              style={{
                position: "relative", width: "100%", maxWidth: 360,
                borderRadius: 24, padding: 20,
                background: "linear-gradient(145deg, rgba(30,10,10,0.95), rgba(20,5,5,0.98))",
                border: "1px solid rgba(239,68,68,0.2)",
                boxShadow: "0 0 60px rgba(239,68,68,0.12)",
                animation: "scaleIn 0.26s cubic-bezier(0.32,0.72,0,1) forwards",
              }}
            >
              <button onClick={() => setShowSos(false)} style={{
                position: "absolute", top: 12, right: 12, background: "none", border: "none",
                color: "rgba(255,255,255,0.4)", cursor: "pointer", padding: 4,
              }}>
                <X style={{ width: 18, height: 18 }} />
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 10,
                  background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <AlertTriangle style={{ width: 16, height: 16, color: "#f87171" }} />
                </div>
                <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#f87171", letterSpacing: "0.06em" }}>
                  Виклик Адміністрації
                </h3>
              </div>

              {[
                { label: "Ваш нік", value: sosNick || localStorage.getItem("crp_nick") || "", setter: setSosNick, placeholder: "Нік в грі" },
                { label: "Нік порушника (необов'язково)", value: sosViolator, setter: setSosViolator, placeholder: "Нік того, хто порушує" },
              ].map(f => (
                <div key={f.label} style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6, letterSpacing: "0.08em" }}>
                    {f.label}
                  </label>
                  <input
                    value={f.value}
                    onChange={e => f.setter(e.target.value)}
                    placeholder={f.placeholder}
                    style={{
                      width: "100%", padding: "10px 14px", borderRadius: 12, fontSize: 13,
                      background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                      color: "#fff", outline: "none", boxSizing: "border-box",
                    }}
                  />
                </div>
              ))}

              <label style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 8, letterSpacing: "0.08em" }}>
                Тип порушення
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                {sosTypes.map(t => {
                  const Icon = t.icon;
                  const active = sosType === t.id;
                  return (
                    <button key={t.id} onClick={() => setSosType(t.id)} style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "10px 12px", borderRadius: 12, fontSize: 11, fontWeight: 600,
                      background: active ? t.activeBg : "rgba(255,255,255,0.04)",
                      border: `1px solid ${active ? t.activeBorder : "rgba(255,255,255,0.08)"}`,
                      color: active ? t.activeColor : "rgba(255,255,255,0.45)",
                      cursor: "pointer", transition: "all 0.15s ease",
                    }}>
                      <Icon style={{ width: 14, height: 14 }} /> {t.label}
                    </button>
                  );
                })}
              </div>

              <label style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6, letterSpacing: "0.08em" }}>
                Опис ситуації
              </label>
              <textarea
                value={sosDesc}
                onChange={e => setSosDesc(e.target.value)}
                placeholder="Детально опишіть що сталося..."
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 12, fontSize: 13,
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                  color: "#fff", outline: "none", resize: "none", height: 80,
                  boxSizing: "border-box", marginBottom: 14,
                }}
              />
              <GradientButton variant="danger" className="w-full" onClick={handleSos} disabled={sosSending}>
                <AlertTriangle style={{ width: 15, height: 15, display: "inline", marginRight: 6 }} />
                {sosSending ? "Викликаю..." : "Викликати Адміністрацію"}
              </GradientButton>
            </div>
          </div>
        )}

        {/* ── Servers bottom-sheet ── */}
        {showServers && (
          <div
            className={serversClosing ? "modal-fade-out" : "modal-fade-in"}
            style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}
            onClick={closeServers}
          >
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(12px)" }} />
            <div
              className={serversClosing ? "modal-slide-down" : "modal-slide-up"}
              style={{ position: "relative", marginBottom: 64 }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{
                borderRadius: "24px 24px 0 0",
                background: "linear-gradient(160deg, #111a11, #0a0f0a)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderBottom: "none",
                boxShadow: "0 -8px 40px rgba(0,0,0,0.6)",
                padding: 20,
              }}>
                <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)", margin: "0 auto 20px" }} />

                {serverView === "list" && (
                  <div className="view-enter">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
                          background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)",
                        }}>
                          <Server style={{ width: 15, height: 15, color: "#34d399" }} />
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#34d399", letterSpacing: "0.08em" }}>СЕРВЕРИ</p>
                          <p style={{ margin: "2px 0 0", fontSize: 10, color: "rgba(255,255,255,0.3)" }}>Оберіть сервер для входу</p>
                        </div>
                      </div>
                      <button onClick={closeServers} style={{
                        width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                        background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer",
                      }}>
                        <X style={{ width: 13, height: 13, color: "rgba(255,255,255,0.5)" }} />
                      </button>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {SERVERS.map(srv => (
                        <button key={srv.id} onClick={() => openServerDetail(srv)} style={{
                          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "14px 16px", borderRadius: 18, cursor: "pointer",
                          background: "linear-gradient(135deg, rgba(255,255,255,0.07), rgba(255,255,255,0.03))",
                          border: "1px solid rgba(255,255,255,0.12)",
                          boxShadow: "0 2px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)",
                          transition: "transform 0.15s ease",
                        }}
                          onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.02)")}
                          onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{
                              width: 42, height: 42, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
                              background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.22)",
                            }}>
                              <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 800, fontSize: 15, color: "#34d399" }}>
                                {srv.id}
                              </span>
                            </div>
                            <div style={{ textAlign: "left" }}>
                              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#f0f0f0" }}>{srv.label}</p>
                              <div style={{ marginTop: 4 }}><OnlineDot /></div>
                            </div>
                          </div>
                          <ChevronRight style={{ width: 16, height: 16, color: "rgba(255,255,255,0.25)" }} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {serverView === "detail" && activeServer && (
                  <div className="view-enter">
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                      <button onClick={backToList} style={{
                        width: 32, height: 32, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
                        background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer",
                      }}>
                        <ArrowLeft style={{ width: 15, height: 15, color: "rgba(255,255,255,0.5)" }} />
                      </button>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
                          background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)",
                        }}>
                          <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 800, fontSize: 13, color: "#34d399" }}>
                            {activeServer.id}
                          </span>
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#34d399", letterSpacing: "0.06em" }}>
                            {activeServer.label.toUpperCase()}
                          </p>
                          <div style={{ marginTop: 3 }}><OnlineDot /></div>
                        </div>
                      </div>
                    </div>

                    {/* Code block */}
                    <div style={{
                      padding: "12px 16px", borderRadius: 16, marginBottom: 14,
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.16)",
                    }}>
                      <div>
                        <p style={{ margin: 0, fontSize: 9, color: "rgba(255,255,255,0.35)", letterSpacing: "0.14em" }}>КОД СЕРВЕРУ</p>
                        <p style={{ margin: "4px 0 0", fontFamily: "'DM Mono', monospace", fontWeight: 800, fontSize: 18, color: "#34d399", letterSpacing: "0.06em" }}>
                          {activeServer.code}
                        </p>
                      </div>
                      <KeyRound style={{ width: 18, height: 18, color: "rgba(52,211,153,0.3)" }} />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <a href={activeServer.url} target="_blank" rel="noopener noreferrer" style={{
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                        padding: "13px 20px", borderRadius: 16, fontWeight: 700, fontSize: 13, color: "#000",
                        background: "linear-gradient(135deg, #34d399, #10b981)",
                        boxShadow: "0 0 24px rgba(52,211,153,0.35), inset 0 1px 0 rgba(255,255,255,0.25)",
                        textDecoration: "none", transition: "transform 0.15s ease",
                      }}
                        onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.03)")}
                        onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
                      >
                        <Gamepad2 style={{ width: 17, height: 17 }} /> ГРАТИ
                      </a>
                      <button onClick={() => copyCode(activeServer.code)} style={{
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                        padding: "12px 20px", borderRadius: 16, fontWeight: 600, fontSize: 13,
                        background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.22)",
                        color: "#34d399", cursor: "pointer", transition: "transform 0.15s ease",
                      }}
                        onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.02)")}
                        onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
                      >
                        {copiedCode ? <><Check style={{ width: 15, height: 15 }} /> СКОПІЙОВАНО!</> : <><Copy style={{ width: 15, height: 15 }} /> КОД СЕРВЕРУ</>}
                      </button>
                      <button onClick={backToList} style={{
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                        padding: "11px 20px", borderRadius: 16, fontWeight: 600, fontSize: 13,
                        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                        color: "rgba(255,255,255,0.4)", cursor: "pointer",
                      }}>
                        <ArrowLeft style={{ width: 14, height: 14 }} /> НАЗАД
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Menu sections ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {menuSections.map((section, si) => {
            const accent = SECTION_ACCENTS[si];
            return (
              <div key={section.label}>
                <SectionLabel icon={section.labelIcon} label={section.label} accent={accent} />
                <div style={{
                  display: "grid",
                  gridTemplateColumns: section.items.length === 3 ? "repeat(3, 1fr)" : "repeat(2, 1fr)",
                  gap: 9,
                }}>
                  {section.items.map((item, i) => {
                    const it = item as { icon: React.ElementType; label: string; desc: string; path: string; red?: boolean; badgeKey?: string; clearKey?: string };
                    const hasBadge = it.badgeKey ? badges[it.badgeKey] : false;
                    const isThreeCol = section.items.length === 3;
                    const iconColor = it.red ? "#f87171" : accent;

                    return (
                      <button
                        key={it.label}
                        className={`menu-card ${isThreeCol ? "menu-card-sm" : ""}`}
                        onClick={() => {
                          if (it.badgeKey === "news") localStorage.setItem("crp_news_seen", String(Date.now()));
                          if (it.clearKey) localStorage.setItem(it.clearKey, String(Date.now()));
                          if (hasBadge) setBadges(prev => ({ ...prev, [it.badgeKey!]: false }));
                          navigate(it.path);
                        }}
                        onMouseEnter={e => {
                          const el = e.currentTarget;
                          el.style.boxShadow = `0 8px 28px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.18), 0 0 0 1px ${iconColor}30`;
                          el.style.borderColor = `${iconColor}30`;
                        }}
                        onMouseLeave={e => {
                          const el = e.currentTarget;
                          el.style.boxShadow = "0 4px 20px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.14)";
                          el.style.borderColor = "rgba(255,255,255,0.14)";
                        }}
                      >
                        {/* icon */}
                        <div style={{
                          position: "relative",
                          width: isThreeCol ? 32 : 38, height: isThreeCol ? 32 : 38,
                          borderRadius: isThreeCol ? 10 : 12,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          background: `${iconColor}14`,
                          border: `1px solid ${iconColor}22`,
                          flexShrink: 0,
                        }}>
                          <it.icon style={{ width: isThreeCol ? 15 : 18, height: isThreeCol ? 15 : 18, color: iconColor }} />
                          {hasBadge && (
                            <span style={{
                              position: "absolute", top: -3, right: -3, width: 9, height: 9, borderRadius: "50%",
                              background: accent, boxShadow: `0 0 8px ${accent}`,
                            }} />
                          )}
                        </div>

                        {/* text */}
                        <div>
                          <p style={{
                            margin: 0, fontWeight: 700,
                            fontSize: isThreeCol ? 11 : 13,
                            color: it.red ? "#f87171" : "#f0f0f0",
                            lineHeight: 1.2,
                          }}>
                            {it.label}
                          </p>
                          <p style={{
                            margin: "3px 0 0",
                            fontSize: isThreeCol ? 9 : 10,
                            color: "rgba(255,255,255,0.3)",
                            lineHeight: 1.3,
                          }}>
                            {it.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Index;
