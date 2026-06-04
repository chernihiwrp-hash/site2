// =====================================================================
// AdminCookTab.tsx — вкладка адмін-панелі «Кухар».
// • Дані зберігаються у БД (cook_products / cook_recipes), а не локально.
// • GUI: списки картками, модальний редактор, явні кнопки «Зберегти/Скасувати»,
//   індикатор збереження, валідація, пошук, інтерактивний 3×3 палітра.
// • Валюта — CR (users.balance), а не ₴.
// =====================================================================
import { useEffect, useState, useMemo } from "react";
import {
  Plus, Trash2, Save, X, Image as ImageIcon, Pencil, Search,
  Loader2, RefreshCw, Coins, Clock,
} from "lucide-react";
import {
  Product, Recipe,
  fetchCookData, getProducts, getRecipes,
  adminUpsertProduct, adminDeleteProduct,
  adminUpsertRecipe, adminDeleteRecipe,
} from "../../lib/cookStore";
import CookIcon, { isImageSrc } from "../../components/CookIcon";

const uid = () => Math.random().toString(36).slice(2, 10);

export default function AdminCookTab() {
  const [tab, setTab] = useState<"products" | "recipes">("products");
  const [products, setProducts] = useState<Product[]>([]);
  const [recipes, setRecipes]   = useState<Recipe[]>([]);
  const [loading, setLoading]   = useState(false);

  const refresh = async () => {
    setLoading(true);
    const { products: ps, recipes: rs } = await fetchCookData();
    setProducts(ps); setRecipes(rs);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    const onData = () => { setProducts(getProducts()); setRecipes(getRecipes()); };
    window.addEventListener("cook:data", onData);
    return () => window.removeEventListener("cook:data", onData);
  }, []);

  return (
    <div className="text-white">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex gap-2">
          <button onClick={() => setTab("products")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === "products" ? "bg-primary text-black" : "bg-white/5 text-white/70 hover:bg-white/10"}`}>
            Продукти ({products.length})
          </button>
          <button onClick={() => setTab("recipes")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === "recipes" ? "bg-primary text-black" : "bg-white/5 text-white/70 hover:bg-white/10"}`}>
            Рецепти ({recipes.length})
          </button>
        </div>
        <button onClick={refresh} disabled={loading}
          className="p-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 transition disabled:opacity-50">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </button>
      </div>

      <div className="mb-3 text-[11px] text-white/50 flex items-center gap-1.5">
        <ImageIcon className="w-3.5 h-3.5" />
        У полі «іконка» можна ввести emoji (🥕) <b className="text-white/70">або URL картинки</b>. Зміни зберігаються у БД.
      </div>

      {tab === "products" ? (
        <ProductsEditor products={products} />
      ) : (
        <RecipesEditor recipes={recipes} products={products} />
      )}
    </div>
  );
}

// ---------- маленькі поля ----------
function IconField({
  value, onChange, placeholder,
}: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-12 h-12 shrink-0 rounded-lg bg-white/5 flex items-center justify-center text-2xl overflow-hidden border border-white/10">
        <CookIcon value={value} size={40} fallback={<span className="text-white/30 text-xs">?</span>} />
      </div>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        className="flex-1 bg-white/5 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:bg-white/10 transition"
        placeholder={placeholder || "🥕  або  https://…/img.png"}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[11px] uppercase tracking-wider text-white/50 mb-1">{label}</div>
      {children}
    </label>
  );
}

