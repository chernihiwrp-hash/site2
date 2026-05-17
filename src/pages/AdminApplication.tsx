import { useState, useEffect } from "react";
import PageHeader from "../components/PageHeader";
import GradientButton from "../components/GradientButton";
import { toast } from "sonner";
import { ChevronRight, ChevronLeft, Send, CheckCircle, Clock, Lock } from "lucide-react";
import { store } from "../lib/store";

const ages = ["10","11","12","13","14","15","16","17","18","19","20","21","22","23","24","25+"];
const days = ["Понеділок","Вівторок","Середа","Четвер","Пʼятниця","Субота","Неділя"];

const AdminApplication = () => {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [recruitClosed, setRecruitClosed] = useState(false);
  const [recruitOpen, setRecruitOpen] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    store.isRecruitmentOpen("admin").then(open => {
      if (!mounted) return;
      setRecruitOpen(open);
      if (!open) setRecruitClosed(true);
    });
    return () => { mounted = false; };
  }, []);
  const [form, setForm] = useState({
    realName: "", roblox: "", age: "", country: "", telegram: "",
    timePerDay: "", playTime: "", hasMic: "",
    adminExp: "", rpTime: "", rpKnowledge: "5",
    q1: "", q2: "", q3: "", q4: "",
    rulesRead: "", offlineDays: [] as string[],
  });

  const set = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }));
  const toggleDay = (d: string) => setForm(prev => ({
    ...prev,
    offlineDays: prev.offlineDays.includes(d) ? prev.offlineDays.filter(x => x !== d) : [...prev.offlineDays, d],
  }));

  const inputClass = "w-full liquid-glass rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 bg-transparent";

  const steps = [
    {
      title: "Особисті дані",
      content: (
        <div className="space-y-3">
          <div><label className="text-xs text-muted-foreground mb-1 block">Ім'я (реальне)</label>
            <input value={form.realName} onChange={e => set("realName", e.target.value)} placeholder="Ваше ім'я" className={inputClass} /></div>
          <div><label className="text-xs text-muted-foreground mb-1 block">Roblox Username</label>
            <input value={form.roblox} onChange={e => set("roblox", e.target.value)} placeholder="Username" className={inputClass} /></div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Вік</label>
            <div className="grid grid-cols-5 gap-1.5">
              {ages.map(a => (
                <button key={a} onClick={() => set("age", a)}
                  className={`text-xs py-2 rounded-xl border transition-all active:scale-95 ${form.age === a ? "bg-primary/20 border-primary/40 text-primary" : "liquid-glass text-muted-foreground"}`}
                >{a}</button>
              ))}
            </div>
          </div>
          <div><label className="text-xs text-muted-foreground mb-1 block">Країна / часовий пояс</label>
            <input value={form.country} onChange={e => set("country", e.target.value)} placeholder="Україна, UTC+2" className={inputClass} /></div>
          <div><label className="text-xs text-muted-foreground mb-1 block">Telegram (нік + тег)</label>
            <input value={form.telegram} onChange={e => set("telegram", e.target.value)} placeholder="@username" className={inputClass} /></div>
        </div>
      ),
      validate: () => form.realName && form.roblox && form.age && form.country && form.telegram,
    },
    {
      title: "Активність",
      content: (
        <div className="space-y-3">
          <div><label className="text-xs text-muted-foreground mb-1 block">Скільки часу на день готові приділяти серверу?</label>
            <input value={form.timePerDay} onChange={e => set("timePerDay", e.target.value)} placeholder="Наприклад: 3-4 години" className={inputClass} /></div>
          <div><label className="text-xs text-muted-foreground mb-1 block">У який час зазвичай граєте?</label>
            <input value={form.playTime} onChange={e => set("playTime", e.target.value)} placeholder="Наприклад: 16:00-22:00" className={inputClass} /></div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Чи є у вас мікрофон?</label>
            <div className="flex gap-2">
              {["Так","Ні"].map(v => (
                <button key={v} onClick={() => set("hasMic", v)}
                  className={`flex-1 text-xs py-2.5 rounded-xl border transition-all active:scale-95 ${form.hasMic === v ? "bg-primary/20 border-primary/40 text-primary" : "liquid-glass text-muted-foreground"}`}
                >{v}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">В які дні не зможете бути онлайн?</label>
            <div className="grid grid-cols-4 gap-1.5">
              {days.map(d => (
                <button key={d} onClick={() => toggleDay(d)}
                  className={`text-[10px] py-2 rounded-xl border transition-all active:scale-95 ${form.offlineDays.includes(d) ? "bg-destructive/20 border-destructive/30 text-destructive" : "liquid-glass text-muted-foreground"}`}
                >{d}</button>
              ))}
            </div>
          </div>
        </div>
      ),
      validate: () => form.timePerDay && form.playTime && form.hasMic,
    },
    {
      title: "Досвід",
      content: (
        <div className="space-y-3">
          <div><label className="text-xs text-muted-foreground mb-1 block">Чи маєте досвід адміністрування?</label>
            <textarea value={form.adminExp} onChange={e => set("adminExp", e.target.value)} placeholder="На яких серверах/проєктах?" className={`${inputClass} resize-none h-20`} /></div>
          <div><label className="text-xs text-muted-foreground mb-1 block">Скільки часу граєте на RP-проєктах?</label>
            <input value={form.rpTime} onChange={e => set("rpTime", e.target.value)} placeholder="Наприклад: 2 роки" className={inputClass} /></div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Оцініть знання RP правил (1–10): {form.rpKnowledge}</label>
            <input type="range" min="1" max="10" value={form.rpKnowledge} onChange={e => set("rpKnowledge", e.target.value)}
              className="w-full accent-primary h-2" />
            <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
              <span>1</span><span>5</span><span>10</span>
            </div>
          </div>
        </div>
      ),
      validate: () => form.adminExp && form.rpTime,
    },
    {
      title: "Ситуаційні питання",
      content: (
        <div className="space-y-3">
          <div><label className="text-xs text-muted-foreground mb-1 block">Що робити якщо адмін вищого рангу порушує правила?</label>
            <textarea value={form.q1} onChange={e => set("q1", e.target.value)} placeholder="Ваша відповідь..." className={`${inputClass} resize-none h-20`} /></div>
          <div><label className="text-xs text-muted-foreground mb-1 block">Гравець ображає інших в OOC чаті. Ваші дії?</label>
            <textarea value={form.q2} onChange={e => set("q2", e.target.value)} placeholder="Ваша відповідь..." className={`${inputClass} resize-none h-20`} /></div>
          <div><label className="text-xs text-muted-foreground mb-1 block">Ваш знайомий порушив правила. Що зробите?</label>
            <textarea value={form.q3} onChange={e => set("q3", e.target.value)} placeholder="Ваша відповідь..." className={`${inputClass} resize-none h-20`} /></div>
          <div><label className="text-xs text-muted-foreground mb-1 block">Чому хочете стати адміністратором нашого сервера?</label>
            <textarea value={form.q4} onChange={e => set("q4", e.target.value)} placeholder="Ваша відповідь..." className={`${inputClass} resize-none h-20`} /></div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">З правилами ознайомлений?</label>
            <div className="flex gap-2">
              {["Так","Ні"].map(v => (
                <button key={v} onClick={() => set("rulesRead", v)}
                  className={`flex-1 text-xs py-2.5 rounded-xl border transition-all active:scale-95 ${form.rulesRead === v ? "bg-primary/20 border-primary/40 text-primary" : "liquid-glass text-muted-foreground"}`}
                >{v}</button>
              ))}
            </div>
          </div>
        </div>
      ),
      validate: () => form.q1 && form.q2 && form.q3 && form.q4 && form.rulesRead,
    },
  ];

  const handleSubmit = async () => {
    if (!steps[step].validate()) return toast.error("Заповніть усі поля");
    setSending(true);
    try {
      // Перевіряємо чи набір адмінів відкритий
      const isOpen = await store.isRecruitmentOpen("admin");
      if (!isOpen) {
        setSending(false);
        setRecruitClosed(true);
        return;
      }
      const nick = localStorage.getItem("crp_nick") || form.realName;
      const ok = await store.submitAdminApp({
        nick,
        roblox: form.roblox,
        age: form.age,
        country: form.country,
        telegram: form.telegram,
        timePerDay: form.timePerDay,
        playTime: form.playTime,
        hasMic: form.hasMic === "Так",
        adminExp: form.adminExp,
        rpTime: form.rpTime,
        rpKnowledge: parseInt(form.rpKnowledge),
        q1: form.q1, q2: form.q2, q3: form.q3, q4: form.q4,
        rulesRead: form.rulesRead === "Так",
        daysOff: form.offlineDays.join(", "),
      });
      if (!ok) throw new Error("submitAdminApp failed");
      setSubmitted(true);
    } catch (e) {
      console.error("Admin application submit error:", e);
      toast.error("Помилка відправки. Спробуйте ще раз.");
    }
    setSending(false);
  };

  const nextStep = () => {
    if (!steps[step].validate()) return toast.error("Заповніть усі поля");
    setStep(s => s + 1);
  };

  if (submitted) {
    return (
      <div className="min-h-screen pb-20 px-4 pt-4">
        <PageHeader title="ЗАЯВКА В АДМІН" subtitle="Стань адміністратором" backTo="/" />
        <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
          <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6"
            style={{ background: "hsl(84 81% 44% / 0.12)", border: "2px solid hsl(84 81% 44% / 0.35)", boxShadow: "0 0 40px hsl(84 81% 44% / 0.2)" }}>
            <CheckCircle className="w-12 h-12 text-primary" style={{ filter: "drop-shadow(0 0 8px hsl(84 81% 44%))" }} />
          </div>
          <h2 className="font-display text-xl font-bold text-foreground mb-2">Заявку відправлено!</h2>
          <p className="text-xs text-muted-foreground text-center mb-6 max-w-xs">Адміністрація розгляне вашу заявку та зв'яжеться з вами через Telegram</p>
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
            style={{ background: "hsl(84 81% 44% / 0.08)", border: "1px solid hsl(84 81% 44% / 0.2)" }}>
            <Clock className="w-4 h-4 text-primary" />
            <span className="text-xs text-primary">Очікуйте відповіді в профілі</span>
          </div>
        </div>
      </div>
    );
  }

  // Якщо набір закрито — рендеримо тільки заблоковану сторінку + модалку, без форми
  if (recruitOpen === false) {
    return (
      <>
        <div className="min-h-screen bg-background pb-20 px-4 pt-4">
          <PageHeader title="ЗАЯВКА В АДМІН" subtitle="Стань адміністратором" backTo="/" />
          <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
            <div className="relative w-28 h-28 rounded-3xl flex items-center justify-center mb-6"
              style={{
                background: "linear-gradient(135deg, hsl(0 70% 15% / 0.9), hsl(0 0% 5% / 0.95))",
                border: "2px solid hsl(0 75% 50% / 0.55)",
                boxShadow: "0 0 50px hsl(0 70% 45% / 0.45), inset 0 0 30px hsl(0 70% 35% / 0.25)",
              }}>
              <Lock className="w-14 h-14" style={{ color: "hsl(0 85% 62%)", filter: "drop-shadow(0 0 12px hsl(0 85% 55%))" }} />
            </div>
            <h2 className="font-display text-xl font-bold mb-2" style={{ color: "hsl(0 80% 70%)", textShadow: "0 0 12px hsl(0 70% 45% / 0.6)" }}>
              Набір закрито
            </h2>
            <p className="text-xs text-muted-foreground text-center max-w-xs mb-6">
              Набір адміністраторів наразі закрито адміністрацією. Дочекайтеся відкриття та спробуйте знову.
            </p>
            <button
              onClick={() => setRecruitClosed(true)}
              className="rounded-2xl px-5 py-3 text-sm font-semibold active:scale-95 transition-all"
              style={{ background: "hsl(0 70% 20% / 0.6)", border: "1px solid hsl(0 70% 45% / 0.5)", color: "hsl(0 80% 70%)" }}
            >
              Показати деталі
            </button>
          </div>
        </div>

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
                style={{ background: "hsl(0 70% 45% / 0.15)", border: "1.5px solid hsl(0 70% 45% / 0.4)", boxShadow: "0 0 24px hsl(0 70% 45% / 0.4)" }}>
                <Lock className="w-8 h-8" style={{ color: "hsl(0 85% 62%)" }} />
              </div>
              <h2 className="text-lg font-bold mb-1" style={{ color: "hsl(0, 70%, 65%)" }}>Набір закрито</h2>
              <p className="text-sm text-muted-foreground mb-1">
                Набір адміністраторів наразі <span className="font-semibold" style={{ color: "hsl(0, 70%, 65%)" }}>закрито</span> адміністрацією.
              </p>
              <p className="text-xs text-muted-foreground/60 mb-5">Дочекайтеся відкриття набору та спробуйте знову.</p>
              <button
                onClick={() => setRecruitClosed(false)}
                className="w-full rounded-2xl py-3 text-sm font-semibold transition-all active:scale-95"
                style={{ background: "hsl(0, 70%, 20%)", border: "1px solid hsl(0, 70%, 45% / 0.5)", color: "hsl(0, 70%, 65%)" }}
              >
                Зрозуміло
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
    <div className="min-h-screen bg-background pb-20 px-4 pt-4">
      <PageHeader title="ЗАЯВКА В АДМІН" subtitle="Стань адміністратором" backTo="/" />
      <div className="animate-fade-in">
        <div className="flex items-center gap-1.5 mb-6">
          {steps.map((_, i) => (
            <div key={i} className={`flex-1 h-1.5 rounded-full transition-all ${i <= step ? "bg-gradient-to-r from-primary to-secondary" : "bg-muted"}`} />
          ))}
        </div>
        <div className="liquid-glass-strong rounded-2xl p-4 mb-4">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">{step + 1}</span>
            {steps[step].title}
          </h3>
          {steps[step].content}
        </div>
        <div className="flex gap-3">
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} className="liquid-glass rounded-2xl px-4 py-3 text-sm text-muted-foreground active:scale-95 transition-all flex items-center gap-1">
              <ChevronLeft className="w-4 h-4" /> Назад
            </button>
          )}
          {step < steps.length - 1 ? (
            <GradientButton variant="green" className="flex-1" onClick={nextStep}>
              Далі <ChevronRight className="w-4 h-4 inline ml-1" />
            </GradientButton>
          ) : (
            <GradientButton variant="green" className="flex-1" onClick={handleSubmit} disabled={sending}>
              {sending ? <><Clock className="w-4 h-4 inline mr-1 animate-spin" /> Відправляю...</> : <><Send className="w-4 h-4 inline mr-1" /> Відправити</>}
            </GradientButton>
          )}
        </div>
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
            Набір адміністраторів наразі <span className="font-semibold" style={{ color: "hsl(0, 70%, 65%)" }}>закрито</span> адміністрацією.
          </p>
          <p className="text-xs text-muted-foreground/60 mb-5">
            Дочекайтеся відкриття набору та спробуйте знову.
          </p>
          <button
            onClick={() => setRecruitClosed(false)}
            className="w-full rounded-2xl py-3 text-sm font-semibold transition-all active:scale-95"
            style={{
              background: "hsl(0, 70%, 20%)",
              border: "1px solid hsl(0, 70%, 45% / 0.5)",
              color: "hsl(0, 70%, 65%)",
            }}
          >
            Зрозуміло
          </button>
        </div>
      </div>
    )}
    </>
  );
};

export default AdminApplication;
