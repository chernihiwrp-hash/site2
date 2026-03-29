import { useState, useEffect } from "react";
import PageHeader from "../components/PageHeader";
import NeonCard from "../components/NeonCard";
import GradientButton from "../components/GradientButton";
import { Megaphone, ThumbsUp, ThumbsDown, Lightbulb, FileText, Send } from "lucide-react";
import { toast } from "sonner";
import { store } from "../lib/store";
import type { CityVoiceItem } from "../lib/store";

const CityVoice = () => {
  const [ideas, setIdeas] = useState<CityVoiceItem[]>([]);
  const [message, setMessage] = useState("");
  const [type, setType] = useState<"idea" | "petition">("idea");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  
  // Зберігаємо голоси в localStorage, щоб вони не зникали при оновленні сторінки
  const [userVotes, setUserVotes] = useState<Record<number, 'like' | 'dislike'>>(() => {
    const saved = localStorage.getItem('city_votes_data');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('city_votes_data', JSON.stringify(userVotes));
  }, [userVotes]);

  useEffect(() => {
    setLoading(true);
    store.getCityVoice().then(data => { 
      setIdeas(data); 
      setLoading(false); 
    });
  }, []);

  const handleLike = async (id: number) => {
    const currentVote = userVotes[id];
    if (currentVote === 'like') return toast.info("Ви вже підтримали це");

    try {
      // Якщо раніше був дизлайк, знімаємо його в базі
      if (currentVote === 'dislike') {
        await store.decrementCityVoiceDislikes(id);
      }
      
      await store.incrementCityVoiceLikes(id);
      setUserVotes(prev => ({ ...prev, [id]: 'like' }));
      
      const updatedIdeas = await store.getCityVoice();
      setIdeas(updatedIdeas);

      // Стильне зелене сповіщення
      toast.success("ГОЛОС ЗАРАХОВАНО: ЗА", {
        className: "bg-black border-primary text-primary font-bold uppercase text-[10px] tracking-widest",
      });
    } catch (error) {
      toast.error("Помилка з'єднання з сервером");
    }
  };

  const handleDislike = async (id: number) => {
    const currentVote = userVotes[id];
    if (currentVote === 'dislike') return toast.info("Ви вже проголосували проти");

    try {
      // Якщо раніше був лайк, знімаємо його в базі
      if (currentVote === 'like') {
        await store.decrementCityVoiceLikes(id);
      }

      await store.incrementCityVoiceDislikes(id);
      setUserVotes(prev => ({ ...prev, [id]: 'dislike' }));
      
      const updatedIdeas = await store.getCityVoice();
      setIdeas(updatedIdeas);

      // Стильне червоне сповіщення
      toast.error("ГОЛОС ЗАРАХОВАНО: ПРОТИ", {
        className: "bg-black border-destructive text-destructive font-bold uppercase text-[10px] tracking-widest",
      });
    } catch (error) {
      toast.error("Помилка з'єднання з сервером");
    }
  };

  const submit = async () => {
    if (!message.trim()) return toast.error("Напишіть повідомлення");
    setSending(true);
    // Тут можна замінити "Гравець" на динамічний нік, якщо він є в системі
    await store.submitCityVoice("Гравець", message, type);
    const updated = await store.getCityVoice();
    setIdeas(updated);
    toast.success(type === "idea" ? "Ідею відправлено!" : "Петицію створено!");
    setMessage("");
    setSending(false);
  };

  const statusColors = {
    active: "bg-primary/15 text-primary border-primary/20",
    approved: "bg-secondary/15 text-secondary border-secondary/20",
    rejected: "bg-destructive/15 text-destructive border-destructive/20"
  };
  const statusLabels = { active: "Активна", approved: "Схвалено", rejected: "Відхилено" };

  return (
    <div className="min-h-screen bg-background pb-20 px-4 pt-4">
      <PageHeader title="ГОЛОС МІСТА" subtitle="Ідеї та петиції" backTo="/" />

      {/* ФОРМА СТВОРЕННЯ */}
      <div className="liquid-glass-card rounded-2xl p-4 mb-4 animate-fade-in">
        <div className="flex gap-2 mb-3">
          {(["idea", "petition"] as const).map(t => (
            <button key={t} onClick={() => setType(t)}
              className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-2.5 rounded-xl border transition-all active:scale-95 ${type === t ? "bg-primary/20 border-primary/30 text-primary" : "liquid-glass text-muted-foreground"}`}>
              {t === "idea" ? <Lightbulb className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
              {t === "idea" ? "Ідея" : "Петиція"}
            </button>
          ))}
        </div>
        <textarea value={message} onChange={e => setMessage(e.target.value)}
          placeholder={type === "idea" ? "Ваша ідея для міста..." : "Текст петиції..."}
          className="w-full liquid-glass rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none h-24 bg-transparent" />
        <GradientButton variant="green" className="w-full mt-3 py-2 text-xs" onClick={submit} disabled={sending}>
          <Send className="w-3.5 h-3.5 inline mr-1.5" />
          {sending ? "Відправляю..." : "Відправити"}
        </GradientButton>
      </div>

      {/* СПИСОК КАРТОК */}
      {loading ? (
        <div className="text-center py-8">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Завантаження...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ideas.map((idea, i) => (
            <div key={idea.id} className="animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
              <NeonCard glowColor="green">
                <div className="flex items-center gap-2 mb-2">
                  {idea.type === "idea"
                    ? <Lightbulb className="w-3.5 h-3.5 text-neon-yellow" />
                    : <FileText className="w-3.5 h-3.5 text-primary" />}
                  <span className="text-[10px] text-muted-foreground font-medium uppercase">
                    {idea.type === "idea" ? "Ідея" : "Петиція"}
                  </span>
                  <span className={`text-[9px] px-2 py-0.5 rounded-md border ml-auto ${statusColors[idea.status]}`}>
                    {statusLabels[idea.status]}
                  </span>
                </div>
                
                <p className="text-[11px] text-foreground mb-2 leading-relaxed">{idea.text}</p>
                
                <div className="flex items-center justify-between border-t border-white/5 pt-2">
                  <span className="text-[10px] text-muted-foreground">— {idea.author}</span>
                  
                  <div className="flex items-center gap-3">
                    {/* КНОПКА ЗА */}
                    <button 
                      onClick={() => handleLike(idea.id)}
                      className={`flex items-center gap-1.5 text-[10px] transition-all active:scale-90 ${
                        userVotes[idea.id] === 'like' 
                          ? 'text-primary font-bold drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]' 
                          : 'text-muted-foreground hover:text-primary/70'
                      }`}
                    >
                      <ThumbsUp className={`w-3.5 h-3.5 ${userVotes[idea.id] === 'like' ? 'fill-primary/20' : ''}`} /> 
                      {idea.likes}
                    </button>

                    {/* КНОПКА ПРОТИ */}
                    <button 
                      onClick={() => handleDislike(idea.id)}
                      className={`flex items-center gap-1.5 text-[10px] transition-all active:scale-90 ${
                        userVotes[idea.id] === 'dislike' 
                          ? 'text-destructive font-bold drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]' 
                          : 'text-muted-foreground hover:text-destructive/70'
                      }`}
                    >
                      <ThumbsDown className={`w-3.5 h-3.5 ${userVotes[idea.id] === 'dislike' ? 'fill-destructive/20' : ''}`} /> 
                      {idea.dislikes}
                    </button>
                  </div>
                </div>
              </NeonCard>
            </div>
          ))}

          {ideas.length === 0 && (
            <div className="text-center py-12 liquid-glass-card rounded-2xl">
              <Megaphone className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
              <p className="text-xs text-muted-foreground">Поки немає ідей. Будьте першим!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CityVoice;
