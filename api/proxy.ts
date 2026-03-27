import { createClient } from '@supabase/supabase-js'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { table, chain } = req.body;
  const SUPABASE_URL = "https://kafivvwxqulxmkpyqinz.supabase.co";

  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; 

  if (!SERVICE_KEY) {
    console.error("Помилка: SUPABASE_SERVICE_ROLE_KEY не знайдено в process.env");
    return res.status(500).json({ error: "Server configuration error: Missing Service Key" });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    let query = supabaseAdmin.from(table);

    if (chain && Array.isArray(chain)) {
      for (const step of chain) {
        // Перевіряємо, чи такий метод взагалі є в Supabase SDK
        if (typeof (query as any)[step.method] === 'function') {
          query = (query as any)[step.method](...step.args);
        } else {
          console.warn(`Метод ${step.method} не знайдено в Supabase SDK`);
        }
      }
    }

    const { data, error } = await query;
    
    if (error) {
      console.error("Supabase Query Error:", error.message);
      return res.status(400).json({ error: error.message });
    }
    
    return res.status(200).json(data);
  } catch (err: any) {
    console.error("Crash in Proxy Handler:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
