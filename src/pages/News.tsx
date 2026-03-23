import { useState, useEffect } from "react";
import PageHeader from "../components/PageHeader";
import NeonCard from "../components/NeonCard";
import GradientButton from "../components/GradientButton";
import { Newspaper, Clock, RefreshCw, ExternalLink } from "lucide-react";
import { store } from "../lib/store";
import type { NewsItem } from "../lib/store";

type NewsButton = { text: string; url: string; variant: "green" | "yellow" | "danger" | "cyan" };

const News = () => {
  // Позначаємо новини як переглянуті при відкритті
  useEffect(() => {
    localStorage.setItem("crp_news_seen", String(Date.now()));
  }, []);

  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => {
    store.getNews().then(data => { setNews(data); setLoading(false); });
  }, []);

  return (
    <div className="min-h-screen pb-20 px-4 pt-4">
      <PageHeader title="НОВИНИ" subtitle="Останні події міста" backTo="/" />
      {loading ? (
        <div className="text-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Завантаження...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {news.map((item, i) => {
            let btn: NewsButton | null = null;
            try {
              const ext = item as NewsItem & { button_data?: string };
              if (ext.button_data) btn = JSON.parse(ext.button_data);
            } catch {}
            const isOpen = openId === item.id;
            return (
              <div key={item.id} className="animate-slide-up" style={{ animationDelay: `${i * 80}ms` }}>
                <NeonCard glowColor="green" onClick={() => setOpenId(isOpen ? null : item.id)}>
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.type === "update" ? "bg-blue-500/10 border border-blue-500/20" : "bg-primary/10 border border-primary/20"}`}>
                      {item.type === "update" ? <RefreshCw className="w-5 h-5 text-blue-400" /> : <Newspaper className="w-5 h-5 text-primary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                        <span className={`text-[8px] px-1.5 py-0.5 rounded shrink-0 ${item.type === "update" ? "bg-blue-500/15 text-blue-400" : "bg-primary/15 text-primary"}`}>
                          {item.type === "update" ? "Оновлення" : "Новина"}
                        </span>
                      </div>
                      <p className={`text-[11px] text-muted-foreground leading-relaxed ${!isOpen ? "line-clamp-2" : ""}`}>{item.text}</p>
                      {isOpen && (
                        <div className="mt-2 animate-fade-in">
                          {item.image && (
                            <img src={item.image} alt="" className="w-full h-40 object-cover rounded-xl mt-2 mb-3"
                              onError={e => (e.currentTarget.style.display = "none")} />
                          )}
                          {/* Кнопка — реальне посилання */}
                          {btn && btn.url && (
                            <div className="mt-3" onClick={e => e.stopPropagation()}>
                              <a href={btn.url} target="_blank" rel="noopener noreferrer">
                                <GradientButton variant={btn.variant} className="text-xs py-2 px-4 flex items-center gap-1.5">
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  {btn.text}
                                </GradientButton>
                              </a>
                            </div>
                          )}
                          {btn && !btn.url && (
                            <div className="mt-3">
                              <GradientButton variant={btn.variant} className="text-xs py-2 px-4">{btn.text}</GradientButton>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span className="text-[10px]">{item.date}</span>
                        </div>
                        <span className="text-[10px] text-primary">{isOpen ? "Згорнути" : "Читати →"}</span>
                      </div>
                    </div>
                  </div>
                </NeonCard>
              </div>
            );
          })}
          {news.length === 0 && (
            <div className="text-center py-12 liquid-glass-card rounded-2xl">
              <Newspaper className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
              <p className="text-xs text-muted-foreground">Новин поки немає</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default News;