// ============================ ПРОДУКТИ ============================
function ProductsEditor({ products }: { products: Product[] }) {
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(
    () => products.filter(p => p.name.toLowerCase().includes(query.toLowerCase())),
    [products, query]
  );

  const startNew = () => {
    setEditing({ id: uid(), name: "", icon: "🥕", price: 10 });
    setCreating(true);
  };
  const startEdit = (p: Product) => { setEditing({ ...p }); setCreating(false); };
  const closeEdit = () => { setEditing(null); setCreating(false); };

  const save = async () => {
    if (!editing) return;
    if (!editing.name.trim()) return;
    setBusyId(editing.id);
    const ok = await adminUpsertProduct(editing, products.length);
    setBusyId(null);
    if (ok) closeEdit();
  };

  const remove = async (id: string) => {
    if (!confirm("Видалити продукт?")) return;
    setBusyId(id);
    await adminDeleteProduct(id);
    setBusyId(null);
  };

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <button onClick={startNew}
          className="px-4 py-2 rounded-xl bg-primary text-black font-semibold inline-flex items-center gap-2 hover:opacity-90 transition active:scale-95">
          <Plus className="w-4 h-4" /> Додати продукт
        </button>
        <div className="flex-1 flex items-center gap-2 bg-white/5 rounded-xl px-3">
          <Search className="w-4 h-4 text-white/40" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Пошук…"
            className="flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-white/30" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-white/40 text-sm text-center py-10 rounded-xl bg-white/[0.02] border border-white/5">
          {products.length === 0 ? "Немає продуктів — додайте перший" : "Нічого не знайдено"}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {filtered.map(p => (
            <div key={p.id}
              className="group p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/5 flex items-center gap-3 transition">
              <div className="w-12 h-12 shrink-0 rounded-lg bg-black/40 flex items-center justify-center">
                <CookIcon value={p.icon} size={40} className="text-3xl" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{p.name}</div>
                <div className="text-[11px] text-[hsl(84_81%_65%)] flex items-center gap-1 mt-0.5">
                  <Coins className="w-3 h-3" /> {p.price.toLocaleString()} CR
                </div>
                {isImageSrc(p.icon) && <div className="text-[10px] text-white/30 truncate mt-0.5">{p.icon}</div>}
              </div>
              <button onClick={() => startEdit(p)}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 transition active:scale-90">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => remove(p.id)} disabled={busyId === p.id}
                className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition disabled:opacity-50">
                {busyId === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </button>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <EditorModal
          title={creating ? "Новий продукт" : "Редагувати продукт"}
          onClose={closeEdit}
          onSave={save}
          busy={busyId === editing.id}
          canSave={editing.name.trim().length > 0 && editing.price >= 0}>
          <Field label="Іконка">
            <IconField value={editing.icon} onChange={v => setEditing({ ...editing, icon: v })} />
          </Field>
          <Field label="Назва">
            <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })}
              className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:bg-white/10"
              placeholder="Помідор" />
          </Field>
          <Field label="Ціна (CR)">
            <input type="number" min={0} value={editing.price}
              onChange={e => setEditing({ ...editing, price: Math.max(0, parseInt(e.target.value || "0")) })}
              className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:bg-white/10" />
          </Field>
        </EditorModal>
      )}
    </div>
  );
}

