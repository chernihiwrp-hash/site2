import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn("Внимание: Переменные окружения Supabase не найдены!");
}

export const supabase = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '');

// ─── TYPES ───────────────────────────────────────────────────────────────────
export type NewsItem = {
  id: number; title: string; text: string; date: string;
  image?: string; type?: "news" | "update"; button_data?: string;
};
export type HouseItem = {
  id: number; name: string; price: number; desc: string;
  category: string; owner: string | null; image?: string; photos: string[];
};
export type WantedPerson = { id: number; name: string; reason: string; stars: number };
export type FactionApplication = {
  id: number; factionId: string; factionName: string; nick: string;
  roblox: string; age: string; telegram: string; experience: string;
  message: string; status: "review" | "approved" | "rejected"; date: string;
  username?: string;
};
export type AdminApplication = {
  id: number; nick: string; roblox: string; age: string; country: string;
  telegram: string; timePerDay: string; playTime: string; hasMic: boolean;
  adminExp: string; rpTime: string; rpKnowledge: number; q1: string; q2: string;
  q3: string; q4: string; rulesRead: boolean; daysOff: string;
  status: "review" | "approved" | "rejected"; date: string;
};
export type CityVoiceItem = {
  id: number; author: string; text: string; type: "idea" | "petition";
  likes: number; dislikes: number; status: "active" | "approved" | "rejected";
};
export type MayorCandidate = { id: number; name: string; program: string; bio: string; votes: number };
export type DocumentItem = { id: number; title: string; content: string };
export type CarRecord = { plate: string; model: string; owner: string };
export type SosMessage = {
  id: number; reason: string; description: string; date: string; type?: string;
};
export type Notification = { id: number; text: string; date: string; read: boolean };
export type LicenseApplication = {
  id: number; username: string; license_type: string; plate_number: string | null;
  status: "pending" | "approved" | "rejected"; created_at: string;
};
export type HousePurchaseRequest = {
  id: number; house_id: number; username: string;
  house_name?: string; house_price?: number;
  status: "pending" | "approved" | "rejected"; created_at: string;
};
export type FactionDB = {
  id: number; name: string; color: string; logo_url?: string;
  gradient?: string; section: "main" | "separate"; created_at: string;
};

// ─── BALANCE HELPERS ──────────────────────────────────────────────────────────
export const getBalance = (nick: string): number => {
  try { return parseInt(localStorage.getItem(`crp_bal_${nick.toLowerCase()}`) || "0"); }
  catch { return 0; }
};
export const setBalance = (nick: string, amount: number) => {
  localStorage.setItem(`crp_bal_${nick.toLowerCase()}`, String(Math.max(0, amount)));
};
export const addBalance = (nick: string, amount: number) => {
  setBalance(nick, getBalance(nick) + amount);
};
export const subtractBalance = (nick: string, amount: number): boolean => {
  const cur = getBalance(nick);
  if (cur < amount) return false;
  setBalance(nick, cur - amount);
  return true;
};

