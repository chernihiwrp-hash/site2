import { useEffect, useMemo, useRef, useState } from "react";
import {
  Flame,
  Gift,
  Lock,
  Sparkles,
  Star,
  Trophy,
  Zap,
  Crown,
  Gem,
  ChevronRight,
} from "lucide-react";

import { toast } from "sonner";
import { supabase } from "../lib/store";
import { dbUpdate, ilike } from "../lib/db";

/* ──────────────────────────────────────────────────────────────
   TYPES
────────────────────────────────────────────────────────────── */

interface NFTGift {
  id: number;
  name: string;
  image_url: string;
  price: number;
}

interface Milestone {
  days: number;
  title: string;
  reward: string;
  icon: any;
}

/* ──────────────────────────────────────────────────────────────
   CONSTANTS
────────────────────────────────────────────────────────────── */

const DAILY_REWARDS = [
  { days: "1-2", reward: 100, color: "#facc15" },
  { days: "3-5", reward: 150, color: "#f97316" },
  { days: "6-7", reward: 200, color: "#22c55e" },
];

const NFT_MILESTONES: Milestone[] = [
  {
    days: 15,
    title: "Bronze",
    reward: "+200 CR",
    icon: Star,
  },
  {
    days: 50,
    title: "Inferno",
    reward: "+350 CR",
    icon: Flame,
  },
  {
    days: 150,
    title: "Mythic",
    reward: "+500 CR",
    icon: Crown,
  },
  {
    days: 365,
    title: "Legend",
    reward: "+800 CR",
    icon: Trophy,
  },
];

/* ──────────────────────────────────────────────────────────────
   FLAME COLOR SYSTEM
────────────────────────────────────────────────────────────── */

const lerp = (a: number, b: number, t: number) => {
  return a + (b - a) * t;
};

const mixColor = (
  c1: [number, number, number],
  c2: [number, number, number],
  t: number
) => {
  return `rgb(
    ${Math.round(lerp(c1[0], c2[0], t))},
    ${Math.round(lerp(c1[1], c2[1], t))},
    ${Math.round(lerp(c1[2], c2[2], t))}
  )`;
};

const getFlameColor = (streak: number) => {
  if (streak <= 15) {
    return mixColor([255, 210, 50], [255, 120, 30], streak / 15);
  }

  if (streak <= 50) {
    return mixColor(
      [255, 120, 30],
      [255, 40, 80],
      (streak - 15) / 35
    );
  }

  if (streak <= 150) {
    return mixColor(
      [255, 40, 80],
      [168, 85, 247],
      (streak - 50) / 100
    );
  }

  if (streak <= 365) {
    return mixColor(
      [168, 85, 247],
      [34, 197, 94],
      (streak - 150) / 215
    );
  }

  return "#3b82f6";
};

/* ──────────────────────────────────────────────────────────────
   ANIMATED BACKGROUND
────────────────────────────────────────────────────────────── */