// ============================ РЕЦЕПТИ ============================
function RecipesEditor({ recipes, products }: { recipes: Recipe[]; products: Product[] }) {
  const [editing, setEditing] = useState<Recipe | null>(null);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [palette, setPalette] = useState<string | null>(null); // id продукту для перетягування

  const startNew = () => {
    setEditing({ id: uid(), name: "", icon: "🍽", grid: Array(9).fill(null), cookTimeMs: 5000, reward: 100 });
    setCreating(true);
    setPalette(products[0]?.id ?? null);
  };
  const startEdit = (r: Recipe) => {
    setEditing({ ...r, grid: [...r.grid] });
    setCreating(false);
    setPalette(products[0]?.id ?? null);
  };
  const close = () => { setEditing(null); setCreating(false); };

  const save = async () => {
    if (!editing) return;
    if (!editing.name.trim()) return;
    setBusyId(editing.id);
    const ok = await adminUpsertRecipe(editing, recipes.length);
    setBusyId(null);
    if (ok) close();
  };

  const remove = async (id: string) => {
    if (!confirm("Видалити рецепт?")) return;
    setBusyId(id);
    await adminDeleteRecipe(id);
    setBusyId(null);
  };

  const paintCell = (i: number) => {
    if (!editing) return;
    const g = [...editing.grid];
    g[i] = g[i] === palette ? null : palette; // повторне натискання — стерти
    setEditing({ ...editing, grid: g });
  };
  const clearGrid = () => editing && setEditing({ ...editing, grid: Array(9).fill(null) });

  const productById = (id: string | null) => id ? products.find(p => p.id === id) : null;

  return (
    <div>
      <button onClick={startNew}
        className="mb-3 px-4 py-2 rounded-xl bg-primary text-black font-semibold inline-flex items-center gap-2 hover:opacity-90 transition active:scale-95">
        <Plus className="w-4 h-4" /> Додати рецепт
      </button>

      {recipes.length === 0 ? (
        <div className="text-white/40 text-sm text-center py-10 rounded-xl bg-white/[0.02] border border-white/5">
          Немає рецептів
        </div>
      ) : (
        <div className="space-y-2">
          {recipes.map(r => {
            const counts: Record<string, number> = {};
            r.grid.forEach(g => { if (g) counts[g] = (counts[g] || 0) + 1; });
            return (
              <div key={r.id} className="p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/5 transition">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 flex items-center justify-center bg-black/40 rounded-lg">
                    <CookIcon value={r.icon || "🍽"} size={40} className="text-3xl" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{r.name}</div>
                    <div className="text-[11px] text-white/50 flex items-center gap-3 mt-0.5">
                      <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {Math.round(r.cookTimeMs / 1000)}с</span>
                      <span className="inline-flex items-center gap-1 text-[hsl(84_81%_65%)]"><Coins className="w-3 h-3" /> +{r.reward.toLocaleString()} CR</span>
                    </div>
                  </div>
                  <button onClick={() => startEdit(r)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 transition active:scale-90">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => remove(r.id)} disabled={busyId === r.id}
                    className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition disabled:opacity-50">
                    {busyId === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
                {Object.keys(counts).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">

                    {Object.entries(counts).map(([pid, q]) => {
                      const p = products.find(x => x.id === pid);
                      return (
                        <div key={pid} className="text-[10px] text-white/60 px-2 py-0.5 rounded-md bg-white/5 inline-flex items-center gap-1">
                          <CookIcon value={p?.icon} size={12} className="text-xs" /> {p?.name || "?"} ×{q}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <EditorModal
          title={creating ? "Новий рецепт" : "Редагувати рецепт"}
          onClose={close}
          onSave={save}
          busy={busyId === editing.id}
          canSave={editing.name.trim().length > 0}
          wide>
          <Field label="Іконка страви">
            <IconField value={editing.icon || ""} onChange={v => setEditing({ ...editing, icon: v })}
              placeholder="🍽  або  https://…/dish.png" />
          </Field>
          <Field label="Назва страви">
            <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })}
              className="w-full bg-white/5 rounded-lg px-3 py-2 outline-none focus:bg-white/10" placeholder="Борщ" />
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Час (сек)">
              <input type="number" min={1} value={Math.round(editing.cookTimeMs / 1000)}
                onChange={e => setEditing({ ...editing, cookTimeMs: Math.max(500, parseInt(e.target.value || "0") * 1000) })}
                className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:bg-white/10" />
            </Field>
            <Field label="Винагорода (CR)">
              <input type="number" min={0} value={editing.reward}
                onChange={e => setEditing({ ...editing, reward: Math.max(0, parseInt(e.target.value || "0")) })}
                className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:bg-white/10" />
            </Field>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] uppercase tracking-wider text-white/50">Сітка 3×3 — клікніть клітинку</div>
              <button onClick={clearGrid} className="text-[11px] text-white/50 hover:text-white px-2 py-0.5 rounded bg-white/5">Очистити</button>
            </div>

            {products.length === 0 ? (
              <div className="text-white/40 text-xs py-4 text-center bg-white/5 rounded-lg">
                Спочатку додайте продукти у вкладці «Продукти»
              </div>
            ) : (
              <>
                {/* Палітра продуктів */}
                <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3">
                  {products.map(p => (
                    <button key={p.id} onClick={() => setPalette(p.id)}
                      className={`shrink-0 w-14 h-16 rounded-lg flex flex-col items-center justify-center transition active:scale-90 ${palette === p.id ? "ring-2 ring-primary" : ""}`}
                      style={{
                        background: palette === p.id ? "hsl(84 81% 44% / .12)" : "hsl(0 0% 100% / .04)",
                        border: "1px solid hsl(0 0% 100% / .06)",
                      }}>
                      <CookIcon value={p.icon} size={28} className="text-2xl" />
                      <div className="text-[9px] text-white/60 mt-0.5 truncate w-full text-center px-1">{p.name}</div>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-2 max-w-[320px]">
                  {editing.grid.map((pid, i) => {
                    const p = productById(pid);
                    return (
                      <button key={i} onClick={() => paintCell(i)}
                        className="aspect-square rounded-xl flex items-center justify-center transition active:scale-90 hover:bg-white/5"
                        style={{
                          background: p ? "hsl(84 81% 44% / .08)" : "hsl(0 0% 100% / .03)",
                          border: p ? "1px solid hsl(84 81% 44% / .4)" : "1px dashed hsl(0 0% 100% / .1)",
                        }}>
                        {p ? <CookIcon value={p.icon} size={32} className="text-2xl" />
                           : <span className="text-white/20 text-lg">+</span>}
                      </button>
                    );
                  })}
                </div>
                <div className="text-[10px] text-white/40 mt-2">
                  Виберіть продукт у палітрі, потім клікайте клітинки. Повторний клік очищує клітинку.
                </div>
              </>
            )}
          </div>
        </EditorModal>
      )}
    </div>
  );
}

// ============================ Модалка-редактор ============================
function EditorModal({
  title, onClose, onSave, busy, canSave, wide, children,
}: {
  title: string;
  onClose: () => void;
  onSave: () => void;
  busy: boolean;
  canSave: boolean;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,.7)", backdropFilter: "blur(8px)" }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className={`w-full ${wide ? "max-w-lg" : "max-w-md"} rounded-t-3xl sm:rounded-3xl p-5 max-h-[90vh] overflow-y-auto`}
        style={{ background: "linear-gradient(160deg, #181818, #0c0c0c)", border: "1px solid hsl(0 0% 100% / 0.08)" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="text-white font-bold tracking-wide">{title}</div>
          <button onClick={onClose}><X className="w-5 h-5 text-white/60" /></button>
        </div>
        <div className="space-y-3">{children}</div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-white/5 text-white/80 hover:bg-white/10 transition active:scale-95">
            Скасувати
          </button>
          <button onClick={onSave} disabled={busy || !canSave}
            className="flex-[2] py-3 rounded-xl bg-primary text-black font-bold inline-flex items-center justify-center gap-2 hover:opacity-90 transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {busy ? "Зберігаємо…" : "Зберегти"}
          </button>
        </div>
      </div>
    </div>
  );
}
