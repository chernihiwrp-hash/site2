import { Users, Home, Shield, Droplets, Crown } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/store";

function useCountUp(target: number, duration = 1200) {
  const [val, setVal] = useState(0);
  const raf = useRef<number>();
  useEffect(() => {
    if (target === 0) return;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(target * ease));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current!);
  }, [target]);
  return val;
}

const Stat = ({ icon: Icon, label, value, loaded, color, glow }: {
  icon: React.ElementType; label: string; value: number; loaded: boolean; color: string; glow: string;
}) => {
  const display = useCountUp(loaded ? value : 0);
  return (
    <div className="flex flex-col items-center justify-center gap-2.5 py-5 px-2 relative group">
      {/* glow blob behind icon */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
        style={{ background: `radial-gradient(ellipse at 50% 60%, ${glow} 0%, transparent 70%)` }} />
      <div className="relative w-10 h-10 rounded-2xl flex items-center justify-center"
        style={{
          background: `linear-gradient(135deg, ${color}22, ${color}08)`,
          border: `1px solid ${color}33`,
          boxShadow: `0 4px 16px ${color}20`,
        }}>
        <Icon style={{ color, width: 18, height: 18 }} />
      </div>
      <div className="text-center">
        <div style={{
          fontFamily: "'DM Mono', 'Fira Mono', monospace",
          fontWeight: 700,
          fontSize: 26,
          lineHeight: 1,
          color,
          textShadow: `0 0 24px ${color}88`,
          letterSpacing: "-0.02em",
        }}>
          {loaded ? display : "—"}
        </div>
        <div style={{
          fontWeight: 600,
          fontSize: 9,
          letterSpacing: "0.14em",
          color: "rgba(255,255,255,0.3)",
          marginTop: 4,
          textTransform: "uppercase",
        }}>
          {label}
        </div>
      </div>
    </div>
  );
};

type MayorInfo = { name: string; avatar: string | null } | null;

const PulseCity = () => {
  const [data, setData] = useState({ citizens: 0, houses: 0, factions: 0 });
  const [loaded, setLoaded] = useState(false);
  const [mayor, setMayor] = useState<MayorInfo>(null);

  useEffect(() => {
    (async () => {
      try {
        const [u, h, f] = await Promise.all([
          supabase.from("users").select("id", { count: "exact", head: true }),
          supabase.from("houses").select("id", { count: "exact", head: true }).eq("is_for_sale", false),
          supabase.from("faction_applications").select("id", { count: "exact", head: true }).eq("status", "approved"),
        ]);
        setData({ citizens: u.count || 0, houses: h.count || 0, factions: f.count || 0 });

        // Load current mayor (candidate with most votes if >= 75% of total)
        const { data: candidates } = await supabase
          .from("mayor_election")
          .select("candidate_username, votes")
          .order("votes", { ascending: false })
          .limit(5);

        if (candidates && candidates.length > 0) {
          const top = candidates[0] as { candidate_username: string; votes: number };
          if (top.candidate_username && (top.votes || 0) > 0) {
            const { data: userData } = await supabase
              .from("users")
              .select("avatar_url")
              .ilike("username", top.candidate_username)
              .maybeSingle();
            setMayor({ name: top.candidate_username, avatar: (userData as any)?.avatar_url || null });
          }
        }
      } catch {}
      setLoaded(true);
    })();
  }, []);

  return (
    <div style={{
      borderRadius: 20,
      overflow: "hidden",
      background: "linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%)",
      backdropFilter: "blur(24px) saturate(1.6)",
      WebkitBackdropFilter: "blur(24px) saturate(1.6)",
      border: "1px solid rgba(255,255,255,0.12)",
      boxShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.12)",
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 16px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "linear-gradient(90deg, rgba(251,191,36,0.06) 0%, transparent 100%)",
      }}>
        {/* animated dot */}
        <div style={{ position: "relative", width: 8, height: 8, flexShrink: 0 }}>
          <span style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            background: "#fbbf24",
            boxShadow: "0 0 8px #fbbf24",
            animation: "pulseDot 2s ease-in-out infinite",
          }} />
          <span style={{
            position: "absolute", inset: -3, borderRadius: "50%",
            background: "rgba(251,191,36,0.3)",
            animation: "pulseDot 2s ease-in-out infinite 0.5s",
          }} />
        </div>
        <Droplets style={{ width: 13, height: 13, color: "#fbbf24", opacity: 0.8 }} />
        <span style={{
          fontFamily: "'DM Mono', monospace",
          fontWeight: 700,
          fontSize: 10,
          letterSpacing: "0.18em",
          color: "#fbbf24",
          textTransform: "uppercase",
        }}>
          Пульс міста
        </span>
        <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, rgba(251,191,36,0.2), transparent)" }} />
        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em" }}>LIVE</span>
      </div>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }}>
        {[
          { icon: Users,  label: "Гравців",    value: data.citizens, color: "#34d399", glow: "rgba(52,211,153,0.15)" },
          { icon: Home,   label: "Будинків",   value: data.houses,   color: "#60a5fa", glow: "rgba(96,165,250,0.15)" },
          { icon: Shield, label: "У фракціях", value: data.factions, color: "#f472b6", glow: "rgba(244,114,182,0.15)" },
        ].map((s, i) => (
          <div key={s.label} style={{ borderRight: i < 2 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
            <Stat {...s} loaded={loaded} />
          </div>
        ))}
      </div>

      {/* Mayor card */}
      {mayor && (
        <div style={{
          margin: "0 12px 12px",
          borderRadius: 14,
          background: "linear-gradient(135deg, rgba(251,191,36,0.08), rgba(251,191,36,0.03))",
          border: "1px solid rgba(251,191,36,0.2)",
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}>
          <Crown style={{ width: 14, height: 14, color: "#fbbf24", flexShrink: 0 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
            {mayor.avatar ? (
              <img src={mayor.avatar} alt={mayor.name}
                style={{ width: 28, height: 28, borderRadius: 8, objectFit: "cover", border: "1.5px solid rgba(251,191,36,0.4)", flexShrink: 0 }}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            ) : (
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(251,191,36,0.15)", border: "1.5px solid rgba(251,191,36,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Crown style={{ width: 14, height: 14, color: "#fbbf24" }} />
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 9, color: "rgba(251,191,36,0.6)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 }}>Поточний мер</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#fbbf24", letterSpacing: "0.02em", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{mayor.name}</div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulseDot {
          0%,100% { opacity:1; transform:scale(1); }
          50% { opacity:0.5; transform:scale(0.7); }
        }
      `}</style>
    </div>
  );
};

export default PulseCity;
