import { createClient } from '@supabase/supabase-js'

// ДАННЫЕ СЕРВЕРА
const SUPABASE_URL = "https://qwpzmioxhbkmxrwwevsv.supabase.co";
// ВСТАВЬ СЮДА СВОЙ SERVICE_ROLE_KEY (ВЕРНЫЙ)
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3cHptaW94aGJrbXhyd3dldnN2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzk1Mzc1OSwiZXhwIjoyMDg5NTI5NzU5fQ.8_fGPNsPAVu4s1z1LYOno7LQ3sVL6Z2P8HyhX0Dpnf0"; 

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

export default async function handler(req: any, res: any) {
  // Разрешаем только POST запросы
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { table, method, data, filter, password } = req.body;

  // Проверка пароля приложения
  if (password !== 'CH-RP_Secure-Gate_2026_!v3') {
    return res.status(403).json({ error: 'Доступ запрещен' });
  }

  try {
    let query: any = supabaseAdmin.from(table);

    if (method === 'INSERT') query = query.insert(data);
    else if (method === 'UPDATE') query = query.update(data).ilike(filter.col, filter.val);
    else if (method === 'DELETE') query = query.delete().eq(filter.col, filter.val);

    const { data: result, error } = await query.select();
    
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
