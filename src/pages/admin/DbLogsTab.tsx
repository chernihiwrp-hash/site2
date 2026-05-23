// DbLogsTab v3 — повний журнал запитів до БД.
// Фільтри: таблиця, операція, нік, IP, TG ID, статус, діапазон часу.
// Кожен рядок розгортається з повним snapshot: що саме писалось/шукалось,
// TG ID, точний час, країна (з IP), user-agent.

import { useEffect, useRef, useState, useCallback } from "react";
import { dbSelect } from "../../lib/db";
import NeonCard from "../../components/NeonCard";

// ─── Типи ─────────────────────────────────────────────────────────────────
type LogRow = {
  id: number;
  created_at: string;
  endpoint: string;
  username: string | null;
  role: string | null;
  table_name: string | null;
  op: string | null;
  match_keys: string[] | null;
  value_keys: string[] | null;
  match_snapshot: Record<string, unknown> | null;
  value_snapshot: Record<string, unknown> | null;
  telegram_id: string | null;
  status: number;
  allowed: boolean;
  error: string | null;
  ip: string | null;
  user_agent: string | null;
};

// ─── Константи ────────────────────────────────────────────────────────────
const PAGE_SIZE = 50;

const ALL_TABLES = [
  "users","factions","faction_leaders","faction_overrides","news","houses",
  "house_families","house_confiscations","house_purchase_requests","wanted",
  "bans","admin_perms","admin_applications","license_applications","car_plates",
  "faction_applications","city_voice","sos_signals","mayor_election",
  "mayor_candidate_applications","nft_gifts","nft_owners","documents",
  "recruitment_settings","notifications","db_logs",
];

const OP_META: Record<string, { color: string; bg: string; label: string }> = {
  insert:        { color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", label: "INSERT" },
  update:        { color: "text-yellow-400",  bg: "bg-yellow-500/10  border-yellow-500/20",  label: "UPDATE" },
  delete:        { color: "text-red-400",     bg: "bg-red-500/10     border-red-500/20",     label: "DELETE" },
  upsert:        { color: "text-orange-400",  bg: "bg-orange-500/10  border-orange-500/20",  label: "UPSERT" },
  select:        { color: "text-blue-400",    bg: "bg-blue-500/10    border-blue-500/20",    label: "SELECT" },
  "select.count":{ color: "text-cyan-400",   bg: "bg-cyan-500/10    border-cyan-500/20",    label: "COUNT"  },
};

const ENDPOINT_META: Record<string, { bg: string; label: string }> = {
  "db":        { bg: "bg-orange-500/20 text-orange-300", label: "db" },
  "db-select": { bg: "bg-blue-500/20 text-blue-300",     label: "select" },
  "auth":      { bg: "bg-purple-500/20 text-purple-300", label: "auth" },
  "balance":   { bg: "bg-green-500/20 text-green-300",   label: "balance" },
};

const ROLE_STYLE: Record<string, string> = {
  superadmin: "text-purple-400 font-bold",
  admin:      "text-yellow-400 font-semibold",
  player:     "text-muted-foreground",
};

// ─── Утиліти ──────────────────────────────────────────────────────────────
function fmt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("uk-UA", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return `${Math.floor(diff / 1000)}с`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}хв`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}год`;
  return `${Math.floor(diff / 86_400_000)}д`;
}

// ─── Мікро-компоненти ──────────────────────────────────────────────────────
function OpBadge({ op }: { op: string | null }) {
  if (!op) return <span className="text-muted-foreground text-[10px]">—</span>;
  const m = OP_META[op] || { color: "text-foreground", bg: "bg-muted/20 border-muted/30", label: op.toUpperCase() };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-mono font-bold ${m.bg} ${m.color}`}>
      {m.label}
    </span>
  );
}

function StatusBadge({ status, allowed }: { status: number; allowed: boolean }) {
  const cls = !allowed
    ? "bg-red-500/20 text-red-400 border-red-500/30"
    : status < 300
      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
      : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-mono ${cls}`}>
      {!allowed ? "✗" : "✓"} {status}
    </span>
  );
}

