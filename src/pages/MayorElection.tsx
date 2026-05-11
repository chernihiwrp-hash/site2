import { useState, useEffect } from "react";
import PageHeader from "../components/PageHeader";
import NeonCard from "../components/NeonCard";
import GradientButton from "../components/GradientButton";
import { User, Crown, Vote, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { store } from "../lib/store";
import type { MayorCandidate } from "../lib/store";

const VOTE_KEY = "crp_mayor_voted";

const MayorElection = () => {
  const [candidates, setCandidates] = useState<MayorCandidate[]>([]);
  const [voted, setVoted] = useState<number | null>(() => {
    const v = localStorage.getItem(VOTE_KEY);
    return v ? Number(v) : null;
  });
  const [showBio, setShowBio] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    store.getCandidates().then(data => { setCandidates(data); setLoading(false); });
  }, []);

  const totalVotes = candidates.reduce((s, c) => s + c.votes, 0);

  const handleVote = async (id: number) => {
    if (voted !== null) return toast.error("Ви вже проголосували!");
    await store.voteCandidate(id);
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, votes: c.votes + 1 } : c));
    setVoted(id);
    localStorage.setItem(VOTE_KEY, String(id));
    toast.success("Ваш голос враховано!");
  };

  return (
    <div className="min-h-screen bg-background pb-20 px-4 pt-4">
      <PageHeader title="ВИБОРИ МЕРА" subtitle="Голосування" backTo="/" />

      <div className="liquid-glass-card rounded-2xl p-4 mb-4 animate-fade-in"
        style={{ borderColor: "hsl(45 100% 55% / 0.2)", boxShadow: "0 0 20px hsl(45 100% 55% / 0.08)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5" style={{ color: "hsl(45 100% 55%)" }} />
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
            const isMayor = pct >= 75;
            return (
              <div key={c.id} className="animate-slide-up" style={{ animationDelay: `${i * 80}ms` }}>
                <NeonCard glowColor={isMayor ? "yellow" : "green"}>
                  {isMayor && (
                    <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl"
                      style={{ background: "hsl(45 100% 55% / 0.12)", border: "1px solid hsl(45 100% 55% / 0.3)", boxShadow: "0 0 20px hsl(45 100% 55% / 0.15)" }}>
                      <Crown className="w-4 h-4 animate-bounce" style={{ color: "hsl(45 100% 55%)" }} />
                      <span className="text-xs font-black uppercase tracking-wider" style={{ color: "hsl(45 100% 55%)" }}>
                        МЕР МІСТА
                      </span>
                      <div className="ml-auto w-2 h-2 rounded-full animate-pulse" style={{ background: "hsl(45 100% 55%)" }} />
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl border flex items-center justify-center shrink-0"
                      style={isMayor ? { background: "hsl(45 100% 55% / 0.15)", borderColor: "hsl(45 100% 55% / 0.4)", boxShadow: "0 0 16px hsl(45 100% 55% / 0.3)" } : { background: "hsl(var(--primary) / 0.1)", borderColor: "hsl(var(--primary) / 0.2)" }}>
                      {isMayor ? <Crown className="w-6 h-6" style={{ color: "hsl(45 100% 55%)" }} /> : <User className="w-6 h-6 text-primary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        {c.name}
                        {isMayor && <span className="text-[9px] px-1.5 py-0.5 rounded-md font-black" style={{ background: "hsl(45 100% 55% / 0.2)", color: "hsl(45 100% 55%)", border: "1px solid hsl(45 100% 55% / 0.3)" }}>МЕР</span>}
                      </h3>
                      <p className="text-[10px] text-muted-foreground line-clamp-1">{c.program}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-bold text-sm" style={{ color: isMayor ? "hsl(45 100% 55%)" : "hsl(var(--primary))" }}>{c.votes}</span>
                      <p className="text-[9px] text-muted-foreground">{pct}%</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1.5 rounded-full bg-muted mb-3 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: isMayor ? "linear-gradient(90deg, hsl(45 100% 55%), hsl(38 100% 60%))" : "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--secondary)))" }} />
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
