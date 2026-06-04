import { useEffect, useState } from "react";
import { isImageSrc } from "./CookIcon";
import { CheckCircle2, XCircle, Zap, Ban } from "lucide-react"; // Використовуємо професійні іконки

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
    }, 16);
    return () => clearInterval(t);
  }, [durationMs, successRate, onResult]);

  const isImg = isImageSrc(dishIcon);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 overflow-hidden">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[15px]" onClick={done ? onClose : undefined} />

      <style>{`
        @keyframes shimmerMove {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes modalShow {
          from { opacity: 0; transform: scale(0.95) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes iconIn {
          0% { transform: scale(0.5) rotate(-20deg); opacity: 0; filter: blur(10px); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; filter: blur(0); }
        }

        .glass-card {
          background: linear-gradient(145deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.03));
          border: 1px solid rgba(255, 255, 255, 0.15);
          box-shadow: 0 40px 100px rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(30px) saturate(160%);
          animation: modalShow 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .mystery-gradient {
          background: linear-gradient(90deg, #111 0%, #444 25%, #fff 50%, #444 75%, #111 100%);
          background-size: 200% auto;
          animation: shimmerMove 2.2s linear infinite;
        }

        .silhouette-img {
          width: 130px; height: 130px;
          -webkit-mask-image: url(${dishIcon});
          mask-image: url(${dishIcon});
          -webkit-mask-size: contain; mask-size: contain;
          -webkit-mask-repeat: no-repeat;
          -webkit-mask-position: center;
        }

        .silhouette-emoji {
          font-size: 110px;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          display: flex; align-items: center; justify-content: center;
        }

        .result-glow-success {
          filter: drop-shadow(0 0 20px rgba(163, 230, 53, 0.5));
          animation: iconIn 0.5s cubic-bezier(0.17, 0.89, 0.32, 1.28);
        }

        .result-glow-error {
          filter: drop-shadow(0 0 20px rgba(244, 63, 94, 0.5));
          animation: iconIn 0.5s cubic-bezier(0.17, 0.89, 0.32, 1.28);
        }
      `}</style>

      <div className="glass-card w-full max-w-[370px] rounded-[50px] p-10 relative z-10 flex flex-col items-center">
        {!done ? (
          <>
            <div className="text-white/30 text-[10px] uppercase tracking-[0.5em] font-black mb-10">Процес готування</div>
            
            <div className="relative mb-12 h-36 flex items-center justify-center w-full">
              <div className="absolute inset-0 bg-white/5 blur-[60px] rounded-full" />
              {isImg ? (
                <div className="mystery-gradient silhouette-img" />
              ) : (
                <div className="mystery-gradient silhouette-emoji">
                  {dishIcon || "🍳"}
                </div>
              )}
            </div>

            <h3 className="text-white text-2xl font-black tracking-tight mb-8 text-center">{dishName}</h3>
            
            <div className="w-full">
              <div className="h-4 w-full bg-black/40 rounded-full overflow-hidden border border-white/5 p-1">
                <div 
                  className="h-full bg-gradient-to-r from-lime-500 via-lime-400 to-emerald-400 rounded-full transition-all duration-150 ease-out"
                  style={{ 
                    width: `${progress * 100}%`,
                    boxShadow: "0 0 20px rgba(163, 230, 53, 0.4)"
                  }}
                />
              </div>
              <div className="flex justify-between mt-3 px-1">
                <span className="text-white/20 text-[9px] font-black tracking-widest uppercase">Завантаження</span>
                <span className="text-white/60 text-xs font-bold font-mono">{Math.round(progress * 100)}%</span>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center w-full">
            {/* Іконка результату замість емодзі */}
            <div className="flex justify-center mb-8">
              {success ? (
                <div className="bg-lime-500/10 p-6 rounded-[30px] border border-lime-500/20 result-glow-success">
                  <CheckCircle2 size={70} className="text-lime-400" strokeWidth={1.5} />
                </div>
              ) : (
                <div className="bg-rose-500/10 p-6 rounded-[30px] border border-rose-500/20 result-glow-error">
                  <XCircle size={70} className="text-rose-400" strokeWidth={1.5} />
                </div>
              )}
            </div>
            
            <h3 className="text-white text-3xl font-black mb-3 uppercase tracking-tighter">
              {success ? "Успішно" : "Помилка"}
            </h3>
            
            <p className="text-white/40 text-sm mb-10 px-6 leading-relaxed">
              {success 
                ? `Блюдо "${dishName}" приготовано ідеально!` 
                : `Процес перервано, інгредієнти втрачено.`}
            </p>

            <div className="flex flex-col gap-4 w-full">
              {success && (
                <div className="bg-white/5 border border-white/10 rounded-[28px] py-4 px-6 flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Zap size={14} className="text-lime-400 fill-lime-400/20" />
                    <span className="text-white/30 text-xs font-bold uppercase tracking-widest">Бонус:</span>
                  </div>
                  <span className="text-lime-400 text-2xl font-black">+{reward} ₴</span>
                </div>
              )}

              <button
                onClick={onClose}
                className="w-full py-5 rounded-[26px] font-black text-black uppercase tracking-[0.2em] text-xs transform transition-all active:scale-95 shadow-2xl"
                style={{
                  background: success 
                    ? "linear-gradient(135deg, #bef264, #84cc16)" 
                    : "linear-gradient(135deg, #f43f5e, #e11d48)",
                  boxShadow: success 
                    ? "0 20px 40px -10px rgba(132, 204, 22, 0.4)" 
                    : "0 20px 40px -10px rgba(225, 29, 72, 0.4)",
                  color: success ? "#064e3b" : "#fff"
                }}
              >
                {success ? "Забрати" : "Закрити"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
