import { useState, useEffect, useRef, useCallback } from "react";
import PageHeader from "../../components/PageHeader";
import GradientButton from "../../components/GradientButton";
import { Rocket as RocketIcon } from "lucide-react";
import { toast } from "sonner";

const Rocket = () => {
  const [bet, setBet] = useState(100);
  const [multiplier, setMultiplier] = useState(1.0);
  const [flying, setFlying] = useState(false);
  const [crashed, setCrashed] = useState(false);
  const [cashedOut, setCashedOut] = useState(false);
  const crashPoint = useRef(1.0);
  const animRef = useRef<number>();
  const startTime = useRef(0);
  const [history, setHistory] = useState<{ mult: number; won: boolean }[]>([]);
  const [rocketY, setRocketY] = useState(0);

  const generateCrashPoint = () => {
    // House edge ~5%, harder to win big
    const r = Math.random();
    if (r < 0.05) return 1.0;
    return parseFloat(Math.max(1.0, (0.95 / (1 - r))).toFixed(2));
  };

  const animate = useCallback((timestamp: number) => {
    if (!startTime.current) startTime.current = timestamp;
    const elapsed = (timestamp - startTime.current) / 1000;
    const newMult = parseFloat((1 + elapsed * 0.15 + elapsed * elapsed * 0.02).toFixed(2));

    if (newMult >= crashPoint.current) {
      setMultiplier(crashPoint.current);
      setFlying(false);
      setCrashed(true);
      setRocketY(0);
      setHistory(h => [{ mult: crashPoint.current, won: false }, ...h].slice(0, 10));
      toast.error(`💥 Ракета впала на x${crashPoint.current}! -${bet} CR`);
      return;
    }

    setMultiplier(newMult);
    setRocketY(Math.min(elapsed * 15, 80));
    animRef.current = requestAnimationFrame(animate);
  }, [bet]);

  const startGame = () => {
    crashPoint.current = generateCrashPoint();
    setMultiplier(1.0);
    setFlying(true);
    setCrashed(false);
    setCashedOut(false);
    setRocketY(0);
    startTime.current = 0;
    animRef.current = requestAnimationFrame(animate);
  };

  const cashOut = () => {
    if (!flying) return;
    if (animRef.current) cancelAnimationFrame(animRef.current);
    setFlying(false);
    setCashedOut(true);
    const win = Math.floor(bet * multiplier);
    setHistory(h => [{ mult: multiplier, won: true }, ...h].slice(0, 10));
    toast.success(`Забрали на x${multiplier.toFixed(2)}! +${win} CR`);
  };

  useEffect(() => {
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, []);

  const getMultiplierColor = () => {
    if (crashed) return "text-destructive";
    if (cashedOut) return "text-primary";
    if (multiplier >= 5) return "text-neon-yellow";
    if (multiplier >= 3) return "text-neon-cyan";
    if (multiplier >= 2) return "text-secondary";
    return "text-primary";
  };

  return (
    <div className="min-h-screen bg-background pb-20 px-4 pt-4">
      <PageHeader title="РАКЕТА" subtitle="Crash гра" backTo="/casino" />

      <div className="animate-fade-in">
        <div className="liquid-glass-card rounded-2xl p-6 mb-4 text-center relative overflow-hidden" style={{ minHeight: 280 }}>
          <div className="absolute inset-0 bg-gradient-to-t from-primary/5 via-transparent to-transparent pointer-events-none" />

          {/* Rocket with smooth movement */}
          <div
            className="relative transition-transform duration-100 ease-out"
            style={{ transform: `translateY(-${rocketY}px)` }}
          >
            <RocketIcon
              className={`w-16 h-16 mx-auto mb-4 transition-all duration-300 ${
                crashed ? "text-destructive rotate-180 opacity-50" : cashedOut ? "text-primary" : "text-primary"
              }`}
              style={flying ? { filter: "drop-shadow(0 0 20px hsl(84 81% 44% / 0.6))" } : undefined}
            />
            {flying && (
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-12 opacity-60"
                style={{
                  background: "linear-gradient(to bottom, hsl(45 100% 55% / 0.6), hsl(0 70% 50% / 0.3), transparent)",
                  borderRadius: "0 0 50% 50%",
                  filter: "blur(4px)",
                }}
              />
            )}
          </div>

          <div className={`text-5xl font-black font-display mb-2 ${getMultiplierColor()} transition-colors`}
            style={!crashed && !cashedOut && multiplier > 1.5 ? { textShadow: `0 0 20px currentColor` } : undefined}>
            x{multiplier.toFixed(2)}
          </div>

          {crashed && <p className="text-sm text-destructive font-bold">💥 CRASHED</p>}
          {cashedOut && <p className="text-sm text-primary font-bold">✅ ЗАБРАНО</p>}

          {history.length > 0 && (
            <div className="flex gap-1.5 justify-center mt-4 flex-wrap">
              {history.map((h, i) => (
                <span key={i} className={`text-[10px] px-2 py-0.5 rounded-md font-mono ${h.won ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"}`}>
                  x{h.mult.toFixed(2)}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-center gap-2 mt-4">
            <span className="text-xs text-muted-foreground">Ставка:</span>
            {[50, 100, 500, 1000].map(b => (
              <button key={b} onClick={() => !flying && setBet(b)}
                className={`text-[11px] px-3 py-1.5 rounded-lg border transition-all active:scale-95 ${bet === b ? "bg-primary/15 border-primary/30 text-primary" : "liquid-glass text-muted-foreground"}`}
              >{b}</button>
            ))}
          </div>
        </div>

        {flying ? (
          <GradientButton variant="yellow" className="w-full text-lg" onClick={cashOut}>
            💰 Забрати x{multiplier.toFixed(2)} ({Math.floor(bet * multiplier)} CR)
          </GradientButton>
        ) : (
          <GradientButton variant="cyan" className="w-full" onClick={startGame}>
            🚀 Запустити — {bet} CR
          </GradientButton>
        )}
      </div>
    </div>
  );
};

export default Rocket;
