// =====================================================================
// AdminCookTab.tsx — вкладка адмін-панелі «Кухар»
// Тепер поле «іконка» приймає emoji АБО URL картинки. Показується прев'ю.
// =====================================================================
import { useState, useEffect } from "react";
import { Plus, Trash2, Save, X, Image as ImageIcon } from "lucide-react";
import {
  Product, Recipe,
  getProducts, saveProducts,
  getRecipes, saveRecipes,
} from "../../lib/cookStore";
import CookIcon, { isImageSrc } from "../../components/CookIcon";

const uid = () => Math.random().toString(36).slice(2, 10);

export default function AdminCookTab() {
  const [tab, setTab] = useState<"products" | "recipes">("products");
  const [products, setProducts] = useState<Product[]>(getProducts());
  const [recipes, setRecipes]   = useState<Recipe[]>(getRecipes());

  useEffect(() => { saveProducts(products); }, [products]);
  useEffect(() => { saveRecipes(recipes); }, [recipes]);

  return (
    <div className="text-white">
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab("products")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === "products" ? "bg-primary text-black" : "bg-white/5 text-white/70 hover:bg-white/10"}`}>
          Продукти ({products.length})
        </button>
        <button onClick={() => setTab("recipes")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === "recipes" ? "bg-primary text-black" : "bg-white/5 text-white/70 hover:bg-white/10"}`}>
          Рецепти ({recipes.length})
        </button>
      </div>

      <div className="mb-3 text-[11px] text-white/50 flex items-center gap-1.5">
        <ImageIcon className="w-3.5 h-3.5" />
        У полі «іконка» можна ввести emoji (🥕) <b className="text-white/70">або вставити URL картинки</b> (https://…/img.png).
      </div>

      {tab === "products" ? (
        <ProductsEditor products={products} setProducts={setProducts} />
      ) : (
        <RecipesEditor recipes={recipes} setRecipes={setRecipes} products={products} />
      )}
    </div>
  );
}

function IconField({
  value, onChange, placeholder,
}: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-12 h-12 shrink-0 rounded-lg bg-white/5 flex items-center justify-center text-2xl overflow-hidden border border-white/5">
        <CookIcon value={value} size={40} fallback={<span className="text-white/30 text-xs">?</span>} />
      </div>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        className="flex-1 bg-white/5 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30"
        placeholder={placeholder || "🥕  або  https://…/img.png"}
      />
    </div>
  );
}

