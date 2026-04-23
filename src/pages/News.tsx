import { useState, useEffect } from "react";
import PageHeader from "../components/PageHeader";
import { Newspaper, Clock, RefreshCw, ExternalLink } from "lucide-react";
import { store } from "../lib/store";
import type { NewsItem } from "../lib/store";

type NewsButton = { text: string; url: string; variant: "green" | "yellow" | "danger" | "cyan" };

const News = () => {
  useEffect(() => {
    localStorage.setItem("crp_news_seen", String(Date.now()));
  }, []);

  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    store.getNews().then(data => { setNews(data); setLoading(false); });
  }, []);

  const handleButtonClick = (e: React.MouseEvent, url: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen pb-20 px-4 pt-4">
      <PageHeader title="НОВИНИ" subtitle="Останні події міста" backTo="/" />
      {loading ? (
        <div className="text-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Завантаження...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {news.map((item, i) => {
            let btn: NewsButton | null = null;
            try {
              const ext = item as NewsItem & { button_data?: string };
              if (ext.button_data) btn = JSON.parse(ext.button_data);
            } catch {}
            const isUpdate = item.type === "update";

            return (
              <div key={item.id} className="animate-slide-up" style={{ animationDelay: `${i * 80}ms` }}>
                <div className={`rounded-2xl border overflow-hidden
                  ${isUpdate
                    ? "bg-blue-950/40 border-blue-500/30"
                    : "bg-green-950/30 border-primary/25"
                  }`}>

                  {/* Цветная полоска сверху */}
                  <div className={`h-0.5 w-full ${isUpdate
                    ? "bg-gradient-to-r from-blue-500/0 via-blue-400 to-blue-500/0"
                    : "bg-gradient-to-r from-primary/0 via-primary to-primary/0"}`} />

                  {/* Картинка — полная ширина, пропорциональная высота */}
                  {item.image && (
                    <div className="w-full">
                      <img
                        src={item.image}
                        alt=""
                        className="w-full block"
                        style={{ display: "block", maxHeight: "400px", objectFit: "contain", background: "rgba(0,0,0,0.3)" }}
                        onError={e => (e.currentTarget.parentElement!.style.display = "none")}
                      />
                    </div>
                  )}

                  <div className="p-3">
                    {/* Заголовок + иконка */}
                    <div className="flex items-start gap-3 mb-2">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5
                        ${isUpdate ? "bg-blue-500/15 border border-blue-500/30" : "bg-primary/10 border border-primary/25"}`}>
                        {isUpdate
                          ? <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                          : <Newspaper className="w-3.5 h-3.5 text-primary" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-bold text-foreground leading-tight">{item.title}</h3>
                          <span className={`text-[8px] px-1.5 py-0.5 rounded-full shrink-0 font-medium mt-0.5
                            ${isUpdate
                              ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                              : "bg-primary/15 text-primary border border-primary/25"}`}>
                            {isUpdate ? "⟳ Оновлення" : "● Новина"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Текст — всегда раскрыт */}
                    <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
                      {item.text}
                    </p>

                    {/* Кнопка */}
                    {btn && (
                      <button
                        className={`mb-3 flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl border transition-all active:scale-95
                          ${btn.variant === "cyan"   ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/25" :
                            btn.variant === "yellow" ? "bg-yellow-500/15 border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/25" :
                            btn.variant === "danger" ? "bg-red-500/15 border-red-500/40 text-red-300 hover:bg-red-500/25" :
                            "bg-primary/15 border-primary/40 text-primary hover:bg-primary/25"}`}
                        onClick={(e) => handleButtonClick(e, btn!.url)}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        {btn.text}
                      </button>
                    )}

                    {/* Футер с датой */}
                    <div className="flex items-center gap-1 text-muted-foreground border-t border-white/5 pt-2">
                      <Clock className="w-3 h-3" />
                      <span className="text-[10px]">{item.date}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {news.length === 0 && (
            <div className="text-center py-12 rounded-2xl border border-white/5">
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
