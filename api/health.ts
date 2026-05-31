// /api/health.ts — діагностика з'єднання з Supabase.
// Відкрий у браузері:  https://<твій-домен>/api/health
// Нічого секретного не віддає — тільки статус підключення.

import { createClient } from "@supabase/supabase-js";

export default async function handler(_req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const report: Record<string, unknown> = {
    has_SUPABASE_URL: !!SUPABASE_URL,
    has_SERVICE_KEY: !!SERVICE_KEY,
    url_host: SUPABASE_URL ? safeHost(SUPABASE_URL) : null,
    service_key_len: SERVICE_KEY ? SERVICE_KEY.length : 0,
  };

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({ ok: false, reason: "ENV_MISSING", report });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    // Простий запит — лише перевіряємо чи відповідає база.
    const { error } = await supabase.from("users").select("id", { count: "exact", head: true });
    if (error) {
      return res.status(503).json({
        ok: false,
        reason: "DB_QUERY_ERROR",
        db_error: error.message,
        hint: "Перевір SUPABASE_SERVICE_ROLE_KEY на Vercel і чи не на паузі проєкт Supabase.",
        report,
      });
    }
    return res.status(200).json({ ok: true, reason: "OK", report });
  } catch (e: any) {
    return res.status(503).json({ ok: false, reason: "CONNECT_FAILED", error: String(e?.message || e), report });
  }
}

function safeHost(url: string): string {
  try { return new URL(url).host; } catch { return "invalid-url"; }
}
