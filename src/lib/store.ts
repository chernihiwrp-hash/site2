import { createClient } from '@supabase/supabase-js';

// ─── CONFIG & CLIENT ─────────────────────────────────────────────────────────
const SUPABASE_URL = "https://qwpzmioxhbkmxrwwevsv.supabase.co";
const SB_PUBLISHABLE_KEY = "sb_publishable_vF2WPqRAsRQ5HByBifFNDA_LHcgvVHF";
const APP_SECRET = "ARTEMIDAHUESOS"; 

// Инициализируем клиент с секретным заголовком для обхода RLS
export const supabase = createClient(SUPABASE_URL, SB_PUBLISHABLE_KEY, {
  global: {
    headers: {
      'x-my-app-secret': APP_SECRET
    }
  }
});

/**
 * Универсальная функция для записи данных с поддержкой нашего RLS-заголовка
 */
const dbWrite = async (table: string, method: 'INSERT' | 'UPDATE' | 'DELETE', data: any, filter?: { col: string, val: any }) => {
  let query: any = supabase.from(table);
  
  if (method === 'INSERT') query = query.insert(data);
  if (method === 'UPDATE') {
    if (!filter) throw new Error("Filter required for UPDATE");
    query = query.update(data).ilike(filter.col, filter.val);
  }
  if (method === 'DELETE') {
    if (!filter) throw new Error("Filter required for DELETE");
    query = query.delete().eq(filter.col, filter.val);
  }

  const { data: res, error } = await query.select();
  if (error) {
    console.error(`[DB Write Error] ${table}:`, error.message);
    throw error;
  }
  return res;
};

// ─── TYPES ───────────────────────────────────────────────────────────────────
export type NewsItem = { id: number; title: string; text: string; date: string; image?: string; type?: "news" | "update"; button_data?: string; };
export type HouseItem = { id: number; name: string; price: number; desc: string; category: string; owner: string | null; image?: string; photos: string[]; };
export type WantedPerson = { id: number; name: string; reason: string; stars: number };
export type FactionApplication = { id: number; factionId: string; factionName: string; nick: string; roblox: string; age: string; telegram: string; experience: string; message: string; status: "review" | "approved" | "rejected"; date: string; username?: string; };
export type AdminApplication = { id: number; nick: string; roblox: string; age: string; country: string; telegram: string; timePerDay: string; playTime: string; hasMic: boolean; adminExp: string; rpTime: string; rpKnowledge: number; q1: string; q2: string; q3: string; q4: string; rulesRead: boolean; daysOff: string; status: "review" | "approved" | "rejected"; date: string; };
export type CityVoiceItem = { id: number; author: string; text: string; type: "idea" | "petition"; likes: number; dislikes: number; status: "active" | "approved" | "rejected"; };
export type MayorCandidate = { id: number; name: string; program: string; bio: string; votes: number };
export type DocumentItem = { id: number; title: string; content: string };
export type CarRecord = { plate: string; model: string; owner: string };
export type SosMessage = { id: number; reason: string; description: string; date: string; type?: string; };
export type Notification = { id: number; text: string; date: string; read: boolean };
export type LicenseApplication = { id: number; username: string; license_type: string; plate_number: string | null; status: "pending" | "approved" | "rejected"; created_at: string; };
export type HousePurchaseRequest = { id: number; house_id: number; username: string; house_name?: string; house_price?: number; rental_days?: number; avatar_url?: string; status: "pending" | "approved" | "rejected"; created_at: string; };
export type FactionDB = { id: number; name: string; color: string; logo_url?: string; gradient?: string; section: "main" | "separate"; created_at: string; };

// ─── BALANCE HELPERS (Fixes Rollup/Vercel errors) ─────────────────────────────
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
  try {
    await store.giveTokens(nick, amount);
  } catch (e) {
    console.error("Failed to sync balance to DB", e);
  }
};

export const subtractBalance = async (nick: string, amount: number): Promise<boolean> => {
  const cur = getBalance(nick);
  if (cur < amount) return false;
  const newVal = cur - amount;
  setBalance(nick, newVal);
  try {
    const { data: user } = await supabase.from("users").select("balance").ilike("username", nick).maybeSingle();
    const dbBalance = ((user?.balance as number) || 0) - amount;
    await dbWrite("users", 'UPDATE', { balance: Math.max(0, dbBalance) }, { col: 'username', val: nick });
    return true;
  } catch { return false; }
};

