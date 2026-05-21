// Журнал запитів до БД. Доступ контролюється пермом "db_logs"
// у стандартному UI керування правами адмінів.
import { useEffect, useState } from "react";
import { dbSelect } from "../../lib/db";
import NeonCard from "../../components/NeonCard";

type LogRow = {
  id: number; created_at: string; endpoint: string;
  username: string | null; role: string | null;
  table_name: string | null; op: string | null;
  match_keys: string[] | null; value_keys: string[] | null;
  status: number; allowed: boolean; error: string | null;
  ip: string | null; user_agent: string | null;
};

const PAGE = 50;

export default function DbLogsTab() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [fUser, setFUser] = useState("");
  const [fTable, setFTable] = useState("");
  const [fEndpoint, setFEndpoint] = useState("");
  const [onlyDenied, setOnlyDenied] = useState(false);

  const load = async () => {
    setLoading(true);
    const filters: any[] = [];
    if (fUser.trim())     filters.push({ col: "username",   op: "ilike", value: `%${fUser.trim().toLowerCase()}%` });
    if (fTable.trim())    filters.push({ col: "table_name", op: "eq",    value: fTable.trim() });
    if (fEndpoint.trim()) filters.push({ col: "endpoint",   op: "eq",    value: fEndpoint.trim() });
    if (onlyDenied)       filters.push({ col: "allowed",    op: "eq",    value: false });

    const { data } = await dbSelect<LogRow[]>("db_logs", {
      filters,
      order: { col: "created_at", dir: "desc" },
      limit: PAGE * (page + 1),
    });
    setRows((data || []) as LogRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, onlyDenied]);

  const input = "liquid-glass rounded-lg px-3 py-2 text-xs bg-transparent border border-border focus:outline-none focus:ring-1 focus:ring-primary/30";

  return (
    <div className="space-y-3">
      <NeonCard>
        <div className="flex flex-wrap gap-2 items-center p-3">
          <input className={input} placeholder="username" value={fUser} onChange={e => setFUser(e.target.value)} />
          <input className={input} placeholder="table"    value={fTable} onChange={e => setFTable(e.target.value)} />
          <select className={input} value={fEndpoint} onChange={e => setFEndpoint(e.target.value)}>
            <option value="">всі endpoint</option>
            <option value="db">db</option>
            <option value="db-select">db-select</option>
            <option value="auth">auth</option>
            <option value="balance">balance</option>
          </select>
          <label className="flex items-center gap-1 text-xs">
            <input type="checkbox" checked={onlyDenied} onChange={e => setOnlyDenied(e.target.checked)} />
            тільки заблоковані
          </label>
          <button onClick={() => { setPage(0); load(); }} className="px-3 py-2 rounded-lg text-xs bg-primary/15 border border-primary/30 text-primary">
            Оновити
          </button>
        </div>
      </NeonCard>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-xs">
          <thead className="bg-muted/30 text-muted-foreground">
            <tr>
              <th className="text-left p-2">Час</th>
              <th className="text-left p-2">User</th>
              <th className="text-left p-2">Role</th>
              <th className="text-left p-2">Endpoint</th>
              <th className="text-left p-2">Op</th>
              <th className="text-left p-2">Table</th>
              <th className="text-left p-2">Match / Values</th>
              <th className="text-left p-2">Status</th>
              <th className="text-left p-2">Error</th>
              <th className="text-left p-2">IP</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className={r.allowed ? "" : "bg-destructive/10"}>
                <td className="p-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString("uk-UA")}</td>
                <td className="p-2">{r.username || "—"}</td>
                <td className="p-2">{r.role || "—"}</td>
                <td className="p-2">{r.endpoint}</td>
                <td className="p-2">{r.op || "—"}</td>
                <td className="p-2">{r.table_name || "—"}</td>
                <td className="p-2 text-muted-foreground">
                  {r.match_keys?.length ? `m:[${r.match_keys.join(",")}]` : ""}{" "}
                  {r.value_keys?.length ? `v:[${r.value_keys.join(",")}]` : ""}
                </td>
                <td className="p-2">{r.status}</td>
                <td className="p-2 text-destructive">{r.error || ""}</td>
                <td className="p-2">{r.ip || "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && !loading && (
              <tr><td colSpan={10} className="p-4 text-center text-muted-foreground">Порожньо</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-center">
        <button onClick={() => setPage(p => p + 1)} disabled={loading}
                className="px-4 py-2 rounded-lg text-xs bg-primary/15 border border-primary/30 text-primary">
          {loading ? "Завантаження…" : "Показати більше"}
        </button>
      </div>
    </div>
  );
}
