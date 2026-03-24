import { createClient } from '@supabase/supabase-js'

// ВСТАВЬ СЮДА СВОИ ДАННЫЕ ИЗ SETTINGS -> API
const supabaseAdmin = createClient(
  "https://qwpzmioxhbkmxrwwevsv.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3cHptaW94aGJrbXhyd3dldnN2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzk1Mzc1OSwiZXhwIjoyMDg5NTI5NzU5fQ.8_fGPNsPAVu4s1z1LYOno7LQ3sVL6Z2P8HyhX0Dpnf0" // Тот, который секретный!
)

export default async function handler(req, res) {
  const { table, method, data, filter, password } = req.body;

  // Проверка нашего пароля, чтобы левые челы не спамили в API
  if (password !== 'CH-RP_Secure-Gate_2026_!v3') {
    return res.status(403).json({ error: "Access Denied" });
  }

  let query = supabaseAdmin.from(table);
  
  if (method === 'INSERT') {
    const { data: result, error } = await query.insert(data).select();
    if (error) return res.status(500).json(error);
    return res.status(200).json(result);
  }

  if (method === 'UPDATE') {
    const { data: result, error } = await query.update(data).ilike(filter.col, filter.val).select();
    if (error) return res.status(500).json(error);
    return res.status(200).json(result);
  }

  return res.status(405).json({ error: "Method not allowed" });
}
