import { createClient } from '@supabase/supabase-js'

export default async function handler(req: any, res: any) {
  const { table, chain } = req.body;
  const SUPABASE_URL = "https://kafivvwxqulxmkpyqinz.supabase.co";
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; 

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY!);

  try {
    let query = supabaseAdmin.from(table);

    // Проходимо по всьому ланцюжку: .select().or().order()
    for (const step of chain) {
      query = (query as any)[step.method](...step.args);
    }

    const { data, error } = await query;
    if (error) throw error;
    return res.status(200).json(data);
  } catch (err: any) {
    console.error("Full Chain Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