// ─── STORE ───────────────────────────────────────────────────────────────────
export const store = {

  // NEWS
  getNews: async (): Promise<NewsItem[]> => {
    const { data } = await supabase.from("news").select("*").order("created_at", { ascending: false });
    return (data || []).map((r: any) => ({
      id: r.id, title: r.title, text: r.content,
      date: new Date(r.created_at).toLocaleDateString("uk-UA"),
      image: r.image_url || undefined, type: r.type || "news",
      button_data: r.button_data || undefined,
    }));
  },
  addNews: async (title: string, text: string, imageUrl?: string, type: "news" | "update" = "news", buttonData?: string) => {
    await dbWrite("news", 'INSERT', { title, content: text, image_url: imageUrl || null, type, author_id: "admin", button_data: buttonData || null });
  },
  deleteNews: async (id: number) => { await dbWrite("news", 'DELETE', null, { col: 'id', val: id }); },

  // HOUSES
  getHouses: async (): Promise<HouseItem[]> => {
    const { data } = await supabase.from("houses").select("*").order("created_at", { ascending: false });
    return (data || []).map((r: any) => ({
      id: r.id, name: r.name, price: r.price, desc: r.description || "",
      category: r.category || "Люкс", owner: r.owner_username || null,
      image: r.image_url || undefined, photos: r.image_url ? [r.image_url] : [],
    }));
  },
  addHouse: async (name: string, desc: string, price: number, imageUrl?: string, category = "Люкс") => {
    await dbWrite("houses", 'INSERT', { name, description: desc, price, image_url: imageUrl || null, category, is_for_sale: true });
  },
  toggleHouseOwner: async (id: number, owner: string | null) => {
    await dbWrite("houses", 'UPDATE', { owner_username: owner, is_for_sale: !owner }, { col: 'id', val: id });
  },

  // HOUSE PURCHASE
  submitHousePurchase: async (houseId: number, username: string, rentalDays?: number): Promise<boolean> => {
    try {
      await dbWrite("house_purchase_requests", 'INSERT', { house_id: houseId, username, status: "pending", rental_days: rentalDays || 7 });
      return true;
    } catch { return false; }
  },

  // WANTED
  getWanted: async (): Promise<WantedPerson[]> => {
    const { data } = await supabase.from("wanted").select("*").eq("status", "active").order("created_at", { ascending: false });
    return (data || []).map((r: any) => ({ id: r.id, name: r.target_username, reason: r.reason, stars: r.stars }));
  },
  addWanted: async (name: string, reason: string, stars: number) => {
    await dbWrite("wanted", 'INSERT', { target_username: name, reason, stars, issued_by: "admin", status: "active" });
  },

  // FACTIONS
  getFactionsFromDB: async (): Promise<FactionDB[]> => {
    const { data } = await supabase.from("factions").select("*").order("created_at", { ascending: true });
    return (data || []) as FactionDB[];
  },
  submitFactionApp: async (app: any) => {
    try {
      await dbWrite("faction_applications", 'INSERT', { 
        faction_name: app.factionName, 
        username: app.nick, 
        status: "review", 
        form_data: app 
      });
      return true;
    } catch { return false; }
  },

  // ADMIN APPLICATIONS
  submitAdminApp: async (app: any) => {
    try {
      await dbWrite("admin_applications", 'INSERT', { username: app.nick, status: "review", form_data: app });
      return true;
    } catch { return false; }
  },

  // CITY VOICE
  getCityVoice: async (): Promise<CityVoiceItem[]> => {
    const { data } = await supabase.from("city_voice").select("*").order("created_at", { ascending: false });
    return (data || []).map((r: any) => ({
      id: r.id, author: r.username, text: r.message, type: r.type || "idea",
      likes: r.likes || 0, dislikes: r.dislikes || 0,
      status: r.status === "pending" ? "active" : r.status,
    }));
  },
  submitCityVoice: async (author: string, text: string, type: "idea" | "petition") => {
    await dbWrite("city_voice", 'INSERT', { username: author, message: text, type, status: "pending" });
  },

  // SOS
  getSos: async (): Promise<SosMessage[]> => {
    const { data } = await supabase.from("sos_signals").select("*").eq("status", "active").order("created_at", { ascending: false });
    return (data || []).map((r: any) => ({
      id: r.id, reason: r.type, description: r.message,
      date: new Date(r.created_at).toLocaleDateString("uk-UA"), type: r.type,
    }));
  },
  addSos: async (username: string, reason: string, description: string, type: string = "other") => {
    await dbWrite("sos_signals", 'INSERT', { username, message: description, type, status: "active" });
  },

  // NOTIFICATIONS
  getNotifications: async (username: string): Promise<Notification[]> => {
    const { data } = await supabase.from("notifications").select("*").ilike("username", username).order("created_at", { ascending: false }).limit(50);
    return (data || []).map((r: any) => ({ id: r.id, text: r.text, date: new Date(r.created_at).toLocaleDateString("uk-UA"), read: r.read }));
  },
  addNotification: async (username: string, text: string) => {
    await dbWrite("notifications", 'INSERT', { username, text, read: false });
  },

  // TOKENS (Database sync)
  giveTokens: async (nick: string, amount: number): Promise<boolean> => {
    try {
      const { data: user } = await supabase.from("users").select("balance").ilike("username", nick).maybeSingle();
      const newBalance = ((user?.balance as number) || 0) + amount;
      await dbWrite("users", 'UPDATE', { balance: newBalance }, { col: 'username', val: nick });
      setBalance(nick, newBalance);
      await store.addNotification(nick, `Вам нараховано ${amount} CR!`);
      return true;
    } catch { return false; }
  },

  // PULSE CITY
  getPulse: async (): Promise<{ citizens: number; houses: number; factions: number }> => {
    const [usersRes, housesRes, factionsRes] = await Promise.all([
      supabase.from("users").select("id", { count: "exact", head: true }),
      supabase.from("houses").select("id", { count: "exact", head: true }).eq("is_for_sale", false),
      supabase.from("faction_applications").select("id", { count: "exact", head: true }).eq("status", "approved"),
    ]);
    return {
      citizens: usersRes.count || 0,
      houses: housesRes.count || 0,
      factions: factionsRes.count || 0,
    };
  },

  // REALTIME
  onNewSos: (cb: (msg: SosMessage) => void) => {
    return supabase.channel("sos_live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "sos_signals" }, (p) => {
        const r = p.new as any;
        cb({ id: r.id, reason: r.type, description: r.message, date: new Date(r.created_at).toLocaleDateString("uk-UA"), type: r.type });
      }).subscribe();
  },
};