// ─── STORE ───────────────────────────────────────────────────────────────────
export const store = {

  // ── NEWS ──────────────────────────────────────────────────────────────────
  getNews: async (): Promise<NewsItem[]> => {
    const { data } = await supabase.from("news").select("*").order("created_at", { ascending: false });
    if (!data) return [];
    return data.map((r: any) => ({
      id: r.id,
      title: r.title,
      text: r.content,
      date: new Date(r.created_at).toLocaleDateString("uk-UA"),
      image: r.image_url || undefined,
      type: r.type || "news",
      button_data: r.button_data || undefined,
    }));
  },
  addNews: async (title: string, text: string, imageUrl?: string, type: "news" | "update" = "news", buttonData?: string) => {
    await supabase.from("news").insert({
      title, content: text, image_url: imageUrl || null,
      type, author_id: "admin", button_data: buttonData || null,
    });
  },
  deleteNews: async (id: number) => { await supabase.from("news").delete().eq("id", id); },

  // ── HOUSES ────────────────────────────────────────────────────────────────
  getHouses: async (): Promise<HouseItem[]> => {
    const { data } = await supabase.from("houses").select("*").order("created_at", { ascending: false });
    if (!data) return [];
    return data.map((r: any) => ({
      id: r.id,
      name: r.name,
      price: r.price,
      desc: r.description || "",
      category: r.category || "Люкс",
      owner: r.owner_username || null,
      image: r.image_url || undefined,
      photos: r.image_url ? [r.image_url] : [],
    }));
  },
  addHouse: async (name: string, desc: string, price: number, imageUrl?: string, category = "Люкс") => {
    await supabase.from("houses").insert({
      name, description: desc, price,
      image_url: imageUrl || null, category, is_for_sale: true,
    });
  },
  deleteHouse: async (id: number) => { await supabase.from("houses").delete().eq("id", id); },
  updateHouse: async (id: number, updates: { name?: string; price?: number; desc?: string; imageUrl?: string }) => {
    await supabase.from("houses").update({
      name: updates.name, price: updates.price,
      description: updates.desc, image_url: updates.imageUrl,
    }).eq("id", id);
  },
  toggleHouseOwner: async (id: number, owner: string | null) => {
    await supabase.from("houses").update({ owner_username: owner, is_for_sale: !owner }).eq("id", id);
  },

  // ── HOUSE PURCHASE ────────────────────────────────────────────────────────
  submitHousePurchase: async (houseId: number, username: string, rentalDays?: number): Promise<boolean> => {
    const { error } = await supabase.from("house_purchase_requests").insert({
      house_id: houseId,
      username,
      status: "pending",
      rental_days: rentalDays || 7,
    });
    return !error;
  },
  getHousePurchaseRequests: async (): Promise<HousePurchaseRequest[]> => {
    const { data } = await supabase.from("house_purchase_requests").select("*").order("created_at", { ascending: false });
    if (!data) return [];
    return data.map((r: any) => ({
      id: r.id,
      house_id: r.house_id,
      username: r.username,
      house_name: r.house_name || "",
      house_price: r.house_price || 0,
      status: r.status,
      created_at: r.created_at,
    }));
  },
  updateHousePurchaseStatus: async (id: number, status: "approved" | "rejected", houseId?: number, username?: string) => {
    await supabase.from("house_purchase_requests").update({ status }).eq("id", id);
    if (status === "approved" && houseId && username) {
      await supabase.from("houses").update({ owner_username: username, is_for_sale: false }).eq("id", houseId);
      store.addNotification(username, `Ваша заявка на будинок схвалена!`);
    }
  },

  // ── WANTED ────────────────────────────────────────────────────────────────
  getWanted: async (): Promise<WantedPerson[]> => {
    const { data } = await supabase.from("wanted").select("*").eq("status", "active").order("created_at", { ascending: false });
    if (!data) return [];
    return data.map((r: any) => ({
      id: r.id,
      name: r.target_username,
      reason: r.reason,
      stars: r.stars,
    }));
  },
  addWanted: async (name: string, reason: string, stars: number) => {
    await supabase.from("wanted").insert({ target_username: name, reason, stars, issued_by: "admin", status: "active" });
  },
  removeWanted: async (id: number) => { await supabase.from("wanted").update({ status: "resolved" }).eq("id", id); },

  // ── FACTIONS ──────────────────────────────────────────────────────────────
  getFactionsFromDB: async (): Promise<FactionDB[]> => {
    const { data } = await supabase.from("factions").select("*").order("created_at", { ascending: true });
    return (data || []) as FactionDB[];
  },
  addFaction: async (name: string, color: string, logoUrl?: string, gradient?: string, section: "main" | "separate" = "main") => {
    const { error } = await supabase.from("factions").insert({
      name, color, logo_url: logoUrl || null,
      gradient: gradient || null, section,
    });
    return !error;
  },
  deleteFaction: async (id: number) => { await supabase.from("factions").delete().eq("id", id); },

  // ── FACTION APPLICATIONS ──────────────────────────────────────────────────
  getFactionApps: async (): Promise<FactionApplication[]> => {
    const { data } = await supabase.from("faction_applications").select("*").order("created_at", { ascending: false });
    if (!data) return [];
    return data.map((r: any) => {
      const fd = r.form_data || {};
      return {
        id: r.id,
        factionId: String(r.faction_id || ""),
        factionName: r.faction_name || "",
        nick: fd.nick || r.username || "",
        username: r.username || "",
        roblox: fd.roblox || "",
        age: fd.age || "",
        telegram: fd.telegram || "",
        experience: fd.experience || "",
        message: fd.message || "",
        status: (r.status === "pending" ? "review" : r.status),
        date: new Date(r.created_at).toLocaleDateString("uk-UA"),
      };
    });
  },
  submitFactionApp: async (app: Omit<FactionApplication, "id" | "status" | "date">) => {
    const factionIdNum = !isNaN(Number(app.factionId)) ? Number(app.factionId) : null;
    const { error } = await supabase.from("faction_applications").insert({
      faction_id: factionIdNum,
      faction_name: app.factionName,
      username: app.nick,
      status: "pending",
      form_data: {
        nick: app.nick, roblox: app.roblox, age: app.age,
        telegram: app.telegram, experience: app.experience, message: app.message,
      },
    });
    return !error;
  },
  updateFactionAppStatus: async (id: number, status: "approved" | "rejected") => {
    await supabase.from("faction_applications").update({ status }).eq("id", id);
  },
  getPlayerFaction: async (nick: string): Promise<string | null> => {
    const { data } = await supabase.from("faction_applications").select("faction_name").eq("username", nick).eq("status", "approved").order("created_at", { ascending: false }).limit(1).maybeSingle();
    return (data as any)?.faction_name || null;
  },

  // ── ADMIN APPLICATIONS ────────────────────────────────────────────────────
  getAdminApps: async (): Promise<AdminApplication[]> => {
    const { data } = await supabase.from("admin_applications").select("*").order("created_at", { ascending: false });
    if (!data) return [];
    return data.map((r: any) => {
      const fd = r.form_data || {};
      return {
        id: r.id,
        nick: fd.nick || r.username || "",
        roblox: fd.roblox || "",
        age: fd.age || "",
        country: fd.country || "",
        telegram: fd.telegram || "",
        timePerDay: fd.timePerDay || "",
        playTime: fd.playTime || "",
        hasMic: fd.hasMic || false,
        adminExp: fd.adminExp || "",
        rpTime: fd.rpTime || "",
        rpKnowledge: fd.rpKnowledge || 0,
        q1: fd.q1 || "", q2: fd.q2 || "", q3: fd.q3 || "", q4: fd.q4 || "",
        rulesRead: fd.rulesRead || false,
        daysOff: fd.daysOff || "",
        status: (r.status === "pending" ? "review" : r.status),
        date: new Date(r.created_at).toLocaleDateString("uk-UA"),
      };
    });
  },
  submitAdminApp: async (app: Omit<AdminApplication, "id" | "status" | "date">) => {
    const { error } = await supabase.from("admin_applications").insert({ username: app.nick, status: "pending", form_data: app });
    return !error;
  },
  updateAdminAppStatus: async (id: number, status: "approved" | "rejected") => {
    await supabase.from("admin_applications").update({ status }).eq("id", id);
  },

  // ── CITY VOICE ────────────────────────────────────────────────────────────
  getCityVoice: async (): Promise<CityVoiceItem[]> => {
    const { data } = await supabase.from("city_voice").select("*").order("created_at", { ascending: false });
    if (!data) return [];
    return data.map((r: any) => ({
      id: r.id,
      author: r.username,
      text: r.message,
      type: r.type || "idea",
      likes: r.likes || 0,
      dislikes: r.dislikes || 0,
      status: (r.status === "pending" ? "active" : r.status),
    }));
  },
  submitCityVoice: async (author: string, text: string, type: "idea" | "petition") => {
    await supabase.from("city_voice").insert({ username: author, message: text, type, status: "pending" });
  },
  updateCityVoiceStatus: async (id: number, status: "approved" | "rejected") => {
    await supabase.from("city_voice").update({ status }).eq("id", id);
  },
  deleteCityVoice: async (id: number) => { await supabase.from("city_voice").delete().eq("id", id); },

  // ── MAYOR ELECTION ────────────────────────────────────────────────────────
  getCandidates: async (): Promise<MayorCandidate[]> => {
    const { data } = await supabase.from("mayor_election").select("*").order("votes", { ascending: false });
    if (!data) return [];
    return data.map((r: any) => ({
      id: r.id,
      name: r.candidate_username,
      program: r.description,
      bio: r.bio || "",
      votes: r.votes || 0,
    }));
  },
  addCandidate: async (name: string, program: string, bio: string) => {
    await supabase.from("mayor_election").insert({ candidate_username: name, description: program, bio, created_by: "admin", votes: 0 });
  },
  deleteCandidate: async (id: number) => { await supabase.from("mayor_election").delete().eq("id", id); },
  voteCandidate: async (id: number) => {
    const { data } = await supabase.from("mayor_election").select("votes").eq("id", id).single();
    await supabase.from("mayor_election").update({ votes: ((data?.votes as number) || 0) + 1 }).eq("id", id);
  },

  // ── DOCUMENTS ─────────────────────────────────────────────────────────────
  getDocs: async (): Promise<DocumentItem[]> => {
    const { data } = await supabase.from("documents").select("*").order("id", { ascending: true });
    if (!data || data.length === 0) return [
      { id: 1, title: "Конституція міста", content: "Основний закон Чернігів RP." },
    ];
    return data as DocumentItem[];
  },
  addDoc: async (title: string, content: string) => { await supabase.from("documents").insert({ title, content }); },
  updateDoc: async (id: number, title: string, content: string) => { await supabase.from("documents").update({ title, content }).eq("id", id); },
  deleteDoc: async (id: number) => { await supabase.from("documents").delete().eq("id", id); },

  // ── CARS / LICENSES ───────────────────────────────────────────────────────
  getCars: async (): Promise<CarRecord[]> => {
    const { data } = await supabase.from("license_applications").select("*").eq("status", "approved").not("plate_number", "is", null);
    if (!data) return [];
    return data.map((r: any) => ({
      plate: r.plate_number,
      model: r.license_type || "Авто",
      owner: r.username,
    }));
  },
  getLicenseApplications: async (): Promise<LicenseApplication[]> => {
    const { data } = await supabase.from("license_applications").select("*").order("created_at", { ascending: false });
    return (data || []) as LicenseApplication[];
  },
  submitLicense: async (username: string, licenseType: string, plateNumber?: string) => {
    await supabase.from("license_applications").insert({ username, license_type: licenseType, plate_number: plateNumber || null, status: "pending" });
  },
  updateLicenseStatus: async (id: number, status: "approved" | "rejected") => {
    await supabase.from("license_applications").update({ status }).eq("id", id);
  },

  // ── SOS ───────────────────────────────────────────────────────────────────
  getSos: async (): Promise<SosMessage[]> => {
    const { data } = await supabase.from("sos_signals").select("*").eq("status", "active").order("created_at", { ascending: false });
    if (!data) return [];
    return data.map((r: any) => ({
      id: r.id,
      reason: r.type,
      description: r.message,
      date: new Date(r.created_at).toLocaleDateString("uk-UA"),
      type: r.type,
    }));
  },
  addSos: async (username: string, reason: string, description: string, type: "raid" | "cheater" | "nrp" | "other" = "other") => {
    await supabase.from("sos_signals").insert({ username, message: description, type, status: "active" });
  },
  resolveSos: async (id: number) => { await supabase.from("sos_signals").update({ status: "resolved" }).eq("id", id); },

  // ── TOKENS / BALANCE ──────────────────────────────────────────────────────
  giveTokens: async (nick: string, amount: number): Promise<boolean> => {
    const { data: user } = await supabase.from("users").select("balance").ilike("username", nick).maybeSingle();
    const currentBalance = (user?.balance as number) || 0;
    const newBalance = currentBalance + amount;
    const { error } = await supabase.from("users").update({ balance: newBalance }).ilike("username", nick);
    if (error) return false;
    setBalance(nick, newBalance);
    await store.addNotification(nick, `Вам нараховано ${amount} CR від адміністрації!`);
    return true;
  },
  takeTokens: async (nick: string, amount: number): Promise<boolean> => {
    const { data: user } = await supabase.from("users").select("balance").ilike("username", nick).maybeSingle();
    const currentBalance = (user?.balance as number) || 0;
    if (currentBalance < amount) return false;
    const newBalance = currentBalance - amount;
    const { error } = await supabase.from("users").update({ balance: newBalance }).ilike("username", nick);
    if (error) return false;
    setBalance(nick, newBalance);
    await store.addNotification(nick, `У вас знято ${amount} CR адміністрацією.`);
    return true;
  },

  // ── NOTIFICATIONS ─────────────────────────────────────────────────────────
  getNotifications: async (username: string): Promise<Notification[]> => {
    const { data } = await supabase.from("notifications").select("*").ilike("username", username).order("created_at", { ascending: false }).limit(50);
    if (!data) return [];
    return data.map((r: any) => ({
      id: r.id, text: r.text, date: new Date(r.created_at).toLocaleDateString("uk-UA"), read: r.read,
    }));
  },
  markNotificationsRead: async (username: string) => {
    await supabase.from("notifications").update({ read: true }).ilike("username", username).eq("read", false);
  },
  addNotification: async (username: string, text: string) => {
    await supabase.from("notifications").insert({ username, text, read: false });
  },

  // ── PULSE CITY ────────────────────────────────────────────────────────────
  getPulse: async (): Promise<{ citizens: number; houses: number; factions: number }> => {
    const [u, h, f] = await Promise.all([
      supabase.from("users").select("id", { count: "exact", head: true }),
      supabase.from("houses").select("id", { count: "exact", head: true }).eq("is_for_sale", false),
      supabase.from("faction_applications").select("id", { count: "exact", head: true }).eq("status", "approved"),
    ]);
    return { citizens: u.count || 0, houses: h.count || 0, factions: f.count || 0 };
  },

  // ── PROFILE DATA ──────────────────────────────────────────────────────────
  getPlayerProfile: async (nick: string) => {
    const [h, f, l] = await Promise.all([
      supabase.from("houses").select("id, name, price").eq("owner_username", nick),
      supabase.from("faction_applications").select("faction_name, status").eq("username", nick).order("created_at", { ascending: false }),
      supabase.from("license_applications").select("id, license_type, plate_number, status").eq("username", nick).eq("status", "approved"),
    ]);
    return { houses: h.data || [], factionApps: f.data || [], licenses: l.data || [] };
  },

  // ── REALTIME ──────────────────────────────────────────────────────────────
  onNewSos: (cb: (msg: SosMessage) => void) => {
    return supabase.channel("sos_live").on("postgres_changes", { event: "INSERT", schema: "public", table: "sos_signals" }, (p) => {
      const r = p.new as any;
      cb({ id: r.id, reason: r.type, description: r.message, date: new Date(r.created_at).toLocaleDateString("uk-UA"), type: r.type });
    }).subscribe();
  },
};
