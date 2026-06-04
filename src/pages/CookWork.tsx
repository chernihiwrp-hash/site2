// =====================================================================
// CookWork.tsx — сторінка «Робота» для фракції Кухар (/cook-work)
// =====================================================================
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShoppingBag, BookOpen, X, Plus, Minus, Sparkles, CheckCircle2 } from "lucide-react";
import {
  Product, Recipe,
  fetchCookData, getProducts, getRecipes,
  getInventory, addToInventory, removeFromInventory,
  fetchBalance, buyProduct, earnRecipe,
  matchRecipe, isCook,
} from "../lib/cookStore";
import CookingModal from "../components/CookingModal";
import CookIcon from "../components/CookIcon";

const MARBLE_URL =
  "https://img.freepik.com/free-photo/top-view-greens-vegetables-with-pepper-grey-space_140725-97965.jpg?semt=ais_hybrid&w=740&q=80";

const glass: React.CSSProperties = {
  background:
    "linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 60%, rgba(255,255,255,0.08) 100%)",
  border: "1px solid rgba(255,255,255,0.18)",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.25), 0 10px 30px rgba(0,0,0,0.45)",
  backdropFilter: "blur(22px) saturate(160%)",
  WebkitBackdropFilter: "blur(22px) saturate(160%)" as any,
};

const glassStrong: React.CSSProperties = {
  ...glass,
  background:
    "linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.05) 55%, rgba(255,255,255,0.10) 100%)",
};

export default function CookWork() {
  const nav = useNavigate();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [recipes, setRecipes]   = useState<Recipe[]>([]);
  const [inv, setInv]           = useState(getInventory());
  const [money, setMoney]       = useState(0);

  const [grid, setGrid] = useState<(string | null)[]>(Array(9).fill(null));
  const [activeCell, setActiveCell] = useState<number | null>(null);
  const [lastFilledCell, setLastFilledCell] = useState<number | null>(null);

  const [shopOpen, setShopOpen]       = useState(false);
  const [recipesOpen, setRecipesOpen] = useState(false);
  const [cooking, setCooking]         = useState<Recipe | null>(null);
  const [targetRecipe, setTargetRecipe] = useState<Recipe | null>(null); // Обраний рецепт для підказки
  
  const [floaters, setFloaters]       = useState<{ id: number; text: string; type: "earn" | "spend" }[]>([]);
  const floaterId = useRef(0);

  useEffect(() => { isCook().then(setAllowed); }, []);

  useEffect(() => {
    (async () => {
      const { products: ps, recipes: rs } = await fetchCookData();
      setProducts(ps); setRecipes(rs);
      setMoney(await fetchBalanc
