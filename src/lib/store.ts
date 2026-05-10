import { createClient } from '@supabase/supabase-js';
import { dbInsert, dbUpdate, dbDelete, dbUpsert, eq, ilike } from './db';

const SUPABASE_URL = "https://kafivvwxqulxmkpyqinz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthZml2dnd4cXVseG1rcHlxaW56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyOTgyNDIsImV4cCI6MjA4OTg3NDI0Mn0.HD_Gxn5UIVxov0-7U4aVhtYXhGvYTsVqLlycE5ctBpg";
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export { dbInsert, dbUpdate, dbDelete, dbUpsert, eq, ilike };

// Все мутации идут через сервер (api/db.ts) — обходит RLS через SERVICE_ROLE_KEY.
const secureInsert = async (table: string, data: object): Promise<void> => {
  const { error } = await dbInsert(table, data);
  if (error) throw new Error(error.message);
};

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

// СТАЛО — всі операції з балансом через Supabase
export const getBalance = (_nick: string): number => 0;

export const getBalanceFromDB = async (nick: string): Promise<number> => {
  try {
    const { data } = await supabase
      .from("users")
      .select("balance")
      .ilike("username", nick)
      .maybeSingle();
    return (data?.balance as number) || 0;
  } catch { return 0; }
};

export const setBalance = async (nick: string, amount: number): Promise<void> => {
  await dbUpdate("users", { balance: Math.max(0, amount) }, { username: ilike(nick) });
};

export const addBalance = async (nick: string, amount: number): Promise<void> => {
  const cur = await getBalanceFromDB(nick);
  await setBalance(nick, cur + amount);
};

export const subtractBalance = async (nick: string, amount: number): Promise<boolean> => {
  const cur = await getBalanceFromDB(nick);
  if (cur < amount) return false;
  await setBalance(nick, cur - amount);
  return true;
};

