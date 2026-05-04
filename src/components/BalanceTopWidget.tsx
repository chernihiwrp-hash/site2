import { useEffect, useState } from "react";
import { Trophy, Crown, Medal, Coins, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/store";

/**
 * Віджет ТОП-балансів для головної сторінки.
 * Показує подіум 1-2-3 + список 4-10.
 * Використання:  <BalanceTopWidget />
 */

type TopUser = {
  username: string;
  balance: number;
  avatar_url?: string | null;
};

const rankColors: Record<number, { bg: string; border: string; glow: string; text: string; label: string }> = {
  1: {
    bg: "linear-gradient(135deg, hsl(45 100% 55% / 0.18), hsl(45 100% 50% / 0.06))",
    border: "hsl(45 100% 55% / 0.45)",
    glow: "0 0 24px hsl(45 100% 55% / 0.3)",
    text: "hsl(45 100% 60%)",
    label: "ЗОЛОТО",
  },
  2: {
    bg: "linear-gradient(135deg, hsl(0 0% 75% / 0.15), hsl(0 0% 60% / 0.05))",
    border: "hsl(0 0% 75% / 0.35)",
    glow: "0 0 18px hsl(0 0% 80% / 0.22)",
    text: "hsl(0 0% 85%)",
    label: "СРІБЛО",
  },
  3: {
    bg: "linear-gradient(135deg, hsl(28 70% 50% / 0.16), hsl(28 70% 40% / 0.05))",
    border: "hsl(28 70% 50% / 0.4)",
    glow: "0 0 18px hsl(28 70% 50% / 0.25)",
    text: "hsl(28 80% 60%)",
    label: "БРОНЗА",
  },
};

const BalanceTopWidget = () => {
  const [users, setUsers] = useState<TopUser[]>([]);
  const [loading, setLoading] = useState(true);
  const myNick = (localStorage.getItem("crp_nick") || "").toLowerCase();

  const load = async () => {
    const { data } = await supabase
      .from("users")
      .select("username, balance, avatar_url")
      .order("balance", { ascending: false })
      .limit(10);
    setUsers((data || []) as TopUser[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("balance_top_widget_live")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "users" }, () => load())
      .subscribe();
    return () => { ch.unsubscribe(); };
  }, []);

  const top3 = users.slice(0, 3);
  const rest = users.slice(3, 10);

  return (
    <div className="liquid-glass-card rounded-3xl p-4 mb-4 animate-fade-in">
      {/* HEADER */}
      <Link to="/top" className="flex items-center justify-between mb-3 active:scale-[0.99] transition-transform">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, hsl(45 100% 55% / 0.2), hsl(45 100% 50% / 0.05))",
              border: "1px solid hsl(45 100% 55% / 0.3)",
            }}
          >
            <Trophy className="w-4 h-4" style={{ color: "hsl(45 100% 60%)" }} />
          </div>
          <div>
            <p className="text-sm font-black tracking-tight">ТОП БАЛАНСІВ</p>
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground/60 font-bold">
              Найбагатші гравці
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span>Усі</span>
          <ChevronRight className="w-3 h-3" />
        </div>
      </Link>

      {loading && (
        <div className="text-center py-8">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      )}

      {!loading && users.length === 0 && (
        <div className="text-center py-6">
          <Trophy className="w-6 h-6 text-muted-foreground opacity-30 mx-auto mb-1" />
          <p className="text-[10px] text-muted-foreground">Поки немає гравців</p>
        </div>
      )}

      {/* ── ПОДІУМ ТОП-3 ── */}
      {top3.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-3 items-end">
          {top3[1] ? <PodiumCard user={top3[1]} rank={2} height={88} myNick={myNick} /> : <div />}
          {top3[0] && <PodiumCard user={top3[0]} rank={1} height={108} myNick={myNick} crown />}
          {top3[2] ? <PodiumCard user={top3[2]} rank={3} height={72} myNick={myNick} /> : <div />}
        </div>
      )}

      {/* ── СПИСОК 4-10 ── */}
      {rest.length > 0 && (
        <div className="space-y-1.5">
          {rest.map((u, i) => {
            const rank = i + 4;
            const isMe = u.username.toLowerCase() === myNick;
            return (
              <div
                key={u.username + i}
                className="rounded-xl px-2.5 py-1.5 flex items-center gap-2.5 transition-all"
                style={{
                  background: isMe ? "hsl(var(--primary) / 0.08)" : "hsl(0 0% 100% / 0.03)",
                  border: isMe ? "1px solid hsl(var(--primary) / 0.35)" : "1px solid hsl(0 0% 100% / 0.05)",
                }}
              >
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center font-black text-[10px] shrink-0"
                  style={{
                    background: "hsl(0 0% 100% / 0.04)",
                    color: "hsl(0 0% 60%)",
                  }}
                >
                  {rank}
                </div>
                {u.avatar_url ? (
                  <img
                    src={u.avatar_url}
                    alt={u.username}
                    className="w-7 h-7 rounded-lg object-cover shrink-0"
                    style={{ border: "1px solid hsl(0 0% 100% / 0.1)" }}
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: "hsl(var(--primary) / 0.08)", border: "1px solid hsl(var(--primary) / 0.15)" }}>
                    <span className="text-[10px] font-bold text-primary/70">
                      {u.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <p className="flex-1 min-w-0 text-xs font-semibold truncate">
                  {u.username}
                  {isMe && <span className="ml-1.5 text-[8px] text-primary font-bold">ВИ</span>}
                </p>
                <div className="flex items-center gap-1 shrink-0">
                  <Coins className="w-3 h-3 text-yellow-400/80" />
                  <span className="text-xs font-bold text-yellow-400/90">
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
  const avatarSize = rank === 1 ? 52 : 42;
  return (
    <div className="flex flex-col items-center">
      <div className="relative mb-1.5">
        {crown && (
          <Crown
            className="absolute left-1/2 -translate-x-1/2 -top-4 w-4 h-4"
            style={{ color: c.text, filter: `drop-shadow(0 0 5px ${c.text})` }}
          />
        )}
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={user.username}
            className="rounded-2xl object-cover"
            style={{
              width: avatarSize,
              height: avatarSize,
              border: `2px solid ${c.border}`,
              boxShadow: c.glow,
            }}
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div
            className="rounded-2xl flex items-center justify-center font-black"
            style={{
              width: avatarSize,
              height: avatarSize,
              background: c.bg,
              border: `2px solid ${c.border}`,
              boxShadow: c.glow,
              color: c.text,
              fontSize: rank === 1 ? 20 : 16,
            }}
          >
            {user.username.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      <p className="text-[10px] font-bold text-foreground text-center truncate w-full px-0.5 mb-0.5">
        {user.username}
        {isMe && <span className="ml-1 text-[8px] text-primary">ВИ</span>}
      </p>

      <div
        className="w-full rounded-t-xl flex flex-col items-center justify-start pt-1.5 pb-1.5 px-1"
        style={{
          height,
          background: c.bg,
          border: `1px solid ${c.border}`,
          borderBottom: "none",
          boxShadow: c.glow,
        }}
      >
        <Icon className="w-3.5 h-3.5 mb-0.5" style={{ color: c.text, filter: `drop-shadow(0 0 4px ${c.text})` }} />
        <span className="text-[8px] font-black tracking-widest" style={{ color: c.text }}>
          {c.label}
        </span>
        <div className="mt-auto flex items-center gap-1">
          <Coins className="w-3 h-3" style={{ color: c.text }} />
          <span className="text-[11px] font-black" style={{ color: c.text }}>
            {(user.balance || 0).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default BalanceTopWidget;
