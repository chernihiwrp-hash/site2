import {
  Newspaper, Vote, Megaphone, ScrollText,
  Shield, FileText, Home,
  Search, UserPlus, Car,
  AlertTriangle, X, Gamepad2, Copy, Check,
  Swords, Bug, UserX, HelpCircle,
  Landmark, Scale, ShieldAlert,
  Server, ChevronRight, ArrowLeft, KeyRound
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
  { id: "raid",    label: "РЕЙД",  icon: Swords,    activeBg: "bg-orange-400/15 border-orange-400/40 text-orange-400" },
  { id: "cheater", label: "ЧИТЕР", icon: Bug,        activeBg: "bg-red-400/15 border-red-400/40 text-red-400" },
  { id: "nrp",     label: "НРП",   icon: UserX,      activeBg: "bg-yellow-400/15 border-yellow-400/40 text-yellow-400" },
  { id: "other",   label: "ІНШЕ",  icon: HelpCircle, activeBg: "bg-muted/20 border-muted/40 text-foreground" },
] as const;

// Пульсуючий зелений індикатор — виноситься в компонент щоб не дублювати
const OnlineDot = () => (
  <div className="flex items-center gap-1.5">
    <span className="relative flex h-2 w-2 flex-shrink-0">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "#22c55e" }} />
      <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "#22c55e" }} />
    </span>
    <span className="text-[10px] font-medium" style={{ color: "#22c55e" }}>Онлайн</span>
  </div>
);

const SectionLabel = ({ icon: Icon, label }: { icon: React.ElementType; label: string }) => (
  <div className="flex items-center gap-2 mb-2 px-1">
    <Icon className="w-3.5 h-3.5 text-muted-foreground" />
    <span className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">{label}</span>
    <div className="flex-1 h-px" style={{ background: "hsl(0 0% 100% / 0.06)" }} />
  </div>
);

if (typeof window !== "undefined") {
  const img = new Image();
  img.src = BG_GIF;
}

// Глобальні стилі для keyframes — вставляються один раз
const MODAL_STYLES = `
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
    from { transform: scale(0.94); opacity: 0; }
    to   { transform: scale(1);    opacity: 1; }
  }
  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
  .modal-slide-up   { animation: slideUp  0.32s cubic-bezier(0.32, 0.72, 0, 1) forwards; }
  .modal-slide-down { animation: slideDown 0.28s cubic-bezier(0.4, 0, 1, 1) forwards; }
  .modal-fade-in    { animation: fadeIn   0.22s ease forwards; }
  .modal-fade-out   { animation: fadeOut  0.22s ease forwards; }
  .view-enter       { animation: fadeIn   0.18s ease forwards; }
  .btn-shine:hover::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.12) 50%, transparent 60%);
    background-size: 200% auto;
    animation: shimmer 0.6s ease;
  }
`;

