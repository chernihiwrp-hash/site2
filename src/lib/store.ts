import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://qwpzmioxhbkmxrwwevsv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3cHptaW94aGJrbXhyd3dldnN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5NTM3NTksImV4cCI6MjA4OTUyOTc1OX0.CrPDm1vWaEruGVQpfBYKYwYO4DG9WlibhVzLHaBMGh8";
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

// ─── NOTIFICATIONS HELPERS ────────────────────────────────────────────────────
const _getNotifs = (): Notification[] => {
  try { return JSON.parse(localStorage.getItem("crp_notifications") || "[]"); } catch { return []; }
};
const _saveNotifs = (items: Notification[]) => {
  localStorage.setItem("crp_notifications", JSON.stringify(items.slice(0, 50)));
};

// ─── STORE ───────────────────────────────────────────────────────────────────
export const store = {

  // ── NEWS ──────────────────────────────────────────────────────────────────
  getNews: async (): Promise<NewsItem[]> => {
    const { data } = await supabase.from("news").select("*").order("created_at", { ascending: false });
    if (!data) return [];
    return data.map((r: Record<string, unknown>) => ({
      id: r.id as number,
      title: r.title as string,
      text: r.content as string,
      date: new Date(r.created_at as string).toLocaleDateString("uk-UA"),
      image: (r.image_url as string) || undefined,
      type: (r.type as "news" | "update") || "news",
      button_data: (r.button_data as string) || undefined,
    }));
  },
  addNews: async (title: string, text: string, imageUrl?: string, type: "news" | "update" = "news", buttonData?: string) => {
    await supabase.from("news").insert({
      title, content: text, image_url: imageUrl || null,
      type, author_id: "admin", button_data: buttonData || null,
    });
  },
  deleteNews: async (id: number) => { await supabase.from("news").delete().eq("id", id); },
  setNews: (_: NewsItem[]) => {},

  // ── HOUSES ────────────────────────────────────────────────────────────────
  getHouses: async (): Promise<HouseItem[]> => {
    const { data } = await supabase.from("houses").select("*").order("created_at", { ascending: false });
    if (!data) return [];
    return data.map((r: Record<string, unknown>) => ({
      id: r.id as number,
      name: r.name as string,
      price: r.price as number,
      desc: (r.description as string) || "",
      category: (r.category as string) || "Люкс",
      owner: (r.owner_username as string) || null,
      image: (r.image_url as string) || undefined,
      photos: r.image_url ? [r.image_url as string] : [],
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
  setHouses: (_: HouseItem[]) => {},

  // ── HOUSE PURCHASE ────────────────────────────────────────────────────────
  submitHousePurchase: async (houseId: number, username: string, rentalDays?: number): Promise<boolean> => {
    const { error } = await supabase.from("house_purchase_requests").insert({
      house_id: houseId,
      username,
      status: "pending",
      rental_days: rentalDays || 7,
    });
    if (error) console.error("submitHousePurchase error:", error.message, error.details, error.hint);
    return !error;
  },
  getHousePurchaseRequests: async (): Promise<HousePurchaseRequest[]> => {
    const { data } = await supabase.from("house_purchase_requests").select("*").order("created_at", { ascending: false });
    if (!data) return [];
    return data.map((r: Record<string, unknown>) => ({
      id: r.id as number,
      house_id: r.house_id as number,
      username: r.username as string,
      house_name: (r.house_name as string) || "",
      house_price: (r.house_price as number) || 0,
      status: r.status as "pending" | "approved" | "rejected",
      created_at: r.created_at as string,
    }));
  },
  updateHousePurchaseStatus: async (id: number, status: "approved" | "rejected", houseId?: number, username?: string) => {
    await supabase.from("house_purchase_requests").update({ status }).eq("id", id);
    if (status === "approved" && houseId && username) {
      await supabase.from("houses").update({ owner_username: username, is_for_sale: false }).eq("id", houseId);
      store.addNotification(`Ваша заявка на будинок схвалена!`);
    }
  },

  // ── WANTED ────────────────────────────────────────────────────────────────
  getWanted: async (): Promise<WantedPerson[]> => {
    const { data } = await supabase.from("wanted").select("*").eq("status", "active").order("created_at", { ascending: false });
    if (!data) return [];
    return data.map((r: Record<string, unknown>) => ({
      id: r.id as number,
      name: r.target_username as string,
      reason: r.reason as string,
      stars: r.stars as number,
    }));
  },
  addWanted: async (name: string, reason: string, stars: number) => {
    await supabase.from("wanted").insert({ target_username: name, reason, stars, issued_by: "admin", status: "active" });
  },
  removeWanted: async (id: number) => { await supabase.from("wanted").update({ status: "resolved" }).eq("id", id); },
  setWanted: (_: WantedPerson[]) => {},

  // ── FACTIONS FROM DB ── (для відображення у списку фракцій)
  getFactionsFromDB: async (): Promise<FactionDB[]> => {
    const { data } = await supabase.from("factions").select("*").order("created_at", { ascending: true });
    return (data || []) as FactionDB[];
  },
  addFaction: async (name: string, color: string, logoUrl?: string, gradient?: string, section: "main" | "separate" = "main") => {
    const { error } = await supabase.from("factions").insert({
      name, color, logo_url: logoUrl || null,
      gradient: gradient || null, section,
    });
    if (error) console.error("addFaction error:", error);
    return !error;
  },
  deleteFaction: async (id: number) => { await supabase.from("factions").delete().eq("id", id); },

  // ── FACTION APPLICATIONS ──────────────────────────────────────────────────
  getFactionApps: async (): Promise<FactionApplication[]> => {
    const { data } = await supabase
      .from("faction_applications")
      .select("*")
      .order("created_at", { ascending: false });
    if (!data) return [];
    return data.map((r: Record<string, unknown>) => {
      const fd = (r.form_data as Record<string, unknown>) || {};
      return {
        id: r.id as number,
        factionId: (r.faction_id as string) || "",
        factionName: (r.faction_name as string) || "",
        nick: (fd.nick as string) || (r.username as string) || "",
        username: (r.username as string) || "",
        roblox: (fd.roblox as string) || "",
        age: (fd.age as string) || "",
        telegram: (fd.telegram as string) || "",
        experience: (fd.experience as string) || "",
        message: (fd.message as string) || "",
        status: ((r.status === "pending" ? "review" : r.status) as FactionApplication["status"]),
        date: new Date(r.created_at as string).toLocaleDateString("uk-UA"),
      };
    });
  },
  submitFactionApp: async (app: Omit<FactionApplication, "id" | "status" | "date">) => {
    // faction_id in DB is BIGINT — parse to number if possible, else null
    const factionIdNum = app.factionId && !isNaN(Number(app.factionId)) ? Number(app.factionId) : null;
    const { error } = await supabase.from("faction_applications").insert({
      faction_id: factionIdNum,
      faction_name: app.factionName,
      username: app.nick,
      status: "pending",
      form_data: {
        nick: app.nick,
        roblox: app.roblox,
        age: app.age,
        telegram: app.telegram,
        experience: app.experience,
        message: app.message,
      },
    });
    if (error) {
      console.error("submitFactionApp ERROR:", JSON.stringify(error, null, 2));
      alert("Помилка Supabase: " + error.message + "\nCode: " + error.code + "\nDetails: " + error.details);
    } else {
      console.log("submitFactionApp OK");
    }
    return !error;
  },
  updateFactionAppStatus: async (id: number, status: "approved" | "rejected") => {
    await supabase.from("faction_applications").update({ status }).eq("id", id);
  },
  // Отримати активну фракцію гравця
  getPlayerFaction: async (nick: string): Promise<string | null> => {
    const { data } = await supabase
      .from("faction_applications")
      .select("faction_name")
      .eq("username", nick)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    return (data as Record<string, unknown> | null)?.faction_name as string | null || null;
  },
  setFactionApps: (_: FactionApplication[]) => {},

  // ── ADMIN APPLICATIONS ────────────────────────────────────────────────────
  getAdminApps: async (): Promise<AdminApplication[]> => {
    const { data } = await supabase.from("admin_applications").select("*").order("created_at", { ascending: false });
    if (!data) return [];
    return data.map((r: Record<string, unknown>) => {
      const fd = (r.form_data as Record<string, unknown>) || {};
      return {
        id: r.id as number,
        nick: (fd.nick as string) || (r.username as string) || "",
        roblox: (fd.roblox as string) || "",
        age: (fd.age as string) || "",
        country: (fd.country as string) || "",
        telegram: (fd.telegram as string) || "",
        timePerDay: (fd.timePerDay as string) || "",
        playTime: (fd.playTime as string) || "",
        hasMic: (fd.hasMic as boolean) || false,
        adminExp: (fd.adminExp as string) || "",
        rpTime: (fd.rpTime as string) || "",
        rpKnowledge: (fd.rpKnowledge as number) || 0,
        q1: (fd.q1 as string) || "",
        q2: (fd.q2 as string) || "",
        q3: (fd.q3 as string) || "",
        q4: (fd.q4 as string) || "",
        rulesRead: (fd.rulesRead as boolean) || false,
        daysOff: (fd.daysOff as string) || "",
        status: ((r.status === "pending" ? "review" : r.status) as AdminApplication["status"]),
        date: new Date(r.created_at as string).toLocaleDateString("uk-UA"),
      };
    });
  },
  submitAdminApp: async (app: Omit<AdminApplication, "id" | "status" | "date">) => {
    const { data, error } = await supabase.from("admin_applications").insert({ username: app.nick, status: "pending", form_data: app }).select();
    if (error) {
      console.error("submitAdminApp ERROR:", JSON.stringify(error, null, 2));
      alert("Помилка Supabase: " + error.message + "\nCode: " + error.code + "\nDetails: " + error.details);
    } else {
      console.log("submitAdminApp OK:", data);
    }
    return !error;
  },
  updateAdminAppStatus: async (id: number, status: "approved" | "rejected") => {
    await supabase.from("admin_applications").update({ status }).eq("id", id);
  },
  setAdminApps: (_: AdminApplication[]) => {},

  // ── CITY VOICE ────────────────────────────────────────────────────────────
  getCityVoice: async (): Promise<CityVoiceItem[]> => {
    const { data } = await supabase.from("city_voice").select("*").order("created_at", { ascending: false });
    if (!data) return [];
    return data.map((r: Record<string, unknown>) => ({
      id: r.id as number,
      author: r.username as string,
      text: r.message as string,
      type: (r.type as "idea" | "petition") || "idea",
      likes: (r.likes as number) || 0,
      dislikes: (r.dislikes as number) || 0,
      status: ((r.status === "pending" ? "active" : r.status) as CityVoiceItem["status"]),
    }));
  },
  submitCityVoice: async (author: string, text: string, type: "idea" | "petition") => {
    await supabase.from("city_voice").insert({ username: author, message: text, type, status: "pending" });
  },
  updateCityVoiceStatus: async (id: number, status: "approved" | "rejected") => {
    await supabase.from("city_voice").update({ status }).eq("id", id);
  },
  deleteCityVoice: async (id: number) => { await supabase.from("city_voice").delete().eq("id", id); },
  setCityVoice: (_: CityVoiceItem[]) => {},

  // ── MAYOR ELECTION ────────────────────────────────────────────────────────
  getCandidates: async (): Promise<MayorCandidate[]> => {
    const { data } = await supabase.from("mayor_election").select("*").order("votes", { ascending: false });
    if (!data) return [];
    return data.map((r: Record<string, unknown>) => ({
      id: r.id as number,
      name: r.candidate_username as string,
      program: r.description as string,
      bio: (r.bio as string) || "",
      votes: (r.votes as number) || 0,
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
  setCandidates: (_: MayorCandidate[]) => {},

  // ── DOCUMENTS ─────────────────────────────────────────────────────────────
  getDocs: async (): Promise<DocumentItem[]> => {
    const { data } = await supabase.from("documents").select("*").order("id", { ascending: true });
    if (!data || data.length === 0) return [
      { id: 1, title: "Конституція міста", content: "Основний закон Чернігів RP." },
      { id: 2, title: "Правила сервера", content: "Загальні правила гри." },
      { id: 3, title: "Кримінальний кодекс", content: "Штрафи та покарання." },
    ];
    return data as DocumentItem[];
  },
  addDoc: async (title: string, content: string) => { await supabase.from("documents").insert({ title, content }); },
  updateDoc: async (id: number, title: string, content: string) => { await supabase.from("documents").update({ title, content }).eq("id", id); },
  deleteDoc: async (id: number) => { await supabase.from("documents").delete().eq("id", id); },
  setDocs: (_: DocumentItem[]) => {},

  // ── CARS / LICENSES ───────────────────────────────────────────────────────
  getCars: async (): Promise<CarRecord[]> => {
    const { data } = await supabase.from("license_applications").select("*").eq("status", "approved").not("plate_number", "is", null);
    if (!data) return [];
    return data.map((r: Record<string, unknown>) => ({
      plate: r.plate_number as string,
      model: (r.license_type as string) || "Авто",
      owner: r.username as string,
    }));
  },
  getLicenseApplications: async (): Promise<LicenseApplication[]> => {
    const { data } = await supabase.from("license_applications").select("*").order("created_at", { ascending: false });
    if (!data) return [];
    return data as LicenseApplication[];
  },
  submitLicense: async (username: string, licenseType: string, plateNumber?: string) => {
    const { error } = await supabase.from("license_applications").insert({
      username, license_type: licenseType,
      plate_number: plateNumber || null, status: "pending",
    });
    if (error) { console.error("submitLicense error:", error); throw new Error(error.message); }
  },
  updateLicenseStatus: async (id: number, status: "approved" | "rejected") => {
    await supabase.from("license_applications").update({ status }).eq("id", id);
  },
  setCars: (_: CarRecord[]) => {},

  // ── SOS ───────────────────────────────────────────────────────────────────
  getSos: async (): Promise<SosMessage[]> => {
    const { data } = await supabase.from("sos_signals").select("*").eq("status", "active").order("created_at", { ascending: false });
    if (!data) return [];
    return data.map((r: Record<string, unknown>) => ({
      id: r.id as number,
      reason: r.type as string,
      description: r.message as string,
      date: new Date(r.created_at as string).toLocaleDateString("uk-UA"),
      type: r.type as string,
    }));
  },
  addSos: async (username: string, reason: string, description: string, type: "raid" | "cheater" | "nrp" | "other" = "other") => {
    await supabase.from("sos_signals").insert({ username, message: description, type, status: "active" });
  },
  resolveSos: async (id: number) => { await supabase.from("sos_signals").update({ status: "resolved" }).eq("id", id); },
  setSos: (_: SosMessage[]) => {},

  // ── TOKENS / BALANCE ──────────────────────────────────────────────────────
  giveTokens: async (nick: string, amount: number): Promise<boolean> => {
    // Читаємо поточний баланс з Supabase
    const { data: user } = await supabase
      .from("users").select("balance").ilike("username", nick).maybeSingle();
    const currentBalance = (user?.balance as number) || 0;
    const newBalance = currentBalance + amount;
    // Записуємо новий баланс в Supabase
    const { error } = await supabase
      .from("users").update({ balance: newBalance }).ilike("username", nick);
    if (error) { console.error("giveTokens error:", error); return false; }
    // Оновлюємо localStorage гравця (якщо він на цьому пристрої)
    setBalance(nick, newBalance);
    await store.addNotification(nick, `Вам нараховано ${amount} CR від адміністрації!`);
    return true;
  },
  takeTokens: async (nick: string, amount: number): Promise<boolean> => {
    // Читаємо поточний баланс з Supabase
    const { data: user } = await supabase
      .from("users").select("balance").ilike("username", nick).maybeSingle();
    const currentBalance = (user?.balance as number) || 0;
    if (currentBalance < amount) return false;
    const newBalance = currentBalance - amount;
    // Записуємо новий баланс в Supabase
    const { error } = await supabase
      .from("users").update({ balance: newBalance }).ilike("username", nick);
    if (error) { console.error("takeTokens error:", error); return false; }
    // Оновлюємо localStorage гравця (якщо він на цьому пристрої)
    setBalance(nick, newBalance);
    await store.addNotification(nick, `У вас знято ${amount} CR адміністрацією.`);
    return true;
  },

  // ── NOTIFICATIONS ─────────────────────────────────────────────────────────
  getNotifications: async (username: string): Promise<Notification[]> => {
    const { data } = await supabase.from("notifications").select("*").ilike("username", username).order("created_at", { ascending: false }).limit(50);
    if (!data) return [];
    return data.map((r: Record<string, unknown>) => ({ id: r.id as number, text: r.text as string, date: new Date(r.created_at as string).toLocaleDateString("uk-UA"), read: r.read as boolean }));
  },
  markNotificationsRead: async (username: string) => {
    await supabase.from("notifications").update({ read: true }).ilike("username", username).eq("read", false);
  },
  addNotification: async (username: string, text: string) => {
    await supabase.from("notifications").insert({ username, text, read: false });
  },
  setNotifications: (_: Notification[]) => {},

  // ── PULSE CITY ────────────────────────────────────────────────────────────
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
  setPulse: (_: { citizens: number; houses: number; factions: number }) => {},

  // ── PROFILE DATA ──────────────────────────────────────────────────────────
  getPlayerProfile: async (nick: string) => {
    const [houseRes, factionRes, licRes] = await Promise.all([
      supabase.from("houses").select("id, name, price").eq("owner_username", nick),
      supabase.from("faction_applications").select("faction_name, status").eq("username", nick).order("created_at", { ascending: false }),
      supabase.from("license_applications").select("id, license_type, plate_number, status").eq("username", nick).eq("status", "approved"),
    ]);
    return {
      houses: (houseRes.data || []) as { id: number; name: string; price: number }[],
      factionApps: (factionRes.data || []) as { faction_name: string; status: string }[],
      licenses: (licRes.data || []) as { id: number; license_type: string; plate_number: string | null; status: string }[],
    };
  },

  // ── REALTIME ──────────────────────────────────────────────────────────────
  onNewSos: (cb: (msg: SosMessage) => void) => {
    return supabase.channel("sos_live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "sos_signals" }, (p) => {
        const r = p.new as Record<string, unknown>;
        cb({ id: r.id as number, reason: r.type as string, description: r.message as string, date: new Date(r.created_at as string).toLocaleDateString("uk-UA"), type: r.type as string });
      }).subscribe();
  },
  onNewFactionApp: (cb: (app: FactionApplication) => void) => {
    return supabase.channel("faction_apps_live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "faction_applications" }, (p) => {
        const r = p.new as Record<string, unknown>;
        const fd = (r.form_data as Record<string, unknown>) || {};
        cb({ id: r.id as number, factionId: (r.faction_id as string) || "", factionName: (r.faction_name as string) || "", nick: (fd.nick as string) || (r.username as string) || "", username: (r.username as string) || "", roblox: (fd.roblox as string) || "", age: (fd.age as string) || "", telegram: (fd.telegram as string) || "", experience: (fd.experience as string) || "", message: (fd.message as string) || "", status: "review", date: new Date(r.created_at as string).toLocaleDateString("uk-UA") });
      }).subscribe();
  },
  onNewAdminApp: (cb: (app: AdminApplication) => void) => {
    return supabase.channel("admin_apps_live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "admin_applications" }, (p) => {
        const r = p.new as Record<string, unknown>;
        const fd = (r.form_data as Record<string, unknown>) || {};
        cb({ id: r.id as number, nick: (fd.nick as string) || (r.username as string) || "", roblox: (fd.roblox as string) || "", age: (fd.age as string) || "", country: (fd.country as string) || "", telegram: (fd.telegram as string) || "", timePerDay: (fd.timePerDay as string) || "", playTime: (fd.playTime as string) || "", hasMic: (fd.hasMic as boolean) || false, adminExp: (fd.adminExp as string) || "", rpTime: (fd.rpTime as string) || "", rpKnowledge: (fd.rpKnowledge as number) || 0, q1: (fd.q1 as string) || "", q2: (fd.q2 as string) || "", q3: (fd.q3 as string) || "", q4: (fd.q4 as string) || "", rulesRead: (fd.rulesRead as boolean) || false, daysOff: (fd.daysOff as string) || "", status: "review", date: new Date(r.created_at as string).toLocaleDateString("uk-UA") });
      }).subscribe();
  },
};
