// =====================================================================
// AdminCookTab.tsx — вкладка адмін-панелі «Кухар»
// Підключення: див. README_COOK.md
// =====================================================================
import { useState, useEffect } from "react";
import { Plus, Trash2, Save, X } from "lucide-react";
import {
  Product, Recipe,
  getProducts, saveProducts,
  getRecipes, saveRecipes,
} from "../../lib/cookStore";

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
          className={`px-4 py-2 rounded-xl text-sm font-medium ${tab === "products" ? "bg-primary text-black" : "bg-white/5 text-white/70"}`}>
          Продукти ({products.length})
        </button>
        <button onClick={() => setTab("recipes")}
          className={`px-4 py-2 rounded-xl text-sm font-medium ${tab === "recipes" ? "bg-primary text-black" : "bg-white/5 text-white/70"}`}>
          Рецепти ({recipes.length})
        </button>
      </div>

      {tab === "products" ? (
        <ProductsEditor products={products} setProducts={setProducts} />
      ) : (
        <RecipesEditor recipes={recipes} setRecipes={setRecipes} products={products} />
      )}
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
      <button onClick={add} className="mb-3 px-4 py-2 rounded-xl bg-primary text-black font-semibold inline-flex items-center gap-2">
        <Plus className="w-4 h-4" /> Додати продукт
      </button>
      <div className="space-y-2">
        {products.map(p => (
          <div key={p.id} className="flex gap-2 items-center p-3 rounded-xl bg-white/5">
            <input value={p.icon} onChange={e => update(p.id, { icon: e.target.value })}
              className="w-14 text-center text-2xl bg-white/5 rounded-lg py-2" placeholder="🥕" />
            <input value={p.name} onChange={e => update(p.id, { name: e.target.value })}
              className="flex-1 bg-white/5 rounded-lg px-3 py-2 text-sm" placeholder="Назва" />
            <input type="number" value={p.price} onChange={e => update(p.id, { price: parseInt(e.target.value || "0") })}
              className="w-24 bg-white/5 rounded-lg px-3 py-2 text-sm" placeholder="Ціна" />
            <button onClick={() => remove(p.id)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg">
              <Trash2 className="w-4 h-4" />
            </button>
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
        <div className="flex gap-2">
          <input value={editing.icon || ""} onChange={e => setEditing({ ...editing, icon: e.target.value })}
            className="w-14 text-center text-2xl bg-white/5 rounded-lg py-2" placeholder="🍽" />
          <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })}
            className="flex-1 bg-white/5 rounded-lg px-3 py-2" placeholder="Назва страви" />
        </div>

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
          <div className="grid grid-cols-3 gap-2 max-w-[300px]">
            {editing.grid.map((pid, i) => (
              <select key={i} value={pid || ""}
                onChange={e => {
                  const g = [...editing.grid]; g[i] = e.target.value || null; setEditing({ ...editing, grid: g });
                }}
                className="aspect-square bg-white/5 rounded-xl text-sm text-white text-center">
                <option value="">—</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
              </select>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={saveEditing} className="px-4 py-2 rounded-xl bg-primary text-black font-semibold inline-flex items-center gap-2">
            <Save className="w-4 h-4" /> Зберегти
          </button>
          <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-xl bg-white/5 text-white inline-flex items-center gap-2">
            <X className="w-4 h-4" /> Скасувати
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button onClick={startNew} className="mb-3 px-4 py-2 rounded-xl bg-primary text-black font-semibold inline-flex items-center gap-2">
        <Plus className="w-4 h-4" /> Додати рецепт
      </button>
      <div className="space-y-2">
        {recipes.map(r => (
          <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
            <div className="text-2xl">{r.icon || "🍽"}</div>
            <div className="flex-1">
              <div className="text-white text-sm font-semibold">{r.name}</div>
              <div className="text-xs text-white/50">⏱ {Math.round(r.cookTimeMs / 1000)}с · +{r.reward} ₴</div>
            </div>
            <button onClick={() => setEditing(r)} className="text-xs px-3 py-1.5 rounded-lg bg-white/10 text-white">Змінити</button>
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
