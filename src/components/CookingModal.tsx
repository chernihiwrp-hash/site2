import { useEffect, useState } from "react";
import { isImageSrc } from "./CookIcon";
import { CheckCircle2, XCircle, Zap, Clock } from "lucide-react";

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
  const [timeLeft, setTimeLeft] = useState(durationMs / 1000);
  const [done, setDone] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const started = Date.now();
    const t = setInterval(() => {
      const now = Date.now();
      const elapsed = now - started;
      const p = Math.min(1, elapsed / durationMs);
      
      setProgress(p);
      setTimeLeft(Math.max(0, (durationMs - elapsed) / 1000));

      if (p >= 1) {
        clearInterval(t);
        const ok = Math.random() < successRate;
        setSuccess(ok);
        setDone(true);
        onResult(ok);
      }
    }, 16);
    return () => clearInterval(t);
  }, [durationMs, successRate, onResult]);

  const isImg = isImageSrc(dishIcon);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 overflow-hidden">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[15px]" onClick={done ? onClose : undefined} />

      <style>{`
        @keyframes shimmerMove { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .glass-card {
          background: linear-gradient(145deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.03));
          border: 1px solid rgba(255, 255, 255, 0.15);
          box-shadow: 0 40px 100px rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(30px);
        }
        /* Світло-сірий замість чорного, темно-білий замість чистого білого */
        .mystery-gradient {
          background: linear-gradient(90deg, #333 0%, #666 25%, #ccc 50%, #666 75%, #333 100%);
          background-size: 200% auto;
          animation: shimmerMove 2.5s linear infinite;
        }
        .silhouette-img {
          width: 180px; height: 180px;
          -webkit-mask-image: url(${dishIcon});
          mask-image: url(${dishIcon});
          -webkit-mask-size: contain; mask-size: contain;
          -webkit-mask-repeat: no-repeat; -webkit-mask-position: center;
        }
        .silhouette-emoji {
          font-size: 140px;
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          display: flex; align-items: center; justify-content: center;
        }
      `}</style>

      <div className="glass-card w-full max-w-[380px] rounded-[50px] p-10 relative z-10 flex flex-col items-center">
        {!done ? (
          <>
            <div className="text-white/30 text-[10px] uppercase tracking-[0.5em] font-black mb-8">Готуємо...</div>
            
            <div className="relative mb-8 h-48 flex items-center justify-center w-full">
              <div className="absolute inset-0 bg-white/5 blur-[60px] rounded-full" />
              {isImg ? (
                <div className="mystery-gradient silhouette-img" />
              ) : (
                <div className="mystery-gradient silhouette-emoji">{dishIcon || "🍳"}</div>
              )}
            </div>

            <h3 className="text-white text-2xl font-black mb-4">{dishName}</h3>

            <div className="flex items-center gap-2 text-lime-400/80 mb-6 font-mono text-sm">
              <Clock size={16} /> {timeLeft.toFixed(1)}с
            </div>
            
            <div className="w-full">
              <div className="h-3 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                <div className="h-full bg-gradient-to-r from-lime-500 to-emerald-400 transition-all duration-150"
                  style={{ width: `${progress * 100}%` }} />
              </div>
            </div>
          </>
        ) : (
          <div className="text-center w-full">
            <div className="flex justify-center mb-8">
              {success ? (
                <CheckCircle2 size={80} className="text-lime-400 drop-shadow-[0_0_15px_rgba(163,230,53,0.5)]" />
              ) : (
                <XCircle size={80} className="text-rose-400 drop-shadow-[0_0_15px_rgba(244,63,94,0.5)]" />
              )}
            </div>
            <h3 className="text-white text-3xl font-black mb-3 uppercase">{success ? "Готово!" : "Невдача"}</h3>
            <div className="flex flex-col gap-4 w-full mt-8">
              {success && (
                <div className="bg-white/5 border border-white/10 rounded-3xl py-4 px-6 flex items-center justify-between">
                  <span className="text-white/30 text-xs font-bold uppercase">Нагорода:</span>
                  <span className="text-lime-400 text-xl font-black">+{reward} ₴</span>
                </div>
              )}
              <button onClick={onClose} className="w-full py-5 rounded-[26px] font-black text-black uppercase tracking-widest text-xs"
                style={{ background: success ? "linear-gradient(135deg, #bef264, #84cc16)" : "linear-gradient(135deg, #f43f5e, #e11d48)" }}>
                {success ? "Забрати" : "Закрити"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
