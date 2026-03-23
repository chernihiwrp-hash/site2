import { Users, Home, Shield, Activity } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "../lib/store";

const PulseCity = () => {
  const [data, setData] = useState({ citizens: 0, houses: 0, factions: 0 });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [usersRes, housesRes, factionsRes] = await Promise.all([
          supabase.from("users").select("id", { count: "exact", head: true }),
          supabase.from("houses").select("id", { count: "exact", head: true }).eq("is_for_sale", false),
          supabase.from("faction_applications").select("id", { count: "exact", head: true }).eq("status", "approved"),
        ]);
        setData({
          citizens: usersRes.count || 0,
          houses: housesRes.count || 0,
          factions: factionsRes.count || 0,
        });
      } catch (e) {
        console.error("PulseCity error:", e);
      }
      setLoaded(true);
    };
    load();
  }, []);

  const stats = [
    { icon: Users,  label: "ГРАВЦІВ",    value: data.citizens, color: "hsl(var(--primary))",    bg: "hsl(var(--primary) / 0.08)",  border: "hsl(var(--primary) / 0.2)" },
    { icon: Home,   label: "БУДИНКІВ",   value: data.houses,   color: "hsl(45, 100%, 55%)",       bg: "hsl(45 100% 55% / 0.08)",     border: "hsl(45 100% 55% / 0.2)" },
    { icon: Shield, label: "У ФРАКЦІЯХ", value: data.factions, color: "hsl(142, 71%, 45%)",       bg: "hsl(142 71% 45% / 0.08)",     border: "hsl(142 71% 45% / 0.2)" },
  ];

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: "hsl(0 0% 0% / 0.5)", border: "1px solid hsl(0 0% 100% / 0.07)", backdropFilter: "blur(20px)" }}>

      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-2.5 border-b" style={{ borderColor: "hsl(0 0% 100% / 0.05)" }}>
        <div className="relative">
          <div className="w-1.5 h-1.5 rounded-full bg-primary" style={{ boxShadow: "0 0 6px hsl(var(--primary))" }} />
          <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-60" />
        </div>
        <Activity className="w-3.5 h-3.5 text-primary" />
        <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: "0.12em", color: "hsl(var(--primary))" }}>
          ПУЛЬС МІСТА
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 divide-x" style={{ borderColor: "hsl(0 0% 100% / 0.05)" }}>
        {stats.map((s, i) => (
          <div key={s.label} className="flex flex-col items-center justify-center py-4 px-2 gap-2"
            style={{ borderColor: "hsl(0 0% 100% / 0.05)" }}>
            {/* Icon */}
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: s.bg, border: `1px solid ${s.border}` }}>
              <s.icon className="w-4.5 h-4.5" style={{ color: s.color, width: 18, height: 18 }} />
            </div>

            {/* Number */}
            <div className="text-center">
              <div style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 900,
                fontSize: 28,
                lineHeight: 1,
                color: s.color,
                textShadow: `0 0 20px ${s.color.replace("hsl(", "hsl(").replace(")", " / 0.5)")}`,
                fontVariantNumeric: "tabular-nums",
              }}>
                {loaded ? s.value : "—"}
              </div>
              <div style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 600,
                fontSize: 9,
                letterSpacing: "0.1em",
                color: "hsl(0 0% 45%)",
                marginTop: 3,
              }}>
                {s.label}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PulseCity;
