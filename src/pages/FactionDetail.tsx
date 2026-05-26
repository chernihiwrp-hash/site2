import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import PageHeader from "../components/PageHeader";
import GradientButton from "../components/GradientButton";
import { Users, User, Send, CheckCircle, Clock, Shield, Crown, LogOut, Lock } from "lucide-react";
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

type Member = { name: string; rank: string; avatar: string | null; isLeader: boolean; isDeputy: boolean };
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
    bgImage?: string; bannerImage?: string;
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
  const [isMember, setIsMember] = useState(false);
  const [resignConfirm, setResignConfirm] = useState(false);
  const [resignLoading, setResignLoading] = useState(false);
  const [recruitClosed, setRecruitClosed] = useState(false);
  const [recruitOpen, setRecruitOpen] = useState<boolean | null>(null);

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
            bgImage: (dbFaction.background_image as string) || undefined,
            bannerImage: (dbFaction.banner_image as string) || undefined,
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
            bgImage: (ov.background_image as string) || undefined,
            bannerImage: (ov.banner_image as string) || undefined,
          };
        } else {
          found = { ...staticF, leaderUsername: undefined, bgImage: undefined, bannerImage: undefined };
        }
      }
      setFaction(found);
    };

    const loadMembers = async () => {
      setMembersLoading(true);

      // 1. Визначаємо всі можливі ідентифікатори фракції
      const staticFaction = factionsData[id || ""];
      const staticName = staticFaction?.name || "";  // оригінальний регістр!

      let dbFactionName = "";
      let numericId: number | null = null;
      if (id && !isNaN(Number(id))) {
        numericId = Number(id);
        const { data: fData } = await supabase
          .from("factions").select("name").eq("id", numericId).maybeSingle();
        if (fData?.name) dbFactionName = fData.name as string;
      }

      // 2. Завантажуємо ВСІ approved заявки одним запитом
      const { data: allApps, error } = await supabase
        .from("faction_applications")
        .select("username, form_data, faction_id, faction_name")
        .eq("status", "approved");

      if (error) { console.error("loadMembers error:", error); setMembersLoading(false); return; }
      if (!allApps || allApps.length === 0) { setMembers([]); setMembersLoading(false); return; }

      // 3. Фільтруємо в JS — всі можливі варіанти матчінгу
      const factionNameLower = (staticName || dbFactionName).toLowerCase();
      const idStr = (id || "").toLowerCase();

      const matched = (allApps as Record<string, unknown>[]).filter(a => {
        const fid = a.faction_id;
        const fname = ((a.faction_name as string) || "").toLowerCase().trim();
        return (
          // По числовому id
          (numericId !== null && (fid === numericId || String(fid) === String(numericId))) ||
          // По імені фракції (нечутливо до регістру)
          (factionNameLower && fname === factionNameLower) ||
          // По dbFactionName
          (dbFactionName && fname === dbFactionName.toLowerCase()) ||
          // По статичному id як рядку ("npu", "sbu" тощо)
          (idStr && fname === idStr) ||
          // По faction_id як рядку
          (idStr && String(fid).toLowerCase() === idStr)
        );
      });

      if (matched.length === 0) { setMembers([]); setMembersLoading(false); return; }

      // 4. Аватари
      const usernames = matched.map(a => {
        const fd = (a.form_data as Record<string, unknown>) || {};
        return (fd.nick as string) || (a.username as string) || "";
      }).filter(Boolean);

      const avatarMap: Record<string, string | null> = {};
      if (usernames.length > 0) {
        const { data: usersData } = await supabase
          .from("users").select("username, avatar_url").in("username", usernames);
        (usersData || []).forEach((u: Record<string, unknown>) => {
          avatarMap[(u.username as string).toLowerCase()] = (u.avatar_url as string) || null;
        });
      }

      // 5. Лідер — шукаємо по всіх варіантах
      let leaderUsername = "";
      let deputyUsername = "";
      const leaderName = staticName || dbFactionName;
      if (leaderName) {
        // Пробуємо по оригінальній назві
        const { data: ldArr } = await dbSelect("faction_leaders", {
          columns: "leader_username, deputy_username",
          filters: [{ col: "faction_name", op: "ilike", value: leaderName }],
          limit: 1,
        });
        let ld = ldArr?.[0];
        // Якщо не знайшло — пробуємо по lowercase (бо AdminPanel зберігає toLowerCase)
        if (!ld) {
          const { data: ldArr2 } = await dbSelect("faction_leaders", {
            columns: "leader_username, deputy_username",
            filters: [{ col: "faction_name", op: "ilike", value: leaderName.toLowerCase() }],
            limit: 1,
          });
          ld = ldArr2?.[0];
        }
        if (ld?.leader_username) leaderUsername = ld.leader_username as string;
        if (ld?.deputy_username) deputyUsername = ld.deputy_username as string;
      }
      if (!leaderUsername && numericId !== null) {
        const { data: fd2Arr } = await dbSelect("factions", {
          columns: "leader_username",
          filters: [{ col: "id", op: "eq", value: numericId }],
          limit: 1,
        });
        const fd2 = fd2Arr?.[0];
        if (fd2?.leader_username) leaderUsername = fd2.leader_username as string;
      }

      // 6. Будуємо список учасників (дедуплікація по username)
      const seenNames = new Set<string>();
      const mems: Member[] = [];
      for (const a of matched) {
        const fd = (a.form_data as Record<string, unknown>) || {};
        const name = ((fd.nick as string) || (a.username as string) || "Гравець").trim();
        if (!name || seenNames.has(name.toLowerCase())) continue;
        seenNames.add(name.toLowerCase());
        mems.push({
          name,
          rank: "Учасник",
          avatar: avatarMap[name.toLowerCase()] || null,
          isLeader: !!leaderUsername && name.toLowerCase() === leaderUsername.toLowerCase(),
          isDeputy: !!deputyUsername && name.toLowerCase() === deputyUsername.toLowerCase(),
        });
      }
      // Якщо лідер або зам не в списку членів — додаємо їх окремо
      if (leaderUsername && !mems.some(m => m.name.toLowerCase() === leaderUsername.toLowerCase())) {
        mems.unshift({
          name: leaderUsername,
          rank: "Учасник",
          avatar: avatarMap[leaderUsername.toLowerCase()] || null,
          isLeader: true,
          isDeputy: false,
        });
      }
      if (deputyUsername && !mems.some(m => m.name.toLowerCase() === deputyUsername.toLowerCase())) {
        mems.splice(leaderUsername ? 1 : 0, 0, {
          name: deputyUsername,
          rank: "Учасник",
          avatar: avatarMap[deputyUsername.toLowerCase()] || null,
          isLeader: false,
          isDeputy: true,
        });
      }

      mems.sort((a, b) => (b.isLeader ? 2 : b.isDeputy ? 1 : 0) - (a.isLeader ? 2 : a.isDeputy ? 1 : 0));

      setMembers(mems);
      if (nick) setIsMember(mems.some(m => m.name.toLowerCase() === nick.toLowerCase()));
      setMembersLoading(false);
    };

    loadFaction();
    loadMembers();
  }, [id]);

  // Перевірка стану набору при завантаженні фракції
  useEffect(() => {
    if (!faction?.name) return;
    let mounted = true;
    store.isRecruitmentOpen(faction.name).then(open => {
      if (mounted) setRecruitOpen(open);
    });
    return () => { mounted = false; };
  }, [faction?.name]);

  if (!faction) return (
    <div className="min-h-screen pb-20 px-4 pt-4">
      <PageHeader title="НЕ ЗНАЙДЕНО" backTo="/factions" />
      <div className="flex items-center justify-center py-16">
        <p className="text-xs text-muted-foreground">Фракцію не знайдено</p>
      </div>
    </div>
  );

