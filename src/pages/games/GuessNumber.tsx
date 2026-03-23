import { useState } from "react";
import PageHeader from "../../components/PageHeader";
import GradientButton from "../../components/GradientButton";
import { toast } from "sonner";

const GuessNumber = () => {
  const [guess, setGuess] = useState("");
  const [result, setResult] = useState<number | null>(null);
  const [bet] = useState(100);

  const play = () => {
    const num = parseInt(guess);
    if (isNaN(num) || num < 1 || num > 100) return toast.error("Введіть число від 1 до 100");
    const random = Math.ceil(Math.random() * 100);
    setResult(random);
    if (num === random) {
      toast.success(`Точне попадання! Виграш: ${bet * 50} CR!`);
    } else if (Math.abs(num - random) <= 5) {
      toast.success(`Майже! Було ${random}. Виграш: ${bet * 5} CR`);
    } else if (Math.abs(num - random) <= 15) {
      toast.info(`Було ${random}. Близько, але не вистачило.`);
    } else {
      toast.error(`Було ${random}. Програш: -${bet} CR`);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 px-4 pt-4">
      <PageHeader title="ВГАДАЙ ЧИСЛО" subtitle="Від 1 до 100" backTo="/casino" />

      <div className="animate-fade-in">
        <div className="glass rounded-2xl p-6 mb-4 text-center">
          {result !== null && (
            <div className="mb-4">
              <span className="text-5xl font-bold text-primary">{result}</span>
              <p className="text-xs text-muted-foreground mt-1">Випало число</p>
            </div>
          )}

          <input
            type="number"
            min="1"
            max="100"
            value={guess}
            onChange={e => setGuess(e.target.value)}
            placeholder="Ваше число"
            className="w-full glass rounded-xl px-4 py-4 text-center text-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 mb-4"
          />

          <p className="text-[10px] text-muted-foreground">Точне = x50 | ±5 = x5 | ±15 = нічия</p>
        </div>

        <GradientButton variant="cyan" className="w-full" onClick={play}>
          Вгадати — {bet} CR
        </GradientButton>
      </div>
    </div>
  );
};

export default GuessNumber;
