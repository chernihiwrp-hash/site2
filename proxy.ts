
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: any, res: any) {

  const SUPABASE_URL = "https://kafivvwxqulxmkpyqinz.supabase.co";
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; 

  if (!SERVICE_KEY) {
    return res.status(500).json({ error: "Missing SERVICE_KEY on server" });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { table, method, args } = req.body;

  try {

    const { data, error } = await (supabaseAdmin.from(table) as any)[method](...args);
    
    if (error) throw error;
    return res.status(200).json({ data });
  } catch (err: any) {
    console.error("Proxy Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
