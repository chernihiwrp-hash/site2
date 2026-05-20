import { useState, useEffect } from "react";
import PageHeader from "../components/PageHeader";
import NeonCard from "../components/NeonCard";
import { ScrollText, ChevronDown, ChevronRight, ExternalLink, BookOpen, Link } from "lucide-react";
import { store } from "../lib/store";
import type { DocumentItem } from "../lib/store";

const Documents = () => {
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    store.getDocs().then(data => { setDocs(data); setLoading(false); });
  }, []);

  return (
    <div className="min-h-screen bg-background pb-20 px-4 pt-4">
      <PageHeader title="ПРАВИЛА" subtitle="Офіційні папери" backTo="/" />

      {/* Посилання на сайт з правилами */}
      <a href="https://sleepmancybr.github.io/chernihiv" target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-3 liquid-glass-card rounded-2xl px-4 py-3.5 mb-4 animate-fade-in hover:border-primary/30 transition-all">
        <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0">
          <ExternalLink className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">Всі правила сервера</p>
          <p className="text-[10px] text-primary/70">sleepmancybr.github.io/chernihiv</p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </a>

      {loading ? (
        <div className="text-center py-8">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Завантаження...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {docs.map((d, i) => (
            <div key={d.id} className="animate-slide-up" style={{ animationDelay: `${i * 80}ms` }}>
              <NeonCard glowColor="lime" onClick={() => setOpenId(openId === d.id ? null : d.id)}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0">
                    <ScrollText className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground">{d.title}</h3>
                    {openId !== d.id && (
                      <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{d.content}</p>
                    )}
                  </div>
                  {openId === d.id
                    ? <ChevronDown className="w-4 h-4 text-primary shrink-0" />
                    : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                </div>
                {openId === d.id && (
                  <div
                    className="mt-3 liquid-glass rounded-xl p-3 animate-fade-in"
                    onClick={e => e.stopPropagation()}
                    onTouchEnd={e => e.stopPropagation()}
                  >
                    <p className="text-[11px] text-foreground whitespace-pre-wrap leading-relaxed">{d.content}</p>
                    {d.button_text && d.button_url && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          const tg = (window as any).Telegram?.WebApp;
                          if (tg?.openLink) tg.openLink(d.button_url);
                          else window.open(d.button_url, "_blank");
                        }}
                        onTouchEnd={e => {
                          e.stopPropagation();
                          const tg = (window as any).Telegram?.WebApp;
                          if (tg?.openLink) tg.openLink(d.button_url);
                          else window.open(d.button_url, "_blank");
                        }}
                        className="mt-3 w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
                        style={{ background: "hsl(var(--primary) / 0.15)", border: "1px solid hsl(var(--primary) / 0.3)", color: "hsl(var(--primary))" }}
                      >
                        <Link className="w-3.5 h-3.5 shrink-0" />
                        {d.button_text}
                        <ExternalLink className="w-3 h-3 ml-auto shrink-0 opacity-60" />
                      </button>
                    )}
                  </div>
                )}
              </NeonCard>
            </div>
          ))}
          {docs.length === 0 && (
            <div className="text-center py-12 liquid-glass-card rounded-2xl">
              <BookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
              <p className="text-xs text-muted-foreground">ПРАВИЛ поки немає</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Documents;
