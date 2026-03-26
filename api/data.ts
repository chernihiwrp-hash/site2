
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {

  const supabaseUrl = process.env.SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_ANON_KEY!
  const secret = process.env.CHERNIHIV_SECRET_KEY!

  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { 'x-app-secret': secret } }
  })

  const { table, method, args } = req.body
  
  const { data, error } = await (supabase.from(table) as any)[method](...args)

  return res.status(200).json({ data, error })
}
