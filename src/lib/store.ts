import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://qwpzmioxhbkmxrwwevsv.supabase.co";
const SB_PUBLISHABLE_KEY = "sb_publishable_vF2WPqRAsRQ5HByBifFNDA_LHcgvVHF";
const APP_SECRET = "ARTEMIDAHUESOS"; 

export const supabase = createClient(SUPABASE_URL, SB_PUBLISHABLE_KEY, {
  global: { headers: { 'x-my-app-secret': APP_SECRET } }
});

const dbWrite = async (table: string, method: 'INSERT' | 'UPDATE' | 'DELETE', data: any, filter?: { col: string, val: any }) => {
  let query: any = supabase.from(table);
  if (method === 'INSERT') query = query.insert(data);
  if (method === 'UPDATE') query = query.update(data).ilike(filter!.col, filter!.val);
  if (method === 'DELETE') query = query.delete().eq(filter!.col, filter!.val);
  const { data: res, error } = await query.select();
  if (error) { console.error(`[DB Write Error] ${table}:`, error.message); throw error; }
  return res;
};

// --- HELPERS ---
export const getBalance = (nick: string): number => {
  try { return parseInt(localStorage.getItem(`crp_bal_${nick.toLowerCase()}`) || "0"); } catch { return 0; }
};
export const setBalance = (nick: string, amount: number) => {
  localStorage.setItem(`crp_bal_${nick.toLowerCase()}`, String(Math.max(0, amount)));
};
export const addBalance = async (nick: string, amount: number) => {
  const current = getBalance(nick);
  const newVal = current + amount;
  setBalance(nick, newVal);
  await store.giveTokens(nick, amount);
};

export const store = {
  // НОВОСТИ
  getNews: async () => {
    const { data } = await supabase.from("news").select("*").order("created_at", { ascending: false });
    return (data || []).map((r: any) => ({ id: r.id, title: r.title, text: r.content, date: new Date(r.created_at).toLocaleDateString("uk-UA"), image: r.image_url, type: r.type || "news" }));
  },
  addNews: async (t: string, txt: string, img?: string) => {
    await dbWrite("news", 'INSERT', { title: t, content: txt, image_url: img, author_id: "admin" });
  },

  // ДОМА
  getHouses: async () => {
    const { data } = await supabase.from("houses").select("*").order("created_at", { ascending: false });
    return (data || []).map((r: any) => ({ id: r.id, name: r.name, price: r.price, desc: r.description, category: r.category, owner: r.owner_username, image: r.image_url }));
  },

  // ЗАЯВКИ В АДМИНЫ (Исправлен статус на 'pending')
  submitAdminApp: async (app: any) => {
    try {
      await dbWrite("admin_applications", 'INSERT', { username: app.nick, status: "pending", form_data: app });
      return true;
    } catch { return false; }
  },

  // РОЗЫСК
  getWanted: async () => {
    const { data } = await supabase.from("wanted").select("*").eq("status", "active");
    return (data || []).map((r: any) => ({ id: r.id, name: r.target_username, reason: r.reason, stars: r.stars }));
  },

  // ПРОФИЛЬ (ТО ЧЕГО НЕ ХВАТАЛО)
  getPlayerProfile: async (nick: string) => {
    const [houseRes, factionRes, licRes] = await Promise.all([
      supabase.from("houses").select("id, name, price").eq("owner_username", nick),
      supabase.from("faction_applications").select("faction_name, status").eq("username", nick),
      supabase.from("license_applications").select("id, license_type, status").eq("username", nick).eq("status", "approved"),
    ]);
    return {
      houses: houseRes.data || [],
      factionApps: factionRes.data || [],
      licenses: licRes.data || [],
    };
  },

  // ТОКЕНЫ
  giveTokens: async (nick: string, amount: number) => {
    const { data: user } = await supabase.from("users").select("balance").ilike("username", nick).maybeSingle();
    const newBal = ((user?.balance as number) || 0) + amount;
    await dbWrite("users", 'UPDATE', { balance: newBal }, { col: 'username', val: nick });
    setBalance(nick, newBal);
    return true;
  },

  // УВЕДОМЛЕНИЯ
  getNotifications: async (username: string) => {
    const { data } = await supabase.from("notifications").select("*").ilike("username", username).order("created_at", { ascending: false });
    return (data || []).map((r: any) => ({ id: r.id, text: r.text, read: r.read }));
  },
  
  // PULSE
  getPulse: async () => {
    const [u, h, f] = await Promise.all([
      supabase.from("users").select("id", { count: "exact", head: true }),
      supabase.from("houses").select("id", { count: "exact", head: true }).eq("is_for_sale", false),
      supabase.from("faction_applications").select("id", { count: "exact", head: true }).eq("status", "approved"),
    ]);
    return { citizens: u.count || 0, houses: h.count || 0, factions: f.count || 0 };
  }
};
