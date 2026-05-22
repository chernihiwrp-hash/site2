import { useState, useEffect, useMemo } from "react";
import PageHeader from "../components/PageHeader";
import {
  ScrollText,
  ChevronDown,
  ExternalLink,
  BookOpen,
  Search,
  Globe,
  ArrowUpRight,
  FileText,
} from "lucide-react";
import { store } from "../lib/store";
import type { DocumentItem } from "../lib/store";

/** Open URL — works inside Telegram WebApp and regular browsers */
const openExternal = (url: string) => {
  if (!url) return;
  const tg = (window as any).Telegram?.WebApp;
  try {
    if (tg?.openLink) {
      tg.openLink(url, { try_instant_view: false });
      return;
    }
  } catch {
    /* fallthrough */
  }
  window.open(url, "_blank", "noopener,noreferrer");
};

const ALL_RULES_URL = "https://sleepmancybr.github.io/chernihiv";

const Documents = () => {
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    store.getDocs().then((data) => {
      setDocs(data);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.content.toLowerCase().includes(q),
    );
  }, [docs, query]);

  return (
    <div className="min-h-screen bg-background pb-24 px-4 pt-4">
      <PageHeader title="ПРАВИЛА" subtitle="Офіційні папери" backTo="/" />

      {/* Hero — головне посилання на сайт з правилами */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => openExternal(ALL_RULES_URL)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") openExternal(ALL_RULES_URL);
        }}
        className="relative overflow-hidden rounded-3xl p-5 mb-5 cursor-pointer select-none active:scale-[0.99] transition-transform animate-fade-in"
        style={{
          background:
            "linear-gradient(135deg, hsl(var(--primary) / 0.18), hsl(var(--primary) / 0.04) 60%, transparent)",
          border: "1px solid hsl(var(--primary) / 0.28)",
          boxShadow:
            "0 10px 30px -10px hsl(var(--primary) / 0.35), inset 0 1px 0 hsl(0 0% 100% / 0.06)",
        }}
      >
        {/* glow accent */}
        <div
          className="pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-50"
          style={{
            background:
              "radial-gradient(circle, hsl(var(--primary) / 0.45), transparent 60%)",
            filter: "blur(8px)",
          }}
        />

        <div className="relative flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{
              background: "hsl(var(--primary) / 0.15)",
              border: "1px solid hsl(var(--primary) / 0.3)",
              boxShadow: "0 0 18px hsl(var(--primary) / 0.25)",
            }}
          >
            <Globe className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase tracking-[0.18em] text-primary/80 font-semibold">
                Сайт правил
              </span>
              <span
                className="text-[9px] px-1.5 py-[1px] rounded-md font-bold"
                style={{
                  background: "hsl(var(--primary) / 0.15)",
                  color: "hsl(var(--primary))",
                }}
              >
                NEW
              </span>
            </div>
            <p className="text-base font-bold text-foreground leading-tight">
              Всі правила сервера
            </p>
            <p className="text-[11px] text-muted-foreground mt-1 truncate">
              sleepmancybr.github.io/chernihiv
            </p>
          </div>
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: "hsl(var(--primary) / 0.18)",
              border: "1px solid hsl(var(--primary) / 0.3)",
            }}
          >
            <ArrowUpRight className="w-4 h-4 text-primary" />
          </div>
        </div>
      </div>

      {/* Search */}
      <div
        className="flex items-center gap-2 rounded-2xl px-4 py-3 mb-4"
        style={{
          background: "hsl(0 0% 100% / 0.04)",
          border: "1px solid hsl(0 0% 100% / 0.08)",
          backdropFilter: "blur(12px)",
        }}
      >
        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Пошук по правилам..."
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          >
            Скинути
          </button>
        )}
      </div>

      {/* Counter */}
      {!loading && (
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              {filtered.length} {filtered.length === 1 ? "документ" : "документів"}
            </span>
          </div>
          <div className="flex-1 h-px ml-3" style={{ background: "hsl(0 0% 100% / 0.06)" }} />
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-20 rounded-2xl animate-pulse"
              style={{
                background:
                  "linear-gradient(90deg, hsl(0 0% 100% / 0.03), hsl(0 0% 100% / 0.06), hsl(0 0% 100% / 0.03))",
                border: "1px solid hsl(0 0% 100% / 0.05)",
                animationDelay: `${i * 100}ms`,
              }}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((d, i) => {
            const isOpen = openId === d.id;
            return (
              <div
                key={d.id}
                className="animate-slide-up"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div
                  className="rounded-2xl overflow-hidden transition-all duration-300"
                  style={{
                    background: isOpen
                      ? "linear-gradient(180deg, hsl(var(--primary) / 0.06), hsl(0 0% 100% / 0.03))"
                      : "hsl(0 0% 100% / 0.035)",
                    border: isOpen
                      ? "1px solid hsl(var(--primary) / 0.3)"
                      : "1px solid hsl(0 0% 100% / 0.08)",
                    boxShadow: isOpen
                      ? "0 8px 24px -8px hsl(var(--primary) / 0.25)"
                      : "none",
                  }}
                >
                  {/* Header — clickable row */}
                  <button
                    type="button"
                    onClick={() => setOpenId(isOpen ? null : d.id)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:scale-[0.995] transition-transform"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors"
                      style={{
                        background: isOpen
                          ? "hsl(var(--primary) / 0.2)"
                          : "hsl(var(--primary) / 0.1)",
                        border: "1px solid hsl(var(--primary) / 0.22)",
                      }}
                    >
                      <ScrollText className="w-5 h-5 text-primary" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-foreground leading-snug">
                        {d.title}
                      </h3>
                      {!isOpen && (
                        <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                          {d.content}
                        </p>
                      )}
                    </div>

                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all"
                      style={{
                        background: isOpen
                          ? "hsl(var(--primary) / 0.18)"
                          : "hsl(0 0% 100% / 0.04)",
                        transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)",
                      }}
                    >
                      <ChevronDown
                        className={`w-4 h-4 ${
                          isOpen ? "text-primary" : "text-muted-foreground"
                        }`}
                      />
                    </div>
                  </button>

                  {/* Body */}
                  {isOpen && (
                    <div className="px-4 pb-4 animate-fade-in">
                      <div
                        className="rounded-xl p-3.5"
                        style={{
                          background: "hsl(0 0% 0% / 0.25)",
                          border: "1px solid hsl(0 0% 100% / 0.05)",
                        }}
                      >
                        <p className="text-[12px] text-foreground/90 whitespace-pre-wrap leading-relaxed">
                          {d.content}
                        </p>
                      </div>

                      {d.button_text && d.button_url && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openExternal(d.button_url!);
                          }}
                          className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 hover:brightness-110"
                          style={{
                            background:
                              "linear-gradient(135deg, hsl(var(--primary) / 0.25), hsl(var(--primary) / 0.12))",
                            border: "1px solid hsl(var(--primary) / 0.4)",
                            color: "hsl(var(--primary))",
                            boxShadow:
                              "0 4px 14px -4px hsl(var(--primary) / 0.4), inset 0 1px 0 hsl(0 0% 100% / 0.08)",
                          }}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>{d.button_text}</span>
                          <ArrowUpRight className="w-3.5 h-3.5 ml-auto opacity-70" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div
              className="text-center py-14 rounded-2xl"
              style={{
                background: "hsl(0 0% 100% / 0.03)",
                border: "1px dashed hsl(0 0% 100% / 0.08)",
              }}
            >
              <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-sm text-foreground/80 font-semibold mb-1">
                {query ? "Нічого не знайдено" : "ПРАВИЛ поки немає"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {query
                  ? "Спробуйте інший пошуковий запит"
                  : "Адміністрація скоро додасть документи"}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Documents;
