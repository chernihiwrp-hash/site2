import { Home, Shield, ShoppingCart, Gift, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../lib/store";

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [canClaim, setCanClaim] = useState(false);
  const nick = localStorage.getItem("crp_nick") || "";

  useEffect(() => {
    if (!nick) return;

    const load = async () => {
      // Непрочитані нотифікації
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .ilike("username", nick)
        .eq("read", false);
      setUnreadCount(count || 0);

      // Щоденна нагорода
      const lastReward = parseInt(localStorage.getItem("crp_last_reward") || "0");
      setCanClaim(Date.now() - lastReward > 24 * 60 * 60 * 1000);
    };

    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [nick]);

  const tabs = [
    { path: "/",         icon: Home,         label: "Головна",  badge: null as string | number | null },
    { path: "/factions", icon: Shield,       label: "Фракції",  badge: null as string | number | null },
    { path: "/casino",   icon: ShoppingCart, label: "Магазин",  badge: null as string | number | null },
    { path: "/shop",     icon: Gift,         label: "Нагороди", badge: canClaim ? "•" : null as string | number | null },
    { path: "/profile",  icon: User,         label: "Профіль",  badge: unreadCount > 0 ? (unreadCount > 9 ? "9+" : unreadCount) : null as string | number | null },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: "hsl(0 0% 0% / 0.8)",
        backdropFilter: "blur(24px)",
        borderTop: "1px solid hsl(0 0% 100% / 0.06)"
      }}>
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`relative flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition-all duration-200 active:scale-90 ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="relative">
                <tab.icon className={`w-5 h-5 transition-all ${isActive ? "drop-shadow-[0_0_8px_hsl(var(--primary)/0.8)]" : ""}`} />
                {tab.badge !== null && (
                  <div
                    className="absolute -top-1.5 -right-2 min-w-[16px] h-4 rounded-full flex items-center justify-center font-bold text-[9px]"
                    style={{
                      background: typeof tab.badge === "number" || (typeof tab.badge === "string" && tab.badge !== "•")
                        ? "hsl(0 84% 60%)"
                        : "hsl(var(--primary))",
                      color: "#fff",
                      padding: "0 3px",
                      boxShadow: typeof tab.badge === "number" || (typeof tab.badge === "string" && tab.badge !== "•")
                        ? "0 0 6px hsl(0 84% 60% / 0.8)"
                        : "0 0 8px hsl(var(--primary) / 0.9)",
                      width: tab.badge === "•" ? "10px" : undefined,
                      height: tab.badge === "•" ? "10px" : undefined,
                      top: tab.badge === "•" ? "-2px" : undefined,
                      right: tab.badge === "•" ? "-2px" : undefined,
                    }}
                  >
                    {tab.badge !== "•" ? tab.badge : ""}
                  </div>
                )}
              </div>
              <span className={`text-[10px] font-medium ${isActive ? "text-primary" : ""}`}>{tab.label}</span>
              {isActive && (
                <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-primary"
                  style={{ boxShadow: "0 0 6px hsl(var(--primary))" }} />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;