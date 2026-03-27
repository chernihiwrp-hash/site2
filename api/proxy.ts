import { createClient } from '@supabase/supabase-js'

export default async function handler(req: any, res: any) {
  
  const origin = req.headers.origin || req.headers.referer;
  
  const isAllowed = origin && (
    origin.includes("localhost") || 
    origin.includes("site2-ky9q.vercel.app") || 
    origin.includes("site2-ky9q") 
  );

  if (!isAllowed) {
    console.warn(" Блокування стороннього запиту з:", origin);
    return res.status(403).json({ error: "Access denied: Unauthorized origin" });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { table, chain } = req.body;
  const SUPABASE_URL = "https://kafivvwxqulxmkpyqinz.supabase.co";
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; 

  if (!SERVICE_KEY) return res.status(500).json({ error: "Missing SERVICE_KEY in Vercel settings" });

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    let query = supabaseAdmin.from(table);

    if (chain && Array.isArray(chain)) {
      for (const step of chain) {
        if (typeof (query as any)[step.method] === 'function') {
          query = (query as any)[step.method](...step.args);
        }
      }
    }

    const { data, error } = await query;
    if (error) throw error;
    
    return res.status(200).json(data);
  } catch (err: any) {
    console.error("❌ Proxy Server Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
