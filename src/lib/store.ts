import { createClient } from '@supabase/supabase-js';
import { dbInsert, dbUpdate, dbDelete, dbUpsert, dbSelect, eq, ilike } from './db';

const SUPABASE_URL = "https://kafivvwxqulxmkpyqinz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthZml2dnd4cXVseG1rcHlxaW56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyOTgyNDIsImV4cCI6MjA4OTg3NDI0Mn0.HD_Gxn5UIVxov0-7U4aVhtYXhGvYTsVqLlycE5ctBpg";
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export { dbInsert, dbUpdate, dbDelete, dbUpsert, eq, ilike };

const secureInsert = async (table: string, data: object): Promise<void> => {
  const { error } = await dbInsert(table, data);
  if (error) throw new Error(error.message);
};

export type NewsItem = {
  id: number; title: string; text: string; date: string;
  image?: string; type?: "news" | "update"; button_data?: string;
};
export type HouseItem = {
  id: number; name: string; price: number; desc: string;
  category: string; owner: string | null; image?: string; photos: string[];
};
export type WantedPerson = { id: number; name: string; reason: string; stars: number };
export type FamilyRole = "owner" | "co_owner" | "member";
export type FamilyMember = {
  id: number;
  house_purchase_id: number;
  username: string;
  role: FamilyRole;
  created_at?: string;
};
export type UserSearchResult = { username: string; avatar_url?: string };
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
export type DocumentItem = { id: number; title: string; content: string; button_text?: string; button_url?: string };
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
  house_image?: string; house_desc?: string;
  rental_days?: number;
  status: "pending" | "approved" | "rejected"; created_at: string;
};
export type RecruitmentTarget = "admin" | string; 
export type RecruitmentSettings = { target: string; is_open: boolean; updated_at?: string };
export type HouseConfiscation = {
  id: number; house_id: number; house_name?: string;
  former_owner: string; reason: string; admin: string; created_at: string;
};
export type MayorCandidateApplication = {
  id: number; username: string; program: string; bio: string;
  status: "pending" | "approved" | "rejected"; created_at: string;
};


export const CR_RATE = 3;
export const toCR = (eur: number) => Math.round(eur * CR_RATE);


export const LICENSE_CR_PRICE = 80000;


export const getBalance = (_nick: string): number => 0;

