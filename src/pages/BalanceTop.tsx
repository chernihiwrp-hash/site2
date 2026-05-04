import { useEffect, useState } from "react";
import { Trophy, Crown, Medal, Coins, RefreshCw } from "lucide-react";
import PageHeader from "../components/PageHeader";
import { supabase } from "../lib/store";

type TopUser = {
  username: string;
  balance: number;
  avatar_url?: string | null;
};

const rankColors: Record<number, { bg: string; border: string; glow: string; text: string; label: string }> = {
  1: {
    bg: "linear-gradient(135deg, hsl(45 100% 55% / 0.18), hsl(45 100% 50% / 0.06))",
    border: "hsl(45 100% 55% / 0.45)",
    glow: "0 0 30px hsl(45 100% 55% / 0.35)",
    text: "hsl(45 100% 60%)",
    label: "ЗОЛОТО",
  },
  2: {
    bg: "linear-gradient(135deg, hsl(0 0% 75% / 0.15), hsl(0 0% 60% / 0.05))",
    border: "hsl(0 0% 75% / 0.35)",
    glow: "0 0 24px hsl(0 0% 80% / 0.25)",
    text: "hsl(0 0% 85%)",
    label: "СРІБЛО",
  },
  3: {
    bg: "linear-gradient(135deg, hsl(28 70% 50% / 0.16), hsl(28 70% 40% / 0.05))",
    border: "hsl(28 70% 50% / 0.4)",
    glow: "0 0 24px hsl(28 70% 50% / 0.28)",
    text: "hsl(28 80% 60%)",
    label: "БРОНЗА",
  },
};

const BalanceTop = () => {
  const [users, setUsers] = useState<TopUser[]>([]);
  const [loading, setLoading] = useState(true);
  const myNick = (localStorage.getItem("crp_nick") || "").toLowerCase();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("users")
      .select("username, balance, avatar_url")
      .order("balance", { ascending: false })
      .limit(50);
    setUsers((data || []) as TopUser[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // realtime — оновлення балансу
    const ch = supabase
      .channel("balance_top_live")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "users" }, () => load())
      .subscribe();
    return () => { ch.unsubscribe(); };
  }, []);

  const top3 = users.slice(0, 3);
  const rest = users.slice(3);

  return (
    <div className="min-h-screen pb-24 px-4 pt-4">
      <div className="flex items-center justify-between mb-4">
        <PageHeader title="ТОП БАЛАНСІВ" subtitle="Найбагатші гравці Чернігова" />
        <button
          onClick={load}
          disabled={loading}
          className="w-9 h-9 liquid-glass rounded-xl flex items-center justify-center active:scale-95 transition-all shrink-0"
        >
          <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading && users.length === 0 && (
        <div className="text-center py-16">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      )}

      {!loading && users.length === 0 && (
        <div className="text-center py-16 liquid-glass-card rounded-2xl">
          <Trophy className="w-8 h-8 text-muted-foreground opacity-30 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Поки немає гравців з балансом</p>
        </div>
      )}

      {/* ── ПОДІУМ ТОП-3 ── */}
      {top3.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-5 items-end animate-fade-in">
          {/* 2 место */}
          {top3[1] ? (
            <PodiumCard user={top3[1]} rank={2} height={120} myNick={myNick} />
          ) : <div />}
          {/* 1 место */}
          {top3[0] && (
            <PodiumCard user={top3[0]} rank={1} height={150} myNick={myNick} crown />
          )}
          {/* 3 место */}
          {top3[2] ? (
            <PodiumCard user={top3[2]} rank={3} height={100} myNick={myNick} />
          ) : <div />}
        </div>
      )}

      {/* ── СПИСОК 4-50 ── */}
      {rest.length > 0 && (
        <div className="space-y-2 animate-fade-in">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-bold px-1 mb-2">
            Інші гравці
          </p>
          {rest.map((u, i) => {
            const rank = i + 4;
            const isMe = u.username.toLowerCase() === myNick;
            return (
              <div
                key={u.username + i}
                className="liquid-glass-card rounded-2xl px-3 py-2.5 flex items-center gap-3 transition-all"
                style={{
                  border: isMe ? "1px solid hsl(var(--primary) / 0.4)" : "1px solid transparent",
                  background: isMe ? "hsl(var(--primary) / 0.06)" : undefined,
                }}
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0"
                  style={{
                    background: "hsl(0 0% 100% / 0.04)",
                    border: "1px solid hsl(0 0% 100% / 0.06)",
                    color: "hsl(0 0% 60%)",
                  }}
                >
                  {rank}
                </div>
                {u.avatar_url ? (
                  <img
                    src={u.avatar_url}
                    alt={u.username}
                    className="w-9 h-9 rounded-xl object-cover shrink-0"
                    style={{ border: "1px solid hsl(0 0% 100% / 0.1)" }}
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "hsl(var(--primary) / 0.08)", border: "1px solid hsl(var(--primary) / 0.15)" }}>
                    <span className="text-xs font-bold text-primary/70">
                      {u.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {u.username}
                    {isMe && <span className="ml-1.5 text-[9px] text-primary font-bold">ВИ</span>}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Coins className="w-3.5 h-3.5 text-yellow-400/80" />
                  <span className="text-sm font-bold text-yellow-400/90">
                    {(u.balance || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const PodiumCard = ({
  user, rank, height, myNick, crown,
}: {
  user: TopUser; rank: number; height: number; myNick: string; crown?: boolean;
}) => {
  const c = rankColors[rank];
  const isMe = user.username.toLowerCase() === myNick;
  const Icon = rank === 1 ? Crown : Medal;
  return (
    <div className="flex flex-col items-center">
      {/* Аватар + корона */}
      <div className="relative mb-2">
        {crown && (
          <Crown
            className="absolute left-1/2 -translate-x-1/2 -top-5 w-5 h-5"
            style={{ color: c.text, filter: `drop-shadow(0 0 6px ${c.text})` }}
          />
        )}
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={user.username}
            className="rounded-2xl object-cover"
            style={{
              width: rank === 1 ? 64 : 52,
              height: rank === 1 ? 64 : 52,
              border: `2px solid ${c.border}`,
              boxShadow: c.glow,
            }}
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div
            className="rounded-2xl flex items-center justify-center font-black"
            style={{
              width: rank === 1 ? 64 : 52,
              height: rank === 1 ? 64 : 52,
              background: c.bg,
              border: `2px solid ${c.border}`,
              boxShadow: c.glow,
              color: c.text,
              fontSize: rank === 1 ? 24 : 20,
            }}
          >
            {user.username.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Ник */}
      <p className="text-[11px] font-bold text-foreground text-center truncate w-full px-1 mb-0.5">
        {user.username}
        {isMe && <span className="ml-1 text-[8px] text-primary">ВИ</span>}
      </p>

      {/* Подіум */}
      <div
        className="w-full rounded-t-2xl flex flex-col items-center justify-start pt-2 pb-2 px-1"
        style={{
          height,
          background: c.bg,
          border: `1px solid ${c.border}`,
          borderBottom: "none",
          boxShadow: c.glow,
        }}
      >
        <Icon className="w-4 h-4 mb-1" style={{ color: c.text, filter: `drop-shadow(0 0 4px ${c.text})` }} />
        <span className="text-[9px] font-black tracking-widest" style={{ color: c.text }}>
          {c.label}
        </span>
        <div className="mt-auto flex items-center gap-1">
          <Coins className="w-3 h-3" style={{ color: c.text }} />
          <span className="text-xs font-black" style={{ color: c.text }}>
            {(user.balance || 0).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default BalanceTop;