const AnimatedBackground = () => {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute left-[10%] top-[15%] h-[300px] w-[300px] rounded-full bg-orange-500/10 blur-[120px]" />

      <div className="absolute right-[5%] top-[30%] h-[250px] w-[250px] rounded-full bg-yellow-500/10 blur-[120px]" />

      <div className="absolute bottom-[10%] left-[35%] h-[350px] w-[350px] rounded-full bg-purple-500/10 blur-[150px]" />

      <div className="absolute bottom-[-100px] right-[20%] h-[300px] w-[300px] rounded-full bg-blue-500/10 blur-[150px]" />
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────
   FLAME
────────────────────────────────────────────────────────────── */

const AnimatedFlame = ({ streak }: { streak: number }) => {
  const color = useMemo(() => getFlameColor(streak), [streak]);

  return (
    <div className="relative flex items-center justify-center">
      <div
        className="absolute h-[180px] w-[180px] rounded-full blur-[70px]"
        style={{
          background: color,
          opacity: 0.25,
          animation: "pulseGlow 3s ease-in-out infinite",
        }}
      />

      <div
        style={{
          filter: `
            drop-shadow(0 0 10px ${color})
            drop-shadow(0 0 30px ${color})
            drop-shadow(0 0 60px ${color})
          `,
        }}
      >
        <Flame
          size={96}
          fill={color}
          color={color}
          strokeWidth={2.5}
          style={{
            animation: "flameFloat 3s ease-in-out infinite",
          }}
        />
      </div>

      <style>{`
        @keyframes flameFloat {
          0% {
            transform: translateY(0px) scale(1) rotate(-2deg);
          }

          25% {
            transform: translateY(-5px) scale(1.04) rotate(2deg);
          }

          50% {
            transform: translateY(-8px) scale(1.08) rotate(-2deg);
          }

          75% {
            transform: translateY(-4px) scale(1.03) rotate(1deg);
          }

          100% {
            transform: translateY(0px) scale(1) rotate(-2deg);
          }
        }

        @keyframes pulseGlow {
          0% {
            opacity: 0.2;
            transform: scale(1);
          }

          50% {
            opacity: 0.35;
            transform: scale(1.12);
          }

          100% {
            opacity: 0.2;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────
   HEADER
────────────────────────────────────────────────────────────── */

const Header = ({ balance }: { balance: number }) => {
  return (
    <div className="relative overflow-hidden rounded-[36px] border border-white/10 bg-white/[0.04] p-8 backdrop-blur-2xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_60%)]" />

      <div className="relative flex items-center justify-between">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <div className="rounded-2xl bg-orange-500/15 p-3">
              <Gift className="text-orange-400" size={26} />
            </div>

            <div>
              <h1 className="text-4xl font-black tracking-tight text-white">
                НАГРАДЫ
              </h1>

              <p className="text-zinc-400">
                Ежедневные бонусы и NFT награды
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-yellow-500/20 bg-yellow-500/10 px-6 py-4">
          <div className="text-xs uppercase tracking-[0.3em] text-yellow-200/70">
            balance
          </div>

          <div className="mt-1 flex items-center gap-2 text-3xl font-black text-yellow-300">
            <Zap fill="currentColor" size={26} />
            {balance}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────
   STREAK HERO
────────────────────────────────────────────────────────────── */

const StreakHero = ({ streak }: { streak: number }) => {
  const color = getFlameColor(streak);

  return (
    <div className="relative overflow-hidden rounded-[36px] border border-white/10 bg-[#0d0d10]/90 p-10 backdrop-blur-2xl">
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background: `radial-gradient(circle at top, ${color}, transparent 70%)`,
        }}
      />

      <div className="relative flex flex-col items-center justify-center">
        <AnimatedFlame streak={streak} />

        <div className="mt-6 text-7xl font-black tracking-tight text-white">
          {streak}
        </div>

        <div className="mt-2 text-sm uppercase tracking-[0.45em] text-zinc-400">
          streak days
        </div>

        <div
          className="mt-5 rounded-full px-5 py-2 text-sm font-bold"
          style={{
            background: `${color}20`,
            border: `1px solid ${color}55`,
            color,
          }}
        >
          🔥 ACTIVE SERIES BONUS
        </div>
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────
   NFT TIMELINE
────────────────────────────────────────────────────────────── */

const NFTTimeline = ({
  streak,
  nftGifts,
}: {
  streak: number;
  nftGifts: NFTGift[];
}) => {
  const progress = Math.min((streak / 365) * 100, 100);

  return (
    <div className="relative overflow-hidden rounded-[36px] border border-white/10 bg-white/[0.03] p-8 backdrop-blur-2xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-white">
            NFT MILESTONES
          </h2>

          <p className="mt-2 text-zinc-400">
            Получай уникальные NFT за серию дней
          </p>
        </div>

        <div className="rounded-2xl border border-purple-500/20 bg-purple-500/10 px-5 py-3 text-sm font-bold text-purple-300">
          {streak}/365
        </div>
      </div>

      <div className="relative mt-16">
        <div className="absolute left-0 top-[54px] h-[4px] w-full rounded-full bg-zinc-800" />

        <div
          className="absolute left-0 top-[54px] h-[4px] rounded-full transition-all duration-1000"
          style={{
            width: `${progress}%`,
            background: getFlameColor(streak),
            boxShadow: `0 0 25px ${getFlameColor(streak)}`,
          }}
        />

        <div className="relative grid grid-cols-4 gap-5">
          {NFT_MILESTONES.map((m, idx) => {
            const nft = nftGifts[idx];
            const reached = streak >= m.days;

            const Icon = m.icon;

            return (
              <div
                key={m.days}
                className="flex flex-col items-center"
              >
                <div
                  className={`
                    relative flex h-[110px] w-[110px]
                    items-center justify-center overflow-hidden
                    rounded-[30px] border transition-all duration-700
                    ${
                      reached
                        ? "scale-105 border-white/20 bg-white/[0.08]"
                        : "border-zinc-800 bg-zinc-900"
                    }
                  `}
                  style={{
                    boxShadow: reached
                      ? `0 0 40px ${getFlameColor(streak)}55`
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
                    <Icon
                      size={42}
                      className={
                        reached
                          ? "text-white"
                          : "text-zinc-600"
                      }
                    />
                  )}

                  {!reached && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                      <Lock className="text-zinc-300" size={28} />
                    </div>
                  )}
                </div>

                <div className="mt-5 text-center">
                  <div className="text-lg font-black text-white">
                    {m.title}
                  </div>

                  <div className="mt-1 text-sm text-zinc-400">
                    {m.days} days
                  </div>

                  <div className="mt-2 text-sm font-bold text-yellow-300">
                    {m.reward}
                  </div>

                  {!reached && (
                    <div className="mt-2 text-xs text-zinc-500">
                      {m.days - streak} days left
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────
   DAILY CARD
────────────────────────────────────────────────────────────── */

const DailyRewardCard = ({
  canClaim,
  loading,
  streak,
  onClaim,
  progress,
  timeLeft,
}: any) => {
  const reward =
    streak >= 6 ? 200 : streak >= 3 ? 150 : 100;

  return (
    <div className="relative overflow-hidden rounded-[36px] border border-white/10 bg-gradient-to-br from-orange-500/10 to-yellow-500/5 p-8 backdrop-blur-2xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,180,50,0.12),transparent_60%)]" />

      <div className="relative flex items-center justify-between gap-10">
        <div className="flex-1">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-2xl bg-orange-500/15 p-3">
              <Sparkles className="text-orange-300" />
            </div>

            <div>
              <div className="text-3xl font-black text-white">
                Daily Reward
              </div>

              <div className="text-zinc-400">
                Заходи каждый день и получай CR
              </div>
            </div>
          </div>

          <div className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm text-zinc-400">
                reward
              </div>

              <div className="text-sm font-bold text-yellow-300">
                +{reward} CR
              </div>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${progress}%`,
                  background:
                    "linear-gradient(90deg,#facc15,#fb923c)",
                }}
              />
            </div>

            <div className="mt-2 text-xs text-zinc-500">
              {Math.round(progress)}% completed
            </div>
          </div>
        </div>

        <div>
          {canClaim ? (
            <button
              onClick={onClaim}
              disabled={loading}
              className="
                group relative overflow-hidden rounded-[24px]
                bg-gradient-to-r from-yellow-400 to-orange-500
                px-10 py-5 text-lg font-black text-black
                transition-all duration-300 hover:scale-105
              "
            >
              <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-white/20" />

              <div className="relative flex items-center gap-3">
                {loading ? "Loading..." : "CLAIM"}

                <ChevronRight />
              </div>
            </button>
          ) : (
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] px-8 py-5 text-center">
              <div className="text-sm text-zinc-500">
                Next reward
              </div>

              <div className="mt-2 text-2xl font-black text-white">
                {timeLeft()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────
   BONUS TABLE
────────────────────────────────────────────────────────────── */

const BonusTable = () => {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {DAILY_REWARDS.map((b) => (
        <div
          key={b.days}
          className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl"
        >
          <div
            className="mb-5 h-2 rounded-full"
            style={{
              background: b.color,
              boxShadow: `0 0 25px ${b.color}`,
            }}
          />

          <div className="text-xl font-black text-white">
            {b.days} days
          </div>

          <div className="mt-2 text-zinc-400">
            Daily streak bonus
          </div>

          <div
            className="mt-6 text-3xl font-black"
            style={{
              color: b.color,
            }}
          >
            +{b.reward} CR
          </div>
        </div>
      ))}
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────
   MAIN SHOP
────────────────────────────────────────────────────────────── */

const Shop = () => {
  const nick =
    localStorage.getItem("crp_nick") || "";

  const [balance, setBalance] = useState(0);

  const [loading, setLoading] = useState(false);

  const [nftGifts, setNftGifts] = useState<NFTGift[]>(
    []
  );

  const [lastReward, setLastReward] = useState(
    () =>
      parseInt(
        localStorage.getItem("crp_last_reward") || "0"
      )
  );

  const [streak, setStreak] = useState(() =>
    parseInt(
      localStorage.getItem("crp_streak") || "0"
    )
  );

  useEffect(() => {
    loadUser();
    loadNFTs();
  }, []);

  const loadUser = async () => {
    const { data } = await supabase
      .from("users")
      .select("balance")
      .ilike("username", nick)
      .maybeSingle();

    if (data?.balance !== undefined) {
      setBalance(data.balance || 0);
    }
  };

  const loadNFTs = async () => {
    const { data } = await supabase
      .from("nft_gifts")
      .select("*")
      .order("created_at", {
        ascending: true,
      });

    if (data) {
      setNftGifts(data as NFTGift[]);
    }
  };

  const canClaim =
    Date.now() - lastReward >
    24 * 60 * 60 * 1000;

  const progress = Math.min(
    100,
    ((Date.now() - lastReward) /
      (24 * 60 * 60 * 1000)) *
      100
  );

  const timeLeft = () => {
    const diff =
      24 * 60 * 60 * 1000 -
      (Date.now() - lastReward);

    const h = Math.floor(diff / 3600000);

    const m = Math.floor(
      (diff % 3600000) / 60000
    );

    return `${h}h ${m}m`;
  };

  const claimReward = async () => {
    if (!canClaim || loading) return;

    setLoading(true);

    try {
      const reward =
        streak >= 6
          ? 200
          : streak >= 3
          ? 150
          : 100;

      const newBalance = balance + reward;

      await dbUpdate(
        "users",
        {
          balance: newBalance,
        },
        {
          username: ilike(nick),
        }
      );

      setBalance(newBalance);

      const now = Date.now();

      const newStreak = streak + 1;

      setStreak(newStreak);

      setLastReward(now);

      localStorage.setItem(
        "crp_last_reward",
        String(now)
      );

      localStorage.setItem(
        "crp_streak",
        String(newStreak)
      );

      toast.success(
        `+${reward} CR • streak ${newStreak}`
      );
    } catch {
      toast.error("error");
    }

    setLoading(false);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050507] px-5 py-10 text-white">
      <AnimatedBackground />

      <div className="relative mx-auto flex max-w-[1500px] flex-col gap-8">
        <Header balance={balance} />

        <div className="grid gap-8 lg:grid-cols-[1.1fr,1fr]">
          <StreakHero streak={streak} />

          <DailyRewardCard
            canClaim={canClaim}
            loading={loading}
            streak={streak}
            onClaim={claimReward}
            progress={progress}
            timeLeft={timeLeft}
          />
        </div>

        <NFTTimeline
          streak={streak}
          nftGifts={nftGifts}
        />

        <BonusTable />
      </div>
    </div>
  );
};

export default Shop;
