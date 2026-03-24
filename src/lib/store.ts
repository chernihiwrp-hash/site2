import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://qwpzmioxhbkmxrwwevsv.supabase.co";
// ВСТАВЬ СЮДА СВЕЖИЙ КЛЮЧ ИЗ SETTINGS -> API
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3cHptaW94aGJrbXhyd3dldnN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5NTM3NTksImV4cCI6MjA4OTUyOTc1OX0.CrPDm1vWaEruGVQpfBYKYwYO4DG9WlibhVzLHaBMGh8"; 

// Создаем клиент с секретным "паспортом" (паролем)
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: {
    headers: {
      'x-my-app-password': 'CH-RP_Secure-Gate_2026_!v3', 
    },
  },
});

// --- TYPES --- (Оставляем как есть)
export type NewsItem = { id: number; title: string; text: string; date: string; image?: string; type?: "news" | "update"; button_data?: string; };
// ... остальные твои типы ...

// --- Вспомогательная функция для записи (теперь без /api/db!) ---
const dbWrite = async (table: string, method: 'INSERT' | 'UPDATE' | 'DELETE', data: any, filter?: { col: string, val: any }) => {
  let query: any = supabase.from(table);
  
  if (method === 'INSERT') query = query.insert(data);
  if (method === 'UPDATE') query = query.update(data).ilike(filter!.col, filter!.val);
  if (method === 'DELETE') query = query.delete().eq(filter!.col, filter!.val);

  const { data: res, error } = await query.select();
  if (error) throw error;
  return res;
};

// --- BALANCE HELPERS ---
export const getBalance = (nick: string): number => {
  try { return parseInt(localStorage.getItem(`crp_bal_${nick.toLowerCase()}`) || "0"); }
  catch { return 0; }
};
export const setBalance = (nick: string, amount: number) => {
  localStorage.setItem(`crp_bal_${nick.toLowerCase()}`, String(Math.max(0, amount)));
};

export const addBalance = async (nick: string, amount: number) => {
  const current = getBalance(nick);
  const newVal = current + amount;
  setBalance(nick, newVal);
  await dbWrite("users", 'UPDATE', { balance: newVal }, { col: 'username', val: nick });
};

// --- STORE ---
export const store = {
  // NEWS
  getNews: async (): Promise<NewsItem[]> => {
    const { data } = await supabase.from("news").select("*").order("created_at", { ascending: false });
    return data ? data.map((r: any) => ({ id: r.id, title: r.title, text: r.content, date: new Date(r.created_at).toLocaleDateString("uk-UA"), image: r.image_url || undefined, type: r.type || "news", button_data: r.button_data || undefined })) : [];
  },
  addNews: async (title: string, text: string, imageUrl?: string, type: "news" | "update" = "news", buttonData?: string) => {
    await dbWrite("news", 'INSERT', { title, content: text, image_url: imageUrl || null, type, author_id: "admin", button_data: buttonData || null });
  },
  
  // Все остальные функции (addHouse, deleteNews и т.д.) теперь должны вызывать dbWrite вместо secureAction!
  // Просто замени везде в своем коде "secureAction" на "dbWrite"
};
