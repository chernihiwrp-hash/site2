import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://qwpzmioxhbkmxrwwevsv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3cHptaW94aGJrbXhyd3dldnN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5NTM3NTksImV4cCI6MjA4OTUyOTc1OX0.CrPDm1vWaEruGVQpfBYKYwYO4DG9WlibhVzLHaBMGh8";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── PROTECTED API BRIDGE ────────────────────────────────────────────────────
const secureAction = async (table: string, method: 'INSERT' | 'UPDATE' | 'DELETE', data: any, filter?: { col: string, val: any }) => {
  const response = await fetch('/api/db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table, method, data, filter })
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Ошибка защиты');
  }
  return response.json();
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

// ─── BALANCE HELPERS ──────────────────────────────────────────────────────────
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
  await secureAction("users", 'UPDATE', { balance: newVal }, { col: 'username', val: nick });
};
export const subtractBalance = async (nick: string, amount: number): Promise<boolean> => {
  const cur = getBalance(nick);
  if (cur < amount) return false;
  const newVal = cur - amount;
  setBalance(nick, newVal);
  await secureAction("users", 'UPDATE', { balance: newVal }, { col: 'username', val: nick });
  return true;
};

// ─── STORE ───────────────────────────────────────────────────────────────────
export const store = {

  // ── NEWS ──
  getNews: async (): Promise<NewsItem[]> => {
    const { data } = await supabase.from("news").select("*").order("created_at", { ascending: false });
    if (!data) return [];
    return data.map((r: any) => ({ id: r.id, title: r.title, text: r.content, date: new Date(r.created_at).toLocaleDateString("uk-UA"), image: r.image_url || undefined, type: r.type || "news", button_data: r.button_data || undefined }));
  },
  addNews: async (title: string, text: string, imageUrl?: string, type: "news" | "update" = "news", buttonData?: string) => {
    await secureAction("news", 'INSERT', { title, content: text, image_url: imageUrl || null, type, author_id: "admin", button_data: buttonData || null });
  },
  deleteNews: async (id: number) => { await secureAction("news", 'DELETE', null, { col: 'id', val: id }); },

  // ── HOUSES ──
  getHouses: async (): Promise<HouseItem[]> => {
    const { data } = await supabase.from("houses").select("*").order("created_at", { ascending: false });
    if (!data) return [];
    return data.map((r: any) => ({ id: r.id, name: r.name, price: r.price, desc: r.description || "", category: r.category || "Люкс", owner: r.owner_username || null, image: r.image_url || undefined, photos: r.image_url ? [r.image_url] : [] }));
  },
  addHouse: async (name: string, desc: string, price: number, imageUrl?: string, category = "Люкс") => {
    await secureAction("houses", 'INSERT', { name, description: desc, price, image_url: imageUrl || null, category, is_for_sale: true });
  },
  deleteHouse: async (id: number) => { await secureAction("houses", 'DELETE', null, { col: 'id', val: id }); },
  updateHouse: async (id: number, updates: any) => {
    await secureAction("houses", 'UPDATE', { name: updates.name, price: updates.price, description: updates.desc, image_url: updates.imageUrl }, { col: 'id', val: id });
  },
  toggleHouseOwner: async (id: number, owner: string | null) => {
    await secureAction("houses", 'UPDATE', { owner_username: owner, is_for_sale: !owner }, { col: 'id', val: id });
  },

  // ── HOUSE PURCHASE ──
  submitHousePurchase: async (houseId: number, username: string, rentalDays?: number): Promise<boolean> => {
    try {
      await secureAction("house_purchase_requests", 'INSERT', { house_id: houseId, username, status: "pending", rental_days: rentalDays || 7 });
      return true;
    } catch { return false; }
  },
  getHousePurchaseRequests: async (): Promise<HousePurchaseRequest[]> => {
    const { data } = await supabase.from("house_purchase_requests").select("*").order("created_at", { ascending: false });
    if (!data) return [];
    const houseIds = [...new Set(data.map((r: any) => r.house_id))];
    const { data: hData } = await supabase.from("houses").select("id, name, price, image_url").in("id", houseIds);
    const houseMap: any = {}; (hData || []).forEach((h: any) => houseMap[h.id] = h);
    return data.map((r: any) => ({
      id: r.id, house_id: r.house_id, username: r.username, house_name: houseMap[r.house_id]?.name || "", house_price: houseMap[r.house_id]?.price || 0,
      rental_days: r.rental_days || 7, status: r.status, created_at: r.created_at, image_url: houseMap[r.house_id]?.image_url || ""
    }));
  },
  updateHousePurchaseStatus: async (id: number, status: "approved" | "rejected", houseId?: number, username?: string) => {
    await secureAction("house_purchase_requests", 'UPDATE', { status }, { col: 'id', val: id });
    if (status === "approved" && houseId && username) {
      await store.toggleHouseOwner(houseId, username);
      await store.addNotification(username, `✅ Заявку на будинок схвалено!`);
    }
  },

  // ── WANTED ──
  getWanted: async (): Promise<WantedPerson[]> => {
    const { data } = await supabase.from("wanted").select("*").eq("status", "active").order("created_at", { ascending: false });
    return data ? data.map((r: any) => ({ id: r.id, name: r.target_username, reason: r.reason, stars: r.stars })) : [];
  },
  addWanted: async (name: string, reason: string, stars: number) => {
    await secureAction("wanted", 'INSERT', { target_username: name, reason, stars, issued_by: "admin", status: "active" });
  },
  removeWanted: async (id: number) => { await secureAction("wanted", 'UPDATE', { status: "resolved" }, { col: 'id', val: id }); },

  // ── FACTIONS ──
  getFactionsFromDB: async (): Promise<FactionDB[]> => {
    const { data } = await supabase.from("factions").select("*").order("created_at", { ascending: true });
    return (data || []) as FactionDB[];
  },
  addFaction: async (name: string, color: string, logoUrl?: string, gradient?: string, section: "main" | "separate" = "main") => {
    try { await secureAction("factions", 'INSERT', { name, color, logo_url: logoUrl || null, gradient: gradient || null, section }); return true; } catch { return false; }
  },
  deleteFaction: async (id: number) => { await secureAction("factions", 'DELETE', null, { col: 'id', val: id }); },
  getPlayerFaction: async (nick: string): Promise<string | null> => {
    const { data } = await supabase.from("faction_applications").select("faction_name").eq("username", nick).eq("status", "approved").order("created_at", { ascending: false }).limit(1).maybeSingle();
    return (data as any)?.faction_name || null;
  },

  // ── FACTION APPLICATIONS ──
  getFactionApps: async (): Promise<FactionApplication[]> => {
    const { data } = await supabase.from("faction_applications").select("*").order("created_at", { ascending: false });
    if (!data) return [];
    return data.map((r: any) => ({
      id: r.id, factionId: r.faction_id || "", factionName: r.faction_name || "", nick: r.form_data?.nick || r.username || "", username: r.username || "",
      roblox: r.form_data?.roblox || "", age: r.form_data?.age || "", telegram: r.form_data?.telegram || "", experience: r.form_data?.experience || "", message: r.form_data?.message || "",
      status: r.status === "pending" ? "review" : r.status, date: new Date(r.created_at).toLocaleDateString("uk-UA")
    }));
  },
  submitFactionApp: async (app: any) => {
    const factionIdNum = app.factionId && !isNaN(Number(app.factionId)) ? Number(app.factionId) : null;
    await secureAction("faction_applications", 'INSERT', { faction_id: factionIdNum, faction_name: app.factionName, username: app.nick, status: "review", form_data: { nick: app.nick, roblox: app.roblox, age: app.age, telegram: app.telegram, experience: app.experience, message: app.message } });
    return true;
  },
  updateFactionAppStatus: async (id: number, status: "approved" | "rejected") => {
    await secureAction("faction_applications", 'UPDATE', { status }, { col: 'id', val: id });
  },

  // ── ADMIN APPLICATIONS ──
  getAdminApps: async (): Promise<AdminApplication[]> => {
    const { data } = await supabase.from("admin_applications").select("*").order("created_at", { ascending: false });
    if (!data) return [];
    return data.map((r: any) => ({
      id: r.id, nick: r.form_data?.nick || r.username || "", status: r.status === "pending" ? "review" : r.status, date: new Date(r.created_at).toLocaleDateString("uk-UA"),
      roblox: r.form_data?.roblox || "", age: r.form_data?.age || "", country: r.form_data?.country || "", telegram: r.form_data?.telegram || "", timePerDay: r.form_data?.timePerDay || "", playTime: r.form_data?.playTime || "", hasMic: !!r.form_data?.hasMic, adminExp: r.form_data?.adminExp || "", rpTime: r.form_data?.rpTime || "", rpKnowledge: r.form_data?.rpKnowledge || 0, q1: r.form_data?.q1 || "", q2: r.form_data?.q2 || "", q3: r.form_data?.q3 || "", q4: r.form_data?.q4 || "", rulesRead: !!r.form_data?.rulesRead, daysOff: r.form_data?.daysOff || ""
    }));
  },
  submitAdminApp: async (app: any) => {
    await secureAction("admin_applications", 'INSERT', { username: app.nick, status: "review", form_data: app });
    return true;
  },
  updateAdminAppStatus: async (id: number, status: "approved" | "rejected") => {
    await secureAction("admin_applications", 'UPDATE', { status }, { col: 'id', val: id });
  },

  // ── CITY VOICE ──
  getCityVoice: async (): Promise<CityVoiceItem[]> => {
    const { data } = await supabase.from("city_voice").select("*").order("created_at", { ascending: false });
    return data ? data.map((r: any) => ({ id: r.id, author: r.username, text: r.message, type: r.type || "idea", likes: r.likes || 0, dislikes: r.dislikes || 0, status: r.status === "pending" ? "active" : r.status })) : [];
  },
  submitCityVoice: async (author: string, text: string, type: "idea" | "petition") => {
    await secureAction("city_voice", 'INSERT', { username: author, message: text, type, status: "pending" });
  },
  updateCityVoiceStatus: async (id: number, status: "approved" | "rejected") => {
    await secureAction("city_voice", 'UPDATE', { status }, { col: 'id', val: id });
  },
  deleteCityVoice: async (id: number) => { await secureAction("city_voice", 'DELETE', null, { col: 'id', val: id }); },

  // ── MAYOR ELECTION ──
  getCandidates: async (): Promise<MayorCandidate[]> => {
    const { data } = await supabase.from("mayor_election").select("*").order("votes", { ascending: false });
    return data ? data.map((r: any) => ({ id: r.id, name: r.candidate_username, program: r.description, bio: r.bio || "", votes: r.votes || 0 })) : [];
  },
  addCandidate: async (name: string, program: string, bio: string) => {
    await secureAction("mayor_election", 'INSERT', { candidate_username: name, description: program, bio, created_by: "admin", votes: 0 });
  },
  deleteCandidate: async (id: number) => { await secureAction("mayor_election", 'DELETE', null, { col: 'id', val: id }); },
  voteCandidate: async (id: number) => {
    const { data } = await supabase.from("mayor_election").select("votes").eq("id", id).single();
    await secureAction("mayor_election", 'UPDATE', { votes: (data?.votes || 0) + 1 }, { col: 'id', val: id });
  },

  // ── DOCUMENTS ──
  getDocs: async (): Promise<DocumentItem[]> => {
    const { data } = await supabase.from("documents").select("*").order("id", { ascending: true });
    return (data as DocumentItem[]) || [];
  },
  addDoc: async (title: string, content: string) => { await secureAction("documents", 'INSERT', { title, content }); },
  updateDoc: async (id: number, title: string, content: string) => { await secureAction("documents", 'UPDATE', { title, content }, { col: 'id', val: id }); },
  deleteDoc: async (id: number) => { await secureAction("documents", 'DELETE', null, { col: 'id', val: id }); },

  // ── CARS / LICENSES ──
  getCars: async (): Promise<CarRecord[]> => {
    const { data } = await supabase.from("license_applications").select("*").eq("status", "approved").not("plate_number", "is", null);
    return data ? data.map((r: any) => ({ plate: r.plate_number, model: r.license_type || "Авто", owner: r.username })) : [];
  },
  getLicenseApplications: async (): Promise<LicenseApplication[]> => {
    const { data } = await supabase.from("license_applications").select("*").order("created_at", { ascending: false });
    return (data as LicenseApplication[]) || [];
  },
  submitLicense: async (username: string, licenseType: string, plateNumber?: string) => {
    await secureAction("license_applications", 'INSERT', { username, license_type: licenseType, plate_number: plateNumber || null, status: "pending" });
  },
  updateLicenseStatus: async (id: number, status: "approved" | "rejected") => {
    await secureAction("license_applications", 'UPDATE', { status }, { col: 'id', val: id });
  },

  // ── SOS ──
  getSos: async (): Promise<SosMessage[]> => {
    const { data } = await supabase.from("sos_signals").select("*").eq("status", "active").order("created_at", { ascending: false });
    return data ? data.map((r: any) => ({ id: r.id, reason: r.type, description: r.message, date: new Date(r.created_at).toLocaleDateString("uk-UA"), type: r.type })) : [];
  },
  addSos: async (username: string, reason: string, description: string, type: any = "other") => {
    await secureAction("sos_signals", 'INSERT', { username, message: description, type, status: "active" });
  },
  resolveSos: async (id: number) => { await secureAction("sos_signals", 'UPDATE', { status: "resolved" }, { col: 'id', val: id }); },

  // ── TOKENS / BALANCE ──
  giveTokens: async (nick: string, amount: number): Promise<boolean> => {
    const { data: user } = await supabase.from("users").select("balance").ilike("username", nick).maybeSingle();
    const newBalance = ((user?.balance as number) || 0) + amount;
    await secureAction("users", 'UPDATE', { balance: newBalance }, { col: 'username', val: nick });
    setBalance(nick, newBalance);
    await store.addNotification(nick, `Вам нараховано ${amount} CR!`);
    return true;
  },
  takeTokens: async (nick: string, amount: number): Promise<boolean> => {
    const { data: user } = await supabase.from("users").select("balance").ilike("username", nick).maybeSingle();
    if (!user || (user.balance as number) < amount) return false;
    const newBalance = (user.balance as number) - amount;
    await secureAction("users", 'UPDATE', { balance: newBalance }, { col: 'username', val: nick });
    setBalance(nick, newBalance);
    return true;
  },

  // ── NOTIFICATIONS ──
  getNotifications: async (username: string): Promise<Notification[]> => {
    const { data } = await supabase.from("notifications").select("*").ilike("username", username).order("created_at", { ascending: false }).limit(50);
    return data ? data.map((r: any) => ({ id: r.id, text: r.text, date: new Date(r.created_at).toLocaleDateString("uk-UA"), read: r.read })) : [];
  },
  markNotificationsRead: async (username: string) => {
    await supabase.from("notifications").update({ read: true }).ilike("username", username).eq("read", false);
  },
  addNotification: async (username: string, text: string) => {
    await secureAction("notifications", 'INSERT', { username, text, read: false });
  },

  // ── PULSE CITY ──
  getPulse: async () => {
    const [u, h, f] = await Promise.all([
      supabase.from("users").select("id", { count: "exact", head: true }),
      supabase.from("houses").select("id", { count: "exact", head: true }).eq("is_for_sale", false),
      supabase.from("faction_applications").select("id", { count: "exact", head: true }).eq("status", "approved"),
    ]);
    return { citizens: u.count || 0, houses: h.count || 0, factions: f.count || 0 };
  },

  // ── PROFILE ──
  getPlayerProfile: async (nick: string) => {
    const [houseRes, factionRes, licRes] = await Promise.all([
      supabase.from("houses").select("id, name, price").eq("owner_username", nick),
      supabase.from("faction_applications").select("faction_name, status").eq("username", nick).order("created_at", { ascending: false }),
      supabase.from("license_applications").select("id, license_type, plate_number, status").eq("username", nick).eq("status", "approved"),
    ]);
    return {
      houses: (houseRes.data || []) as any[],
      factionApps: (factionRes.data || []) as any[],
      licenses: (licRes.data || []) as any[],
    };
  },

  // ── REALTIME ──
  onNewSos: (cb: any) => supabase.channel("sos_live").on("postgres_changes", { event: "INSERT", schema: "public", table: "sos_signals" }, (p: any) => cb({ id: p.new.id, reason: p.new.type, description: p.new.message, date: new Date(p.new.created_at).toLocaleDateString("uk-UA"), type: p.new.type })).subscribe(),
};
