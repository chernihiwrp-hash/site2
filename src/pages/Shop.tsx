/* ──────────────────────────────────────────────────────────────
   🔥 НОВЫЙ БЛОК СЕРИИ + NFT МИЛСТОУНОВ
   УДАЛИ СТАРЫЕ:
   - NFT Магазин
   - старый streak block
   И ВСТАВЬ ЭТО ВМЕСТО НИХ
────────────────────────────────────────────────────────────── */

const getSmoothFlameColor = (streak: number) => {
  // плавный переход между цветами
  if (streak <= 15) {
    const t = streak / 15;
    return `rgb(${250}, ${200 - t * 60}, ${20})`; // yellow -> orange
  }

  if (streak <= 50) {
    const t = (streak - 15) / 35;
    return `rgb(${255 - t * 90}, ${80 - t * 20}, ${20 + t * 80})`; // orange -> red/pink
  }

  if (streak <= 150) {
    const t = (streak - 50) / 100;
    return `rgb(${170 + t * 30}, ${40 - t * 20}, ${255})`; // purple
  }

  if (streak <= 365) {
    const t = (streak - 150) / 215;
    return `rgb(${100 - t * 70}, ${255}, ${180 - t * 100})`; // green
  }

  return "#3b82f6"; // blue
};

const AnimatedFlame = ({ streak }: { streak: number }) => {
  const color = getSmoothFlameColor(streak);

  return (
    <div className="relative flex items-center justify-center">
      <div
        className="relative"
        style={{
          filter: `drop-shadow(0 0 15px ${color}) drop-shadow(0 0 35px ${color})`,
          animation: "flameFloat 3s ease-in-out infinite",
        }}
      >
        <Flame
          size={42}
          fill={color}
          color={color}
          strokeWidth={2}
          style={{
            animation: "flamePulse 2s ease-in-out infinite",
          }}
        />

        {/* glow */}
        <div
          className="absolute inset-0 rounded-full blur-2xl opacity-60"
          style={{
            background: color,
            transform: "scale(1.4)",
            animation: "glowPulse 2.5s ease-in-out infinite",
          }}
        />
      </div>

      <style>{`
        @keyframes flamePulse {
          0% {
            transform: scale(1) rotate(-2deg);
          }
          50% {
            transform: scale(1.12) rotate(2deg);
          }
          100% {
            transform: scale(1) rotate(-2deg);
          }
        }

        @keyframes flameFloat {
          0% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-4px);
          }
          100% {
            transform: translateY(0px);
          }
        }

        @keyframes glowPulse {
          0% {
            opacity: 0.4;
          }
          50% {
            opacity: 0.9;
          }
          100% {
            opacity: 0.4;
          }
        }
      `}</style>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────
   НОВЫЙ UI СЕРИИ
────────────────────────────────────────────────────────────── */

<div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#0d0d0f] p-6 backdrop-blur-xl">

  {/* background glow */}
  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top,#84cc1622,transparent_70%)]" />

  {/* top */}
  <div className="relative flex flex-col items-center justify-center text-center">

    <AnimatedFlame streak={streak} />

    <div className="mt-3 text-4xl font-black tracking-tight text-white">
      {streak}
    </div>

    <div className="text-sm text-zinc-400 uppercase tracking-[0.25em]">
      Серия дней
    </div>

    {streak >= 3 && (
      <div className="mt-3 rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-1 text-xs font-bold text-orange-300">
        BONUS ACTIVE
      </div>
    )}
  </div>

  {/* line */}
  <div className="relative mt-8">
    <div className="absolute top-5 left-0 h-[3px] w-full rounded-full bg-zinc-800" />

    <div
      className="absolute top-5 left-0 h-[3px] rounded-full transition-all duration-700"
      style={{
        width: `${Math.min((streak / 365) * 100, 100)}%`,
        background: getSmoothFlameColor(streak),
        boxShadow: `0 0 20px ${getSmoothFlameColor(streak)}`,
      }}
    />

    <div className="relative flex items-center justify-between">
      {nftMilestones.map((m, idx) => {
        const reached = streak >= m.days;
        const nft = nftGifts[idx];

        return (
          <div
            key={m.days}
            className="flex flex-col items-center"
          >
            <div
              className={`
                relative z-10 flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border
                transition-all duration-500
                ${
                  reached
                    ? "scale-110 border-white/20 bg-white/10"
                    : "border-zinc-800 bg-zinc-900"
                }
              `}
              style={{
                boxShadow: reached
                  ? `0 0 25px ${getSmoothFlameColor(streak)}55`
                  : "none",
              }}
            >
              {nft?.image_url ? (
                <img
                  src={nft.image_url}
                  className={`h-full w-full object-cover ${
                    reached ? "" : "grayscale opacity-40"
                  }`}
                />
              ) : (
                <Gift
                  size={20}
                  className={reached ? "text-white" : "text-zinc-600"}
                />
              )}
            </div>

            <div className="mt-3 text-xs font-bold text-white">
              {m.days}
            </div>

            <div className="text-[10px] text-zinc-500">
              дней
            </div>

            {!reached && (
              <div className="mt-1 text-[10px] text-zinc-600">
                {m.days - streak} left
              </div>
            )}
          </div>
        );
      })}
    </div>
  </div>
</div>
