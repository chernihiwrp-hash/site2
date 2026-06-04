// =====================================================================
// CookingModal.tsx — модалка приготування. Glassmorphism + анімації.
// =====================================================================
import { useEffect, useState } from "react";

type Props = {
  dishName: string;
  dishIcon?: string;
  durationMs: number;
  reward: number;
  successRate?: number;
  onClose: () => void;
  onResult: (success: boolean) => void;
};

export default function CookingModal({
  dishName, dishIcon, durationMs, reward, successRate = 1, onClose, onResult,
}: Props) {
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const started = Date.now();
    const t = setInterval(() => {
      const p = Math.min(1, (Date.now() - started) / durationMs);
      setProgress(p);
      if (p >= 1) {
        clearInterval(t);
        const ok = Math.random() < successRate;
        setSuccess(ok);
        setDone(true);
        onResult(ok);
      }
    }, 50);
    return () => clearInterval(t);
  }, [durationMs, successRate, onResult]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(18px) saturate(140%)" }}>
      <style>{`
        @keyframes cmSweep {
          0%   { background-position: -150% 0; }
          100% { background-position:  250% 0; }
        }
        @keyframes cmPop {
          0%   { transform: scale(0.4); opacity: 0; }
          60%  { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); }
        }
        @keyframes cmFloat {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-6px); }
        }
        @keyframes cmRing {
          0%   { transform: rotate(0deg);   opacity: 0.7; }
          100% { transform: rotate(360deg); opacity: 0.7; }
        }
        @keyframes cmFadeUp {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
        @keyframes cmConfetti {
          0%   { transform: translate(0,0) scale(0); opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) scale(1); opacity: 0; }
        }
        .cm-card {
          background: linear-gradient(160deg, rgba(255,255,255,0.10), rgba(255,255,255,0.03));
          backdrop-filter: blur(28px) saturate(180%);
          border: 1px solid rgba(255,255,255,0.16);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.15),
            0 28px 70px rgba(0,0,0,0.55);
          animation: cmFadeUp .45s cubic-bezier(.2,.8,.2,1) both;
        }
        .cm-silhouette {
          width: 160px; height: 160px;
          border-radius: 50%;
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(circle at 35% 30%, rgba(255,255,255,0.20), transparent 50%),
            linear-gradient(160deg, rgba(255,255,255,0.10), rgba(255,255,255,0.02));
          backdrop-filter: blur(18px) saturate(160%);
          border: 1px solid rgba(255,255,255,0.18);
          box-shadow:
            inset 0 2px 0 rgba(255,255,255,0.18),
            inset 0 -10px 30px rgba(0,0,0,0.45),
            0 10px 40px rgba(0,0,0,0.5);
          animation: cmFloat 3.4s ease-in-out infinite;
        }
        .cm-silhouette::after {
          content: "";
          position: absolute; inset: 0;
          background: linear-gradient(110deg,
            transparent 30%,
            hsl(84 81% 55% / 0.55) 45%,
            hsl(84 90% 75% / 0.95) 50%,
            hsl(84 81% 55% / 0.55) 55%,
            transparent 70%);
          background-size: 200% 100%;
          animation: cmSweep 1.6s linear infinite;
          mix-blend-mode: screen;
        }
        .cm-icon {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 64px;
          filter: drop-shadow(0 6px 14px rgba(0,0,0,0.6));
        }
        .cm-ring {
          position: absolute; inset: -10px;
          border-radius: 50%;
          border: 2px dashed hsl(84 81% 55% / 0.45);
          animation: cmRing 9s linear infinite;
        }
        .cm-result-icon { animation: cmPop .45s cubic-bezier(.2,1.4,.4,1) both; }
        .cm-confetti {
          position: absolute; left: 50%; top: 50%;
          width: 8px; height: 8px; border-radius: 2px;
          animation: cmConfetti 1.2s cubic-bezier(.2,.8,.2,1) forwards;
        }
      `}</style>

      <div className="w-full max-w-[340px] rounded-3xl p-6 cm-card relative">
        {!done ? (
          <>
            <div className="text-center text-[11px] uppercase tracking-[0.25em] text-white/55 mb-5">
              Готуємо страву…
            </div>
            <div className="flex justify-center mb-6 relative" style={{ height: 180 }}>
              <div className="cm-silhouette">
                {dishIcon && <div className="cm-icon">{dishIcon}</div>}
              </div>
              <div className="cm-ring" style={{ width: 180, height: 180, left: "50%", top: 0, transform: "translateX(-50%)" }} />
            </div>
            <div className="text-center text-white font-bold text-lg tracking-[0.15em] mb-4">{dishName}</div>
            <div className="h-2 rounded-full overflow-hidden relative"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="h-full rounded-full transition-all duration-100"
                style={{
                  width: `${progress * 100}%`,
                  background: "linear-gradient(90deg, hsl(84 81% 50%), hsl(84 90% 75%))",
                  boxShadow: "0 0 16px hsl(84 81% 55% / 0.7)",
                }} />
            </div>
            <div className="text-center text-[10px] text-white/45 mt-2 tracking-wider">
              {Math.round(progress * 100)}%
            </div>
          </>
        ) : (
          <>
            {success && (
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                {Array.from({ length: 14 }).map((_, i) => {
                  const angle = (i / 14) * Math.PI * 2;
                  const dist = 80 + Math.random() * 60;
                  const colors = ["#bef264", "#fde047", "#f0abfc", "#67e8f9", "#fca5a5"];
                  return (
                    <span key={i} className="cm-confetti"
                      style={{
                        background: colors[i % colors.length],
                        ["--tx" as any]: `${Math.cos(angle) * dist}px`,
                        ["--ty" as any]: `${Math.sin(angle) * dist}px`,
                        animationDelay: `${i * 25}ms`,
                      }} />
                  );
                })}
              </div>
            )}
            <div className="text-center text-6xl mb-3 cm-result-icon">{success ? "✅" : "❌"}</div>
            <div className="text-center text-white text-lg font-bold mb-1">
              {success ? "Успішно!" : "Не вдалось"}
            </div>
            <div className="text-center text-white/60 text-sm mb-5">
              {success ? `+${reward} грн` : "Інгредієнти витрачено"}
            </div>
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl font-semibold text-black transition-all active:scale-95"
              style={{
                background: "linear-gradient(95deg, hsl(84 81% 50%), hsl(84 90% 70%))",
                boxShadow: "0 12px 28px hsl(84 81% 44% / 0.45)",
              }}>
              Готово
            </button>
          </>
        )}
      </div>
    </div>
  );
}