export type NftGift = {
  id: string;
  name: string;
  price: number;
  image_url: string;
  sold?: boolean;
  created_at?: string;
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

  // ─── NFT GIFTS LOGIC ──────────────────────────────────────────────────────
  getNftGifts: async (): Promise<NftGift[]> => {
    const { data, error } = await supabase
      .from("nft_gifts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) { console.error("Помилка завантаження NFT:", error.message); return []; }
    return (data || []) as NftGift[];
  },

  addNftGift: async (name: string, price: number, imageUrl: string) => {
    // ✅ БЕЗОПАСНО: INSERT через сервер
    await secureInsert("nft_gifts", { name, price, image_url: imageUrl });
    return true;
  },

  toggleNftSold: async (id: string, sold: boolean): Promise<boolean> => {
    const { error } = await dbUpdate("nft_gifts", { sold }, { id: eq(id) });
    if (error) { console.error("toggleNftSold error:", error.message); return false; }
    return true;
  },

  buyNftGift: async (nick: string, gift: NftGift): Promise<boolean> => {
    try {
      const balance = await getBalanceFromDB(nick);
      if (balance < gift.price) return false;
      const success = await subtractBalance(nick, gift.price);
      if (success) {
        try {
          // ✅ БЕЗОПАСНО: INSERT через сервер
          await secureInsert("nft_owners", { owner_nick: nick, nft_id: gift.id });
          return true;
        } catch (e) {
          console.error("Помилка БД при купівлі:", e);
          await addBalance(nick, gift.price);
          return false;
        }
      }
      return false;
    } catch (e) {
      console.error("Критична помилка при купівлі NFT:", e);
      return false;
    }
  },

  getUserGifts: async (nick: string): Promise<NftGift[]> => {
    try {
      const { data: owners, error: ownerError } = await supabase
        .from("nft_owners").select("nft_id").eq("owner_nick", nick);
      if (ownerError || !owners || owners.length === 0) return [];
      const giftIds = owners.map(o => o.nft_id);
      const { data: nfts, error: nftError } = await supabase
        .from("nft_gifts").select("*").in("id", giftIds);
      if (nftError) { console.error("Помилка отримання даних NFT:", nftError.message); return []; }
      return (nfts || []) as NftGift[];
    } catch (e) {
      console.error("Помилка getUserGifts:", e);
      return [];
    }
  },

  deleteNftGift: async (id: string) => {
    const { error } = await dbDelete("nft_gifts", { id: eq(id) });
    if (error) throw new Error(error.message);
    return true;
  },

  // ── LICENSES & PLATES ──────────────────────────────────────────────────────
  getLicenseApplications: async (): Promise<LicenseApplication[]> => {
    const { data } = await supabase
      .from("license_applications").select("*").order("created_at", { ascending: false });
    if (!data) return [];
    return data.map((r: any) => ({
      id: r.id, username: r.username, license_type: r.license_type,
      status: r.status, date: new Date(r.created_at).toLocaleDateString("uk-UA")
    }));
  },

  // ── NEWS ──────────────────────────────────────────────────────────────────
  getNews: async (): Promise<NewsItem[]> => {
    const { data } = await supabase.from("news").select("*").order("created_at", { ascending: false });
    if (!data) return [];
    return data.map((r: Record<string, unknown>) => ({
      id: r.id as number, title: r.title as string, text: r.content as string,
      date: new Date(r.created_at as string).toLocaleDateString("uk-UA"),
      image: (r.image_url as string) || undefined,
      type: (r.type as "news" | "update") || "news",
      button_data: (r.button_data as string) || undefined,
    }));
  },
  addNews: async (title: string, text: string, imageUrl?: string, type: "news" | "update" = "news", buttonData?: string) => {
    // ✅ БЕЗОПАСНО: INSERT через сервер
    await secureInsert("news", {
      title, content: text, image_url: imageUrl || null,
      type, author_id: "admin", button_data: buttonData || null,
    });
  },
  deleteNews: async (id: number) => { await dbDelete("news", { id: eq(id) }); },
  setNews: (_: NewsItem[]) => {},

  // ── HOUSES ────────────────────────────────────────────────────────────────
  getHouses: async (username?: string): Promise<HouseItem[]> => {
    const { data: housesData } = await supabase.from("houses").select("*").order("created_at", { ascending: false });
    if (!housesData) return [];
    const allHouses = housesData.map((r: Record<string, unknown>) => ({
      id: r.id as number, name: r.name as string, price: r.price as number,
      desc: (r.description as string) || "", category: (r.category as string) || "Люкс",
      owner: (r.owner_username as string) || null, image: (r.image_url as string) || undefined,
      photos: r.image_url ? [r.image_url as string] : [], rental_days: 0,
    }));
    if (username) {
      const { data: requests } = await supabase
        .from("house_purchase_requests").select("house_id, rental_days")
        .eq("username", username).eq("status", "approved");
      if (requests && requests.length > 0) {
        const rentalMap = new Map(requests.map(req => [req.house_id, req.rental_days]));
        return allHouses.map(h => ({ ...h, rental_days: rentalMap.get(h.id) || 0 }));
      }
    }
    return allHouses;
  },

  getCarPlates: async (nick: string) => {
    try {
      const { data, error } = await supabase.from("car_plates").select("*").eq("username", nick);
      if (error) { console.error("Помилка БД car_plates:", error.message); return []; }
      return data || [];
    } catch (e) { console.error("Критична помилка getCarPlates:", e); return []; }
  },

  addHouse: async (name: string, desc: string, price: number, imageUrl?: string, category?: string) => {
    // ✅ БЕЗОПАСНО: INSERT через сервер
    await secureInsert("houses", {
      name, description: desc, price, image_url: imageUrl || null,
      category: category || "Люкс", owner_username: null, is_for_sale: true,
    });
  },

  deleteHouse: async (id: number) => { await dbDelete("houses", { id: eq(id) }); },

  updateHouse: async (id: number, updates: { name?: string; price?: number; desc?: string; imageUrl?: string }) => {
    await dbUpdate("houses", {
      name: updates.name, price: updates.price,
      description: updates.desc, image_url: updates.imageUrl,
    }, { id: eq(id) });
  },

  toggleHouseOwner: async (id: number, owner: string | null) => {
    await dbUpdate("houses", { owner_username: owner, is_for_sale: !owner }, { id: eq(id) });
  },

  setHouses: (_: HouseItem[]) => {},

  // ── HOUSE PURCHASE ────────────────────────────────────────────────────────
  submitHousePurchase: async (houseId: number, username: string, rentalDays?: number): Promise<boolean> => {
    try {
      // ✅ БЕЗОПАСНО: INSERT через сервер
      await secureInsert("house_purchase_requests", {
        house_id: houseId, username, status: "pending", rental_days: rentalDays || 7,
      });
      return true;
    } catch (e) { console.error("submitHousePurchase error:", e); return false; }
  },

  getHousePurchaseRequests: async (): Promise<HousePurchaseRequest[]> => {
    const { data } = await supabase.from("house_purchase_requests").select("*").order("created_at", { ascending: false });
    if (!data) return [];
    return data.map((r: Record<string, unknown>) => ({
      id: r.id as number, house_id: r.house_id as number, username: r.username as string,
      house_name: (r.house_name as string) || "", house_price: (r.house_price as number) || 0,
      status: r.status as "pending" | "approved" | "rejected",
      created_at: r.created_at as string, rental_days: (r.rental_days as number) || 7,
    }));
  },

  updateHousePurchaseStatus: async (id: number, status: "approved" | "rejected", houseId?: number, username?: string) => {
    await dbUpdate("house_purchase_requests", { status }, { id: eq(id) });
    if (status === "approved" && houseId && username) {
      await dbUpdate("houses", { owner_username: username, is_for_sale: false }, { id: eq(houseId) });
    }
    if (status === "rejected" && houseId) {
      await dbUpdate("houses", { owner_username: null, is_for_sale: true }, { id: eq(houseId) });
    }
  },

  // ── FACTION APPLICATIONS ──────────────────────────────────────────────────
  getFactionApps: async (): Promise<FactionApplication[]> => {
    const { data } = await supabase.from("faction_applications").select("*").order("created_at", { ascending: false });
    if (!data) return [];
    return data.map((r: Record<string, unknown>) => {
      const fd = (r.form_data as Record<string, unknown>) || {};
      return {
        id: r.id as number, factionId: (r.faction_id as string) || "",
        factionName: (r.faction_name as string) || "",
        nick: (fd.nick as string) || (r.username as string) || "",
        username: (r.username as string) || "",
        roblox: (fd.roblox as string) || "", age: (fd.age as string) || "",
        telegram: (fd.telegram as string) || "", experience: (fd.experience as string) || "",
        message: (fd.message as string) || "",
        status: ((r.status === "pending" ? "review" : r.status) as FactionApplication["status"]),
        date: new Date(r.created_at as string).toLocaleDateString("uk-UA"),
      };
    });
  },

  // Принимаем либо (factionId, factionName, app), либо единый payload-объект
  submitFactionApp: async (
    a: any,
    b?: string,
    c?: Omit<FactionApplication, "id" | "status" | "date" | "factionId" | "factionName">,
  ): Promise<boolean> => {
    try {
      let factionId: string;
      let factionName: string;
      let app: any;
      if (typeof a === "object" && a !== null) {
        factionId = a.factionId || "";
        factionName = a.factionName || "";
        app = a;
      } else {
        factionId = String(a || "");
        factionName = String(b || "");
        app = c || {};
      }
      const nick = app?.nick || localStorage.getItem("crp_nick") || "";
      await secureInsert("faction_applications", {
        faction_id: factionId,
        faction_name: factionName,
        username: nick,
        status: "pending",
        form_data: { ...app, nick },
      });
      return true;
    } catch (e) {
      console.error("submitFactionApp ERROR:", e);
      return false;
    }
  },

  updateFactionAppStatus: async (id: number, status: "approved" | "rejected") => {
    await dbUpdate("faction_applications", { status }, { id: eq(id) });
  },

  kickFromFaction: async (nick: string, factionName: string): Promise<boolean> => {
    const dbFactionName = factionName.replace(/^фракція\s*/i, "").trim();
    const { error } = await dbUpdate(
      "faction_applications",
      { status: "rejected" },
      { username: eq(nick), faction_name: ilike(dbFactionName), status: eq("approved") },
    );
    if (error) { console.error("❌ Помилка Supabase при оновленні:", error.message); return false; }
    return true;
  },

  // ── ADMIN APPLICATIONS ────────────────────────────────────────────────────
  getAdminApps: async (): Promise<AdminApplication[]> => {
    const { data } = await supabase.from("admin_applications").select("*").order("created_at", { ascending: false });
    if (!data) return [];
    return data.map((r: Record<string, unknown>) => {
      const fd = (r.form_data as Record<string, unknown>) || {};
      return {
        id: r.id as number, nick: (fd.nick as string) || (r.username as string) || "",
        roblox: (fd.roblox as string) || "", age: (fd.age as string) || "",
        country: (fd.country as string) || "", telegram: (fd.telegram as string) || "",
        timePerDay: (fd.timePerDay as string) || "", playTime: (fd.playTime as string) || "",
        hasMic: (fd.hasMic as boolean) || false, adminExp: (fd.adminExp as string) || "",
        rpTime: (fd.rpTime as string) || "", rpKnowledge: (fd.rpKnowledge as number) || 0,
        q1: (fd.q1 as string) || "", q2: (fd.q2 as string) || "",
        q3: (fd.q3 as string) || "", q4: (fd.q4 as string) || "",
        rulesRead: (fd.rulesRead as boolean) || false, daysOff: (fd.daysOff as string) || "",
        status: ((r.status === "pending" ? "review" : r.status) as AdminApplication["status"]),
        date: new Date(r.created_at as string).toLocaleDateString("uk-UA"),
      };
    });
  },

  submitAdminApp: async (app: Omit<AdminApplication, "id" | "status" | "date">) => {
    // ✅ БЕЗОПАСНО: INSERT через сервер
    try {
      await secureInsert("admin_applications", { username: app.nick, status: "pending", form_data: app });
      return true;
    } catch (e) {
      console.error("submitAdminApp ERROR:", e);
      return false;
    }
  },

  updateAdminAppStatus: async (id: number, status: "approved" | "rejected") => {
    await dbUpdate("admin_applications", { status }, { id: eq(id) });
  },
  setAdminApps: (_: AdminApplication[]) => {},

  // ── CITY VOICE ────────────────────────────────────────────────────────────
  getCityVoice: async (): Promise<CityVoiceItem[]> => {
    const { data } = await supabase.from("city_voice").select("*").order("created_at", { ascending: false });
    if (!data) return [];
    return data.map((r: any) => ({
      id: r.id, author: r.username, text: r.message, type: r.type || "idea",
      likes: r.likes || 0, dislikes: r.dislikes || 0,
      status: r.status === "pending" ? "active" : r.status,
    }));
  },

  incrementCityVoiceLikes: async (id: number) => {
    const { data } = await supabase.from("city_voice").select("likes").eq("id", id).single();
    await dbUpdate("city_voice", { likes: (data?.likes || 0) + 1 }, { id: eq(id) });
  },
  decrementCityVoiceLikes: async (id: number) => {
    const { data } = await supabase.from("city_voice").select("likes").eq("id", id).single();
    await dbUpdate("city_voice", { likes: Math.max(0, (data?.likes || 0) - 1) }, { id: eq(id) });
  },
  incrementCityVoiceDislikes: async (id: number) => {
    const { data } = await supabase.from("city_voice").select("dislikes").eq("id", id).single();
    await dbUpdate("city_voice", { dislikes: (data?.dislikes || 0) + 1 }, { id: eq(id) });
  },
  decrementCityVoiceDislikes: async (id: number) => {
    const { data } = await supabase.from("city_voice").select("dislikes").eq("id", id).single();
    await dbUpdate("city_voice", { dislikes: Math.max(0, (data?.dislikes || 0) - 1) }, { id: eq(id) });
  },

  submitCityVoice: async (author: string, text: string, type: "idea" | "petition") => {
    // ✅ БЕЗОПАСНО: INSERT через сервер
    await secureInsert("city_voice", { username: author, message: text, type, status: "pending", likes: 0, dislikes: 0 });
  },

  updateCityVoiceStatus: async (id: number, status: "approved" | "rejected") => {
    await dbUpdate("city_voice", { status }, { id: eq(id) });
  },
  deleteCityVoice: async (id: number) => { await dbDelete("city_voice", { id: eq(id) }); },

  // ── MAYOR ELECTION ────────────────────────────────────────────────────────
  getCandidates: async (): Promise<MayorCandidate[]> => {
    const { data } = await supabase.from("mayor_election").select("*").order("votes", { ascending: false });
    if (!data) return [];
    return data.map((r: Record<string, unknown>) => ({
      id: r.id as number, name: r.candidate_username as string,
      program: r.description as string, bio: (r.bio as string) || "",
      votes: (r.votes as number) || 0,
    }));
  },
  addCandidate: async (name: string, program: string, bio: string) => {
    // ✅ БЕЗОПАСНО: INSERT через сервер
    await secureInsert("mayor_election", { candidate_username: name, description: program, bio, created_by: "admin", votes: 0 });
  },
  deleteCandidate: async (id: number) => { await dbDelete("mayor_election", { id: eq(id) }); },
  voteCandidate: async (id: number) => {
    const { data } = await supabase.from("mayor_election").select("votes").eq("id", id).single();
    await dbUpdate("mayor_election", { votes: ((data?.votes as number) || 0) + 1 }, { id: eq(id) });
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
  addDoc: async (title: string, content: string) => {
    // ✅ БЕЗОПАСНО: INSERT через сервер
    await secureInsert("documents", { title, content });
  },
  updateDoc: async (id: number, title: string, content: string) => {
    await dbUpdate("documents", { title, content }, { id: eq(id) });
  },
  deleteDoc: async (id: number) => { await dbDelete("documents", { id: eq(id) }); },
  setDocs: (_: DocumentItem[]) => {},

  getCars: async (nick?: string): Promise<CarRecord[]> => {
    let query = supabase.from("car_plates").select("*").eq("status", "approved");
    if (nick) query = query.eq("username", nick);
    const { data, error } = await query;
    if (error) { console.error("Ошибка в getCars:", error.message); return []; }
    return data.map((r: any) => ({
      plate: r.plate_number, model: r.car_model || "Транспорт", owner: r.username,
    }));
  },

  submitLicense: async (username: string, licenseType: string) => {
    // ✅ БЕЗОПАСНО: INSERT через сервер
    await secureInsert("license_applications", { username, license_type: licenseType, status: "pending" });
  },

  submitCarPlate: async (username: string, model: string, plate: string) => {
    // ✅ БЕЗОПАСНО: INSERT через сервер
    await secureInsert("car_plates", { username, plate_number: plate, car_model: model, status: "pending" });
  },

  updateLicenseStatus: async (id: number, status: "approved" | "rejected") => {
    await dbUpdate("license_applications", { status }, { id: eq(id) });
  },

  updateCarPlateStatus: async (id: number, status: "approved" | "rejected") => {
    await dbUpdate("car_plates", { status }, { id: eq(id) });
  },

  setCars: (_: CarRecord[]) => {},

  // ── SOS ───────────────────────────────────────────────────────────────────
  getSos: async (): Promise<SosMessage[]> => {
    const { data } = await supabase.from("sos_signals").select("*").eq("status", "active").order("created_at", { ascending: false });
    if (!data) return [];
    return data.map((r: Record<string, unknown>) => ({
      id: r.id as number, reason: r.type as string, description: r.message as string,
      date: new Date(r.created_at as string).toLocaleDateString("uk-UA"), type: r.type as string,
    }));
  },
  addSos: async (username: string, reason: string, description: string, type: "raid" | "cheater" | "nrp" | "other" = "other") => {
    // ✅ БЕЗОПАСНО: INSERT через сервер
    await secureInsert("sos_signals", { username, message: description, type, status: "active" });
  },
  resolveSos: async (id: number) => { await dbUpdate("sos_signals", { status: "resolved" }, { id: eq(id) }); },
  setSos: (_: SosMessage[]) => {},

  // ── WANTED (Розшук) ───────────────────────────────────────────────────────
  getWanted: async (): Promise<WantedPerson[]> => {
    const { data } = await supabase.from("wanted").select("*").order("stars", { ascending: false });
    if (!data) return [];
    return data.map((r: Record<string, unknown>) => ({
      id: r.id as number,
      name: (r.name as string) || (r.username as string) || "",
      reason: (r.reason as string) || "",
      stars: Number(r.stars) || 1,
    }));
  },
  addWanted: async (name: string, reason: string, stars: number): Promise<boolean> => {
    const { error } = await dbInsert("wanted", { name, reason, stars: Math.max(1, Math.min(5, stars)) });
    if (error) { console.error("addWanted error:", error); return false; }
    return true;
  },
  removeWanted: async (id: number): Promise<boolean> => {
    const { error } = await dbDelete("wanted", { id: eq(id) });
    if (error) { console.error("removeWanted error:", error); return false; }
    return true;
  },
  setWanted: (_: WantedPerson[]) => {},

  // ── TOKENS / BALANCE ──────────────────────────────────────────────────────
  giveTokens: async (nick: string, amount: number): Promise<boolean> => {
    const { data: user } = await supabase.from("users").select("balance").ilike("username", nick).maybeSingle();
    const currentBalance = (user?.balance as number) || 0;
    const newBalance = currentBalance + amount;
    const { error } = await dbUpdate("users", { balance: newBalance }, { username: ilike(nick) });
    if (error) { console.error("giveTokens error:", error); return false; }
    setBalance(nick, newBalance);
    await store.addNotification(nick, `Вам нараховано ${amount} CR від адміністрації!`);
    return true;
  },

  takeTokens: async (nick: string, amount: number): Promise<boolean> => {
    const { data: user } = await supabase.from("users").select("balance").ilike("username", nick).maybeSingle();
    const currentBalance = (user?.balance as number) || 0;
    if (currentBalance < amount) return false;
    const newBalance = currentBalance - amount;
    const { error } = await dbUpdate("users", { balance: newBalance }, { username: ilike(nick) });
    if (error) { console.error("takeTokens error:", error); return false; }
    setBalance(nick, newBalance);
    await store.addNotification(nick, `З вашого балансу списано ${amount} CR.`);
    return true;
  },

  // ── THEMES ────────────────────────────────────────────────────────────────
  getOwnedThemes: async (nick: string): Promise<string[]> => {
    const { data, error } = await supabase.from("users").select("owned_themes").ilike("username", nick).maybeSingle();
    if (error || !data || !data.owned_themes) return ["lime"];
    return data.owned_themes;
  },

  saveBoughtTheme: async (nick: string, themeId: string) => {
    const currentThemes = await store.getOwnedThemes(nick);
    if (!currentThemes.includes(themeId)) {
      const newThemes = [...currentThemes, themeId];
      const { error } = await dbUpdate("users", { owned_themes: newThemes }, { username: ilike(nick) });
      if (!error) {
        localStorage.setItem(`crp_owned_themes_${nick.toLowerCase()}`, JSON.stringify(newThemes));
      }
    }
  },

  // ── PULSE CITY ────────────────────────────────────────────────────────────
  getPulse: async (): Promise<{ citizens: number; houses: number; factions: number }> => {
    const [usersRes, housesRes, factionsRes] = await Promise.all([
      supabase.from("users").select("id", { count: "exact", head: true }),
      supabase.from("houses").select("id", { count: "exact", head: true }).eq("is_for_sale", false),
      supabase.from("faction_applications").select("id", { count: "exact", head: true }).eq("status", "approved"),
    ]);
    return { citizens: usersRes.count || 0, houses: housesRes.count || 0, factions: factionsRes.count || 0 };
  },
  setPulse: (_: { citizens: number; houses: number; factions: number }) => {},

  // ── PROFILE DATA ──────────────────────────────────────────────────────────
  getPlayerProfile: async (nick: string) => {
    const [houseRes, factionRes, licRes, platesRes] = await Promise.all([
      supabase.from("house_purchase_requests").select("id, rental_days, created_at, house_id").eq("username", nick).eq("status", "approved"),
      supabase.from("faction_applications").select("faction_name, status").ilike("username", nick).order("created_at", { ascending: false }),
      supabase.from("license_applications").select("id, license_type, status").ilike("username", nick).ilike("status", "approved"),
      supabase.from("car_plates").select("id, plate_number, car_model, status").ilike("username", nick).ilike("status", "approved"),
    ]);
    let housesWithDetails: any[] = [];
    if (houseRes.data && houseRes.data.length > 0) {
      const houseIds = houseRes.data.map(h => h.house_id);
      const { data: housesData } = await supabase.from("houses").select("id, name, price, image_url").in("id", houseIds);
      housesWithDetails = houseRes.data.map((req: any) => {
        const details = housesData?.find(d => d.id === req.house_id);
        return {
          id: req.id, name: details?.name || "Будинок", price: details?.price || 0,
          rental_days: req.rental_days || 7, created_at: req.created_at, image: details?.image_url
        };
      });
    }
    return {
      houses: housesWithDetails,
      factionApps: (factionRes.data || []) as { faction_name: string; status: string }[],
      licenses: (licRes.data || []) as { id: number; license_type: string; status: string }[],
      carPlates: (platesRes.data || []) as { id: number; plate_number: string; car_model: string; status: string }[],
    };
  },

  // ── NOTIFICATIONS ─────────────────────────────────────────────────────────
  addNotification: async (nick: string, text: string) => {
    const notifs = _getNotifs();
    const newNotif: Notification = {
      id: Date.now(), text, date: new Date().toLocaleDateString("uk-UA"), read: false
    };
    _saveNotifs([newNotif, ...notifs]);
  },

  getNotifications: (): Notification[] => _getNotifs(),

  markNotificationRead: (id: number) => {
    const notifs = _getNotifs().map(n => n.id === id ? { ...n, read: true } : n);
    _saveNotifs(notifs);
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
  onAppStatusChange: (
    table: "faction_applications" | "admin_applications" | "license_applications" | "car_plates" | "house_purchase_requests",
    cb: (id: number, status: string) => void
  ) => {
    return supabase.channel(`${table}_status_live`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table }, (p) => {
        const r = p.new as Record<string, unknown>;
        if (r?.id != null && r?.status != null) { cb(r.id as number, r.status as string); }
      }).subscribe();
  },
};