const Index = () => {
  const navigate = useNavigate();
  const [showSos, setShowSos]           = useState(false);
  const [sosType, setSosType]           = useState<"raid"|"cheater"|"nrp"|"other">("raid");
  const [sosDesc, setSosDesc]           = useState("");
  const [sosNick, setSosNick]           = useState("");
  const [sosViolator, setSosViolator]   = useState("");
  const [sosSending, setSosSending]     = useState(false);
  const [badges, setBadges]             = useState<Record<string, boolean>>({});

  // Servers modal
  const [showServers, setShowServers]   = useState(false);
  const [serversClosing, setServersClosing] = useState(false);
  const [activeServer, setActiveServer] = useState<typeof SERVERS[0] | null>(null);
  const [serverView, setServerView]     = useState<"list"|"detail">("list");
  const [copiedCode, setCopiedCode]     = useState(false);

  const closeServers = () => {
    setServersClosing(true);
    setTimeout(() => { setShowServers(false); setServersClosing(false); setActiveServer(null); setServerView("list"); }, 280);
  };

  const openServerDetail = (srv: typeof SERVERS[0]) => {
    setActiveServer(srv);
    setServerView("detail");
  };

  const backToList = () => {
    setServerView("list");
    setTimeout(() => setActiveServer(null), 180);
  };

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

  const stickerIcons = [
    "https://i.ibb.co/fdy3KvFs/58aa76f3835e515a59e0a752.png",
    "https://i.ibb.co/7J3HdZQK/free-icon-life-preserver-4974652.png",
    "https://i.ibb.co/VcLVx9b9/pngtree-glasses-summer-black-white-transparent-png-image-9047495.png",
  ];
  const stickerMap = useMemo(() => {
    const labels = menuSections.flatMap(s => s.items.map(i => i.label));
    const shuffled = [...labels].sort(() => Math.random() - 0.5).slice(0, 3);
    const map: Record<string, string> = {};
    shuffled.forEach((l, idx) => { map[l] = stickerIcons[idx]; });
    return map;
  }, []);

  return (
    <div className="min-h-screen pb-24 px-4 pt-4 relative">
      {/* inject keyframes once */}
      <style>{MODAL_STYLES}</style>

      <div aria-hidden className="fixed inset-0 pointer-events-none" style={{ zIndex: 0, backgroundColor: "#0a0a0a" }} />
      <div aria-hidden className="fixed inset-0 pointer-events-none" style={{ zIndex: 0, backgroundImage: `url('${BG_GIF}')`, backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat", transform: "translate3d(0,0,0)", backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" as any }} />
      <div aria-hidden className="fixed inset-0 pointer-events-none" style={{ zIndex: 0, background: "rgba(0,0,0,0.65)" }} />

      <div className="relative" style={{ zIndex: 1 }}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-display text-xl font-bold tracking-wider neon-text-lime">CHERNIHIV RP</h1>
            <p className="text-xs text-muted-foreground mt-0.5">ПОРТАЛ ГРАВЦЯ</p>
          </div>
          <button
            onClick={() => setShowSos(true)}
            className="relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-90"
            style={{ background: "hsl(0 70% 50% / 0.12)", boxShadow: "0 0 16px hsl(0 70% 50% / 0.25)", border: "1px solid hsl(0 70% 50% / 0.25)" }}
          >
            <AlertTriangle className="w-5 h-5 text-destructive animate-pulse" />
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-destructive animate-ping" />
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-destructive" />
          </button>
        </div>

        {/* ── Servers button ── */}
        <div className="mb-5">
          <button
            onClick={() => { setShowServers(true); setActiveServer(null); setServerView("list"); }}
            className="relative overflow-hidden w-full flex items-center justify-between px-5 py-4 rounded-2xl font-bold text-sm text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.97] group"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary) / 0.18), hsl(var(--secondary) / 0.12))",
              border: "1px solid hsl(var(--primary) / 0.35)",
              boxShadow: "0 0 24px hsl(var(--primary) / 0.2), inset 0 1px 0 hsl(0 0% 100% / 0.12)",
            }}
          >
            {/* shine on hover */}
            <span className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"
              style={{ background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.07) 50%, transparent 70%)" }} />
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
                style={{ background: "hsl(var(--primary) / 0.15)", border: "1px solid hsl(var(--primary) / 0.3)" }}>
                <Server className="w-5 h-5" style={{ color: "hsl(var(--primary))" }} />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold" style={{ color: "hsl(var(--primary))" }}>СЕРВЕРИ</p>
                <p className="text-[10px] text-muted-foreground font-normal">Обери сервер та підключись</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" style={{ color: "hsl(var(--primary) / 0.7)" }} />
          </button>
        </div>

        {/* ── SOS Modal ── */}
        {showSos && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0 modal-fade-in" onClick={() => setShowSos(false)}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <div
              className="relative w-full max-w-sm rounded-2xl p-5 liquid-glass-strong overflow-y-auto"
              onClick={e => e.stopPropagation()}
              style={{
                border: "1px solid hsl(0 70% 50% / 0.25)",
                boxShadow: "0 0 40px hsl(0 70% 50% / 0.15)",
                animation: "scaleIn 0.28s cubic-bezier(0.32, 0.72, 0, 1) forwards",
                transformOrigin: "bottom center",
                maxHeight: "90vh",
              }}
            >
              <button onClick={() => setShowSos(false)} className="absolute top-3 right-3 text-muted-foreground transition-all duration-150 hover:scale-110 hover:text-foreground active:scale-90">
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-destructive/15 border border-destructive/25 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                </div>
                <h3 className="font-display text-sm font-bold text-destructive">Виклик Адміністрації</h3>
              </div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Ваш нік</label>
              <input
                value={sosNick || localStorage.getItem("crp_nick") || ""}
                onChange={e => setSosNick(e.target.value)}
                placeholder="Нік в грі"
                className="w-full liquid-glass rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-destructive/30 bg-transparent mb-3 transition-all duration-150"
              />
              <label className="text-xs text-muted-foreground mb-1.5 block">
                Нік порушника <span className="opacity-50">(необов'язково)</span>
              </label>
              <input
                value={sosViolator}
                onChange={e => setSosViolator(e.target.value)}
                placeholder="Нік того, хто порушує"
                className="w-full liquid-glass rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-destructive/30 bg-transparent mb-3 transition-all duration-150"
              />
              <label className="text-xs text-muted-foreground mb-1.5 block">Тип порушення</label>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {sosTypes.map(t => {
                  const Icon = t.icon;
                  return (
                    <button key={t.id} onClick={() => setSosType(t.id)}
                      className={`flex items-center gap-2 text-xs px-3 py-2.5 rounded-xl border transition-all duration-150 active:scale-95 hover:scale-[1.03] ${sosType === t.id ? t.activeBg : "liquid-glass text-muted-foreground"}`}>
                      <Icon className="w-4 h-4" /> {t.label}
                    </button>
                  );
                })}
              </div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Опис ситуації</label>
              <textarea
                value={sosDesc}
                onChange={e => setSosDesc(e.target.value)}
                placeholder="Детально опишіть що сталося..."
                className="w-full liquid-glass rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none resize-none h-20 bg-transparent mb-4 transition-all duration-150"
              />
              <GradientButton variant="danger" className="w-full transition-transform duration-150 active:scale-[0.98]" onClick={handleSos} disabled={sosSending}>
                <AlertTriangle className="w-4 h-4 inline mr-1.5" />
                {sosSending ? "Викликаю..." : "Викликати Адміністрацію"}
              </GradientButton>
            </div>
          </div>
        )}

        <div className="mb-5 animate-fade-in"><PulseCity /></div>

        {/* ── Servers bottom-sheet modal ── */}
        {showServers && (
          <div
            className={serversClosing ? "modal-fade-out" : "modal-fade-in"}
            style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}
            onClick={closeServers}
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
            <div
              className={serversClosing ? "modal-slide-down" : "modal-slide-up"}
              style={{ position: "relative", marginBottom: "64px" }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{
                borderRadius: "24px 24px 0 0",
                background: "linear-gradient(160deg, #141414, #0a0a0a)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderBottom: "none",
                boxShadow: "0 -8px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)",
                padding: "20px",
                overflow: "hidden",
              }}>
                {/* Handle */}
                <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: "rgba(255,255,255,0.15)" }} />

                {/* ── Server LIST ── */}
                {serverView === "list" && (
                  <div className="view-enter">
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                          style={{ background: "hsl(var(--primary) / 0.12)", border: "1px solid hsl(var(--primary) / 0.25)" }}>
                          <Server className="w-4 h-4" style={{ color: "hsl(var(--primary))" }} />
                        </div>
                        <div>
                          <h3 className="font-display text-sm font-bold" style={{ color: "hsl(var(--primary))" }}>СЕРВЕРИ</h3>
                          <p className="text-[10px] text-muted-foreground">Оберіть сервер для входу</p>
                        </div>
                      </div>
                      <button
                        onClick={closeServers}
                        className="w-7 h-7 rounded-full flex items-center justify-center liquid-glass transition-all duration-150 hover:scale-110 active:scale-90"
                      >
                        <X className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      {SERVERS.map((srv, idx) => (
                        <button
                          key={srv.id}
                          onClick={() => openServerDetail(srv)}
                          className="group w-full flex items-center justify-between px-4 py-4 rounded-2xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.97]"
                          style={{
                            background: "linear-gradient(135deg, #2a2a2a, #1f1f1f)",
                            border: "1px solid rgba(255,255,255,0.18)",
                            boxShadow: "0 2px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)",
                            animationDelay: `${idx * 60}ms`,
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
                              style={{ background: "hsl(var(--primary) / 0.15)", border: "1px solid hsl(var(--primary) / 0.3)" }}
                            >
                              <span className="font-display font-black text-base" style={{ color: "hsl(var(--primary))" }}>{srv.id}</span>
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-bold" style={{ color: "#f0f0f0" }}>{srv.label}</p>
                              <div className="mt-1"><OnlineDot /></div>
                            </div>
                          </div>
                          <ChevronRight
                            className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1"
                            style={{ color: "rgba(255,255,255,0.3)" }}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Server DETAIL ── */}
                {serverView === "detail" && activeServer && (
                  <div className="view-enter">
                    <div className="flex items-center gap-3 mb-5">
                      <button
                        onClick={backToList}
                        className="w-8 h-8 rounded-xl flex items-center justify-center liquid-glass transition-all duration-150 hover:scale-110 active:scale-90"
                      >
                        <ArrowLeft className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                          style={{ background: "hsl(var(--primary) / 0.12)", border: "1px solid hsl(var(--primary) / 0.25)" }}>
                          <span className="font-display font-black text-sm" style={{ color: "hsl(var(--primary))" }}>{activeServer.id}</span>
                        </div>
                        <div>
                          <h3 className="font-display text-sm font-bold" style={{ color: "hsl(var(--primary))" }}>
                            {activeServer.label.toUpperCase()}
                          </h3>
                          <div className="mt-0.5"><OnlineDot /></div>
                        </div>
                      </div>
                    </div>

                    {/* Code block */}
                    <div
                      className="rounded-2xl px-4 py-3.5 mb-4 flex items-center justify-between transition-all duration-200 hover:brightness-110"
                      style={{ background: "hsl(var(--primary) / 0.06)", border: "1px solid hsl(var(--primary) / 0.18)" }}
                    >
                      <div>
                        <p className="text-[9px] text-muted-foreground mb-0.5">КОД СЕРВЕРУ</p>
                        <p className="text-base font-mono font-black" style={{ color: "hsl(var(--primary))", letterSpacing: "0.05em" }}>
                          {activeServer.code}
                        </p>
                      </div>
                      <KeyRound className="w-5 h-5 opacity-30" style={{ color: "hsl(var(--primary))" }} />
                    </div>

                    <div className="space-y-2.5">
                      {/* ГРАТИ */}
                      <a
                        href={activeServer.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative overflow-hidden group w-full flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-2xl font-bold text-sm text-white transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]"
                        style={{
                          background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))",
                          boxShadow: "0 0 24px hsl(var(--primary) / 0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
                        }}
                      >
                        <span className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                          style={{ background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.15) 50%, transparent 70%)" }} />
                        <Gamepad2 className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
                        ГРАТИ
                      </a>

                      {/* КОД СЕРВЕРУ */}
                      <button
                        onClick={() => copyCode(activeServer.code)}
                        className="relative overflow-hidden group w-full flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-2xl font-bold text-sm transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]"
                        style={{
                          background: "hsl(var(--primary) / 0.1)",
                          border: "1px solid hsl(var(--primary) / 0.25)",
                          color: "hsl(var(--primary))",
                        }}
                      >
                        <span className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"
                          style={{ background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.06) 50%, transparent 70%)" }} />
                        {copiedCode
                          ? <><Check className="w-4 h-4" /> СКОПІЙОВАНО!</>
                          : <><Copy className="w-4 h-4" /> КОД СЕРВЕРУ</>
                        }
                      </button>

                      {/* НАЗАД */}
                      <button
                        onClick={backToList}
                        className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-semibold text-sm text-muted-foreground transition-all duration-200 hover:scale-[1.02] hover:text-foreground active:scale-[0.97] liquid-glass"
                      >
                        <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1" />
                        НАЗАД
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Menu sections ── */}
        <div className="space-y-5">
          {menuSections.map((section, si) => (
            <div key={section.label} className="animate-fade-in" style={{ animationDelay: `${si * 60}ms` }}>
              <SectionLabel icon={section.labelIcon} label={section.label} />
              <div className={`grid gap-2 ${section.items.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
                {section.items.map((item, i) => {
                  const it = item as { icon: React.ElementType; label: string; desc: string; path: string; red?: boolean; badgeKey?: string; clearKey?: string };
                  const hasBadge   = it.badgeKey ? badges[it.badgeKey] : false;
                  const isThreeCol = section.items.length === 3;
                  return (
                    <button
                      key={it.label}
                      onClick={() => {
                        if (it.badgeKey === "news") localStorage.setItem("crp_news_seen", String(Date.now()));
                        if (it.clearKey) localStorage.setItem(it.clearKey, String(Date.now()));
                        if (hasBadge) setBadges(prev => ({ ...prev, [it.badgeKey!]: false }));
                        navigate(it.path);
                      }}
                      className="animate-slide-up group"
                      style={{ animationDelay: `${(si * 4 + i) * 35}ms` }}
                    >
                      <div
                        className={`liquid-glass-card relative overflow-hidden rounded-2xl ${isThreeCol ? "p-3" : "p-4"} flex flex-col gap-2 transition-all duration-200 hover:scale-[1.03] active:scale-[0.96] h-full text-left`}
                        style={{
                          background: "linear-gradient(135deg, hsl(0 0% 100% / 0.10), hsl(0 0% 100% / 0.02))",
                          backdropFilter: "blur(22px) saturate(1.8)",
                          WebkitBackdropFilter: "blur(22px) saturate(1.8)",
                          border: `1px solid hsl(0 0% 100% / 0.18)`,
                          boxShadow: "inset 0 1px 0 hsl(0 0% 100% / 0.18), inset 0 -1px 0 hsl(0 0% 0% / 0.25), 0 8px 24px hsl(0 0% 0% / 0.35)",
                          transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
                        }}
                        onMouseEnter={e => {
                          const el = e.currentTarget as HTMLDivElement;
                          el.style.boxShadow = `inset 0 1px 0 hsl(0 0% 100% / 0.22), 0 0 28px ${it.red ? "hsl(0 70% 50% / 0.3)" : "hsl(var(--primary) / 0.3)"}`;
                          el.style.borderColor = it.red ? "hsl(0 70% 50% / 0.35)" : "hsl(var(--primary) / 0.35)";
                        }}
                        onMouseLeave={e => {
                          const el = e.currentTarget as HTMLDivElement;
                          el.style.boxShadow = "inset 0 1px 0 hsl(0 0% 100% / 0.18), inset 0 -1px 0 hsl(0 0% 0% / 0.25), 0 8px 24px hsl(0 0% 0% / 0.35)";
                          el.style.borderColor = "hsl(0 0% 100% / 0.18)";
                        }}
                      >
                        {/* Glossy highlight */}
                        <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-2xl"
                          style={{ background: "linear-gradient(180deg, hsl(0 0% 100% / 0.12), transparent)" }} />
                        {/* Shine on hover */}
                        <span className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-400 rounded-2xl"
                          style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 60%)" }} />

                        {stickerMap[it.label] && (
                          <img src={stickerMap[it.label]} alt=""
                            className="pointer-events-none absolute -top-2 -right-2 w-10 h-10 object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)] rotate-12 transition-transform duration-200 group-hover:rotate-6 group-hover:scale-110" />
                        )}

                        <div
                          className={`relative ${isThreeCol ? "w-8 h-8" : "w-10 h-10"} rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110 ${it.red ? "bg-destructive/10 border border-destructive/15" : "bg-primary/10 border border-primary/15"}`}
                        >
                          <it.icon className={`${isThreeCol ? "w-4 h-4" : "w-5 h-5"} ${it.red ? "text-destructive" : "text-primary"}`} />
                          {hasBadge && (
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-primary animate-pulse"
                              style={{ boxShadow: "0 0 6px hsl(var(--primary))" }} />
                          )}
                        </div>

                        <div className="relative">
                          <p className={`${isThreeCol ? "text-xs" : "text-sm"} font-bold leading-tight truncate ${it.red ? "text-destructive" : "text-foreground"}`}>
                            {it.label}
                          </p>
                          <p className={`${isThreeCol ? "text-[9px]" : "text-[10px]"} text-muted-foreground mt-0.5 truncate`}>
                            {it.desc}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Index;
