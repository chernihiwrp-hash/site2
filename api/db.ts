import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  "https://qwpzmioxhbkmxrwwevsv.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE!
)

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const { table, method, data, filter } = req.body;

  try {
    let query;
    if (method === 'INSERT') query = supabaseAdmin.from(table).insert(data);
    else if (method === 'UPDATE') query = supabaseAdmin.from(table).update(data).ilike(filter.col, filter.val);
    else if (method === 'DELETE') query = supabaseAdmin.from(table).delete().eq(filter.col, filter.val);

    const { data: result, error } = await query!.select();
    if (error) throw error;
    return res.status(200).json(result);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}
