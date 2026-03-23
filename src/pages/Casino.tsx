import { useState, useEffect } from "react";
import { Palette, Check, Zap, Lock, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { getBalance, addBalance } from "../lib/store";
import { THEMES, applyTheme, type ThemeId } from "./Shop";

const Casino = () => {
  const nick = localStorage.getItem("crp_nick") || "";
  const [balance, setBalance] = useState(() => getBalance(nick));
  const [currentTheme, setCurrentTheme] = useState<ThemeId>(
    () => (localStorage.getItem("crp_theme") as ThemeId) || "lime"
  );
  const [ownedThemes, setOwnedThemes] = useState<ThemeId[]>(() => {
    try { return JSON.parse(localStorage.getItem(`crp_owned_themes_${nick}`) || '["lime"]'); }
    catch { return ["lime"]; }
  });

  useEffect(() => {
    const update = () => setBalance(getBalance(nick));
    window.addEventListener("focus", update);
    return () => window.removeEventListener("focus", update);
  }, [nick]);

  const buyOrActivate = (theme: typeof THEMES[0]) => {
    if (ownedThemes.includes(theme.id)) {
      applyTheme(theme);
      setCurrentTheme(theme.id);
      toast.success(`Тему "${theme.name}" активовано!`);
      return;
    }
    if (balance < theme.price) {
      toast.error(`Недостатньо CR! Потрібно ${theme.price} CR`);
      return;
    }
    addBalance(nick, -theme.price);
    setBalance(getBalance(nick));
    const newOwned = [...ownedThemes, theme.id];
    setOwnedThemes(newOwned);
    localStorage.setItem(`crp_owned_themes_${nick}`, JSON.stringify(newOwned));
    applyTheme(theme);
    setCurrentTheme(theme.id);
    toast.success(`Тему "${theme.name}" куплено та активовано!`);
  };

  return (
    <div className="min-h-screen pb-20 px-4 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-display text-xl font-bold tracking-wider neon-text-lime">МАГАЗИН</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Теми інтерфейсу</p>
        </div>
        <div className="flex items-center gap-1.5 liquid-glass px-3 py-2 rounded-xl"
          style={{ border: "1px solid hsl(var(--primary) / 0.2)" }}>
          <Zap className="w-3.5 h-3.5 text-primary" />
          <span className="text-sm font-bold text-primary">{balance} CR</span>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground text-center mb-4 px-4">
        Теми змінюють акцентний колір усього інтерфейсу. Заробляй CR щодня та купуй нові теми.
      </p>

      <div className="space-y-3">
        {THEMES.map((theme, i) => {
          const isOwned = ownedThemes.includes(theme.id);
          const isActive = currentTheme === theme.id;
          return (
            <div key={theme.id} className="animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
              <div
                className="rounded-2xl p-4 transition-all"
                style={{
                  background: isActive
                    ? `linear-gradient(135deg, hsl(var(--primary) / 0.12), hsl(var(--primary) / 0.04))`
                    : "linear-gradient(135deg, hsl(0 0% 100% / 0.05), hsl(0 0% 100% / 0.015))",
                  border: `1px solid ${isActive ? "hsl(var(--primary) / 0.4)" : "hsl(0 0% 100% / 0.08)"}`,
                  boxShadow: isActive ? "0 0 20px hsl(var(--primary) / 0.15)" : "none",
                }}
              >
                <div className="flex items-center gap-3">
                  {/* Color swatch */}
                  <div className="w-14 h-14 rounded-xl shrink-0 relative overflow-hidden"
                    style={{ background: theme.preview, border: "2px solid hsl(0 0% 100% / 0.15)" }}>
                    {isActive && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <Check className="w-6 h-6 text-white drop-shadow-lg" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="text-sm font-bold text-foreground">{theme.name}</p>
                      {isActive && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold"
                          style={{ background: "hsl(var(--primary) / 0.15)", color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary) / 0.25)" }}>
                          АКТИВНА
                        </span>
                      )}
                      {isOwned && !isActive && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold bg-white/8 text-muted-foreground border border-white/10">
                          КУПЛЕНА
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">{theme.description}</p>
                    {theme.price > 0 && !isOwned && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Ціна: <span className="text-primary font-bold">{theme.price} CR</span>
                      </p>
                    )}
                  </div>

                  {/* Action button */}
                  <div className="shrink-0">
                    {theme.price === 0 || isOwned ? (
                      <button
                        onClick={() => buyOrActivate(theme)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                          isActive
                            ? "text-primary border border-primary/20"
                            : "liquid-glass text-foreground hover:border-primary/30"
                        }`}
                        style={isActive ? { background: "hsl(var(--primary) / 0.1)" } : {}}>
                        {isActive ? "Активна" : "Вибрати"}
                      </button>
                    ) : (
                      <button
                        onClick={() => buyOrActivate(theme)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
                        style={{
                          background: balance >= theme.price ? theme.preview : "hsl(0 0% 100% / 0.06)",
                          border: "1px solid hsl(0 0% 100% / 0.15)",
                          color: balance >= theme.price ? "#fff" : "hsl(0 0% 40%)",
                        }}>
                        {balance < theme.price
                          ? <Lock className="w-3 h-3" />
                          : <ShoppingCart className="w-3 h-3" />
                        }
                        {theme.price} CR
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Casino;