function ProductsEditor({ products, setProducts }: { products: Product[]; setProducts: (p: Product[]) => void }) {
  const add = () => setProducts([...products, { id: uid(), name: "Новий продукт", icon: "🥕", price: 10 }]);
  const update = (id: string, patch: Partial<Product>) =>
    setProducts(products.map(p => p.id === id ? { ...p, ...patch } : p));
  const remove = (id: string) => setProducts(products.filter(p => p.id !== id));

  return (
    <div>
      <button onClick={add} className="mb-3 px-4 py-2 rounded-xl bg-primary text-black font-semibold inline-flex items-center gap-2 hover:opacity-90 transition">
        <Plus className="w-4 h-4" /> Додати продукт
      </button>
      <div className="space-y-2">
        {products.map(p => (
          <div key={p.id} className="p-3 rounded-xl bg-white/5 space-y-2">
            <IconField value={p.icon} onChange={v => update(p.id, { icon: v })} />
            <div className="flex gap-2">
              <input value={p.name} onChange={e => update(p.id, { name: e.target.value })}
                className="flex-1 bg-white/5 rounded-lg px-3 py-2 text-sm" placeholder="Назва" />
              <input type="number" value={p.price} onChange={e => update(p.id, { price: parseInt(e.target.value || "0") })}
                className="w-24 bg-white/5 rounded-lg px-3 py-2 text-sm" placeholder="Ціна" />
              <button onClick={() => remove(p.id)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            {isImageSrc(p.icon) && (
              <div className="text-[10px] text-white/40 truncate">URL: {p.icon}</div>
            )}
          </div>
        ))}
        {products.length === 0 && <div className="text-white/40 text-sm text-center py-6">Немає продуктів</div>}
      </div>
    </div>
  );
}

function RecipesEditor({ recipes, setRecipes, products }: {
  recipes: Recipe[]; setRecipes: (r: Recipe[]) => void; products: Product[];
}) {
  const [editing, setEditing] = useState<Recipe | null>(null);

  const startNew = () => setEditing({
    id: uid(), name: "Нова страва", icon: "🍽", grid: Array(9).fill(null),
    cookTimeMs: 5000, reward: 100,
  });
  const saveEditing = () => {
    if (!editing) return;
    const exists = recipes.find(r => r.id === editing.id);
    setRecipes(exists ? recipes.map(r => r.id === editing.id ? editing : r) : [...recipes, editing]);
    setEditing(null);
  };
  const remove = (id: string) => setRecipes(recipes.filter(r => r.id !== id));

  if (editing) {
    return (
      <div className="space-y-3">
        <IconField
          value={editing.icon || ""}
          onChange={v => setEditing({ ...editing, icon: v })}
          placeholder="🍽  або  https://…/dish.png"
        />
        <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })}
          className="w-full bg-white/5 rounded-lg px-3 py-2" placeholder="Назва страви" />

        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-white/60">
            Час приготування (сек)
            <input type="number" value={Math.round(editing.cookTimeMs / 1000)}
              onChange={e => setEditing({ ...editing, cookTimeMs: parseInt(e.target.value || "0") * 1000 })}
              className="w-full bg-white/5 rounded-lg px-3 py-2 mt-1 text-white text-sm" />
          </label>
          <label className="text-xs text-white/60">
            Винагорода (₴)
            <input type="number" value={editing.reward}
              onChange={e => setEditing({ ...editing, reward: parseInt(e.target.value || "0") })}
              className="w-full bg-white/5 rounded-lg px-3 py-2 mt-1 text-white text-sm" />
          </label>
        </div>

        <div>
          <div className="text-xs text-white/60 mb-2">Сітка 3×3 — оберіть продукт для кожної клітинки:</div>
          <div className="grid grid-cols-3 gap-2 max-w-[320px]">
            {editing.grid.map((pid, i) => {
              const p = pid ? products.find(x => x.id === pid) : null;
              return (
                <div key={i} className="aspect-square bg-white/5 rounded-xl flex flex-col items-center justify-center p-1 gap-1">
                  <div className="flex items-center justify-center h-8">
                    {p ? <CookIcon value={p.icon} size={28} className="text-2xl" /> : <span className="text-white/20 text-xl">—</span>}
                  </div>
                  <select value={pid || ""}
                    onChange={e => {
                      const g = [...editing.grid]; g[i] = e.target.value || null; setEditing({ ...editing, grid: g });
                    }}
                    className="w-full bg-black/40 rounded-md text-[10px] text-white text-center py-1 border border-white/5">
                    <option value="">—</option>
                    {products.map(pp => <option key={pp.id} value={pp.id}>{pp.name}</option>)}
                  </select>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={saveEditing} className="px-4 py-2 rounded-xl bg-primary text-black font-semibold inline-flex items-center gap-2 hover:opacity-90 transition">
            <Save className="w-4 h-4" /> Зберегти
          </button>
          <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-xl bg-white/5 text-white inline-flex items-center gap-2 hover:bg-white/10 transition">
            <X className="w-4 h-4" /> Скасувати
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button onClick={startNew} className="mb-3 px-4 py-2 rounded-xl bg-primary text-black font-semibold inline-flex items-center gap-2 hover:opacity-90 transition">
        <Plus className="w-4 h-4" /> Додати рецепт
      </button>
      <div className="space-y-2">
        {recipes.map(r => (
          <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
            <div className="w-10 h-10 flex items-center justify-center">
              <CookIcon value={r.icon || "🍽"} size={36} className="text-2xl" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-semibold truncate">{r.name}</div>
              <div className="text-xs text-white/50">⏱ {Math.round(r.cookTimeMs / 1000)}с · +{r.reward} ₴</div>
            </div>
            <button onClick={() => setEditing(r)} className="text-xs px-3 py-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition">Змінити</button>
            <button onClick={() => remove(r.id)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {recipes.length === 0 && <div className="text-white/40 text-sm text-center py-6">Немає рецептів</div>}
      </div>
    </div>
  );
}
