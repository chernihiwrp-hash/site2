import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://kafivvwxqulxmkpyqinz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthZml2dnd4cXVseG1rcHlxaW56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyOTgyNDIsImV4cCI6MjA4OTg3NDI0Mn0.HD_Gxn5UIVxov0-7U4aVhtYXhGvYTsVqLlycE5ctBpg";
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

// Залишаємо тільки цей тип, він тепер універсальний
export type NftGift = {
  id: string;
  name: string;
  price: number;
  image_url: string;
  sold?: boolean;
  created_at?: string;
};

// Тип OwnedGift можна видаляти, він більше не використовується
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

  /**
   * Отримує список усіх доступних NFT-подарунків для відображення в магазині.
   */
  getNftGifts: async (): Promise<NftGift[]> => {
    const { data, error } = await supabase
      .from("nft_gifts")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Помилка завантаження NFT:", error.message);
      return [];
    }
    return (data || []) as NftGift[];
  },

  /**
   * Додає новий NFT-подарунок у базу даних (використовується в адмін-панелі).
   */
  addNftGift: async (name: string, price: number, imageUrl: string) => {
    const { error } = await supabase.from("nft_gifts").insert({
      name,
      price,
      image_url: imageUrl
    });
    
    if (error) throw new Error(error.message);
    return true;
  },

  /**
   * Перемикає статус sold для NFT (true/false).
   */
  toggleNftSold: async (id: string, sold: boolean): Promise<boolean> => {
    const { error } = await supabase
      .from("nft_gifts")
      .update({ sold })
      .eq("id", id);
    if (error) { console.error("toggleNftSold error:", error.message); return false; }
    return true;
  },

  /**
   * Обробляє купівлю NFT: перевіряє баланс, списує гроші та додає запис у nft_owners.
   */
  buyNftGift: async (nick: string, gift: NftGift): Promise<boolean> => {
    try {
      const balance = getBalance(nick);
      if (balance < gift.price) return false;

      // 1. Списуємо баланс локально (localStorage)
      const success = subtractBalance(nick, gift.price);
      
      if (success) {
        // 2. Додаємо запис про власника в окрему таблицю nft_owners
        const { error: insertError } = await supabase
          .from("nft_owners")
          .insert({
            owner_nick: nick,
            nft_id: gift.id
          });

        if (insertError) {
          console.error("Помилка БД при купівлі:", insertError.message);
          // Повертаємо баланс назад у localStorage, якщо запис у БД зірвався
          addBalance(nick, gift.price);
          return false;
        }

        // 3. Оновлюємо баланс у таблиці users в Supabase для синхронізації
        await supabase
          .from("users")
          .update({ balance: balance - gift.price })
          .ilike("username", nick);
          
        return true;
      }
      return false;
    } catch (e) {
      console.error("Критична помилка при купівлі NFT:", e);
      return false;
    }
  },

  /**
   * Повертає список куплених NFT для конкретного гравця (через таблицю nft_owners).
   */
  getUserGifts: async (nick: string): Promise<NftGift[]> => {
    try {
      // 1. Отримуємо ID всіх подарунків, які належать цьому ніку
      const { data: owners, error: ownerError } = await supabase
        .from("nft_owners")
        .select("nft_id")
        .eq("owner_nick", nick);

      if (ownerError || !owners || owners.length === 0) return [];

      const giftIds = owners.map(o => o.nft_id);

      // 2. Дістаємо повні дані (назву, ціну, картинку) цих NFT з головної таблиці
      const { data: nfts, error: nftError } = await supabase
        .from("nft_gifts")
        .select("*")
        .in("id", giftIds);

      if (nftError) {
        console.error("Помилка отримання даних NFT:", nftError.message);
        return [];
      }
      
      return (nfts || []) as NftGift[];
    } catch (e) {
      console.error("Помилка getUserGifts:", e);
      return [];
    }
  },

  /**
   * Видаляє NFT з магазину (використовується в адмін-панелі).
   */
  deleteNftGift: async (id: string) => {
    // При видаленні NFT з магазину, записи в nft_owners видаляться автоматично, 
    // якщо ти налаштував CASCADE DELETE у Supabase.
    const { error } = await supabase.from("nft_gifts").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return true;
  },
  // ── LICENSES & PLATES (ДОБАВЛЯЕМ НОВОЕ, НЕ УДАЛЯЯ СТАРОЕ) ──────────────────
  
  getLicenseApplications: async (): Promise<LicenseApplication[]> => {
    const { data } = await supabase
      .from("license_applications")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (!data) return [];
    return data.map((r: any) => ({
      id: r.id,
      username: r.username,
      license_type: r.license_type,
      status: r.status,
      date: new Date(r.created_at).toLocaleDateString("uk-UA")
    }));
  },

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
  getHouses: async (username?: string): Promise<HouseItem[]> => {
    // 1. Отримуємо всі будинки
    const { data: housesData } = await supabase.from("houses").select("*").order("created_at", { ascending: false });
    if (!housesData) return [];

    const allHouses = housesData.map((r: Record<string, unknown>) => ({
      id: r.id as number,
      name: r.name as string,
      price: r.price as number,
      desc: (r.description as string) || "",
      category: (r.category as string) || "Люкс",
      owner: (r.owner_username as string) || null,
      image: (r.image_url as string) || undefined,
      photos: r.image_url ? [r.image_url as string] : [],
      rental_days: 0, 
    }));

    // 2. Якщо передано username, шукаємо дні оренди в схвалених заявках
    if (username) {
      const { data: requests } = await supabase
        .from("house_purchase_requests")
        .select("house_id, rental_days")
        .eq("username", username)
        .eq("status", "approved");

      if (requests && requests.length > 0) {
        const rentalMap = new Map(requests.map(req => [req.house_id, req.rental_days]));
        return allHouses.map(h => ({
          ...h,
          rental_days: rentalMap.get(h.id) || 0
        }));
      }
    }

    return allHouses;
  },

