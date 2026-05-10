import { useState, useEffect } from "react";
import PageHeader from "../components/PageHeader";
import NeonCard from "../components/NeonCard";
import GradientButton from "../components/GradientButton";
import { User, Crown, Vote, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { store } from "../lib/store";
import type { MayorCandidate } from "../lib/store";

const MayorElection = () => {
  const [candidates, setCandidates] = useState<MayorCandidate[]>([]);
  const [voted, setVoted] = useState<number | null>(null);
  const [showBio, setShowBio] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    store.getCandidates().then(data => { 
      setCandidates(data); 
      setLoading(false); 
      const nick = localStorage.getItem("crp_nick") || "";
      const savedVote = localStorage.getItem(`crp_voted_mayor_${nick}`);
      if (savedVote) setVoted(Number(savedVote));
    });
  }, []);

  const totalVotes = candidates.reduce((s, c) => s + c.votes, 0);

  const handleVote = async (id: number) => {
    const nick = localStorage.getItem("crp_nick") || "";
    if (voted !== null || localStorage.getItem(`crp_voted_mayor_${nick}`)) return toast.error("Ви вже проголосували!");
    const success = await store.voteCandidate(id);
    if (!success) return toast.error("Помилка або ви вже голосували");
    
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, votes: c.votes + 1 } : c));
    setVoted(id);
    localStorage.setItem(`crp_voted_mayor_${nick}`, String(id));
    toast.success("Ваш голос враховано!");
  };

  return (
    <div className="min-h-screen bg-background pb-20 px-4 pt-4">
      <PageHeader title="ВИБОРИ МЕРА" subtitle="Голосування" backTo="/" />

      <div className="liquid-glass-card rounded-2xl p-4 mb-4 animate-fade-in"
        style={{ borderColor: "hsl(45 100% 55% / 0.2)", boxShadow: "0 0 20px hsl(45 100% 55% / 0.08)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-500" />
            <span className="text-sm font-semibold text-foreground">Вибори мера</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
            style={{ background: "hsl(142 71% 45% / 0.12)", border: "1px solid hsl(142 71% 45% / 0.2)" }}>
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] text-primary font-medium">Активне</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-2">
          <Vote className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="text-[11px] text-muted-foreground">Всього голосів: {totalVotes}</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Завантаження кандидатів...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {candidates.map((c, i) => {
            const pct = totalVotes > 0 ? Math.round((c.votes / totalVotes) * 100) : 0;
            const isVoted = voted === c.id;
            const isWinner = pct >= 75 && totalVotes > 5; // Highlight if clear leader
            
            return (
              <div key={c.id} className="animate-slide-up" style={{ animationDelay: `${i * 80}ms` }}>
                <NeonCard glowColor={isWinner ? "amber" : "green"}>
                  <div className="flex items-center gap-3 mb-3 relative">
                    {isWinner && (
                      <div className="absolute -top-6 -left-2 rotate-[-15deg] animate-bounce">
                        <Crown className="w-8 h-8 text-yellow-400 fill-yellow-400/20 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]" />
                      </div>
                    )}
                    <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${isWinner ? 'bg-yellow-400/15 border-yellow-400/30' : 'bg-primary/10 border-primary/20'}`}>
                      <User className={`w-6 h-6 ${isWinner ? 'text-yellow-400' : 'text-primary'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className={`text-sm font-semibold ${isWinner ? 'text-yellow-400' : 'text-foreground'}`}>{c.name}</h3>
                        {isWinner && <span className="text-[8px] font-black bg-yellow-400 text-black px-1.5 py-0.5 rounded uppercase tracking-tighter">Переможець</span>}
                      </div>
                      <p className="text-[10px] text-muted-foreground line-clamp-1">{c.program}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`font-bold text-sm ${isWinner ? 'text-yellow-400' : 'text-primary'}`}>{c.votes}</span>
                      <p className="text-[9px] text-muted-foreground">{pct}%</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1.5 rounded-full bg-muted mb-3 overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-1000 ${isWinner ? 'bg-gradient-to-r from-yellow-400 to-orange-500 shadow-[0_0_8px_rgba(250,204,21,0.5)]' : 'bg-gradient-to-r from-primary to-secondary'}`}
                      style={{ width: `${pct}%` }} />
                  </div>

                  <div className="flex gap-2 items-center">
                    <button onClick={() => setShowBio(showBio === c.id ? null : c.id)}
                      className="text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {showBio === c.id ? "Сховати" : "Програма"}
                    </button>
                    <div className="flex-1" />
                    {isVoted ? (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/15 border border-primary/25">
                        <CheckCircle className="w-3.5 h-3.5 text-primary" />
                        <span className="text-[10px] text-primary font-medium">Проголосовано</span>
                      </div>
                    ) : (
                      <GradientButton variant="green" className="py-1.5 px-4 text-[11px]" onClick={() => handleVote(c.id)}>
                        Голосувати
                      </GradientButton>
                    )}
                  </div>

                  {showBio === c.id && (
                    <div className="mt-3 liquid-glass rounded-xl p-3 animate-fade-in">
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{c.bio || c.program}</p>
                    </div>
                  )}
                </NeonCard>
              </div>
            );
          })}
          {candidates.length === 0 && (
            <div className="text-center py-12 liquid-glass-card rounded-2xl">
              <Crown className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
              <p className="text-xs text-muted-foreground">Кандидатів ще не додано</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MayorElection;
