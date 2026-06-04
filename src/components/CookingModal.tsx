import { useEffect, useState } from "react";

// Проверка: ссылка это на картинку или просто эмодзи
function isImageSrc(v?: string | null): boolean {
  if (!v) return false;
  const s = v.trim();
  if (!s) return false;
  if (/^(https?:)?\/\//i.test(s)) return true;
  if (s.startsWith("/")) return true;
  if (s.startsWith("data:image")) return true;
  if (/\.(png|jpe?g|webp|gif|svg|avif)(\?.*)?$/i.test(s)) return true;
  return false;
}

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
      {/* Фон */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[15px]" onClick={done ? onClose : undefined} />

      <style>{`
        @keyframes shimmerMove {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes modalShow {
          from { opacity: 0; transform: scale(0.9) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        .glass-card {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.05));
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(25px);
          animation: modalShow 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        /* Общий градиент для силуэта */
        .mystery-gradient {
          background: linear-gradient(90deg, #1a1a1a 0%, #666666 25%, #ffffff 50%, #666666 75%, #1a1a1a 100%);
          background-size: 200% auto;
          animation: shimmerMove 2.5s linear infinite;
        }

        /* Если dishIcon — это картинка, используем её как маску */
        .silhouette-img {
          width: 120px;
          height: 120px;
          -webkit-mask-image: url(${dishIcon});
          mask-image: url(${dishIcon});
          -webkit-mask-size: contain;
          mask-size: contain;
          -webkit-mask-repeat: no-repeat;
          mask-repeat: no-repeat;
          -webkit-mask-position: center;
          mask-position: center;
        }

        /* Если dishIcon — это эмодзи */
        .silhouette-emoji {
          font-size: 100px;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .progress-glow {
          box-shadow: 0 0 15px hsl(84, 81%, 55%, 0.6);
        }
      `}</style>

      <div className="glass-card w-full max-w-[360px] rounded-[45px] p-10 relative z-10 flex flex-col items-center">
        {!done ? (
          <>
            <div className="text-white/40 text-[11px] uppercase tracking-[0.4em] font-bold mb-10">
              Приготування...
            </div>

            {/* Контейнер для иконки (Статичный) */}
            <div className="relative mb-12 h-32 flex items-center justify-center w-full">
              <div className="absolute inset-0 bg-white/5 blur-[40px] rounded-full" />
              
              {isImg ? (
                /* Силуэт для КАРТИНКИ */
                <div className="mystery-gradient silhouette-img" />
              ) : (
                /* Силуэт для ЭМОДЗИ */
                <div className="mystery-gradient silhouette-emoji">
                  {dishIcon || "🍳"}
                </div>
              )}
            </div>

            <h3 className="text-white text-2xl font-bold tracking-tight mb-8">
              {dishName}
            </h3>
            
            {/* Жирный прогресс-бар */}
            <div className="w-full">
              <div className="h-4 w-full bg-black/30 rounded-full overflow-hidden border border-white/10 p-[3px]">
                <div 
                  className="h-full bg-gradient-to-r from-lime-400 via-lime-300 to-emerald-400 rounded-full progress-glow transition-all duration-150 ease-out"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <div className="flex justify-between mt-3 px-1">
                <span className="text-white/20 text-[10px] font-black tracking-widest uppercase">Progress</span>
                <span className="text-white/70 text-xs font-bold">{Math.round(progress * 100)}%</span>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center w-full">
            <div className={`text-7xl mb-6 flex justify-center drop-shadow-2xl ${success ? 'animate-bounce' : ''}`}>
              {success ? "✨" : "💨"}
            </div>
            
            <h3 className="text-white text-3xl font-black mb-2 uppercase tracking-tighter">
              {success ? "Успішно!" : "Не вдалося"}
            </h3>
            
            <p className="text-white/40 text-sm mb-10 px-4">
              {success 
                ? `Ви майстерно приготували "${dishName}"` 
                : `Щось пішло не так, спробуйте ще раз.`}
            </p>

            <div className="flex flex-col gap-4 w-full">
              {success && (
                <div className="bg-white/5 border border-white/10 rounded-3xl py-4 px-6 flex items-center justify-between mb-2">
                  <span className="text-white/30 text-xs font-bold uppercase tracking-widest">Винагорода:</span>
                  <span className="text-lime-400 text-xl font-black">+{reward} ₴</span>
                </div>
              )}

              <button
                onClick={onClose}
                className="w-full py-5 rounded-[24px] font-black text-black uppercase tracking-widest transform transition-all active:scale-95 shadow-xl"
                style={{
                  background: success 
                    ? "linear-gradient(135deg, #bef264, #84cc16)" 
                    : "linear-gradient(135deg, #f43f5e, #e11d48)",
                  boxShadow: success 
                    ? "0 15px 30px -5px rgba(132, 204, 22, 0.4)" 
                    : "0 15px 30px -5px rgba(225, 29, 72, 0.4)",
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
