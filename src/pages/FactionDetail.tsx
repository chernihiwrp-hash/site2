import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import PageHeader from "../components/PageHeader";
import GradientButton from "../components/GradientButton";
import { Users, User, Send, CheckCircle, Clock, Shield, Crown } from "lucide-react";
import { toast } from "sonner";
import { store, supabase } from "../lib/store";

const factionsData: Record<string, { name: string; color: string; gradient: string; desc: string; dangerous?: boolean }> = {
  sbu:        { name: "СБУ",         color: "hsl(220, 70%, 55%)", gradient: "linear-gradient(135deg, hsl(220,70%,35%,0.2), hsl(220,70%,15%,0.08))", desc: "Служба безпеки України" },
  dbr:        { name: "ДБР",         color: "hsl(160, 50%, 45%)", gradient: "linear-gradient(135deg, hsl(160,50%,35%,0.2), hsl(160,50%,15%,0.08))", desc: "Державне бюро розслідувань" },
  npu:        { name: "НПУ",         color: "hsl(210, 80%, 55%)", gradient: "linear-gradient(135deg, hsl(210,80%,45%,0.2), hsl(210,80%,20%,0.08))", desc: "Національна поліція України" },
  vsu:        { name: "ВСУ",         color: "hsl(140, 50%, 40%)", gradient: "linear-gradient(135deg, hsl(140,50%,30%,0.2), hsl(100,40%,20%,0.08))", desc: "Збройні Сили України" },
  prosecutor: { name: "Прокуратура", color: "hsl(30, 50%, 50%)",  gradient: "linear-gradient(135deg, hsl(30,50%,35%,0.2), hsl(220,10%,30%,0.08))", desc: "Нагляд за дотриманням законів" },
  dsns:       { name: "ДСНС",        color: "hsl(15, 80%, 55%)",  gradient: "linear-gradient(135deg, hsl(15,80%,45%,0.2), hsl(15,60%,20%,0.08))", desc: "Служба з надзвичайних ситуацій" },
  judge:      { name: "Суддя",       color: "hsl(45, 80%, 55%)",  gradient: "linear-gradient(135deg, hsl(45,80%,50%,0.2), hsl(40,70%,25%,0.08))", desc: "Судова система" },
  lawyers:    { name: "Адвокати",    color: "hsl(25, 80%, 55%)",  gradient: "linear-gradient(135deg, hsl(25,80%,50%,0.2), hsl(20,70%,25%,0.08))", desc: "Захист прав та інтересів" },
  orion:      { name: "ОРІОН",       color: "hsl(0, 55%, 45%)",   gradient: "linear-gradient(135deg, hsl(0,55%,25%,0.35), hsl(0,0%,4%,0.45))", desc: "Приватна військова компанія", dangerous: true },
  ghetto:     { name: "ГЕТТО",       color: "hsl(0, 60%, 42%)",   gradient: "linear-gradient(135deg, hsl(0,60%,20%,0.4), hsl(0,0%,3%,0.5))", desc: "Вуличне угруповання", dangerous: true },
  mafia:      { name: "МАФІЯ",       color: "hsl(0, 65%, 45%)",   gradient: "linear-gradient(135deg, hsl(0,65%,25%,0.35), hsl(0,0%,5%,0.4))", desc: "Організована злочинність", dangerous: true },
};

type Member = { name: string; rank: string; avatar: string | null; isLeader: boolean };
type AppStatus = "idle" | "sending" | "sent";

const DEFAULT_QUESTIONS = [
  "Чому хочеш вступити у фракцію?",
  "Який у тебе досвід в RP?",
  "Скільки часу на день граєш?",
];

