import { useEffect, useState } from "react";

type Props = {
  dishName: string;
  dishIcon?: string; // Ожидается эмодзи или SVG-строка
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
    }, 16); // 60fps для плавности
    return () => clearInterval(t);
  }, [durationMs, successRate, onResult]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 overflow-hidden">
      {/* Фон с сильным размытием */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[12px]" onClick={done ? onClose : undefined} />

      <style>{`
        @keyframes shimmerMove {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(2deg); }
        }
        @keyframes modalShow {
          from { opacity: 0; transform: scale(0.9) translateY(30px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes iconPop {
          0% { transform: scale(0.5); opacity: 0; }
          70% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }

        .glass-card {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05));
          border: 1px solid rgba(255, 255, 255, 0.15);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(20px);
          animation: modalShow 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        /* Эффект скрытого блюда (градиент внутри иконки) */
        .mystery-shape {
          font-size: 100px;
          line-height: 1;
          background: linear-gradient(90deg, #1a1a1a 0%, #808080 25%, #ffffff 50%, #808080 75%, #1a1a1a 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmerMove 3s linear infinite, float 4s ease-in-out infinite;
          filter: drop-shadow(0 10px 20px rgba(0,0,0,0.5));
        }

        .progress-glow {
          box-shadow: 0 0 15px hsl(84, 81%, 55%, 0.5);
        }
      `}</style>

      <div className="glass-card w-full max-w-[360px] rounded-[40px] p-8 relative z-10 flex flex-col items-center">
        {!done ? (
          <>
            <div className="text-white/40 text-[10px] uppercase tracking-[0.3em] font-medium mb-8">
              Магія на кухні...
            </div>

            {/* Контейнер для иконки */}
            <div className="relative mb-10 h-32 flex items-center justify-center">
              <div className="absolute inset-0 bg-lime-500/10 blur-[40px] rounded-full" />
              <div className="mystery-shape">
                {dishIcon || "🍳"}
              </div>
            </div>

            <h3 className="text-white text-xl font-semibold tracking-wide mb-2">
              {dishName}
            </h3>
            
            <div className="w-full mt-6 mb-2">
              <div className="h-[6px] w-full bg-white/10 rounded-full overflow-hidden border border-white/5">
                <div 
                  className="h-full bg-gradient-to-r from-lime-400 to-emerald-300 progress-glow transition-all duration-150 ease-out"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-white/30 text-[10px] font-bold tracking-tighter">PROGRESS</span>
                <span className="text-white/60 text-[10px] font-bold">{Math.round(progress * 100)}%</span>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <div className={`text-7xl mb-6 scale-110 flex justify-center drop-shadow-lg ${success ? 'animate-bounce' : ''}`} 
                 style={{ animation: 'iconPop 0.5s forwards' }}>
              {success ? "✨" : "💨"}
            </div>
            
            <h3 className="text-white text-2xl font-bold mb-2 uppercase tracking-tight">
              {success ? "Шедеврально!" : "От халепа!"}
            </h3>
            
            <p className="text-white/50 text-sm mb-8 px-4 leading-relaxed">
              {success 
                ? `Ви приготували "${dishName}" і отримали винагороду.` 
                : `Блюдо зіпсовано, але досвід залишається з вами.`}
            </p>

            <div className="flex flex-col gap-3 w-full">
              {success && (
                <div className="bg-white/5 border border-white/10 rounded-2xl py-3 px-4 flex items-center justify-between mb-2">
                  <span className="text-white/40 text-xs">Винагорода:</span>
                  <span className="text-lime-400 font-bold">+{reward} ₴</span>
                </div>
              )}

              <button
                onClick={onClose}
                className="w-full py-4 rounded-2xl font-bold text-black transform transition-all active:scale-95 hover:brightness-110 shadow-lg"
                style={{
                  background: success 
                    ? "linear-gradient(135deg, #bef264, #65a30d)" 
                    : "linear-gradient(135deg, #f43f5e, #9f1239)",
                  boxShadow: success 
                    ? "0 10px 25px -5px rgba(132, 204, 22, 0.4)" 
                    : "0 10px 25px -5px rgba(225, 29, 72, 0.4)",
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
