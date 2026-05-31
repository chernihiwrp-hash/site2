import { useEffect, useState } from "react";
import { Crown, Vote, Sparkles } from "lucide-react";
import { store } from "../lib/store";
import type { MayorCandidate } from "../lib/store";

/**
 * Картка "Поточний мер міста".
 * Показує лідера виборів — ту саму людину, яка позначена як МЕР на сторінці виборів.
 * Ставиться одразу під блоком "Пульс міста".
 */
const CurrentMayor = () => {
  const [mayor, setMayor] = useState<MayorCandidate | null>(null);
  const [totalVotes, setTotalVotes] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    store.getCandidates().then((list) => {
      if (list.length) {
        const total = list.reduce((s, c) => s + c.votes, 0);
        // getCandidates повертає список відсортований за голосами (desc) — перший це лідер
        const leader = list.reduce((a, b) => (b.votes > a.votes ? b : a), list[0]);
        setMayor(leader);
        setTotalVotes(total);
      }
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  // Поки вантажиться або немає кандидатів — нічого не показуємо
  if (!loaded || !mayor) return null;

  const pct = totalVotes > 0 ? Math.round((mayor.votes / totalVotes) * 100) : 0;
  const isElected = pct >= 75; // та сама умова, що й на сторінці виборів
  const initials = (mayor.name || "?").trim().slice(0, 2).toUpperCase();

  return (
    <div
      style={{
        position: "relative",
        borderRadius: 22,
        overflow: "hidden",
        padding: 1,
        background:
          "linear-gradient(135deg, rgba(251,191,36,0.55), rgba(251,191,36,0.05) 40%, rgba(255,255,255,0.08) 70%, rgba(251,191,36,0.4))",
        boxShadow: "0 12px 40px rgba(251,191,36,0.18), 0 4px 16px rgba(0,0,0,0.45)",
      }}
    >
      {/* moving sheen */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.13) 48%, transparent 60%)",
          backgroundSize: "250% 100%",
          animation: "mayorSheen 4.5s linear infinite",
          pointerEvents: "none",
          zIndex: 3,
        }}
      />
      <div
        style={{
          position: "relative",
          borderRadius: 21,
          overflow: "hidden",
          background:
            "linear-gradient(135deg, rgba(36,30,12,0.92) 0%, rgba(20,18,12,0.95) 100%)",
          backdropFilter: "blur(24px) saturate(1.7)",
          WebkitBackdropFilter: "blur(24px) saturate(1.7)",
        }}
      >
        {/* glow blobs */}
        <div
          style={{
            position: "absolute",
            top: -40,
            right: -30,
            width: 160,
            height: 160,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(251,191,36,0.28) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        {/* header strip */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 16px",
            borderBottom: "1px solid rgba(251,191,36,0.14)",
            background:
              "linear-gradient(90deg, rgba(251,191,36,0.12) 0%, transparent 100%)",
          }}
        >
          <Crown style={{ width: 14, height: 14, color: "#fbbf24" }} />
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontWeight: 700,
              fontSize: 10,
              letterSpacing: "0.18em",
              color: "#fbbf24",
              textTransform: "uppercase",
            }}
          >
            {isElected ? "Поточний мер міста" : "Лідер виборів"}
          </span>
          <div
            style={{
              flex: 1,
              height: 1,
              background:
                "linear-gradient(90deg, rgba(251,191,36,0.25), transparent)",
            }}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "3px 8px",
              borderRadius: 8,
              background: "rgba(251,191,36,0.12)",
              border: "1px solid rgba(251,191,36,0.25)",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#fbbf24",
                boxShadow: "0 0 8px #fbbf24",
                animation: "pulseDot 2s ease-in-out infinite",
              }}
            />
            <span style={{ fontSize: 9, color: "#fbbf24", letterSpacing: "0.1em", fontWeight: 600 }}>
              {pct}%
            </span>
          </div>
        </div>

        {/* body */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 16px 18px" }}>
          {/* avatar */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 18,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, rgba(251,191,36,0.28), rgba(251,191,36,0.06))",
                border: "1.5px solid rgba(251,191,36,0.45)",
                boxShadow: "0 0 24px rgba(251,191,36,0.35), inset 0 1px 0 rgba(255,255,255,0.18)",
                fontFamily: "'DM Mono', monospace",
                fontWeight: 800,
                fontSize: 22,
                color: "#fde68a",
                textShadow: "0 0 16px rgba(251,191,36,0.8)",
              }}
            >
              {initials}
            </div>
            {/* crown badge */}
            <div
              style={{
                position: "absolute",
                top: -10,
                left: "50%",
                transform: "translateX(-50%)",
                animation: "mayorBob 2.6s ease-in-out infinite",
              }}
            >
              <Crown style={{ width: 20, height: 20, color: "#fbbf24", filter: "drop-shadow(0 0 8px rgba(251,191,36,0.9))" }} fill="#fbbf24" />
            </div>
          </div>

          {/* info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
              <h3
                style={{
                  fontWeight: 800,
                  fontSize: 18,
                  color: "#fff",
                  lineHeight: 1.1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  letterSpacing: "-0.01em",
                }}
              >
                {mayor.name}
              </h3>
              <span
                style={{
                  flexShrink: 0,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                  fontSize: 9,
                  fontWeight: 800,
                  padding: "2px 7px",
                  borderRadius: 7,
                  background: "rgba(251,191,36,0.2)",
                  color: "#fbbf24",
                  border: "1px solid rgba(251,191,36,0.35)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                <Sparkles style={{ width: 9, height: 9 }} /> Мер
              </span>
            </div>
            <p
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.5)",
                lineHeight: 1.4,
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              {mayor.program || "Керує містом"}
            </p>

            {/* votes row */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
              <Vote style={{ width: 12, height: 12, color: "#fbbf24", opacity: 0.85 }} />
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontWeight: 700,
                  fontSize: 13,
                  color: "#fde68a",
                }}
              >
                {mayor.votes}
              </span>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>голосів</span>
              {/* mini progress */}
              <div
                style={{
                  flex: 1,
                  height: 5,
                  borderRadius: 99,
                  background: "rgba(255,255,255,0.08)",
                  overflow: "hidden",
                  marginLeft: 4,
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${pct}%`,
                    borderRadius: 99,
                    background: "linear-gradient(90deg, #fbbf24, #f59e0b)",
                    boxShadow: "0 0 10px rgba(251,191,36,0.7)",
                    transition: "width 0.8s ease",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes mayorSheen {
          0% { background-position: 200% 0; }
          100% { background-position: -100% 0; }
        }
        @keyframes mayorBob {
          0%,100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(-3px); }
        }
        @keyframes pulseDot {
          0%,100% { opacity:1; transform:scale(1); }
          50% { opacity:0.4; transform:scale(0.7); }
        }
      `}</style>
    </div>
  );
};

export default CurrentMayor;
