import { useState, useEffect } from "react";
import PageHeader from "../components/PageHeader";
import NeonCard from "../components/NeonCard";
import { ScrollText, ChevronDown, ChevronRight, ExternalLink, BookOpen } from "lucide-react";
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
      <PageHeader title="ДОКУМЕНТИ" subtitle="Офіційні папери" backTo="/" />

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
                  <div className="mt-3 liquid-glass rounded-xl p-3 animate-fade-in">
                    <p className="text-[11px] text-foreground whitespace-pre-wrap leading-relaxed">{d.content}</p>
                  </div>
                )}
              </NeonCard>
            </div>
          ))}
          {docs.length === 0 && (
            <div className="text-center py-12 liquid-glass-card rounded-2xl">
              <BookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
              <p className="text-xs text-muted-foreground">Документів поки немає</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Documents;
