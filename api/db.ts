import { createClient } from "@supabase/supabase-js";

const ALLOWED_TABLES = new Set<string>([
  "users",
  "license_applications",
  "car_plates",
  "faction_applications",
  "admin_applications",
  "admin_perms",
  "house_purchase_requests",
  "city_voice",
  "sos_signals",
  "wanted",
  "factions",
  "faction_leaders",
  "faction_overrides",
  "mayor_election",
  "nft_gifts",
  "nft_owners",
  "news",
  "houses",
  "documents",
  "bans",
]);

const ALLOWED_OPS = new Set(["insert", "update", "delete", "upsert"]);
const ALLOWED_FILTERS = new Set(["eq", "ilike"]);

type Match = Record<string, { op: "eq" | "ilike"; value: unknown }> | undefined;

interface Body {
  table: string;
  op: "insert" | "update" | "delete" | "upsert";
  values?: unknown;
  match?: Match;
  onConflict?: string;
  returning?: boolean;
}

export default async function handler(req: any, res: any) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({ error: "Server not configured: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" });
  }

  let body: Body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  const { op, values, match, onConflict, returning } = body || ({} as Body);
  const table = String(body?.table || "").trim();

  if (!table || !ALLOWED_TABLES.has(table)) {
    return res.status(400).json({ error: `Table not allowed: ${table || "empty"}` });
  }
  if (!op || !ALLOWED_OPS.has(op)) {
    return res.status(400).json({ error: "Op not allowed" });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    let q: any = supabaseAdmin.from(table);

    if (op === "insert") {
      q = q.insert(values as any);
    } else if (op === "upsert") {
      q = q.upsert(values as any, onConflict ? { onConflict } : undefined);
    } else if (op === "update") {
      q = q.update(values as any);
    } else if (op === "delete") {
      q = q.delete();
    }

    if (match && typeof match === "object") {
      for (const [col, cond] of Object.entries(match)) {
        if (!cond || !ALLOWED_FILTERS.has(cond.op)) continue;
        q = q[cond.op](col, cond.value as any);
      }
    }

    if (returning) q = q.select();

    const { data, error } = await q;
    if (error) {
      console.error("[api/db] error:", error.message);
      return res.status(400).json({ error: error.message });
    }
    return res.status(200).json({ data: data ?? null });
  } catch (e: any) {
    console.error("[api/db] exception:", e?.message);
    return res.status(500).json({ error: e?.message || "Server error" });
  }
}