export const getBalanceFromDB = async (nick: string): Promise<number> => {
  try {
    const { data } = await dbSelect<{ balance: number }>("users", {
      columns: "balance",
      filters: [{ col: "username", op: "ilike", value: nick }],
      single: true,
    });
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

const _getNotifs = (): Notification[] => {
  try { return JSON.parse(localStorage.getItem("crp_notifications") || "[]"); } catch { return []; }
};
const _saveNotifs = (items: Notification[]) => {
  localStorage.setItem("crp_notifications", JSON.stringify(items.slice(0, 50)));
};


export const store = {


  getNftGifts: async (): Promise<NftGift[]> => {
    const { data, error } = await dbSelect<NftGift[]>("nft_gifts", {
      order: { col: "created_at", dir: "desc" },
    });
    if (error) { console.error("Помилка завантаження NFT:", error.message); return []; }
    return (data || []) as NftGift[];
  },

  addNftGift: async (name: string, price: number, imageUrl: string) => {

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
      const { data: owners, error: ownerError } = await dbSelect<{ nft_id: string }[]>("nft_owners", {
        columns: "nft_id",
        filters: [{ col: "owner_nick", op: "ilike", value: nick }],
      });
      if (ownerError || !owners || owners.length === 0) return [];
      const giftIds = owners.map(o => o.nft_id).filter(id => id != null && id !== "");
      const { data: nfts, error: nftError } = await dbSelect<NftGift[]>("nft_gifts", {
        filters: [{ col: "id", op: "in", value: giftIds }],
      });
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

  getLicenseApplications: async (): Promise<LicenseApplication[]> => {
    const { data } = await dbSelect("license_applications", {
      order: { col: "created_at", dir: "desc" },
    });
    if (!data) return [];
    return data.map((r: any) => ({
      id: r.id, username: r.username, license_type: r.license_type,
      status: r.status, date: new Date(r.created_at).toLocaleDateString("uk-UA")
    }));
  },

  getNews: async (): Promise<NewsItem[]> => {
    const { data } = await dbSelect("news", { order: { col: "created_at", dir: "desc" } });
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

    await secureInsert("news", {
      title, content: text, image_url: imageUrl || null,
      type, author_id: "admin", button_data: buttonData || null,
    });
  },
  deleteNews: async (id: number) => { await dbDelete("news", { id: eq(id) }); },
  setNews: (_: NewsItem[]) => {},

  releaseExpiredHouses: async (): Promise<void> => {
    try {
      const { data } = await dbSelect("house_purchase_requests", {
        columns: "id, house_id, created_at, rental_days, status",
        filters: [{ col: "status", op: "eq", value: "approved" }],
      });
      if (!data || data.length === 0) return;
      const now = Date.now();
      const expired = data.filter((r: any) => {
        const days = (r.rental_days as number) || 7;
        const start = new Date(r.created_at as string).getTime();
        return start + days * 86400000 < now;
      });
      for (const r of expired) {
        await dbUpdate("house_purchase_requests", { status: "expired" }, { id: eq(r.id as number) });
        await dbUpdate("houses", { owner_username: null, is_for_sale: true }, { id: eq(r.house_id as number) });
      }
    } catch (e) { console.error("releaseExpiredHouses:", e); }
  },

  getHouses: async (username?: string): Promise<HouseItem[]> => {

    await (store as any).releaseExpiredHouses?.();
    const { data: housesData } = await dbSelect("houses", { order: { col: "created_at", dir: "desc" } });
    if (!housesData) return [];
    const allHouses = housesData.map((r: Record<string, unknown>) => ({
      id: r.id as number, name: r.name as string, price: r.price as number,
      desc: (r.description as string) || "", category: (r.category as string) || "Люкс",
      owner: (r.owner_username as string) || null, image: (r.image_url as string) || undefined,
      photos: r.image_url ? [r.image_url as string] : [], rental_days: 0,
    }));
    if (username) {
     
      const myHouses = allHouses.filter(h =>
        h.owner && h.owner.toLowerCase() === username.toLowerCase()
      );
      if (myHouses.length > 0) {
  
        const { data: requests } = await dbSelect("house_purchase_requests", {
          columns: "house_id, rental_days",
          filters: [
            { col: "username", op: "eq", value: username },
            { col: "status", op: "eq", value: "approved" },
          ],
        });
        const rentalMap = new Map((requests || []).map((req: any) => [req.house_id, req.rental_days]));
        return myHouses.map(h => ({ ...h, rental_days: rentalMap.get(h.id) || 0 }));
      }
      return [];
    }
    return allHouses;
  },

  getCarPlates: async (nick: string) => {
    try {
      const { data, error } = await dbSelect("car_plates", {
        filters: [{ col: "username", op: "eq", value: nick }],
      });
      if (error) { console.error("Помилка БД car_plates:", error.message); return []; }
      return data || [];
    } catch (e) { console.error("Критична помилка getCarPlates:", e); return []; }
  },

  addHouse: async (name: string, desc: string, price: number, imageUrl?: string, category?: string) => {

    await secureInsert("houses", {
      name, description: desc, price, image_url: imageUrl || null,
      category: category || "Люкс", owner_username: null, is_for_sale: true,
    });
  },

  deleteHouse: async (id: number) => {
 
    await dbDelete("house_purchase_requests", { house_id: eq(id) });
    const { error } = await dbDelete("houses", { id: eq(id) });
    if (error) throw error;
  },

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

  
  submitHousePurchase: async (houseId: number, username: string, rentalDays?: number): Promise<boolean> => {
    try {

      await secureInsert("house_purchase_requests", {
        house_id: houseId, username, status: "pending", rental_days: rentalDays || 7,
      });
      return true;
    } catch (e) { console.error("submitHousePurchase error:", e); return false; }
  },

  getHousePurchaseRequests: async (): Promise<HousePurchaseRequest[]> => {
    const { data } = await dbSelect("house_purchase_requests", { order: { col: "created_at", dir: "desc" } });
    if (!data) return [];
    const houseIds = [...new Set(data.map((r: Record<string, unknown>) => r.house_id as number).filter(Boolean))];
    let housesMap: Record<number, Record<string, unknown>> = {};
    if (houseIds.length > 0) {
      const { data: houses } = await dbSelect("houses", {
        columns: "id, name, description, price, image_url",
        filters: [{ col: "id", op: "in", value: houseIds }],
      });
      if (houses) houses.forEach((h: Record<string, unknown>) => { housesMap[h.id as number] = h; });
    }
    return data.map((r: Record<string, unknown>) => {
      const h = housesMap[r.house_id as number] || {};
      return {
        id: r.id as number, house_id: r.house_id as number, username: r.username as string,
        house_name: (r.house_name as string) || (h.name as string) || "",
        house_price: (r.house_price as number) || (h.price as number) || 0,
        house_image: (h.image_url as string) || undefined,
        house_desc: (h.description as string) || "",
        status: r.status as "pending" | "approved" | "rejected",
        created_at: r.created_at as string, rental_days: (r.rental_days as number) || 7,
      };
    });
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

  getFactionApps: async (): Promise<FactionApplication[]> => {
    const { data } = await dbSelect("faction_applications", { order: { col: "created_at", dir: "desc" } });
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

  submitFactionApp: async (
    factionOrPayload: string | Omit<FactionApplication, "id" | "status" | "date">,
    factionNameArg?: string,
    appArg?: Omit<FactionApplication, "id" | "status" | "date" | "factionId" | "factionName">
  ): Promise<boolean> => {
    try {
      const payload = (
        typeof factionOrPayload === "object" && factionOrPayload !== null
          ? factionOrPayload
          : { ...(appArg || {}), factionId: factionOrPayload, factionName: factionNameArg || "" }
      ) as Omit<FactionApplication, "id" | "status" | "date">;

      const nick = String(payload.nick || localStorage.getItem("crp_nick") || "").trim();
      if (!nick) throw new Error("Nick is required");

      const factionIdRaw = payload.factionId || "";
    
      const factionIdValue = !isNaN(Number(factionIdRaw)) && factionIdRaw !== ""
        ? Number(factionIdRaw)
        : factionIdRaw;

      const rowData = {
        faction_id: factionIdValue,
        faction_name: String(payload.factionName || ""),
        username: nick,
        status: "pending",
        form_data: { ...payload, nick },
      };

      // Try authenticated API first
      const { error: apiErr } = await dbInsert("faction_applications", rowData);
      if (apiErr) {
        console.warn("submitFactionApp API error, trying direct:", apiErr.message);
        // Fallback: direct supabase insert (uses anon key, requires RLS to allow inserts)
        const { error: directErr } = await supabase.from("faction_applications").insert(rowData);
        if (directErr) throw new Error(directErr.message);
      }
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
    // Use eq for username to avoid wildcard issues with underscores in nicks
    const { error } = await dbUpdate(
      "faction_applications",
      { status: "rejected" },
      { username: eq(nick), faction_name: ilike(dbFactionName), status: eq("approved") },
    );
    if (error) {
      // Fallback: try with lowercase nick
      const { error: err2 } = await dbUpdate(
        "faction_applications",
        { status: "rejected" },
        { username: eq(nick.toLowerCase()), faction_name: ilike(dbFactionName), status: eq("approved") },
      );
      if (err2) { console.error("❌ Помилка Supabase при оновленні:", err2.message); return false; }
    }
    return true;
  },

  resignFromFaction: async (nick: string, factionName: string): Promise<boolean> => {
    const dbFactionName = factionName.replace(/^фракція\s*/i, "").trim();
    // Use eq for username to avoid wildcard issues with underscores in nicks
    const { error } = await dbUpdate(
      "faction_applications",
      { status: "rejected" },
      { username: eq(nick), faction_name: ilike(dbFactionName), status: eq("approved") },
    );
    if (error) {
      // Fallback: try with lowercase nick
      const { error: err2 } = await dbUpdate(
        "faction_applications",
        { status: "rejected" },
        { username: eq(nick.toLowerCase()), faction_name: ilike(dbFactionName), status: eq("approved") },
      );
      if (err2) { console.error("❌ resignFromFaction:", err2.message); return false; }
    }
    return true;
  },

  getWanted: async (): Promise<WantedPerson[]> => {
    const { data, error } = await dbSelect("wanted", {
      filters: [{ op: "or", value: "status.eq.active,status.is.null" }],
      order: { col: "stars", dir: "desc" },
    });
    if (error) { console.error("getWanted:", error.message); return []; }
    return (data || []).map((r: Record<string, unknown>) => ({
      id: r.id as number,
      name:
        (r.target_username as string) ||
        (r.name as string) ||
        (r.username as string) ||
        (r.nickname as string) ||
        (r.nick as string) ||
        (r.player as string) ||
        "Невідомо",
      reason: (r.reason as string) || "",
      stars: Math.max(0, Math.min(5, (r.stars as number) || 0)),
    }));
  },

  addWanted: async (name: string, reason: string, stars: number): Promise<boolean> => {
    const s = Math.max(0, Math.min(5, stars));
  
    const tryPayloads = [
      { target_username: name, reason, stars: s, status: "active", issued_by: "admin" },
      { target_username: name, reason, stars: s, status: "active" },
      { target_username: name, reason, stars: s },
      { name, username: name, reason, stars: s },
    ];
    for (const payload of tryPayloads) {
      const { error } = await dbInsert("wanted", payload);
      if (!error) return true;
      console.warn("addWanted retry:", error.message);
    }
    return false;
  },

  removeWanted: async (id: number): Promise<void> => {
    await dbDelete("wanted", { id: eq(id) });
  },

  getAdminApps: async (): Promise<AdminApplication[]> => {
    const { data } = await dbSelect("admin_applications", { order: { col: "created_at", dir: "desc" } });
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

  submitAdminApp: async (app: Omit<AdminApplication, "id" | "status" | "date">): Promise<boolean> => {
    const nick = String(app?.nick || localStorage.getItem("crp_nick") || "").trim();
    if (!nick) {
      console.error("submitAdminApp ERROR: Nick is required");
      return false;
    }
    // Verify we have credentials before trying to submit
    const password = localStorage.getItem("crp_password") || sessionStorage.getItem("crp_password") || "";
    // Don't block if no password in localStorage - dbInsert will use getCredentials() which checks both storages

    const row = {
      username: nick,
      status: "pending" as const,
      form_data: { ...app, nick },
    };

    try {
      const { error: apiErr } = await dbInsert("admin_applications", row);
      if (apiErr) {
        console.warn("submitAdminApp API error, trying direct:", apiErr.message);
        // Fallback: direct supabase insert
        const { error: directErr } = await supabase.from("admin_applications").insert(row);
        if (directErr) throw new Error(directErr.message);
      }
      return true;
    } catch (serverError: any) {
      console.error("submitAdminApp /api/db ERROR:", serverError?.message || serverError);
      return false;
    }
  },

  updateAdminAppStatus: async (id: number, status: "approved" | "rejected") => {
    await dbUpdate("admin_applications", { status }, { id: eq(id) });
  },
  setAdminApps: (_: AdminApplication[]) => {},

  getCityVoice: async (): Promise<CityVoiceItem[]> => {
    const { data } = await dbSelect("city_voice", { order: { col: "created_at", dir: "desc" } });
    if (!data) return [];
    return data.map((r: any) => ({
      id: r.id, author: r.username, text: r.message, type: r.type || "idea",
      likes: r.likes || 0, dislikes: r.dislikes || 0,
      status: r.status === "pending" ? "active" : r.status,
    }));
  },

  incrementCityVoiceLikes: async (id: number) => {
    const { data } = await dbSelect<{ likes: number }>("city_voice", {
      columns: "likes", filters: [{ col: "id", op: "eq", value: id }], single: true,
    });
    await dbUpdate("city_voice", { likes: (data?.likes || 0) + 1 }, { id: eq(id) });
  },
  decrementCityVoiceLikes: async (id: number) => {
    const { data } = await dbSelect<{ likes: number }>("city_voice", {
      columns: "likes", filters: [{ col: "id", op: "eq", value: id }], single: true,
    });
    await dbUpdate("city_voice", { likes: Math.max(0, (data?.likes || 0) - 1) }, { id: eq(id) });
  },
  incrementCityVoiceDislikes: async (id: number) => {
    const { data } = await dbSelect<{ dislikes: number }>("city_voice", {
      columns: "dislikes", filters: [{ col: "id", op: "eq", value: id }], single: true,
    });
    await dbUpdate("city_voice", { dislikes: (data?.dislikes || 0) + 1 }, { id: eq(id) });
  },
  decrementCityVoiceDislikes: async (id: number) => {
    const { data } = await dbSelect<{ dislikes: number }>("city_voice", {
      columns: "dislikes", filters: [{ col: "id", op: "eq", value: id }], single: true,
    });
    await dbUpdate("city_voice", { dislikes: Math.max(0, (data?.dislikes || 0) - 1) }, { id: eq(id) });
  },

  submitCityVoice: async (author: string, text: string, type: "idea" | "petition") => {
 
    await secureInsert("city_voice", { username: author, message: text, type, status: "pending", likes: 0, dislikes: 0 });
  },

  updateCityVoiceStatus: async (id: number, status: "approved" | "rejected") => {
    await dbUpdate("city_voice", { status }, { id: eq(id) });
  },
  deleteCityVoice: async (id: number) => { await dbDelete("city_voice", { id: eq(id) }); },


  getCandidates: async (): Promise<MayorCandidate[]> => {
    const { data } = await dbSelect("mayor_election", { order: { col: "votes", dir: "desc" } });
    if (!data) return [];
    return data.map((r: Record<string, unknown>) => ({
      id: r.id as number, name: r.candidate_username as string,
      program: r.description as string, bio: (r.bio as string) || "",
      votes: (r.votes as number) || 0,
    }));
  },
  addCandidate: async (name: string, program: string, bio: string) => {
 
    await secureInsert("mayor_election", { candidate_username: name, description: program, bio, created_by: "admin", votes: 0 });
  },
  deleteCandidate: async (id: number) => { await dbDelete("mayor_election", { id: eq(id) }); },
  voteCandidate: async (id: number) => {
    const { data } = await dbSelect<{ votes: number }>("mayor_election", {
      columns: "votes", filters: [{ col: "id", op: "eq", value: id }], single: true,
    });
    await dbUpdate("mayor_election", { votes: ((data?.votes as number) || 0) + 1 }, { id: eq(id) });
  },
  setCandidates: (_: MayorCandidate[]) => {},

  getDocs: async (): Promise<DocumentItem[]> => {
    const { data } = await dbSelect("documents", { order: { col: "id", dir: "asc" } });
    if (!data || data.length === 0) return [
      { id: 1, title: "Конституція міста", content: "Основний закон Чернігів RP." },
      { id: 2, title: "Правила сервера", content: "Загальні правила гри." },
      { id: 3, title: "Кримінальний кодекс", content: "Штрафи та покарання." },
    ];
    return data as DocumentItem[];
  },
  addDoc: async (title: string, content: string, button_text?: string, button_url?: string): Promise<boolean> => {
    const { error } = await dbInsert("documents", { title, content, button_text: button_text || null, button_url: button_url || null });
    if (error) { console.error("[addDoc] error:", error.message); return false; }
    return true;
  },
  updateDoc: async (id: number, title: string, content: string, button_text?: string, button_url?: string): Promise<boolean> => {
    const { error } = await dbUpdate("documents", { title, content, button_text: button_text || null, button_url: button_url || null }, { id: eq(id) });
    if (error) { console.error("[updateDoc] error:", error.message); return false; }
    return true;
  },
  deleteDoc: async (id: number) => { await dbDelete("documents", { id: eq(id) }); },
  setDocs: (_: DocumentItem[]) => {},

  getCars: async (nick?: string): Promise<CarRecord[]> => {
    const filters: any[] = [{ col: "status", op: "eq", value: "approved" }];
    if (nick) filters.push({ col: "username", op: "eq", value: nick });
    const { data, error } = await dbSelect("car_plates", { filters });
    if (error) { console.error("Ошибка в getCars:", error.message); return []; }
    return data.map((r: any) => ({
      plate: r.plate_number, model: r.car_model || "Транспорт", owner: r.username,
    }));
  },

  submitLicense: async (username: string, licenseType: string) => {

    await secureInsert("license_applications", { username, license_type: licenseType, status: "pending" });
  },

  submitCarPlate: async (username: string, model: string, plate: string) => {

    await secureInsert("car_plates", { username, plate_number: plate, car_model: model, status: "pending" });
  },

  updateLicenseStatus: async (id: number, status: "approved" | "rejected") => {
    await dbUpdate("license_applications", { status }, { id: eq(id) });
  },

  updateCarPlateStatus: async (id: number, status: "approved" | "rejected") => {
    await dbUpdate("car_plates", { status }, { id: eq(id) });
  },

  setCars: (_: CarRecord[]) => {},

  getSos: async (): Promise<SosMessage[]> => {
    const { data } = await dbSelect("sos_signals", {
      filters: [{ col: "status", op: "eq", value: "active" }],
      order: { col: "created_at", dir: "desc" },
    });
    if (!data) return [];
    return data.map((r: Record<string, unknown>) => ({
      id: r.id as number, reason: r.type as string, description: r.message as string,
      date: new Date(r.created_at as string).toLocaleDateString("uk-UA"), type: r.type as string,
    }));
  },
  addSos: async (username: string, reason: string, description: string, type: "raid" | "cheater" | "nrp" | "other" = "other") => {

    await secureInsert("sos_signals", { username, message: description, type, status: "active" });
  },
  resolveSos: async (id: number) => { await dbUpdate("sos_signals", { status: "resolved" }, { id: eq(id) }); },
  setSos: (_: SosMessage[]) => {},


  giveTokens: async (nick: string, amount: number): Promise<boolean> => {
 
    const adminNick     = localStorage.getItem("crp_nick")     || "";
    const adminPassword = (localStorage.getItem("crp_password") || sessionStorage.getItem("crp_password")) || "";
    if (!adminNick || !adminPassword) return false;
    try {
      const res = await fetch("/api/admin-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nick: adminNick, password: adminPassword, op: "give", target: nick, amount }),
      });
      if (!res.ok) { console.error("giveTokens:", await res.json()); return false; }
      return true;
    } catch (e) { console.error("giveTokens network error:", e); return false; }
  },

  takeTokens: async (nick: string, amount: number): Promise<boolean> => {
 
    const adminNick     = localStorage.getItem("crp_nick")     || "";
    const adminPassword = (localStorage.getItem("crp_password") || sessionStorage.getItem("crp_password")) || "";
    if (!adminNick || !adminPassword) return false;
    try {
      const res = await fetch("/api/admin-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nick: adminNick, password: adminPassword, op: "take", target: nick, amount }),
      });
      if (!res.ok) { console.error("takeTokens:", await res.json()); return false; }
      return true;
    } catch (e) { console.error("takeTokens network error:", e); return false; }
  },

  getOwnedThemes: async (nick: string): Promise<string[]> => {
    const { data, error } = await dbSelect<{ owned_themes: string[] }>("users", {
      columns: "owned_themes", filters: [{ col: "username", op: "ilike", value: nick }], single: true,
    });
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

 
  getPulse: async (): Promise<{ citizens: number; houses: number; factions: number }> => {
    const [usersRes, housesRes, factionsRes] = await Promise.all([
      dbSelect("users", { columns: "id", count: true }),
      dbSelect("houses", { columns: "id", filters: [{ col: "is_for_sale", op: "eq", value: false }], count: true }),
      dbSelect("faction_applications", { columns: "id", filters: [{ col: "status", op: "eq", value: "approved" }], count: true }),
    ]);
    return { citizens: usersRes.count || 0, houses: housesRes.count || 0, factions: factionsRes.count || 0 };
  },
  setPulse: (_: { citizens: number; houses: number; factions: number }) => {},

  
  getPlayerProfile: async (nick: string) => {

    await (store as any).releaseExpiredHouses?.();
    const [houseRes, factionRes, licRes, platesRes, familyRes] = await Promise.all([
      dbSelect("house_purchase_requests", {
        columns: "id, rental_days, created_at, house_id",
        filters: [{ col: "username", op: "eq", value: nick }, { col: "status", op: "eq", value: "approved" }],
      }),
      dbSelect("faction_applications", {
        columns: "faction_name, status",
        filters: [{ col: "username", op: "ilike", value: nick }],
        order: { col: "created_at", dir: "desc" },
      }),
      dbSelect("license_applications", {
        columns: "id, license_type, status",
        filters: [{ col: "username", op: "ilike", value: nick }, { col: "status", op: "ilike", value: "approved" }],
      }),
      dbSelect("car_plates", {
        columns: "id, plate_number, car_model, status",
        filters: [{ col: "username", op: "ilike", value: nick }, { col: "status", op: "ilike", value: "approved" }],
      }),
      dbSelect("house_families", {
        columns: "house_purchase_id, role",
        filters: [{ col: "username", op: "ilike", value: nick }],
      }),
    ]);
    let housesWithDetails: any[] = [];
    const familyHouseRequestIds = (familyRes.data || []).map((f: any) => f.house_purchase_id).filter(Boolean);
 
    const ownRequestIds = (houseRes.data || []).map((h: any) => h.id);
    const extraFamilyIds = familyHouseRequestIds.filter((id: number) => !ownRequestIds.includes(id));
    let allRequests = houseRes.data || [];
    if (extraFamilyIds.length > 0) {
      const { data: familyRequests } = await dbSelect("house_purchase_requests", {
        columns: "id, rental_days, created_at, house_id",
        filters: [{ col: "id", op: "in", value: extraFamilyIds }, { col: "status", op: "eq", value: "approved" }],
      });
      allRequests = [...allRequests, ...(familyRequests || [])];
    }
    if (allRequests.length > 0) {
      const houseIds = allRequests.map((h: any) => h.house_id);
      const { data: housesData } = await dbSelect("houses", {
        columns: "id, name, price, image_url",
        filters: [{ col: "id", op: "in", value: houseIds }],
      });
      housesWithDetails = allRequests.map((req: any) => {
        const details = housesData?.find((d: any) => d.id === req.house_id);
        const isFamilyMember = familyHouseRequestIds.includes(req.id) && !ownRequestIds.includes(req.id);
        return {
          id: req.id, name: details?.name || "Будинок", price: details?.price || 0,
          rental_days: req.rental_days || 7, created_at: req.created_at, image: details?.image_url,
          isFamilyHouse: isFamilyMember,
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

  markNotificationsRead: async (_nick: string) => {
    const notifs = _getNotifs().map(n => ({ ...n, read: true }));
    _saveNotifs(notifs);
  },

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

  getFamily: async (housePurchaseId: number): Promise<FamilyMember[]> => {
    const { data, error } = await supabase
      .from("house_families")
      .select("*")
      .eq("house_purchase_id", housePurchaseId)
      .order("role", { ascending: true });
    if (error) { console.error("getFamily:", error.message); return []; }
    return (data || []) as FamilyMember[];
  },

  createFamily: async (housePurchaseId: number, ownerNick: string): Promise<boolean> => {
    try {
      await secureInsert("house_families", {
        house_purchase_id: housePurchaseId,
        username: ownerNick,
        role: "owner",
      });
      return true;
    } catch (e) { console.error("createFamily:", e); return false; }
  },

  addFamilyMember: async (
    housePurchaseId: number,
    username: string,
    role: FamilyRole = "member",
  ): Promise<boolean> => {
    try {
      await secureInsert("house_families", {
        house_purchase_id: housePurchaseId, username, role,
      });
      return true;
    } catch (e) { console.error("addFamilyMember:", e); return false; }
  },

  updateFamilyRole: async (id: number, role: FamilyRole): Promise<void> => {
    await dbUpdate("house_families", { role }, { id: eq(id) });
  },

  removeFamilyMember: async (id: number): Promise<void> => {
    await dbDelete("house_families", { id: eq(id) });
  },

  searchUsers: async (query: string, limit = 10): Promise<UserSearchResult[]> => {
    const q = (query || "").trim();
    if (!q) return [];
    try {
      const { data, error } = await dbSelect("users", {
        columns: "username, avatar_url",
        filters: [{ col: "username", op: "ilike", value: `${q}%` }],
        limit,
      });
      if (error) { console.error("searchUsers:", error.message); return []; }
      return (data || []).map((r: any) => ({
        username: String(r.username || ""),
        avatar_url: r.avatar_url || undefined,
      })).filter((u: any) => u.username);
    } catch (e) { console.error("searchUsers:", e); return []; }
  },

  addFaction: async (
    name: string,
    color: string,
    logoUrl?: string,
    gradient?: string,
    section: "main" | "separate" = "main",
  ): Promise<boolean> => {
    try {
      const { error } = await dbInsert("factions", {
        name, color,
        logo_url: logoUrl || null,
        gradient: gradient || null,
        section,
      });
      if (error) {
        console.error("addFaction DB error:", error.message, error.details, error.hint);
        return false;
      }
      return true;
    } catch (e) {
      console.error("addFaction:", e);
      return false;
    }
  },

  updateFaction: async (
    id: number,
    updates: Partial<{ name: string; color: string; gradient: string; section: "main"|"separate"; logo_url: string; description: string; icon_name: string; dangerous: boolean; background_image: string; banner_image: string; questions: string[] }>,
  ): Promise<boolean> => {
    const { error } = await dbUpdate("factions", updates, { id: eq(id) });
    if (error) { console.error("updateFaction:", error.message); return false; }
    return true;
  },

  deleteFaction: async (id: number): Promise<boolean> => {
    const { error } = await dbDelete("factions", { id: eq(id) });
    if (error) { console.error("deleteFaction:", error.message); return false; }
    return true;
  },

  getRecruitmentMap: async (): Promise<Record<string, boolean>> => {
    try {
      const { data } = await dbSelect("recruitment_settings");
      const map: Record<string, boolean> = {};
      (data || []).forEach((r: any) => { map[String(r.target).toLowerCase()] = r.is_open !== false; });
      return map;
    } catch { return {}; }
  },

  isRecruitmentOpen: async (target: string): Promise<boolean> => {
    try {
      const targetKey = target.toLowerCase().trim();
  
      const { data, error } = await dbSelect("recruitment_settings", {
        columns: "is_open, target",
      });
      if (error) { console.error("[isRecruitmentOpen] db error:", error.message); return true; }
      if (!data || data.length === 0) return true;
      const row = data.find((r: any) => String(r.target).toLowerCase().trim() === targetKey);
      console.log("[isRecruitmentOpen] target:", targetKey, "row:", row, "all:", data);
      if (!row) return true; 
      return row.is_open !== false;
    } catch (e) {
      console.error("[isRecruitmentOpen] exception:", e);
      return true;
    }
  },

  setRecruitmentOpen: async (target: string, isOpen: boolean): Promise<boolean> => {
    const { error } = await dbUpsert(
      "recruitment_settings",
      { target: target.toLowerCase(), is_open: isOpen, updated_at: new Date().toISOString() },
      { onConflict: "target" },
    );
    if (error) { console.error("setRecruitmentOpen:", error.message); return false; }
    return true;
  },

  updateHouseFull: async (
    id: number,
    updates: Partial<{ name: string; price: number; description: string; category: string; image_url: string }>,
  ): Promise<boolean> => {
    const { error } = await dbUpdate("houses", updates, { id: eq(id) });
    if (error) { console.error("updateHouseFull:", error.message); return false; }
    return true;
  },

  confiscateHouse: async (
    houseId: number,
    formerOwner: string,
    reason: string,
    admin: string,
  ): Promise<boolean> => {
    try {
     
      await secureInsert("house_confiscations", {
        house_id: houseId, former_owner: formerOwner, reason, admin,
      });
  
      await dbUpdate("houses", { owner_username: null, is_for_sale: true }, { id: eq(houseId) });

      await dbUpdate(
        "house_purchase_requests",
        { status: "rejected" },
        { house_id: eq(houseId), username: ilike(formerOwner), status: eq("approved") },
      );

      await store.addNotification(formerOwner, `Ваш будинок конфіскований адміністрацією. Причина: ${reason}`);
      return true;
    } catch (e) {
      console.error("confiscateHouse:", e);
      return false;
    }
  },

  getConfiscations: async (): Promise<HouseConfiscation[]> => {
    const { data } = await dbSelect("house_confiscations", { order: { col: "created_at", dir: "desc" } });
    if (!data) return [];
    const ids = [...new Set(data.map((r: any) => r.house_id).filter(Boolean))];
    let names: Record<number, string> = {};
    if (ids.length) {
      const { data: hs } = await dbSelect("houses", {
        columns: "id, name",
        filters: [{ col: "id", op: "in", value: ids }],
      });
      (hs || []).forEach((h: any) => { names[h.id] = h.name; });
    }
    return data.map((r: any) => ({
      id: r.id, house_id: r.house_id, house_name: names[r.house_id] || `#${r.house_id}`,
      former_owner: r.former_owner, reason: r.reason, admin: r.admin || "admin",
      created_at: r.created_at,
    }));
  },


  getUserConfiscations: async (nick: string): Promise<HouseConfiscation[]> => {
    const all = await store.getConfiscations();
    return all.filter(c => c.former_owner.toLowerCase() === nick.toLowerCase());
  },


  submitLicenseFull: async (
    username: string,
    licenseType: string,
    telegram?: string,
    paymentMethod: "money" | "cr" = "money",
  ): Promise<{ ok: boolean; auto?: boolean; error?: string }> => {
    if (paymentMethod === "cr") {

      const balance = await getBalanceFromDB(username);
      if (balance < LICENSE_CR_PRICE) {
        return { ok: false, error: `Недостатньо CR. Потрібно ${LICENSE_CR_PRICE.toLocaleString()}` };
      }
      const ok = await subtractBalance(username, LICENSE_CR_PRICE);
      if (!ok) return { ok: false, error: "Не вдалось списати CR" };
      try {
        await secureInsert("license_applications", {
          username,
          license_type: telegram ? `${licenseType} | TG: ${telegram}` : licenseType,
          status: "approved",
        });
        await store.addNotification(username, `Ліцензію видано (оплата ${LICENSE_CR_PRICE.toLocaleString()} CR)`);
        return { ok: true, auto: true };
      } catch (e: any) {

        await addBalance(username, LICENSE_CR_PRICE);
        return { ok: false, error: e?.message || "DB error" };
      }
    }

    try {
      await secureInsert("license_applications", {
        username,
        license_type: telegram ? `${licenseType} | TG: ${telegram}` : licenseType,
        status: "pending",
      });
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message };
    }
  },

  
  submitMayorApplication: async (
    username: string, program: string, bio: string,
  ): Promise<boolean> => {
    try {
      await secureInsert("mayor_candidate_applications", {
        username, program, bio, status: "pending",
      });
      return true;
    } catch (e) {
      console.error("submitMayorApplication:", e);
      return false;
    }
  },

  getMayorApplications: async (): Promise<MayorCandidateApplication[]> => {
    const { data } = await dbSelect("mayor_candidate_applications", { order: { col: "created_at", dir: "desc" } });
    return (data || []) as MayorCandidateApplication[];
  },

  updateMayorApplicationStatus: async (id: number, status: "approved" | "rejected") => {

    if (status === "approved") {
      const { data: app } = await dbSelect("mayor_candidate_applications", {
        filters: [{ col: "id", op: "eq", value: id }], single: true,
      });
      if (app) {
        await secureInsert("mayor_election", {
          candidate_username: app.username, description: app.program, bio: app.bio,
          created_by: "admin", votes: 0,
        });
        await store.addNotification(app.username, "Вашу кандидатуру на мера прийнято! Гравці можуть голосувати.");
      }
    } else {
      const { data: app } = await dbSelect<{ username: string }>("mayor_candidate_applications", {
        columns: "username", filters: [{ col: "id", op: "eq", value: id }], single: true,
      });
      if (app?.username) await store.addNotification(app.username, "Вашу заявку на мера відхилено.");
    }
    await dbUpdate("mayor_candidate_applications", { status }, { id: eq(id) });
  },

  addSosFull: async (
    reporterNick: string,
    violatorNick: string,
    reason: string,
    description: string,
    type: "raid" | "cheater" | "nrp" | "other" = "other",
  ): Promise<boolean> => {
    try {
      const payload = violatorNick
        ? `[${reporterNick} → порушник: ${violatorNick}] ${description}`
        : `[${reporterNick}] ${description}`;
      await secureInsert("sos_signals", {
        username: reporterNick, message: payload, type, status: "active",
      });
      return true;
    } catch (e) {
      console.error("addSosFull:", e);
      return false;
    }
  },

  buyHouseWithCR: async (
    houseId: number, username: string, _priceEUR: number, rentalDays = 24,
  ): Promise<{ ok: boolean; error?: string }> => {
    const password = (localStorage.getItem("crp_password") || sessionStorage.getItem("crp_password")) || "";
    if (!username || !password) return { ok: false, error: "Not logged in" };
    try {
      const res = await fetch("/api/balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nick: username, password,
          op: "buy_house",
          house_id: houseId,
          rental_days: rentalDays,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: json?.error || `HTTP ${res.status}` };
      await store.addNotification(username, `Будинок придбано за ${(json?.data?.cr_spent ?? 0).toLocaleString()} CR`);
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message || "Network error" };
    }
  },


  giveNftToUser: async (nick: string, nftId: string): Promise<boolean> => {
    try {
 
      const { data: existing } = await dbSelect("nft_owners", {
        columns: "nft_id",
        filters: [{ col: "owner_nick", op: "ilike", value: nick }, { col: "nft_id", op: "eq", value: nftId }],
        single: true,
      });
      if (existing) return true; 
      await secureInsert("nft_owners", { owner_nick: nick, nft_id: nftId });
      await store.addNotification(nick, "Ви отримали NFT-нагороду!");
      return true;
    } catch (e) {
      console.error("giveNftToUser:", e);
      return false;
    }
  },
};
