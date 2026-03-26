import { createClient } from '@supabase/supabase-js'

export default async function handler(req: any, res: any) {

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const SUPABASE_URL = "https://kafivvwxqulxmkpyqinz.supabase.co";

  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; 

  if (!SERVICE_KEY) {
    console.error("Помилка: SUPABASE_SERVICE_ROLE_KEY не знайдено в налаштуваннях Vercel");
    return res.status(500).json({ error: "Server configuration error: Missing Service Key" });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { table, method, args } = req.body;

  if (!table || !method) {
    return res.status(400).json({ error: "Missing table or method in request body" });
  }

  try {
    
    const { data, error } = await (supabaseAdmin.from(table) as any)[method](...args);
    
    if (error) {
      console.error(`Supabase Error (${method} on ${table}):`, error.message);
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json(data);
  } catch (err: any) {
    console.error("Critical Proxy Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
