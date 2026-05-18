/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║     VIP — сторінка покупки підписки                              ║
 * ║  Файл: /src/pages/Vip.tsx                                        ║
 * ║                                                                  ║
 * ║  Що тут є:                                                       ║
 * ║  • Вибір плану (місяць / рік)                                    ║
 * ║  • Кнопка "Купити" → POST /api/anypay-create → redirect          ║
 * ║  • Таймер VIP-підписки зі зворотним відліком                     ║
 * ║  • Автозняття VIP якщо час вийшов                                ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import { useState, useEffect, useCallback } from "react";
import { Crown, Clock, CheckCircle, Zap, Shield, Star, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/store";
import PageHeader from "../components/PageHeader";

// ── Типи ─────────────────────────────────────────────────────────────────────
type Duration = "month" | "year";
type VipStatus = {
  is_vip: boolean;
  expires_at: string | null;
  duration: string | null;
};

// ── Плани підписки (ціни мають відповідати api/anypay-create.ts) ─────────────
const PLANS: {
  id: Duration;
  label: string;
  price: number;
  originalPrice?: number;
  badge?: string;
  features: string[];
}[] = [
  {
    id: "month",
    label: "1 Місяць",
    price: 99,
    features: [
      "VIP значок у профілі",
      "Доступ до VIP-зон",
      "Пріоритетна підтримка",
      "Ексклюзивний колір нікнейму",
    ],
  },
  {
    id: "year",
    label: "1 Рік",
    price: 799,
    originalPrice: 1188, // 99 * 12
    badge: "ВИГОДА 33%",
    features: [
      "Усе з плану «Місяць»",
      "Ексклюзивний VIP-скін",
      "Подвійний досвід",
      "Спеціальна рамка аватару",
    ],
  },
];

// ── Хелпер: форматує залишок часу в рядок ────────────────────────────────────
function formatTimeLeft(expiresAt: string): { text: string; isExpired: boolean; dangerZone: boolean } {
  const now = Date.now();
  const expires = new Date(expiresAt).getTime();
  const diff = expires - now;

  if (diff <= 0) return { text: "Закінчилась", isExpired: true, dangerZone: false };

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  let text: string;
  if (days > 30) {
    const months = Math.floor(days / 30);
    const remDays = days % 30;
    text = remDays > 0 ? `${months} міс. ${remDays} дн.` : `${months} міс.`;
  } else if (days > 0) {
    text = `${days} дн. ${hours} год. ${minutes} хв.`;
  } else if (hours > 0) {
    text = `${hours} год. ${minutes} хв. ${seconds} сек.`;
  } else {
    text = `${minutes} хв. ${seconds} сек.`;
  }

  return { text, isExpired: false, dangerZone: diff < 3 * 24 * 60 * 60 * 1000 }; // < 3 дні
}

// ── Компонент таймера ─────────────────────────────────────────────────────────
function VipTimer({ expiresAt, onExpire }: { expiresAt: string; onExpire: () => void }) {
  const [display, setDisplay] = useState(() => formatTimeLeft(expiresAt));

  useEffect(() => {
    if (display.isExpired) {
      onExpire();
      return;
    }

    const interval = setInterval(() => {
      const next = formatTimeLeft(expiresAt);
      setDisplay(next);
      if (next.isExpired) {
        clearInterval(interval);
        onExpire();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpire, display.isExpired]);

  const color = display.isExpired
    ? "#ef4444"
    : display.dangerZone
    ? "#f97316"
    : "#84cc16";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 18px",
        borderRadius: 12,
        border: `1px solid ${color}33`,
        background: `${color}11`,
        color,
        fontSize: 14,
        fontWeight: 600,
        letterSpacing: "0.03em",
      }}
    >
      <Clock size={16} />
      {display.isExpired ? (
        <span>Підписка закінчилась</span>
      ) : (
        <>
          <span style={{ opacity: 0.7, fontWeight: 400 }}>Залишилось:</span>
          <span style={{ fontFamily: "monospace", fontSize: 15 }}>{display.text}</span>
          {display.dangerZone && <AlertTriangle size={14} />}
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── ГОЛОВНИЙ КОМПОНЕНТ ────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export default function Vip() {
  const nick = localStorage.getItem("crp_nick") || "";

  const [selectedPlan, setSelectedPlan] = useState<Duration>("month");
  const [loading, setLoading] = useState(false);
  const [vipStatus, setVipStatus] = useState<VipStatus>({
    is_vip: false,
    expires_at: null,
    duration: null,
  });
  const [statusLoading, setStatusLoading] = useState(true);

  // ── Завантажуємо поточний статус VIP ─────────────────────────────────────
  const loadVipStatus = useCallback(async () => {
    if (!nick) { setStatusLoading(false); return; }

    try {
      const { data } = await supabase
        .from("users")
        .select("role, vip_expires_at, vip_duration")
        .ilike("username", nick)
        .maybeSingle();

      if (!data) { setStatusLoading(false); return; }

      const isVip =
        data.role === "vip" &&
        data.vip_expires_at &&
        new Date(data.vip_expires_at).getTime() > Date.now();

      setVipStatus({
        is_vip: Boolean(isVip),
        expires_at: data.vip_expires_at || null,
        duration: data.vip_duration || null,
      });
    } catch (e) {
      console.error("[Vip] loadVipStatus error:", e);
    } finally {
      setStatusLoading(false);
    }
  }, [nick]);

  useEffect(() => {
    loadVipStatus();
  }, [loadVipStatus]);

  // ── Автозняття VIP у БД після закінчення таймера ─────────────────────────
  const handleTimerExpire = useCallback(async () => {
    if (!nick) return;

    try {
      await fetch("/api/db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: "users",
          op: "update",
          values: { role: "user", vip_expires_at: null, vip_duration: null },
          match: { username: { op: "ilike", value: nick } },
        }),
      });
    } catch (e) {
      console.error("[Vip] handleTimerExpire error:", e);
    }

    setVipStatus({ is_vip: false, expires_at: null, duration: null });
    toast.info("⏰ Ваша VIP-підписка закінчилась");
  }, [nick]);

  // ── Ініціація оплати ──────────────────────────────────────────────────────
  const handleBuy = async () => {
    if (!nick) {
      toast.error("Спочатку увійдіть в акаунт");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/anypay-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: nick,          // username гравця
          duration: selectedPlan, // "month" або "year"
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.payment_url) {
        toast.error(data.error || "Помилка створення платежу. Спробуйте пізніше.");
        return;
      }

      // ✅ Автоматичний редирект на сторінку оплати AnyPay
      window.location.href = data.payment_url;

    } catch (e: any) {
      toast.error("Мережева помилка. Перевірте з'єднання.");
      console.error("[Vip] handleBuy error:", e);
    } finally {
      setLoading(false);
    }
  };

  // ── Рендер ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", padding: "16px 16px 100px" }}>
      <PageHeader title="VIP Підписка" />

      {/* ── Поточний статус VIP ─── */}
      {!statusLoading && vipStatus.is_vip && vipStatus.expires_at && (
        <div
          style={{
            margin: "0 auto 24px",
            maxWidth: 480,
            padding: "18px 20px",
            borderRadius: 16,
            border: "1px solid #f59e0b44",
            background: "linear-gradient(135deg, #f59e0b11, #f59e0b05)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <Crown size={20} color="#f59e0b" />
            <span style={{ color: "#f59e0b", fontWeight: 700, fontSize: 16 }}>
              VIP Активний
            </span>
            <span
              style={{
                marginLeft: "auto",
                fontSize: 11,
                padding: "2px 10px",
                borderRadius: 20,
                background: "#f59e0b22",
                color: "#fbbf24",
                fontWeight: 600,
                textTransform: "uppercase",
              }}
            >
              {vipStatus.duration === "year" ? "Річний" : "Місячний"}
            </span>
          </div>

          <VipTimer expiresAt={vipStatus.expires_at} onExpire={handleTimerExpire} />
        </div>
      )}

      {/* ── Заголовок ─── */}
      <div style={{ textAlign: "center", margin: "0 auto 32px", maxWidth: 480 }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #f59e0b33, #f59e0b11)",
            border: "2px solid #f59e0b44",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}
        >
          <Crown size={32} color="#f59e0b" />
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "hsl(var(--foreground))", marginBottom: 8 }}>
          VIP Привілеї
        </h1>
        <p style={{ color: "hsl(var(--muted-foreground))", fontSize: 14, lineHeight: 1.6 }}>
          Отримайте ексклюзивний доступ до особливих можливостей сервера
        </p>
      </div>

      {/* ── Плани ─── */}
      <div
        style={{
          display: "flex",
          gap: 14,
          maxWidth: 480,
          margin: "0 auto 28px",
          flexDirection: "column",
        }}
      >
        {PLANS.map((plan) => {
          const selected = selectedPlan === plan.id;
          return (
            <button
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              style={{
                position: "relative",
                padding: "18px 20px",
                borderRadius: 16,
                border: `2px solid ${selected ? "hsl(var(--primary))" : "hsl(var(--border))"}`,
                background: selected ? "hsl(var(--primary) / 0.08)" : "hsl(var(--card))",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.2s ease",
                transform: selected ? "scale(1.01)" : "scale(1)",
                boxShadow: selected ? "0 0 20px hsl(var(--primary) / 0.2)" : "none",
              }}
            >
              {/* Badge */}
              {plan.badge && (
                <div
                  style={{
                    position: "absolute",
                    top: -10,
                    right: 16,
                    background: "hsl(var(--primary))",
                    color: "#000",
                    fontSize: 10,
                    fontWeight: 800,
                    padding: "3px 10px",
                    borderRadius: 20,
                    letterSpacing: "0.05em",
                  }}
                >
                  {plan.badge}
                </div>
              )}

              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: "hsl(var(--foreground))" }}>
                    {plan.label}
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 4 }}>
                    <span style={{ fontSize: 26, fontWeight: 800, color: selected ? "hsl(var(--primary))" : "hsl(var(--foreground))" }}>
                      {plan.price} ₴
                    </span>
                    {plan.originalPrice && (
                      <span style={{ fontSize: 14, color: "hsl(var(--muted-foreground))", textDecoration: "line-through" }}>
                        {plan.originalPrice} ₴
                      </span>
                    )}
                  </div>
                </div>

                {/* Radio indicator */}
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    border: `2px solid ${selected ? "hsl(var(--primary))" : "hsl(var(--border))"}`,
                    background: selected ? "hsl(var(--primary))" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: 4,
                  }}
                >
                  {selected && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#000" }} />}
                </div>
              </div>

              {/* Features */}
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                {plan.features.map((f, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "hsl(var(--muted-foreground))" }}>
                    <CheckCircle size={13} color="hsl(var(--primary))" style={{ flexShrink: 0 }} />
                    {f}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      {/* ── Кнопка купити ─── */}
      <div style={{ maxWidth: 480, margin: "0 auto 24px" }}>
        <button
          onClick={handleBuy}
          disabled={loading || !nick}
          style={{
            width: "100%",
            padding: "16px 24px",
            borderRadius: 14,
            border: "none",
            background: loading
              ? "hsl(var(--muted))"
              : "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))",
            color: loading ? "hsl(var(--muted-foreground))" : "hsl(var(--primary-foreground))",
            fontSize: 16,
            fontWeight: 700,
            cursor: loading || !nick ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            transition: "all 0.2s ease",
            boxShadow: loading ? "none" : "0 4px 24px hsl(var(--primary) / 0.35)",
            letterSpacing: "0.03em",
          }}
        >
          {loading ? (
            <>
              <div
                style={{
                  width: 18,
                  height: 18,
                  border: "2px solid currentColor",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  animation: "spin 0.6s linear infinite",
                }}
              />
              Перенаправлення...
            </>
          ) : (
            <>
              <Zap size={18} />
              Оплатити {PLANS.find((p) => p.id === selectedPlan)?.price} ₴ через AnyPay
            </>
          )}
        </button>

        {!nick && (
          <p style={{ textAlign: "center", color: "#ef4444", fontSize: 13, marginTop: 8 }}>
            ⚠️ Увійдіть в акаунт щоб купити підписку
          </p>
        )}
      </div>

      {/* ── Інфо ─── */}
      <div
        style={{
          maxWidth: 480,
          margin: "0 auto",
          padding: "16px 20px",
          borderRadius: 12,
          background: "hsl(var(--muted) / 0.4)",
          border: "1px solid hsl(var(--border))",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <Shield size={15} color="hsl(var(--muted-foreground))" />
          <span style={{ fontSize: 12, fontWeight: 600, color: "hsl(var(--muted-foreground))", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Безпечна оплата
          </span>
        </div>
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 5 }}>
          {[
            "Оплата захищена AnyPay — офіційна платіжна система",
            "Підписка активується автоматично після оплати",
            "Підтримуються картки Visa / Mastercard / Google Pay",
            "Валюта: UAH (українська гривня)",
          ].map((text, i) => (
            <li key={i} style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", display: "flex", alignItems: "flex-start", gap: 6 }}>
              <Star size={10} style={{ flexShrink: 0, marginTop: 3 }} />
              {text}
            </li>
          ))}
        </ul>
      </div>

      {/* ── CSS анімація спінера ─── */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
