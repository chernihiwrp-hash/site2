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



  // ── NEWS ────────────────────────────