function SnapshotBlock({ label, data, color }: {
  label: string; data: Record<string, unknown> | null; color: string;
}) {
  if (!data || !Object.keys(data).length) return null;
  return (
    <div className="space-y-1">
      <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">{label}</div>
      <div className={`rounded-lg px-2.5 py-2 text-[11px] font-mono space-y-0.5 border ${color}`}>
        {Object.entries(data).map(([k, v]) => (
          <div key={k} className="flex gap-2 items-start">
            <span className="text-muted-foreground shrink-0 w-28 truncate">{k}:</span>
            <span className="text-foreground break-all">
              {v === null ? <span className="text-muted-foreground italic">null</span>
               : v === "" ? <span className="text-muted-foreground italic">«пусто»</span>
               : typeof v === "object" ? JSON.stringify(v).slice(0, 200)
               : String(v).slice(0, 200)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Головний компонент ───────────────────────────────────────────────────
export default function DbLogsTab() {
  const [rows, setRows]         = useState<LogRow[]>([]);
  const [loading, setLoading]   = useState(false);
  const [page, setPage]         = useState(0);
  const [total, setTotal]       = useState<number | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [auto, setAuto]         = useState(false);
  const [msg, setMsg]           = useState<string | null>(null);
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Фільтри
  const [fUser,    setFUser]    = useState("");
  const [fTg,      setFTg]      = useState("");
  const [fTable,   setFTable]   = useState("");
  const [fOp,      setFOp]      = useState("");
  const [fIp,      setFIp]      = useState("");
  const [fStatus,  setFStatus]  = useState<"all"|"ok"|"denied">("all");
  const [fDateFrom, setFDateFrom] = useState("");
  const [fDateTo,   setFDateTo]   = useState("");

  const buildFilters = useCallback(() => {
    const f: any[] = [];
    if (fUser.trim())  f.push({ col: "username",    op: "ilike", value: `%${fUser.trim()}%` });
    if (fTg.trim())    f.push({ col: "telegram_id", op: "ilike", value: `%${fTg.trim()}%` });
    if (fTable.trim()) f.push({ col: "table_name",  op: "eq",    value: fTable.trim() });
    if (fOp.trim())    f.push({ col: "op",          op: "eq",    value: fOp.trim() });
    if (fIp.trim())    f.push({ col: "ip",          op: "ilike", value: `%${fIp.trim()}%` });
    if (fStatus === "ok")     f.push({ col: "allowed", op: "eq", value: true });
    if (fStatus === "denied") f.push({ col: "allowed", op: "eq", value: false });
    // Фільтр по часу (використовуємо ilike як workaround — краще було б gte/lte але додамо через OR)
    // Простіше: фільтруємо на клієнті якщо заповнено діапазон
    return f;
  }, [fUser, fTg, fTable, fOp, fIp, fStatus]);

  const applyDateFilter = useCallback((data: LogRow[]) => {
    if (!fDateFrom && !fDateTo) return data;
    return data.filter(r => {
      const t = new Date(r.created_at).getTime();
      if (fDateFrom && t < new Date(fDateFrom).getTime()) return false;
      if (fDateTo   && t > new Date(fDateTo + "T23:59:59").getTime()) return false;
      return true;
    });
  }, [fDateFrom, fDateTo]);

  const load = useCallback(async (reset = false) => {
    setLoading(true);
    const p = reset ? 0 : page;
    if (reset) setPage(0);
    const filters = buildFilters();
    const [dataRes, countRes] = await Promise.all([
      dbSelect<LogRow[]>("db_logs", {
        filters,
        order: { col: "created_at", dir: "desc" },
        limit: PAGE_SIZE * (p + 1),
      }),
      dbSelect<null>("db_logs", { filters, count: true }),
    ]);
    setRows(applyDateFilter((dataRes.data || []) as LogRow[]));
    if (countRes.count !== undefined) setTotal(countRes.count);
    setLoading(false);
  }, [page, buildFilters, applyDateFilter]);

  useEffect(() => { load(true); }, []); // eslint-disable-line

  useEffect(() => {
    if (auto) {
      autoRef.current = setInterval(() => load(true), 8_000);
    } else {
      if (autoRef.current) clearInterval(autoRef.current);
    }
    return () => { if (autoRef.current) clearInterval(autoRef.current); };
  }, [auto, load]);

  const resetFilters = () => {
    setFUser(""); setFTg(""); setFTable(""); setFOp(""); setFIp("");
    setFStatus("all"); setFDateFrom(""); setFDateTo("");
  };

  const handleCleanup = async () => {
    setMsg("Очищення…");
    try {
      const res = await fetch("/api/db-cleanup", { method: "GET" });
      const json = await res.json().catch(() => ({}));
      setMsg(res.ok ? `✓ Видалено ${json.removed ?? 0} рядків` : `✗ ${json.error || res.status}`);
      if (res.ok) load(true);
    } catch (e: any) { setMsg(`✗ ${e?.message}`); }
    setTimeout(() => setMsg(null), 5000);
  };

  const inp = "liquid-glass rounded-lg px-2.5 py-1.5 text-xs bg-transparent border border-border focus:outline-none focus:ring-1 focus:ring-primary/30";
  const deniedCount  = rows.filter(r => !r.allowed).length;
  const uniqueIps    = new Set(rows.map(r => r.ip).filter(Boolean)).size;
  const uniqueUsers  = new Set(rows.map(r => r.username).filter(Boolean)).size;
  const deleteCount  = rows.filter(r => r.op === "delete").length;

  return (
    <div className="space-y-3">

      {/* ── Фільтри ── */}
      <NeonCard>
        <div className="p-3 space-y-2.5">

          {/* Рядок 1: нік, TG, таблиця, операція, IP */}
          <div className="flex flex-wrap gap-2">
            <input className={inp} style={{ minWidth: 110 }} placeholder="👤 Нік"
              value={fUser} onChange={e => setFUser(e.target.value)}
              onKeyDown={e => e.key === "Enter" && load(true)} />

            <input className={inp} style={{ minWidth: 110 }} placeholder="📱 TG ID"
              value={fTg} onChange={e => setFTg(e.target.value)}
              onKeyDown={e => e.key === "Enter" && load(true)} />

            <select className={inp} style={{ minWidth: 130 }} value={fTable} onChange={e => { setFTable(e.target.value); }}>
              <option value="">🗄 Всі таблиці</option>
              {ALL_TABLES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <select className={inp} style={{ minWidth: 110 }} value={fOp} onChange={e => setFOp(e.target.value)}>
              <option value="">⚡ Всі операції</option>
              {["insert","update","delete","upsert","select","select.count"].map(o =>
                <option key={o} value={o}>{o}</option>
              )}
            </select>

            <input className={inp} style={{ minWidth: 110 }} placeholder="🌐 IP"
              value={fIp} onChange={e => setFIp(e.target.value)}
              onKeyDown={e => e.key === "Enter" && load(true)} />
          </div>

          {/* Рядок 2: дати + статус + кнопки */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">З</span>
              <input type="date" className={inp} value={fDateFrom}
                onChange={e => setFDateFrom(e.target.value)} />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">По</span>
              <input type="date" className={inp} value={fDateTo}
                onChange={e => setFDateTo(e.target.value)} />
            </div>

            {/* Статус */}
            {(["all","ok","denied"] as const).map(s => (
              <button key={s} onClick={() => setFStatus(s)}
                className={`px-3 py-1 rounded-full text-[11px] border transition-colors ${
                  fStatus === s
                    ? s === "denied" ? "bg-red-500/20 border-red-500/40 text-red-300"
                    : s === "ok"     ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                    :                  "bg-primary/20 border-primary/40 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/30"
                }`}>
                {s === "all" ? "Всі" : s === "ok" ? "✓ ОК" : "✗ Відмовлено"}
              </button>
            ))}

            <button onClick={() => load(true)} disabled={loading}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/15 border border-primary/30 text-primary hover:bg-primary/25 transition-colors disabled:opacity-40">
              {loading ? "…" : "🔍 Пошук"}
            </button>

            <button onClick={resetFilters}
              className="px-3 py-1.5 rounded-lg text-xs border border-border text-muted-foreground hover:border-primary/20 transition-colors">
              Скинути
            </button>

            <div className="flex-1" />

            {/* Live toggle */}
            <button onClick={() => setAuto(a => !a)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] border transition-colors ${
                auto ? "bg-primary/20 border-primary/40 text-primary" : "border-border text-muted-foreground"
              }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${auto ? "bg-primary animate-pulse" : "bg-muted-foreground"}`} />
              {auto ? "Live" : "Live"}
            </button>

            <button onClick={handleCleanup}
              className="px-3 py-1.5 rounded-lg text-xs border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors">
              🗑 Очистити {">"}3д
            </button>
          </div>

          {msg && <div className="text-xs px-1" style={{ color: msg.startsWith("✓") ? "hsl(142 71% 45%)" : "hsl(0 70% 60%)" }}>{msg}</div>}
        </div>
      </NeonCard>

      {/* ── Статистика ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: "Всього в БД",  val: total?.toLocaleString() ?? "…", c: "text-primary" },
          { label: "Унікальних юзерів", val: uniqueUsers, c: "text-blue-400" },
          { label: "Відмовлено",   val: deniedCount, c: deniedCount > 0 ? "text-red-400" : "text-muted-foreground" },
          { label: "DELETE запитів", val: deleteCount, c: deleteCount > 0 ? "text-orange-400" : "text-muted-foreground" },
        ].map(s => (
          <NeonCard key={s.label}>
            <div className="p-3 text-center">
              <div className={`text-xl font-bold font-mono ${s.c}`}>{String(s.val)}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{s.label}</div>
            </div>
          </NeonCard>
        ))}
      </div>

      {/* ── Таблиця логів ── */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[700px]">
            <thead>
              <tr className="bg-muted/20 border-b border-border text-muted-foreground">
                <th className="text-left px-3 py-2 font-semibold uppercase tracking-wide text-[10px] w-[90px]">Час</th>
                <th className="text-left px-3 py-2 font-semibold uppercase tracking-wide text-[10px]">Юзер</th>
                <th className="text-left px-3 py-2 font-semibold uppercase tracking-wide text-[10px]">Таблиця</th>
                <th className="text-left px-3 py-2 font-semibold uppercase tracking-wide text-[10px]">Операція</th>
                <th className="text-left px-3 py-2 font-semibold uppercase tracking-wide text-[10px]">Що змінено</th>
                <th className="text-left px-3 py-2 font-semibold uppercase tracking-wide text-[10px]">Статус</th>
                <th className="text-left px-3 py-2 font-semibold uppercase tracking-wide text-[10px]">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {rows.map(r => {
                const isExp = expanded === r.id;
                // "Що змінено" — перше значення зі snapshot
                const primaryVal = r.value_snapshot
                  ? Object.entries(r.value_snapshot).find(([k]) =>
                      ["name","title","text","username","message","status"].includes(k)
                    )?.[1]
                  : r.match_snapshot
                  ? Object.values(r.match_snapshot)[0]
                  : null;

                return (
                  <>
                    <tr
                      key={r.id}
                      onClick={() => setExpanded(isExp ? null : r.id)}
                      className={`cursor-pointer transition-colors group ${
                        !r.allowed ? "bg-red-500/5 hover:bg-red-500/10" : "hover:bg-muted/20"
                      }`}
                    >
                      {/* Час */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <div className="font-mono text-[11px] text-foreground">{fmt(r.created_at)}</div>
                        <div className="text-[9px] text-muted-foreground">{timeAgo(r.created_at)} тому</div>
                      </td>

                      {/* Юзер */}
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-foreground">{r.username || <span className="text-muted-foreground italic">анонім</span>}</div>
                        <div className="flex gap-1.5 mt-0.5">
                          {r.role && <span className={`text-[9px] ${ROLE_STYLE[r.role] || "text-muted-foreground"}`}>{r.role}</span>}
                          {r.telegram_id && <span className="text-[9px] text-blue-400">TG:{r.telegram_id}</span>}
                        </div>
                      </td>

                      {/* Таблиця */}
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-foreground">{r.table_name || "—"}</span>
                          {r.endpoint && (
                            <span className={`px-1 py-0.5 rounded text-[9px] ${(ENDPOINT_META[r.endpoint] || {bg:"bg-muted/20 text-muted-foreground"}).bg}`}>
                              {r.endpoint}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Операція */}
                      <td className="px-3 py-2.5">
                        <OpBadge op={r.op} />
                      </td>

                      {/* Що змінено — preview */}
                      <td className="px-3 py-2.5 max-w-[200px]">
                        {primaryVal != null ? (
                          <span className="text-foreground truncate block" title={String(primaryVal)}>
                            {String(primaryVal).slice(0, 50)}
                            {String(primaryVal).length > 50 ? "…" : ""}
                          </span>
                        ) : r.error ? (
                          <span className="text-red-400 truncate block" title={r.error}>⚠ {r.error.slice(0, 40)}</span>
                        ) : (
                          <span className="text-muted-foreground text-[10px]">
                            {r.value_keys?.join(", ") || r.match_keys?.join(", ") || "—"}
                          </span>
                        )}
                      </td>

                      {/* Статус */}
                      <td className="px-3 py-2.5">
                        <StatusBadge status={r.status} allowed={r.allowed} />
                      </td>

                      {/* IP */}
                      <td className="px-3 py-2.5">
                        <span className="font-mono text-muted-foreground text-[10px]">{r.ip || "—"}</span>
                      </td>
                    </tr>

                    {/* ── Розгорнутий рядок ── */}
                    {isExp && (
                      <tr key={`${r.id}-exp`} className={`${!r.allowed ? "bg-red-500/5" : "bg-muted/5"}`}>
                        <td colSpan={7} className="px-4 py-4">
                          <div className="space-y-3">

                            {/* Шапка з метаданими */}
                            <div className="flex flex-wrap gap-3">
                              {[
                                { l: "ID запису",    v: `#${r.id}`,                        c: "text-muted-foreground" },
                                { l: "Точний час",   v: fmt(r.created_at),                  c: "text-foreground" },
                                { l: "Endpoint",     v: r.endpoint,                          c: "text-orange-300" },
                                { l: "Нік",         v: r.username || "—",                   c: "text-foreground" },
                                { l: "Роль",         v: r.role || "—",                      c: ROLE_STYLE[r.role||""] || "text-muted-foreground" },
                                ...(r.telegram_id ? [{ l: "Telegram ID", v: r.telegram_id, c: "text-blue-400" }] : []),
                                { l: "IP",          v: r.ip || "—",                         c: "text-foreground" },
                                { l: "Статус",      v: `${r.allowed ? "✓" : "✗"} ${r.status}`, c: r.allowed ? "text-emerald-400" : "text-red-400" },
                              ].map(item => (
                                <div key={item.l} className="min-w-[100px]">
                                  <div className="text-[9px] text-muted-foreground uppercase tracking-widest mb-0.5">{item.l}</div>
                                  <div className={`text-xs font-mono font-medium ${item.c}`}>{item.v}</div>
                                </div>
                              ))}
                            </div>

                            {/* Snapshots */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <SnapshotBlock
                                label="📝 Що писалось (values)"
                                data={r.value_snapshot}
                                color="border-emerald-500/20 bg-emerald-500/5"
                              />
                              <SnapshotBlock
                                label="🔍 Фільтр (match / where)"
                                data={r.match_snapshot}
                                color="border-yellow-500/20 bg-yellow-500/5"
                              />
                            </div>

                            {/* Помилка */}
                            {r.error && (
                              <div className="space-y-1">
                                <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">⚠ Помилка</div>
                                <div className="rounded-lg px-3 py-2 text-xs font-mono text-red-400 bg-red-500/10 border border-red-500/20 break-all">
                                  {r.error}
                                </div>
                              </div>
                            )}

                            {/* User-Agent */}
                            {r.user_agent && (
                              <div className="space-y-1">
                                <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">🖥 User-Agent</div>
                                <div className="text-[10px] font-mono text-muted-foreground break-all bg-muted/10 border border-border rounded-lg px-2.5 py-1.5">
                                  {r.user_agent}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}

              {/* Пусто */}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="text-3xl mb-2">🔍</div>
                    <div className="text-sm text-muted-foreground">
                      {fUser || fTg || fTable || fOp || fIp || fDateFrom || fDateTo || fStatus !== "all"
                        ? "За цими фільтрами нічого не знайдено"
                        : "Логів ще немає"}
                    </div>
                  </td>
                </tr>
              )}
              {loading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground animate-pulse text-sm">
                    Завантаження…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Пагінація ── */}
      {total !== null && rows.length < total && (
        <div className="flex justify-center">
          <button
            onClick={() => { setPage(p => p + 1); load(); }}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-primary/15 border border-primary/30 text-primary hover:bg-primary/25 transition-colors disabled:opacity-40"
          >
            {loading ? "Завантаження…" : `Завантажити ще (показано ${rows.length} з ${total})`}
          </button>
        </div>
      )}
    </div>
  );
}