const handleResign = async () => {
    if (!nick || !faction) {
      toast.error("Помилка: Нік або фракція не знайдені");
      return;
    }
    
    setResignLoading(true);
    
    // Очищаємо нік від випадкових пробілів
    const userNick = nick.trim();
    const factionName = faction.name;
    
    console.log("📤 Спроба звільнення:", { userNick, factionName });

    // Викликаємо функцію видалення
    const ok = await store.resignFromFaction(userNick, factionName);
    
    setResignLoading(false);
    
    if (ok) {
      toast.success("Ви успішно покинули фракцію");
      setIsMember(false);
      setResignConfirm(false);
      // Оновлюємо список учасників на екрані, видаляючи себе
      setMembers(prev => prev.filter(m => m.name.toLowerCase() !== userNick.toLowerCase()));
    } else {
      console.error("❌ Supabase відхилив видалення. Можливо, назва фракції в базі інша або немає прав (RLS).");
      toast.error("Помилка бази. Перевір консоль (F12)");
    }
  };
  const handleSubmit = async () => {
    if (!nick || !roblox || !age || !telegram) return toast.error("Заповніть усі поля");
    const unanswered = questions.findIndex((_, i) => !answers[i]?.trim());
    if (unanswered !== -1) return toast.error(`Дайте відповідь на питання ${unanswered + 1}`);

    // Перевірка набору перед відправкою (на випадок якщо набір закрили поки форма була відкрита)
    const isOpen = await store.isRecruitmentOpen(faction!.name);
    if (!isOpen) {
      setShowForm(false);
      setRecruitClosed(true);
      return;
    }

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
    <>
    <div className="min-h-screen pb-20 px-4 pt-4">
      <PageHeader title={faction.name} subtitle={faction.desc} backTo="/factions" />
      <div className="animate-fade-in">

        {/* Banner */}
        <div className="rounded-2xl mb-4 border overflow-hidden"
          style={{ borderColor: faction.color + "22" }}>
          {/* Banner image if set */}
          {faction.bannerImage && (
            <div className="w-full h-32 relative">
              <img src={faction.bannerImage} alt={faction.name} className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display = "none")} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            </div>
          )}
          <div className="p-5"
            style={faction.bgImage && !faction.bannerImage
              ? { backgroundImage: `url(${faction.bgImage})`, backgroundSize: "cover", backgroundPosition: "center" }
              : { background: faction.gradient }}>
            {faction.bgImage && !faction.bannerImage && <div className="absolute inset-0 bg-black/50" />}
            <div className="flex items-center gap-4 relative z-10">
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
        </div>

        {/* ── КНОПКИ (зверху) ── */}

        {/* Resign button — тільки для учасника */}
        {isMember && (
          <div className="mb-4">
            {!resignConfirm ? (
              <button
                onClick={() => setResignConfirm(true)}
                className="w-full liquid-glass rounded-2xl px-4 py-3 text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform"
                style={{ color: "hsl(0 70% 60%)", border: "1px solid hsl(0 70% 60% / 0.25)", background: "hsl(0 70% 60% / 0.06)" }}
              >
                <LogOut className="w-4 h-4" />
                Уволитися з фракції
              </button>
            ) : (
              <div className="liquid-glass rounded-2xl p-4 animate-fade-in"
                style={{ border: "1px solid hsl(0 70% 60% / 0.3)", background: "hsl(0 70% 60% / 0.06)" }}>
                <p className="text-sm font-semibold text-foreground mb-1 text-center">Ви впевнені?</p>
                <p className="text-xs text-muted-foreground text-center mb-3">
                  Ви покинете <span style={{ color: faction.color }}>{faction.name}</span>. Для повернення потрібно буде подати нову заявку.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleResign}
                    disabled={resignLoading}
                    className="flex-1 rounded-2xl px-4 py-2.5 text-sm font-bold active:scale-95 transition-transform"
                    style={{ background: "hsl(0 70% 55%)", color: "white" }}
                  >
                    {resignLoading ? "Обробка..." : "Так, уволитися"}
                  </button>
                  <button
                    onClick={() => setResignConfirm(false)}
                    className="flex-1 liquid-glass rounded-2xl px-4 py-2.5 text-sm text-muted-foreground active:scale-95 transition-transform"
                  >
                    Скасувати
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

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

        {/* Форма подачі / кнопка "Подати анкету" — тільки для НЕ учасників */}
        {!isMember && (
          <div className="mb-4">
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
              recruitOpen === false ? (
                <button
                  onClick={() => setRecruitClosed(true)}
                  className="w-full rounded-2xl py-3.5 px-4 text-sm font-bold flex items-center justify-center gap-2.5 active:scale-[0.98] transition-all relative overflow-hidden group"
                  style={{
                    background: "linear-gradient(135deg, hsl(0 70% 22% / 0.85), hsl(0 60% 12% / 0.95))",
                    border: "1.5px solid hsl(0 75% 50% / 0.55)",
                    color: "hsl(0 80% 70%)",
                    boxShadow: "0 0 24px hsl(0 70% 45% / 0.35), inset 0 0 20px hsl(0 70% 35% / 0.2)",
                  }}
                >
                  <Lock className="w-4 h-4" style={{ color: "hsl(0 85% 62%)", filter: "drop-shadow(0 0 6px hsl(0 85% 55%))" }} />
                  <span style={{ textShadow: "0 0 10px hsl(0 80% 50% / 0.6)" }}>Набір закрито</span>
                </button>
              ) : (
                <GradientButton variant={btnVariant} className="w-full" onClick={async () => {
                  const isOpen = await store.isRecruitmentOpen(faction.name);
                  if (!isOpen) { setRecruitOpen(false); setRecruitClosed(true); return; }
                  setShowForm(true);
                }}>
                  Подати анкету
                </GradientButton>
              )
            )}
          </div>
        )}

        {/* ── СПИСОК УЧАСНИКІВ (знизу) ── */}
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
                    border: m.isLeader ? `1px solid hsl(45 100% 55% / 0.3)` : m.isDeputy ? `1px solid hsl(200 80% 55% / 0.25)` : undefined,
                    background: m.isLeader ? "hsl(45 100% 55% / 0.05)" : m.isDeputy ? "hsl(200 80% 55% / 0.04)" : undefined,
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
                    {m.isDeputy && !m.isLeader && (
                      <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: "hsl(200 80% 55%)", boxShadow: "0 0 8px hsl(200 80% 55% / 0.6)" }}>
                        <Shield className="w-2.5 h-2.5 text-black" />
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
                      {m.isDeputy && !m.isLeader && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold"
                          style={{ background: "hsl(200 80% 55% / 0.15)", color: "hsl(200 80% 60%)", border: "1px solid hsl(200 80% 55% / 0.3)" }}>
                          ЗАМ
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

      </div>

      {/* ── МОДАЛКА: НАБІР ЗАКРИТО ── */}
      {recruitClosed && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
          onClick={() => setRecruitClosed(false)}
        >
          <div
            className="relative w-full max-w-sm rounded-3xl p-6 text-center animate-fade-in"
            style={{
              background: "linear-gradient(135deg, hsl(0 70% 10% / 0.95), hsl(0 0% 5% / 0.98))",
              border: "1.5px solid hsl(0 70% 45% / 0.5)",
              boxShadow: "0 0 40px hsl(0 70% 40% / 0.3), 0 0 80px hsl(0 70% 30% / 0.15)",
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center"
              style={{
                background: "hsl(0 70% 45% / 0.15)",
                border: "1.5px solid hsl(0 70% 45% / 0.4)",
                boxShadow: "0 0 24px hsl(0 70% 45% / 0.4)",
              }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="hsl(0, 70%, 60%)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <h2 className="text-lg font-bold mb-1" style={{ color: "hsl(0, 70%, 65%)" }}>
              Набір закрито
            </h2>
            <p className="text-sm text-muted-foreground mb-1">
              Набір у фракцію <span className="font-semibold" style={{ color: faction.color }}>{faction.name}</span> наразі закрито адміністрацією.
            </p>
            <p className="text-xs text-muted-foreground/60 mb-5">
              Дочекайтеся відкриття набору та спробуйте знову.
            </p>
            <button
              onClick={() => setRecruitClosed(false)}
              className="w-full rounded-2xl py-3 text-sm font-semibold transition-all active:scale-95"
              style={{
                background: "hsl(0, 70%, 45% / 0.2)",
                border: "1px solid hsl(0, 70%, 45% / 0.4)",
                color: "hsl(0, 70%, 65%)",
              }}
            >
              Зрозуміло
            </button>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default FactionDetail;
