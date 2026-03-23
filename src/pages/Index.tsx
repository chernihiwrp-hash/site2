import {
  Newspaper, Vote, Megaphone, ScrollText,
  Shield, FileText, Home,
  Search, UserPlus, Car,
  AlertTriangle, X, Gamepad2, Copy, Check,
  Swords, Bug, UserX, HelpCircle, ChevronRight,
  Star, Landmark, Scale, ShieldAlert
} from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PulseCity from "../components/PulseCity";
import GradientButton from "../components/GradientButton";
import { toast } from "sonner";
import { store } from "../lib/store";

const ROBLOX_URL = "https://www.roblox.com/games/start?placeId=7711635737&launchData=joinCode%3D5319vick";
const SERVER_CODE = "5319vick";

const menuSections = [
  {
    labelIcon: Landmark,
    label: "Місто",
    items: [
      { icon: Newspaper,  label: "Новини",      desc: "Останні події",    path: "/news",            badgeKey: "news" },
      { icon: Vote,       label: "Вибори мера", desc: "Голосування",      path: "/mayor-election" },
      { icon: Megaphone,  label: "Голос міста", desc: "Скарги та ідеї",   path: "/city-voice",      badgeKey: "voice", clearKey: "crp_voice_seen" },
      { icon: ScrollText, label: "Документи",   desc: "Офіційні папери",  path: "/documents" },
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
      { icon: Search,   label: "Розшук",      desc: "Список розшуку",    path: "/wanted",           red: true },
      { icon: UserPlus, label: "В адмін",     desc: "Подати заявку",     path: "/admin-application" },
      { icon: Car,      label: "Номери авто", desc: "Реєстрація авто",   path: "/car-registration" },
    ],
  },
];

const sosTypes = [
  { id: "raid",    label: "РЕЙД",  icon: Swords,     activeBg: "bg-orange-400/15 border-orange-400/40 text-orange-400" },
  { id: "cheater", label: "ЧИТЕР", icon: Bug,         activeBg: "bg-red-400/15 border-red-400/40 text-red-400" },
  { id: "nrp",     label: "НРП",   icon: UserX,       activeBg: "bg-yellow-400/15 border-yellow-400/40 text-yellow-400" },
  { id: "other",   label: "ІНШЕ",  icon: HelpCircle,  activeBg: "bg-muted/20 border-muted/40 text-foreground" },
];

const SectionLabel = ({ icon: Icon, label }: { icon: typeof Shield; label: string }) => (
  <div className="flex items-center gap-2 mb-2 px-1">
    <Icon className="w-3.5 h-3.5 text-muted-foreground" />
    <span className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">{label}</span>
    <div className="flex-1 h-px" style={{ background: "hsl(0 0% 100% / 0.06)" }} />
  </div>
);

