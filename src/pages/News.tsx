import { useState, useEffect } from "react";
import PageHeader from "../components/PageHeader";
import NeonCard from "../components/NeonCard";
import GradientButton from "../components/GradientButton";
import { Newspaper, Clock, RefreshCw, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { store } from "../lib/store";
import type { NewsItem } from "../lib/store";

type NewsButton = { text: string; url: string; variant: "green" | "yellow" | "danger" | "cyan" };

const News = () => {
  useEffect(() => {
    localStorage.setItem("crp_news_seen", String(Date.now()));
  }, []);

  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<number | null>(null);

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
        <div className="space-y-3">
          {news.map((item, i) => {
            let btn: NewsButton | null = null;
            try {
              const ext = item as NewsItem & { button_data?: string };
              if (ext.button_data) btn = JSON.parse(ext.button_data);
            } catch {}
            const isOpen = openId === item.id;
            const isUpdate = item.type === "update";

            return (
              <div key={item.id} className="animate-slide-up" style={{ animationDelay: `${i * 80}ms` }}>
                {/* Карточка — не используем NeonCard чтобы избежать конфликтов кликов */}
                <div
                  className={`rounded-2xl border cursor-pointer transition-all duration-200 overflow-hidden
                    ${isUpdate
                      ? "bg-blue-950/40 border-blue-500/30 hover:border-blue-400/60"
                      : "bg-green-950/30 border-primary/25 hover:border-primary/60"
                    }`}
                  onClick={() => setOpenId(isOpen ? null : item.id)}
                >
                  {/* Цветная полоска сверху */}
                  <div className={`h-0.5 w-full ${isUpdate ? "bg-gradient-to-r from-blue-500/0 via-blue-400 to-blue-500/0" : "bg-gradient-to-r from-primary/0 via-primary to-primary/0"}`} />

                  <div className="p-3">
                    <div className="flex items-start gap-3">
                      {/* Иконка */}
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5
                        ${isUpdate ? "bg-blue-500/15 border border-blue-500/30" : "bg-primary/10 border border-primary/25"}`}>
                        {isUpdate
                          ? <RefreshCw className="w-4 h-4 text-blue-400" />
                          : <Newspaper className="w-4 h-4 text-primary" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Заголовок + бейдж */}
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="text-sm font-bold text-foreground leading-tight">{item.title}</h3>
                          <span className={`text-[8px] px-1.5 py-0.5 rounded-full shrink-0 font-medium mt-0.5
                            ${isUpdate ? "bg-blue-500/20 text-blue-300 border border-blue-500/30" : "bg-primary/15 text-primary border border-primary/25"}`}>
                            {isUpdate ? "⟳ Оновлення" : "● Новина"}
                          </span>
                        </div>

                        {/* Текст */}
                        <p className={`text-[11px] text-muted-foreground leading-relaxed ${!isOpen ? "line-clamp-2" : ""}`}>
                          {item.text}
                        </p>

                        {/* Раскрытый контент */}
                        {isOpen && (
                          <div className="mt-3 animate-fade-in" onClick={e => e.stopPropagation()}>
                            {item.image && (
                              <img
                                src={item.image}
                                alt=""
                                className="w-full h-44 object-cover rounded-xl mb-3 border border-white/5"
                                onError={e => (e.currentTarget.style.display = "none")}
                              />
                            )}

                            {/* Кнопка — window.open напрямую */}
                            {btn && (
                              <button
                                className={`mt-2 flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl border transition-all active:scale-95
                                  ${btn.variant === "cyan"    ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/25" :
                                    btn.variant === "yellow"  ? "bg-yellow-500/15 border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/25" :
                                    btn.variant === "danger"  ? "bg-red-500/15 border-red-500/40 text-red-300 hover:bg-red-500/25" :
                                    "bg-primary/15 border-primary/40 text-primary hover:bg-primary/25"}`}
                                onClick={(e) => handleButtonClick(e, btn!.url)}
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                {btn.text}
                              </button>
                            )}
                          </div>
                        )}

                        {/* Футер */}
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span className="text-[10px]">{item.date}</span>
                          </div>
                          <span className={`text-[10px] flex items-center gap-0.5 ${isUpdate ? "text-blue-400" : "text-primary"}`}>
                            {isOpen ? <><ChevronUp className="w-3 h-3" /> Згорнути</> : <><ChevronDown className="w-3 h-3" /> Читати</>}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {news.length === 0 && (
            <div className="text-center py-12 rounded-2xl border border-white/5 bg-white/2">
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
