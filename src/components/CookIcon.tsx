import { useEffect, useState } from "react";

// Вспомогательная функция из твоего CookIcon
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
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" />

      <style>{`
        @keyframes shimmerMove {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes modalShow {
          from { opacity: 0; transform: scale(0.95) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        
        .glass-card {
          background: linear-gradient(160deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.04));
          border: 1px solid rgba(255, 255, 255, 0.18);
          box-shadow: 0 40px 80px rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(30px) saturate(150%);
          animation: modalShow 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }

        /* Градиент: темно-серый -> белый -> темно-серый */
        .mystery-gradient {
          background: linear-gradient(90deg, #1a1a1a 0%, #4a4a4a 25%, #ffffff 50%, #4a4a4a 75%, #1a1a1a 100%);
          background-size: 200% 100%;
          animation: shimmerMove 2.5s linear infinite;
        }

        /* Маска для картинки */
        .img-mask {
          mask-image: url(${dishIcon});
          mask-size: contain;
          mask-repeat: no-repeat;
          mask-position: center;
          -webkit-mask-image: url(${dishIcon});
          -webkit-mask-size: contain;
          -webkit-mask-repeat: no-repeat;
          -webkit-mask-position: center;
        }

        /* Для эмодзи используем стандартный background-clip */
        .emoji-mask {
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-size: 100px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .progress-glow {
          box-shadow: 0 0 20px hsl(84, 81%, 55%, 0.6);
        }
      `}</style>

      <div className="glass-card w-full max-w-[360px] rounded-[45px] p-10 relative z-10 flex flex-col items-center">
        {!done ? (
          <>
            <div className="text-white/30 text-[11px] uppercase tracking-[0.4em] font-bold mb-10">
              Приготування...
            </div>

            {/* Контейнер иконки (статичный, без парения) */}
            <div className="relative mb-12 w-32 h-32 flex items-center justify-center">
              {/* Эффект свечения сзади */}
              <div className="absolute inset-0 bg-white/5 blur-[50px] rounded-full" />
              
              {isImg ? (
                // Если это картинка (URL)
                <div className="w-full h-full mystery-gradient img-mask" />
              ) : (
                // Если это Эмодзи
                <div className="mystery-gradient emoji-mask">
                  {dishIcon || "🍳"}
                </div>
              )}
            </div>

            <h3 className="text-white text-2xl font-bold tracking-tight mb-8">
              {dishName}
            </h3>
            
            {/* Большой прогресс-бар */}
            <div className="w-full space-y-3">
              <div className="h-4 w-full bg-black/40 rounded-full p-1 border border-white/5 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-lime-500 via-lime-400 to-emerald-400 rounded-full progress-glow transition-all duration-150 ease-linear"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <div className="flex justify-between px-1">
                <span className="text-white/20 text-[10px] font-black tracking-widest">LOADING</span>
                <span className="text-lime-400/80 text-[11px] font-bold">{Math.round(progress * 100)}%</span>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center w-full animate-in fade-in zoom-in duration-300">
            <div className="text-7xl mb-6 drop-shadow-2xl">
              {success ? "✨" : "💨"}
            </div>
            
            <h3 className="text-white text-3xl font-black mb-2 tracking-tight">
              {success ? "ГОТОВО!" : "НЕ ВДАЛОСЬ"}
            </h3>
            
            <p className="text-white/40 text-sm mb-10">
              {success ? "Блюдо виглядає апетитно" : "Інгредієнти було зіпсовано"}
            </p>

            <div className="space-y-4 w-full">
              {success && (
                <div className="bg-white/5 border border-white/10 rounded-3xl py-4 px-6 flex items-center justify-between">
                  <span className="text-white/40 text-xs font-bold uppercase tracking-widest">Винагорода</span>
                  <span className="text-lime-400 text-xl font-black">+{reward} ₴</span>
                </div>
              )}

              <button
                onClick={onClose}
                className="w-full py-5 rounded-3xl font-black text-black uppercase tracking-widest transform transition-all active:scale-95 shadow-2xl"
                style={{
                  background: success 
                    ? "linear-gradient(135deg, #bef264, #84cc16)" 
                    : "linear-gradient(135deg, #f43f5e, #e11d48)",
                  boxShadow: success 
                    ? "0 15px 35px -10px rgba(132, 204, 22, 0.5)" 
                    : "0 15px 35px -10px rgba(225, 29, 72, 0.5)",
                }}
              >
                {success ? "Чудово" : "Закрити"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