// ── CAR PLATES ─────────────────────────────────────────────────────────────
  getCarPlates: async (nick: string) => {
    try {
      const { data, error } = await supabase
        .from("car_plates")
        .select("*")
        .eq("username", nick); // ИСПОЛЬЗУЕМ username ИЗ ТВОЕЙ ТАБЛИЦЫ

      if (error) {
        console.error("Помилка БД car_plates:", error.message);
        return [];
      }
      return data || [];
    } catch (e) {
      console.error("Критична помилка getCarPlates:", e);
      return [];
    }
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
    if (error) console.error("submitHousePurchase error:", error.message);
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
      rental_days: (r.rental_days as number) || 7, // додаємо сюди теж
    }));
  },

  updateHousePurchaseStatus: async (id: number, status: "approved" | "rejected", houseId?: number, username?: string) => {
    // Оновлюємо статус заявки
    await supabase.from("house_purchase_requests").update({ status }).eq("id", id);
    
    // Якщо схвалено — оновлюємо власника будинку
    if (status === "approved" && houseId && username) {
      await supabase.from("houses").update({ 
        owner_username: username, 
        is_for_sale: false 
      }).eq("id", houseId);
      
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

  // ── CITY VOICE ──
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
      status: r.status === "pending" ? "active" : r.status,
    }));
  },

  incrementCityVoiceLikes: async (id: number) => {
    const { data } = await supabase.from("city_voice").select("likes").eq("id", id).single();
    await supabase.from("city_voice").update({ likes: (data?.likes || 0) + 1 }).eq("id", id);
  },

  decrementCityVoiceLikes: async (id: number) => {
    const { data } = await supabase.from("city_voice").select("likes").eq("id", id).single();
    await supabase.from("city_voice").update({ likes: Math.max(0, (data?.likes || 0) - 1) }).eq("id", id);
  },

  incrementCityVoiceDislikes: async (id: number) => {
    const { data } = await supabase.from("city_voice").select("dislikes").eq("id", id).single();
    await supabase.from("city_voice").update({ dislikes: (data?.dislikes || 0) + 1 }).eq("id", id);
  },

  decrementCityVoiceDislikes: async (id: number) => {
    const { data } = await supabase.from("city_voice").select("dislikes").eq("id", id).single();
    await supabase.from("city_voice").update({ dislikes: Math.max(0, (data?.dislikes || 0) - 1) }).eq("id", id);
  },

  submitCityVoice: async (author: string, text: string, type: "idea" | "petition") => {
    await supabase.from("city_voice").insert({ username: author, message: text, type, status: "pending", likes: 0, dislikes: 0 });
  },

  updateCityVoiceStatus: async (id: number, status: "approved" | "rejected") => {
    await supabase.from("city_voice").update({ status }).eq("id", id);
  },

  deleteCityVoice: async (id: number) => { await supabase.from("city_voice").delete().eq("id", id); },
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


  getCars: async (nick?: string): Promise<CarRecord[]> => {
    let query = supabase
      .from("car_plates")
      .select("*")
      .eq("status", "approved");
      
    if (nick) {
      query = query.eq("username", nick); 
    }

    const { data, error } = await query;
      
    if (error) {
      console.error("Ошибка в getCars:", error.message);
      return [];
    }
    
    return data.map((r: any) => ({
      plate: r.plate_number,
      model: r.car_model || "Транспорт",
      owner: r.username, 
    }));
  },

  submitLicense: async (username: string, licenseType: string) => {
    const { error } = await supabase.from("license_applications").insert({
      username, 
      license_type: licenseType,
      status: "pending",
    });
    if (error) { console.error("submitLicense error:", error); throw new Error(error.message); }
  },

  submitCarPlate: async (username: string, model: string, plate: string) => {
    const { error } = await supabase.from("car_plates").insert({
      username,
      plate_number: plate,
      car_model: model,
      status: "pending",
    });
    if (error) { console.error("submitCarPlate error:", error); throw new Error(error.message); }
  },

  updateLicenseStatus: async (id: number, status: "approved" | "rejected") => {
    await supabase.from("license_applications").update({ status }).eq("id", id);
  },


  updateCarPlateStatus: async (id: number, status: "approved" | "rejected") => {
    await supabase.from("car_plates").update({ status }).eq("id", id);
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
    const { data: user } = await supabase
      .from("users").select("balance").ilike("username", nick).maybeSingle();
    
    const currentBalance = (user?.balance as number) || 0;
    const newBalance = currentBalance + amount;

    const { error } = await supabase
      .from("users").update({ balance: newBalance }).ilike("username", nick);

    if (error) { console.error("giveTokens error:", error); return false; }

    setBalance(nick, newBalance);
    await store.addNotification(nick, `Вам нараховано ${amount} CR від адміністрації!`);
    return true;
  },

  takeTokens: async (nick: string, amount: number): Promise<boolean> => {
    const { data: user } = await supabase
      .from("users").select("balance").ilike("username", nick).maybeSingle();

    const currentBalance = (user?.balance as number) || 0;
    if (currentBalance < amount) return false;

    const newBalance = currentBalance - amount;

    const { error } = await supabase
      .from("users").update({ balance: newBalance }).ilike("username", nick);

    if (error) { console.error("takeTokens error:", error); return false; }

    setBalance(nick, newBalance);
 
    await store.addNotification(nick, `З вашого балансу списано ${amount} CR.`);
    return true;
  },

  // ── THEMES ────────────────────────────────────────────────────────────────
  getOwnedThemes: async (nick: string): Promise<string[]> => {
    const { data, error } = await supabase
      .from("users")
      .select("owned_themes")
      .ilike("username", nick)
      .maybeSingle();
    
    if (error || !data || !data.owned_themes) {
      return ["lime"]; 
    }
    return data.owned_themes;
  },

  saveBoughtTheme: async (nick: string, themeId: string) => {
    const currentThemes = await store.getOwnedThemes(nick);
    if (!currentThemes.includes(themeId)) {
      const newThemes = [...currentThemes, themeId];
      
      const { error } = await supabase
        .from("users")
        .update({ owned_themes: newThemes })
        .ilike("username", nick);
        
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
    return {
      citizens: usersRes.count || 0,
      houses: housesRes.count || 0,
      factions: factionsRes.count || 0,
    };
  },
  setPulse: (_: { citizens: number; houses: number; factions: number }) => {},

  // ── PROFILE DATA ──────────────────────────────────────────────────────────
  getPlayerProfile: async (nick: string) => {
    const [houseRes, factionRes, licRes, platesRes] = await Promise.all([
      // Отримуємо запити на будинки разом із датою створення та rental_days
      supabase
        .from("house_purchase_requests")
        .select(`
          id,
          rental_days,
          created_at,
          house_id
        `)
        .eq("username", nick)
        .eq("status", "approved"),

      supabase.from("faction_applications").select("faction_name, status").eq("username", nick).order("created_at", { ascending: false }),
      supabase.from("license_applications").select("id, license_type, status").eq("username", nick).eq("status", "approved"),
      supabase.from("car_plates").select("id, plate_number, car_model, status").eq("username", nick).eq("status", "approved"),
    ]);

    // Оскільки JOIN може видавати 404, якщо не налаштовані зв'язки, 
    // краще отримати дані будинків окремим запитом, якщо є схвалені заявки
    let housesWithDetails = [];
    if (houseRes.data && houseRes.data.length > 0) {
      const houseIds = houseRes.data.map(h => h.house_id);
      const { data: housesData } = await supabase
        .from("houses")
        .select("id, name, price, image_url")
        .in("id", houseIds);

      housesWithDetails = houseRes.data.map((req: any) => {
        const details = housesData?.find(d => d.id === req.house_id);
        return {
          id: req.id,
          name: details?.name || "Будинок",
          price: details?.price || 0,
          rental_days: req.rental_days || 7,
          created_at: req.created_at, // ПЕРЕДАЄМО ДАТУ ДЛЯ РОЗРАХУНКУ
          image: details?.image_url 
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
