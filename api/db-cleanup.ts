// /api/db-cleanup.ts — видаляє записи db_logs старші 3 днів.
// Викликається Vercel Cron: щодня о 03:00 UTC.
// Також можна викликати вручну з адмін-панелі (через fetch /api/db-cleanup з CRON_SECRET).

import { createClient } from "@supabase/supabase-js";

export const config = { maxDuration: 30 };

export default async function handler(req: any, res: any) {
  // Захист: лише Vercel Cron або ручний виклик з секретом
  const authHeader = req.headers["authorization"] || "";
  const secret = process.env.CRON_SECRET || "";
  if (secret && authHeader !== `Bearer ${secret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({ error: "Server not configured" });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    // Видаляємо всі записи старші 3 днів
    const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

    const { error, count } = await supabase
      .from("db_logs")
      .delete({ count: "exact" })
      .lt("created_at", cutoff);

    if (error) {
      console.error("[db-cleanup] error:", error.message);
      return res.status(500).json({ error: "Cleanup failed", detail: error.message });
    }

    console.log(`[db-cleanup] removed ${count ?? 0} rows older than ${cutoff}`);
    return res.status(200).json({
      ok: true,
      removed: count ?? 0,
      cutoff,
      ts: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error("[db-cleanup] unexpected error:", e?.message);
    return res.status(500).json({ error: "Server error" });
  }
}
