// =====================================================================
// CookingModal.tsx — модалка приготування з ефектом «свіп-градієнта»
// =====================================================================
import { useEffect, useState } from "react";

type Props = {
  dishName: string;
  dishIcon?: string;     // emoji або URL
  durationMs: number;
  reward: number;
  successRate?: number;  // 0..1, за замовч. 1 (завжди успіх)
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
      style={{ background: "rgba(0,0,0,0.78)", backdropFilter: "blur(10px)" }}>
      <style>{`
        @keyframes cookSweep {
          0%   { background-position: -150% 0; }
          100% { background-position:  250% 0; }
        }
        .cook-silhouette {
          width: 180px; height: 110px;
          border-radius: 50%;
          background: #2a2a2a;
          position: relative; overflow: hidden;
          box-shadow: inset 0 0 30px rgba(0,0,0,0.6);
        }
        .cook-silhouette::after {
          content: "";
          position: absolute; inset: 0;
          background: linear-gradient(110deg,
            transparent 30%,
            hsl(84 81% 55% / 0.55) 45%,
            hsl(84 81% 70% / 0.85) 50%,
            hsl(84 81% 55% / 0.55) 55%,
            transparent 70%);
          background-size: 200% 100%;
          animation: cookSweep 1.6s linear infinite;
          mix-blend-mode: screen;
        }
      `}</style>

      <div className="w-full max-w-[340px] rounded-3xl p-6"
        style={{
          background: "linear-gradient(160deg, #161616 0%, #0c0c0c 100%)",
          border: "1px solid hsl(0 0% 100% / 0.08)",
          boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
        }}>
        {!done ? (
          <>
            <div className="text-center text-sm text-white/70 mb-5">Перевіряємо рецепт…</div>
            <div className="flex justify-center mb-5">
              <div className="cook-silhouette" />
            </div>
            <div className="text-center text-white font-bold text-lg tracking-wide mb-4">{dishName}</div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(0 0% 100% / 0.08)" }}>
              <div className="h-full rounded-full transition-all"
                style={{
                  width: `${progress * 100}%`,
                  background: "linear-gradient(90deg, hsl(84 81% 44%), hsl(84 81% 70%))",
                  boxShadow: "0 0 12px hsl(84 81% 55% / 0.6)",
                }} />
            </div>
          </>
        ) : (
          <>
            <div className="text-center text-5xl mb-3">{success ? "✅" : "❌"}</div>
            <div className="text-center text-white text-lg font-bold mb-1">
              {success ? "Успішно!" : "Не вдалось"}
            </div>
            <div className="text-center text-white/60 text-sm mb-5">
              {success ? `+${reward} грн` : "Інгредієнти витрачено"}
            </div>
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl font-semibold text-black"
              style={{ background: "linear-gradient(90deg, hsl(84 81% 44%), hsl(84 81% 60%))" }}>
              Готово
            </button>
          </>
        )}
      </div>
    </div>
  );
}