// Avatar component
const MemberAvatar = ({ avatar, name, color, size = 32 }: { avatar: string | null; name: string; color: string; size?: number }) => {
  if (avatar && (avatar.startsWith("http") || avatar.startsWith("data:"))) {
    return (
      <img src={avatar} alt={name}
        className="rounded-xl object-cover"
        style={{ width: size, height: size, border: `1.5px solid ${color}44` }}
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
      />
    );
  }
  return (
    <div className="rounded-xl flex items-center justify-center font-bold text-xs"
      style={{ width: size, height: size, backgroundColor: color + "20", border: `1.5px solid ${color}40`, color }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
};

const FactionDetail = () => {
  const { id } = useParams();
  const [faction, setFaction] = useState<{
    name: string; color: string; gradient: string; desc: string; dangerous?: boolean; leaderUsername?: string;
  } | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [questions, setQuestions] = useState<string[]>(DEFAULT_QUESTIONS);
  const [showForm, setShowForm] = useState(false);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [nick] = useState(localStorage.getItem("crp_nick") || "");
  const [roblox, setRoblox] = useState("");
  const [age, setAge] = useState("");
  const [telegram, setTelegram] = useState("");
  const [appStatus, setAppStatus] = useState<AppStatus>("idle");

  useEffect(() => {
    if (!id) return;

    const loadFaction = async () => {
      const { data } = await supabase.from("factions").select("*").order("created_at", { ascending: true });
      let found = null;

      if (data && data.length > 0) {
        const dbFaction = data.find(
          (f: Record<string, unknown>) =>
            String(f.id) === id ||
            (f.name as string).toLowerCase().replace(/\s+/g, "_") === id
        );
        if (dbFaction) {
          const color = (dbFaction.color as string) || "hsl(84 81% 44%)";
          const qs = (dbFaction.questions as string[]) || [];
          if (qs.length) setQuestions(qs);
          found = {
            name: dbFaction.name as string,
            color,
            gradient: (dbFaction.gradient as string) || `linear-gradient(135deg, ${color}22, ${color}08)`,
            desc: (dbFaction.description as string) || "Фракція сервера",
            dangerous: (dbFaction.dangerous as boolean) || false,
            leaderUsername: (dbFaction.leader_username as string) || null,
          };
          return setFaction(found);
        }
      }

      // Static faction — read from Supabase faction_overrides
      if (factionsData[id || ""]) {
        const staticF = factionsData[id || ""];
        const slug = staticF.name.toLowerCase().replace(/\s+/g, "_");
        const { data: ov } = await supabase
          .from("faction_overrides")
          .select("*")
          .eq("faction_slug", slug)
          .maybeSingle();
        if (ov) {
          const qs = (ov.questions as string[]) || [];
          if (qs.length) setQuestions(qs);
          const color = (ov.color as string) || staticF.color;
          found = {
            name: (ov.name as string) || staticF.name,
            color,
            gradient: (ov.gradient as string) || staticF.gradient,
            desc: (ov.description as string) || staticF.desc,
            dangerous: (ov.dangerous as boolean) ?? staticF.dangerous ?? false,
            leaderUsername: undefined,
          };
        } else {
          found = { ...staticF, leaderUsername: undefined };
        }
      }
      setFaction(found);
    };

    const loadMembers = async () => {
      setMembersLoading(true);

      // 1. Load approved faction applications
      const { data: apps } = await supabase
        .from("faction_applications")
        .select("username, form_data, faction_id, faction_name")
        .eq("status", "approved");

      if (!apps) { setMembersLoading(false); return; }

      const staticFaction = factionsData[id || ""];
      const staticName = staticFaction?.name?.toLowerCase() || "";

      const matched = (apps as Record<string, unknown>[]).filter(a => {
        const fid = String(a.faction_id || "");
        const fname = (a.faction_name as string || "").toLowerCase().trim();
        return fid === id || fname === staticName || fname === id?.toLowerCase();
      });

      if (matched.length === 0) { setMembers([]); setMembersLoading(false); return; }

      // 2. Load avatars from users table
      const usernames = matched.map(a => {
        const fd = (a.form_data as Record<string, unknown>) || {};
        return (fd.nick as string) || (a.username as string) || "";
      }).filter(Boolean);

      const { data: usersData } = await supabase
        .from("users")
        .select("username, avatar_url")
        .in("username", usernames);

      const avatarMap: Record<string, string | null> = {};
      (usersData || []).forEach((u: Record<string, unknown>) => {
        avatarMap[(u.username as string).toLowerCase()] = (u.avatar_url as string) || null;
      });

      // 3. Get leader from faction_leaders table (works for all factions)
      let leaderUsername = "";
      const factionNameForLeader = staticFaction?.name || "";
      // Try by faction name first (covers all factions)
      if (factionNameForLeader) {
        const { data: leaderData } = await supabase
          .from("faction_leaders")
          .select("leader_username")
          .eq("faction_name", factionNameForLeader.toLowerCase())
          .maybeSingle();
        if (leaderData?.leader_username) {
          leaderUsername = leaderData.leader_username as string;
        }
      }
      // Also check by DB faction name
      if (!leaderUsername) {
        const { data: fData } = await supabase.from("factions").select("leader_username, name").eq("id", Number(id)).maybeSingle();
        if (fData?.leader_username) {
          leaderUsername = fData.leader_username as string;
        } else if (fData?.name) {
          const { data: leaderData2 } = await supabase
            .from("faction_leaders")
            .select("leader_username")
            .eq("faction_name", (fData.name as string).toLowerCase())
            .maybeSingle();
          if (leaderData2?.leader_username) leaderUsername = leaderData2.leader_username as string;
        }
      }

      const mems: Member[] = matched.map(a => {
        const fd = (a.form_data as Record<string, unknown>) || {};
        const name = (fd.nick as string) || (a.username as string) || "Гравець";
        return {
          name,
          rank: "Учасник",
          avatar: avatarMap[name.toLowerCase()] || null,
          isLeader: !!leaderUsername && name.toLowerCase() === leaderUsername.toLowerCase(),
        };
      });

      // Sort: leader first
      mems.sort((a, b) => (b.isLeader ? 1 : 0) - (a.isLeader ? 1 : 0));

      setMembers(mems);
      setMembersLoading(false);
    };

    loadFaction();
    loadMembers();
  }, [id]);

  if (!faction) return (
    <div className="min-h-screen pb-20 px-4 pt-4">
      <PageHeader title="НЕ ЗНАЙДЕНО" backTo="/factions" />
      <div className="flex items-center justify-center py-16">
        <p className="text-xs text-muted-foreground">Фракцію не знайдено</p>
      </div>
    </div>
  );

  const handleSubmit = async () => {
    if (!nick || !roblox || !age || !telegram) return toast.error("Заповніть усі поля");
    const unanswered = questions.findIndex((_, i) => !answers[i]?.trim());
    if (unanswered !== -1) return toast.error(`Дайте відповідь на питання ${unanswered + 1}`);
    setAppStatus("sending");

    const message = questions.map((q, i) => `${i + 1}. ${q}\n→ ${answers[i] || ""}`).join("\n\n");

    const ok = await store.submitFactionApp({
      factionId: id || "",
      factionName: faction.name,
      nick, roblox, age, telegram,
      experience: "",
      message,
    });

    if (ok) {
      setAppStatus("sent");
      setTimeout(() => {
        setShowForm(false);
        setAppStatus("idle");
        setRoblox(""); setAge(""); setTelegram(""); setAnswers({});
      }, 3000);
    } else {
      toast.error("Помилка відправки");
      setAppStatus("idle");
    }
  };

  const inputClass = "w-full liquid-glass rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors bg-transparent";
  const btnVariant = faction.dangerous ? "danger" : "green";

  return (
    <div className="min-h-screen pb-20 px-4 pt-4">
      <PageHeader title={faction.name} subtitle={faction.desc} backTo="/factions" />
      <div className="animate-fade-in">

        {/* Banner */}
        <div className="rounded-2xl p-5 mb-4 border" style={{ background: faction.gradient, borderColor: faction.color + "22" }}>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold"
              style={{ backgroundColor: faction.color + "22", border: `1px solid ${faction.color}55`, color: faction.color }}>
              {faction.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">{faction.name}</h2>
              <p className="text-xs text-muted-foreground mt-1">{faction.desc}</p>
              <p className="text-xs text-muted-foreground">
                Учасників: {membersLoading ? "..." : members.length}
                {faction.leaderUsername && (
                  <span className="ml-2 text-yellow-400">
                    · Лідер: {faction.leaderUsername}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Members */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Учасники</span>
          </div>

          {membersLoading ? (
            <div className="flex items-center justify-center py-6">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : members.length === 0 ? (
            <div className="liquid-glass rounded-xl p-4 text-center">
              <Shield className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Немає підтверджених учасників</p>
              <p className="text-[10px] text-muted-foreground/50 mt-1">Учасники з'являться після схвалення заявок</p>
            </div>
          ) : (
            <div className="space-y-2">
              {members.map((m, i) => (
                <div key={i}
                  className="liquid-glass rounded-xl p-3 flex items-center gap-3 animate-slide-up"
                  style={{
                    animationDelay: `${i * 50}ms`,
                    border: m.isLeader ? `1px solid hsl(45 100% 55% / 0.3)` : undefined,
                    background: m.isLeader ? "hsl(45 100% 55% / 0.05)" : undefined,
                  }}>
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <MemberAvatar avatar={m.avatar} name={m.name} color={faction.color} size={36} />
                    {m.isLeader && (
                      <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: "hsl(45 100% 55%)", boxShadow: "0 0 8px hsl(45 100% 55% / 0.7)" }}>
                        <Crown className="w-3 h-3 text-black" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-foreground">{m.name}</span>
                      {m.isLeader && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold"
                          style={{ background: "hsl(45 100% 55% / 0.15)", color: "hsl(45 100% 55%)", border: "1px solid hsl(45 100% 55% / 0.3)" }}>
                          ЛІДЕР
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">{m.rank}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sent confirmation */}
        {appStatus === "sent" && (
          <div className="liquid-glass-card rounded-2xl p-5 mb-4 animate-fade-in border border-primary/20 text-center">
            <CheckCircle className="w-10 h-10 text-primary mx-auto mb-3" />
            <h3 className="text-sm font-bold text-foreground mb-1">Анкету відправлено!</h3>
            <p className="text-[11px] text-muted-foreground mb-2">
              Ваша заявка у <span style={{ color: faction.color }}>{faction.name}</span> передана адміністрації
            </p>
            <div className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl mx-auto w-fit"
              style={{ background: "hsl(84 81% 44% / 0.1)", border: "1px solid hsl(84 81% 44% / 0.2)" }}>
              <Clock className="w-3 h-3 text-primary" />
              <span className="text-[10px] text-primary">Очікуйте повідомлення в профілі</span>
            </div>
          </div>
        )}

        {/* Form */}
        {showForm && appStatus !== "sent" ? (
          <div className="liquid-glass-strong rounded-2xl p-4 space-y-3 animate-fade-in">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Send className="w-4 h-4" style={{ color: faction.color }} /> Анкета у {faction.name}
            </h3>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Нік (RP ім'я)</label>
              <div className="liquid-glass rounded-xl px-4 py-3 text-sm text-foreground/60">{nick || "—"}</div>
            </div>
            {[
              { label: "Roblox Username", value: roblox, set: setRoblox, ph: "Roblox username" },
              { label: "Вік",             value: age,    set: setAge,    ph: "Ваш вік" },
              { label: "Telegram",        value: telegram, set: setTelegram, ph: "@username" },
            ].map(f => (
              <div key={f.label}>
                <label className="text-xs text-muted-foreground mb-1 block">{f.label}</label>
                <input value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.ph} className={inputClass} />
              </div>
            ))}
            {questions.map((q, i) => (
              <div key={i}>
                <label className="text-xs text-muted-foreground mb-1 block">
                  <span className="text-primary font-bold">{i + 1}. </span>{q}
                </label>
                <textarea value={answers[i] || ""} onChange={e => setAnswers(prev => ({ ...prev, [i]: e.target.value }))}
                  placeholder="Ваша відповідь..." className={`${inputClass} resize-none h-20`} />
              </div>
            ))}
            <div className="flex gap-2">
              <GradientButton variant={btnVariant} className="flex-1" onClick={handleSubmit} disabled={appStatus === "sending"}>
                <Send className="w-3.5 h-3.5 inline mr-1.5" />
                {appStatus === "sending" ? "Відправляю..." : "Відправити анкету"}
              </GradientButton>
              <button onClick={() => setShowForm(false)} className="liquid-glass rounded-2xl px-4 py-3 text-sm text-muted-foreground active:scale-95">
                Скасувати
              </button>
            </div>
          </div>
        ) : appStatus === "idle" && (
          <GradientButton variant={btnVariant} className="w-full" onClick={() => setShowForm(true)}>
            Подати анкету
          </GradientButton>
        )}
      </div>
    </div>
  );
};

export default FactionDetail;
