import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE! 
)

export default async function handler(req: any, res: any) {

  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { table, data } = req.body;


  const { data: result, error } = await supabase
    .from(table)
    .insert(data);

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json(result);
}
