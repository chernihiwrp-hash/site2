import { useState } from "react";
import PageHeader from "../../components/PageHeader";
import GradientButton from "../../components/GradientButton";
import { toast } from "sonner";

const symbols = ["🍒", "🍋", "💎", "7️⃣", "🔔", "⭐"];

const Slots = () => {
  const [reels, setReels] = useState(["🍒", "💎", "7️⃣"]);
  const [spinning, setSpinning] = useState(false);
  const [bet, setBet] = useState(100);
  const [spinsToday, setSpinsToday] = useState(0);

  const spin = () => {
    if (spinning) return;
    if (spinsToday >= 30) return toast.error("Ліміт 30 спінів на день вичерпано!");
    setSpinning(true);
    setSpinsToday(s => s + 1);

    const interval = setInterval(() => {
      setReels([
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
      ]);
    }, 80);

    setTimeout(() => {
      clearInterval(interval);
      const result = [
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
      ];
      setReels(result);
      setSpinning(false);
      // Increased win chance
      if (result[0] === result[1] && result[1] === result[2]) {
        toast.success(`🎰 Джекпот! Виграш: ${bet * 10} CR!`);
      } else if (result[0] === result[1] || result[1] === result[2] || result[0] === result[2]) {
        toast.success(`Виграш: ${bet * 2} CR!`);
      } else {
        toast.error(`Програш: -${bet} CR`);
      }
    }, 1800);
  };

  return (
    <div className="min-h-screen bg-background pb-20 px-4 pt-4">
      <PageHeader title="СЛОТИ" subtitle="Крути барабан" backTo="/casino" />

      <div className="animate-fade-in">
        <div className="glass rounded-2xl p-6 mb-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
          
          <p className="text-[10px] text-muted-foreground text-center mb-4">Спінів сьогодні: {spinsToday}/30</p>

          <div className="flex justify-center gap-3 mb-6 relative">
            {reels.map((s, i) => (
              <div
                key={i}
                className={`w-20 h-24 rounded-xl glass border border-primary/20 flex items-center justify-center text-4xl transition-all ${spinning ? "animate-pulse scale-105" : ""}`}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {s}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-xs text-muted-foreground">Ставка:</span>
            {[50, 100, 250, 500].map(b => (
              <button
                key={b}
                onClick={() => setBet(b)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all active:scale-95 ${
                  bet === b ? "bg-primary/15 border-primary/30 text-primary" : "glass text-muted-foreground"
                }`}
              >
                {b} CR
              </button>
            ))}
          </div>
        </div>

        <GradientButton variant="cyan" className="w-full text-base" onClick={spin} disabled={spinning || spinsToday >= 30}>
          {spinning ? "🎰 Крутиться..." : spinsToday >= 30 ? "Ліміт вичерпано" : "🎰 Крутити!"}
        </GradientButton>
      </div>
    </div>
  );
};

export default Slots;
