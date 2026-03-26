import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  const { table, method, args } = req.body;
  const SUPABASE_URL = "https://kafivvwxqulxmkpyqinz.supabase.co";
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; 

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY!);

  try {

    const callArgs = Array.isArray(args) ? args : (args ? [args] : []);

    const { data, error } = await (supabaseAdmin.from(table) as any)[method](...callArgs);
    
    if (error) throw error;

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