const Index = () => {
  const navigate = useNavigate();
  const [showSos, setShowSos] = useState(false);
  const [sosType, setSosType] = useState("raid");
  const [sosDesc, setSosDesc] = useState("");
  const [sosNick, setSosNick] = useState("");
  const [copied, setCopied] = useState(false);
  const [sosSending, setSosSending] = useState(false);
  const [badges, setBadges] = useState<Record<string, boolean>>({});

  const checkBadges = async () => {
    const { supabase } = await import("../lib/store");
    const nick = localStorage.getItem("crp_nick") || "";
    const next: Record<string, boolean> = {};

    // News badge
    const lastNews = parseInt(localStorage.getItem("crp_news_seen") || "0");
    const { data: newsData } = await supabase.from("news").select("created_at").order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (newsData?.created_at) next["news"] = new Date(newsData.created_at).getTime() > lastNews;

    // City voice badge
    const lastVoice = parseInt(localStorage.getItem("crp_voice_seen") || "0");
    const { data: voiceData } = await supabase.from("city_voice").select("created_at").order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (voiceData?.created_at) next["voice"] = new Date(voiceData.created_at).getTime() > lastVoice;

    // Notifications badge (for profile button hint)
    if (nick) {
      const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).ilike("username", nick).eq("read", false);
      next["notifs"] = (count || 0) > 0;
    }

    setBadges(next);
  };

  useEffect(() => {
    checkBadges();
    const interval = setInterval(checkBadges, 30_000);
    return () => clearInterval(interval);
  }, []);

  const handleSos = async () => {
    if (!sosDesc.trim()) return toast.error("Опишіть ситуацію");
    setSosSending(true);
    await store.addSos(sosNick || localStorage.getItem("crp_nick") || "Гравець", sosType, sosDesc, sosType as "raid"|"cheater"|"nrp"|"other");
    setSosSending(false); setShowSos(false); setSosDesc(""); setSosNick("");
    toast.success("SOS сигнал відправлено адміністрації!");
  };

  const copyCode = () => {
    navigator.clipboard.writeText(SERVER_CODE);
    setCopied(true); toast.success("Код скопійовано!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen pb-24 px-4 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-display text-xl font-bold tracking-wider neon-text-lime">CHERNIHIV RP</h1>
          <p className="text-xs text-muted-foreground mt-0.5">ПОРТАЛ ГРАВЦЯ</p>
        </div>
        <button onClick={() => setShowSos(true)}
          className="relative w-12 h-12 rounded-full flex items-center justify-center active:scale-90 transition-all"
          style={{ background: "hsl(0 70% 50% / 0.12)", boxShadow: "0 0 16px hsl(0 70% 50% / 0.25)", border: "1px solid hsl(0 70% 50% / 0.25)" }}>
          <AlertTriangle className="w-5 h-5 text-destructive animate-pulse" />
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-destructive animate-ping" />
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-destructive" />
        </button>
      </div>

      {/* Play + code */}
      <div className="flex items-center gap-3 mb-5">
        <a href={ROBLOX_URL} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm text-white transition-all active:scale-95"
          style={{ background: "linear-gradient(135deg, hsl(142,71%,42%), hsl(142,71%,22%))", boxShadow: "0 0 20px hsl(142 71% 45% / 0.35)" }}>
          <Gamepad2 className="w-5 h-5" /> ГРАТИ
        </a>
        <div className="flex-1 liquid-glass rounded-2xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[9px] text-muted-foreground">КОД СЕРВЕРУ</p>
            <p className="text-sm font-mono font-bold text-primary">{SERVER_CODE}</p>
          </div>
          <button onClick={copyCode} className="p-1.5 rounded-lg liquid-glass active:scale-95 transition-all">
            {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
          </button>
        </div>
      </div>

      {/* SOS Modal */}
      {showSos && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setShowSos(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
          <div className="relative w-full max-w-sm rounded-2xl p-5 animate-fade-in liquid-glass-strong" onClick={e => e.stopPropagation()}
            style={{ border: "1px solid hsl(0 70% 50% / 0.25)", boxShadow: "0 0 40px hsl(0 70% 50% / 0.15)" }}>
            <button onClick={() => setShowSos(false)} className="absolute top-3 right-3 text-muted-foreground"><X className="w-5 h-5" /></button>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-destructive/15 border border-destructive/25 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-destructive" />
              </div>
              <h3 className="font-display text-sm font-bold text-destructive">SOS СИГНАЛ</h3>
            </div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Ваш нік</label>
            <input value={sosNick || localStorage.getItem("crp_nick") || ""} onChange={e => setSosNick(e.target.value)} placeholder="Нік в грі"
              className="w-full liquid-glass rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-destructive/30 bg-transparent mb-3" />
            <label className="text-xs text-muted-foreground mb-1.5 block">Тип порушення</label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {sosTypes.map(t => { const Icon = t.icon; return (
                <button key={t.id} onClick={() => setSosType(t.id)}
                  className={`flex items-center gap-2 text-xs px-3 py-2.5 rounded-xl border transition-all active:scale-95 ${sosType === t.id ? t.activeBg : "liquid-glass text-muted-foreground"}`}>
                  <Icon className="w-4 h-4" /> {t.label}
                </button>
              ); })}
            </div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Опис ситуації</label>
            <textarea value={sosDesc} onChange={e => setSosDesc(e.target.value)} placeholder="Детально опишіть що сталося..."
              className="w-full liquid-glass rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none resize-none h-20 bg-transparent mb-4" />
            <GradientButton variant="danger" className="w-full" onClick={handleSos} disabled={sosSending}>
              <AlertTriangle className="w-4 h-4 inline mr-1.5" />
              {sosSending ? "Відправляю..." : "Відправити SOS"}
            </GradientButton>
          </div>
        </div>
      )}

      <div className="mb-5 animate-fade-in"><PulseCity /></div>

      <div className="space-y-5">
        {menuSections.map((section, si) => (
          <div key={section.label} className="animate-fade-in" style={{ animationDelay: `${si * 60}ms` }}>
            <SectionLabel icon={section.labelIcon} label={section.label} />
            <div className={`grid gap-2 ${section.items.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
              {section.items.map((item, i) => {
                const it = item as { icon: typeof Shield; label: string; desc: string; path: string; red?: boolean; badgeKey?: string; clearKey?: string };
                const hasBadge = it.badgeKey ? badges[it.badgeKey] : false;
                const isThreeCol = section.items.length === 3;
                return (
                  <button key={it.label}
                    onClick={() => {
                      if (it.badgeKey === "news") localStorage.setItem("crp_news_seen", String(Date.now()));
                      if (it.clearKey) localStorage.setItem(it.clearKey, String(Date.now()));
                      if (hasBadge) setBadges(prev => ({ ...prev, [it.badgeKey!]: false }));
                      navigate(it.path);
                    }}
                    className="animate-slide-up" style={{ animationDelay: `${(si * 4 + i) * 35}ms` }}>
                    <div className={`liquid-glass-card rounded-2xl ${isThreeCol ? "p-3" : "p-4"} flex flex-col gap-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.97] h-full text-left ${it.red ? "hover:border-destructive/25" : "hover:border-primary/25"}`}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 20px ${it.red ? "hsl(0 70% 50% / 0.14)" : "hsl(var(--primary) / 0.14)"}`; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = ""; }}>
                      <div className={`relative ${isThreeCol ? "w-8 h-8" : "w-10 h-10"} rounded-xl flex items-center justify-center ${it.red ? "bg-destructive/10 border border-destructive/15" : "bg-primary/10 border border-primary/15"}`}>
                        <it.icon className={`${isThreeCol ? "w-4 h-4" : "w-5 h-5"} ${it.red ? "text-destructive" : "text-primary"}`} />
                        {hasBadge && (
                          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-primary animate-pulse"
                            style={{ boxShadow: "0 0 6px hsl(var(--primary))" }} />
                        )}
                      </div>
                      <div>
                        <p className={`${isThreeCol ? "text-xs" : "text-sm"} font-bold leading-tight truncate ${it.red ? "text-destructive" : "text-foreground"}`}>{it.label}</p>
                        <p className={`${isThreeCol ? "text-[9px]" : "text-[10px]"} text-muted-foreground mt-0.5 truncate`}>{it.desc}</p>
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
  );
};

export default Index;
