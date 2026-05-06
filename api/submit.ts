import { createClient } from '@supabase/supabase-js';

const ALLOWED_TABLES = [
  'license_applications',
  'car_plates',
  'faction_applications',
  'admin_applications',
  'house_purchase_requests',
  'city_voice',
  'sos_signals',
  'wanted',
  'factions',
  'mayor_election',
  'nft_gifts',
  'nft_owners',
  'news',
  'houses',
  'documents',
];

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  // Создаём клиент ВНУТРИ функции — переменные точно загружены к этому моменту
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars:', { supabaseUrl: !!supabaseUrl, supabaseKey: !!supabaseKey });
    return new Response(JSON.stringify({ error: 'Server config error' }), { status: 500 });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

  let body: { table: string; data: object };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const { table, data } = body;

  if (!ALLOWED_TABLES.includes(table)) {
    return new Response(JSON.stringify({ error: 'Table not allowed' }), { status: 400 });
  }

  if (!data || typeof data !== 'object') {
    return new Response(JSON.stringify({ error: 'Invalid data' }), { status: 400 });
  }

  const { error } = await supabaseAdmin.from(table).insert(data);

  if (error) {
    console.error(`Insert error in ${table}:`, error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}
