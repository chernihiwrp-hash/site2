import { useState, useEffect } from "react";
import PageHeader from "../components/PageHeader";
import NeonCard from "../components/NeonCard";
import { Crosshair, Search, ShieldAlert } from "lucide-react";
import { store } from "../lib/store";
import type { WantedPerson } from "../lib/store";

const Wanted = () => {
  const [search, setSearch] = useState("");
  const [wanted, setWanted] = useState<WantedPerson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    store.getWanted().then(data => { setWanted(data); setLoading(false); });
  }, []);

  const filtered = wanted.filter(w => w.name.toLowerCase().includes(search.toLowerCase()));

  const starColor = (stars: number) => {
    if (stars >= 5) return "text-red-400";
    if (stars >= 4) return "text-orange-400";
    if (stars >= 3) return "text-yellow-400";
    return "text-muted-foreground";
  };

  return (
    <div className="min-h-screen bg-background pb-20 px-4 pt-4">
      <PageHeader title="РОЗШУК" subtitle="Список розшуку" backTo="/" />

      <div className="liquid-glass-card rounded-2xl p-3 mb-4 flex items-center gap-3 animate-fade-in">
        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Пошук за ніком..."
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none" />
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="w-6 h-6 border-2 border-destructive border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Завантаження...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((w, i) => (
            <div key={w.id} className="animate-slide-up" style={{ animationDelay: `${i * 80}ms` }}>
              <NeonCard glowColor="red">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: `hsl(0 ${20 + w.stars * 12}% ${25 + w.stars * 3}% / 0.2)`,
                      border: "1px solid hsl(0 70% 50% / 0.25)",
                      boxShadow: `0 0 ${w.stars * 4}px hsl(0 70% 50% / 0.2)`
                    }}>
                    <Crosshair className="w-5 h-5 text-destructive" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground">{w.name}</h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{w.reason}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex gap-0.5 justify-end mb-0.5">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <span key={j} className={`text-xs ${j < w.stars ? starColor(w.stars) : "opacity-15"}`}>★</span>
                      ))}
                    </div>
                    <span className="text-[9px] text-muted-foreground">Рівень {w.stars}/5</span>
                  </div>
                </div>
              </NeonCard>
            </div>
          ))}
          {filtered.length === 0 && !loading && (
            <div className="text-center py-12 liquid-glass-card rounded-2xl">
              <ShieldAlert className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
              <p className="text-sm text-muted-foreground">
                {search ? "Нікого не знайдено" : "Список розшуку порожній"}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Wanted;
