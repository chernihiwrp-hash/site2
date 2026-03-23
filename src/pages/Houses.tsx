import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { Home, Building2, ChevronRight, Tag, Users } from "lucide-react";
import { store } from "../lib/store";
import type { HouseItem } from "../lib/store";

const Houses = () => {
  const navigate = useNavigate();
  const [houses, setHouses] = useState<HouseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "free" | "sold">("all");

  useEffect(() => { store.getHouses().then(h => { setHouses(h); setLoading(false); }); }, []);

  const total = houses.length;
  const free = houses.filter(h => !h.owner).length;
  const sold = total - free;

  const filtered = houses.filter(h => {
    if (filter === "free") return !h.owner;
    if (filter === "sold") return !!h.owner;
    return true;
  });

  return (
    <div className="min-h-screen pb-20 px-4 pt-4">
      <PageHeader title="БУДИНКИ" subtitle="Нерухомість міста" backTo="/" />

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-2 mb-4 animate-fade-in">
        {[
          { label: "Всього", value: total, color: "text-foreground", bg: "liquid-glass" },
          { label: "Вільно", value: free,  color: "text-primary",    bg: "bg-primary/8 border border-primary/15" },
          { label: "Зайнято", value: sold, color: "text-yellow-400", bg: "bg-yellow-400/8 border border-yellow-400/15" },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl py-3 text-center`}>
            <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 liquid-glass rounded-2xl p-1">
        {([
          { id: "all",  label: "Всі" },
          { id: "free", label: "Вільні" },
          { id: "sold", label: "Зайняті" },
        ] as const).map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${filter === f.id ? "bg-primary text-black" : "text-muted-foreground"}`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Home className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Немає будинків</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((h, i) => {
            const isSold = !!h.owner;
            const photo = h.photos?.find(p => p.startsWith("http")) || h.image;
            return (
              <button key={h.id} onClick={() => navigate(`/houses/${h.id}`)}
                className="w-full animate-slide-up text-left" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="rounded-2xl overflow-hidden transition-all hover:scale-[1.01] active:scale-[0.98]"
                  style={{
                    background: "hsl(0 0% 0% / 0.4)",
                    border: isSold ? "1px solid hsl(0 0% 100% / 0.06)" : "1px solid hsl(var(--primary) / 0.2)",
                    boxShadow: isSold ? "none" : "0 0 20px hsl(var(--primary) / 0.06)",
                    backdropFilter: "blur(20px)",
                  }}>
                  <div className="flex items-stretch gap-0">
                    {/* Photo or icon */}
                    <div className="w-24 h-24 shrink-0 overflow-hidden relative">
                      {photo ? (
                        <img src={photo} alt={h.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"
                          style={{ background: isSold ? "hsl(0 0% 100% / 0.03)" : "hsl(var(--primary) / 0.06)" }}>
                          {h.category === "Люкс"
                            ? <Building2 className="w-10 h-10" style={{ color: "hsl(45 100% 55% / 0.4)" }} />
                            : <Home className="w-10 h-10" style={{ color: "hsl(var(--primary) / 0.4)" }} />
                          }
                        </div>
                      )}
                      {/* Sold overlay */}
                      {isSold && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="text-[9px] font-black text-red-400 rotate-[-15deg] border border-red-400/50 px-1.5 py-0.5 rounded">ЗАЙНЯТО</span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-bold text-foreground truncate">{h.name}</h3>
                        </div>
                        <p className="text-[10px] text-muted-foreground line-clamp-2">{h.desc}</p>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1.5">
                          <Tag className="w-3 h-3 text-yellow-400" />
                          <span className="text-xs font-bold text-yellow-400">{h.price.toLocaleString()}€</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className={`text-[9px] px-2 py-0.5 rounded-md font-semibold ${
                            h.category === "Люкс"
                              ? "bg-yellow-400/10 text-yellow-400 border border-yellow-400/20"
                              : "bg-primary/10 text-primary border border-primary/20"
                          }`}>{h.category}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Houses;
