import { useState } from "react";
import PageHeader from "../../components/PageHeader";
import GradientButton from "../../components/GradientButton";
import { toast } from "sonner";

const Dice = () => {
  const [dice, setDice] = useState([3, 4]);
  const [rolling, setRolling] = useState(false);
  const [bet, setBet] = useState(100);
  const [guess, setGuess] = useState<"high" | "low" | null>(null);

  const roll = () => {
    if (rolling || !guess) return toast.error("Оберіть високе або низьке");
    setRolling(true);

    const interval = setInterval(() => {
      setDice([Math.ceil(Math.random() * 6), Math.ceil(Math.random() * 6)]);
    }, 100);

    setTimeout(() => {
      clearInterval(interval);
      const d1 = Math.ceil(Math.random() * 6);
      const d2 = Math.ceil(Math.random() * 6);
      setDice([d1, d2]);
      setRolling(false);
      const total = d1 + d2;
      const isHigh = total >= 7;
      if ((guess === "high" && isHigh) || (guess === "low" && !isHigh)) {
        toast.success(`${d1} + ${d2} = ${total}. Виграш: ${bet * 2} CR!`);
      } else {
        toast.error(`${d1} + ${d2} = ${total}. Програш: -${bet} CR`);
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background pb-20 px-4 pt-4">
      <PageHeader title="КОСТІ" subtitle="Кинь кубики" backTo="/casino" />

      <div className="animate-fade-in">
        <div className="glass rounded-2xl p-6 mb-4">
          <div className="flex justify-center gap-6 mb-6">
            {dice.map((d, i) => (
              <div key={i} className={`w-20 h-20 rounded-xl glass border border-primary/30 flex items-center justify-center text-3xl font-bold text-primary ${rolling ? "animate-pulse" : ""}`}>
                {d}
              </div>
            ))}
          </div>

          <p className="text-xs text-center text-muted-foreground mb-3">Сума ≥ 7 = Високе, &lt; 7 = Низьке</p>

          <div className="flex gap-3 justify-center mb-4">
            <button
              onClick={() => setGuess("high")}
              className={`px-6 py-2 rounded-xl text-sm font-medium transition-all active:scale-95 ${
                guess === "high" ? "bg-primary/20 border border-primary/40 text-primary" : "glass text-muted-foreground"
              }`}
            >
              Високе ↑
            </button>
            <button
              onClick={() => setGuess("low")}
              className={`px-6 py-2 rounded-xl text-sm font-medium transition-all active:scale-95 ${
                guess === "low" ? "bg-primary/20 border border-primary/40 text-primary" : "glass text-muted-foreground"
              }`}
            >
              Низьке ↓
            </button>
          </div>
        </div>

        <GradientButton variant="green" className="w-full" onClick={roll} disabled={rolling}>
          {rolling ? "Кидаємо..." : `Кинути — ${bet} CR`}
        </GradientButton>
      </div>
    </div>
  );
};

export default Dice;
