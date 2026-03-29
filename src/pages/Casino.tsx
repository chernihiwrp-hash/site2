import { useState, useEffect, useRef } from "react";
import { Zap, Gift, X, ShoppingBag, Diamond, Upload, Plus, Save } from "lucide-react";
import { toast } from "sonner";
import { getBalance, store, type NftGift } from "../lib/store";
import GradientButton from "../components/GradientButton";

// ─── МЕДІА ПЛЕЄР (TGS/JSON/IMG) ──────────────────────────────────────────
const GiftMedia = ({ url, className }: { url: string; className?: string }) => {
  const isAnimated = url.toLowerCase().includes(".tgs") || url.toLowerCase().includes(".json");
  if (isAnimated) {
    return (
      <div className={`${className} flex items-center justify-center`}>
        {/* @ts-ignore */}
        <dotlottie-player autoplay loop src={url} background="transparent" style={{ width: "100%", height: "100%" }} />
      </div>
    );
  }
  return <img src={url} className={`${className} object-contain`} alt="nft" />;
};

const Casino = () => {
  const nick = localStorage.getItem("crp_nick") || "";
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [balance, setBalance] = useState(() => getBalance(nick));
  const [gifts, setGifts] = useState<NftGift[]>([]);
  const [selectedGift, setSelectedGift] = useState<NftGift | null>(null);
  
  // Стан для форми додавання нового NFT
  const [isAdding, setIsAdding] = useState(false);
  const [newNft, setNewNft] = useState({ name: "", price: "", file: null as File | null });

  useEffect(() => {
    const load = async () => setGifts(await store.getNftGifts());
    load();
  }, []);

  // КНОПКА "ЗАВАНТАЖИТИ": ОБРОБКА ФАЙЛУ
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewNft({ ...newNft, name: file.name.split('.')[0], file: file });
      toast.success(`Файл ${file.name} вибрано`);
    }
  };

  // ЗБЕРЕЖЕННЯ (Емуляція додавання в базу)
  const saveNewNft = async () => {
    if (!newNft.name || !newNft.price || !newNft.file) {
      toast.error("Заповни всі поля та вибери файл!");
      return;
    }

    const giftToAdd: NftGift = {
      id: `nft-${Date.now()}`,
      name: newNft.name,
      price: Number(newNft.price),
      // ВАЖЛИВО: Ми прописуємо шлях так, ніби ти вже поклав файл у папку gifts
      image_url: `/gifts/${newNft.file.name}` 
    };

    // Тут ти зазвичай викликаєш store.addNft(giftToAdd)
    setGifts([giftToAdd, ...gifts]);
    setIsAdding(false);
    setNewNft({ name: "", price: "", file: null });
    
    toast.info("NFT додано! Не забудь покласти файл у папку public/gifts/");
  };

  return (
    <div className="min-h-screen pb-24 px-4 pt-6 bg-black text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-black italic uppercase tracking-tighter">Магазин<span className="text-primary">.</span></h1>
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-2xl">
          <Zap className="w-4 h-4 text-primary" />
          <span className="font-black">{balance} CR</span>
        </div>
      </div>

      {/* КНОПКА ВІДКРИТТЯ АДМІН-ФОРМИ */}
      <button 
        onClick={() => setIsAdding(!isAdding)}
        className="w-full mb-6 py-4 bg-primary/10 border border-primary/20 rounded-3xl flex items-center justify-center gap-2 text-primary font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all"
      >
        {isAdding ? <X size={16} /> : <Plus size={16} />}
        {isAdding ? "Скасувати" : "Додати нове NFT"}
      </button>

      {/* ФОРМА ДОДАВАННЯ (З'ЯВЛЯЄТЬСЯ ПО КЛІКУ) */}
      {isAdding && (
        <div className="mb-8 p-6 bg-zinc-900/50 border border-white/10 rounded-[2.5rem] animate-in slide-in-from-top-4 duration-300">
          <div className="space-y-4">
            <input 
              type="text" placeholder="Назва NFT" 
              className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3 text-sm focus:border-primary outline-none"
              value={newNft.name} onChange={(e) => setNewNft({...newNft, name: e.target.value})}
            />
            <input 
              type="number" placeholder="Ціна (CR)" 
              className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3 text-sm focus:border-primary outline-none"
              value={newNft.price} onChange={(e) => setNewNft({...newNft, price: e.target.value})}
            />
            
            {/* ПРИХОВАНИЙ INPUT ДЛЯ ФАЙЛУ */}
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept=".tgs,.json,.png,.jpg" />
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              className={`w-full py-3 rounded-2xl border-2 border-dashed transition-all flex items-center justify-center gap-2 ${newNft.file ? 'border-primary/50 text-primary' : 'border-white/10 text-zinc-500'}`}
            >
              <Upload size={18} />
              <span className="text-xs font-bold uppercase">{newNft.file ? newNft.file.name : "Вибрати .tgs файл"}</span>
            </button>

            <GradientButton variant="green" className="w-full py-4 rounded-2xl font-black uppercase text-[10px]" onClick={saveNewNft}>
              <Save size={16} className="mr-2" /> Зберегти в магазин
            </GradientButton>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-2 gap-4">
        {gifts.map((gift) => (
          <div key={gift.id} onClick={() => setSelectedGift(gift)} className="bg-zinc-900/40 border border-white/5 rounded-[2rem] p-4 flex flex-col items-center active:scale-95 transition-all">
            <div className="w-full aspect-square mb-3 bg-black/40 rounded-2xl flex items-center justify-center p-2">
              <GiftMedia url={gift.image_url} className="w-full h-full" />
            </div>
            <p className="text-[10px] font-black uppercase text-zinc-500 truncate w-full text-center">{gift.name}</p>
            <p className="text-primary font-black mt-1">{gift.price} CR</p>
          </div>
        ))}
      </div>

      {/* NFT Modal (як і раніше) */}
      {selectedGift && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl animate-in fade-in">
          <div className="w-full max-w-sm bg-zinc-900 border border-white/10 rounded-[3rem] p-8 relative text-center">
            <button onClick={() => setSelectedGift(null)} className="absolute top-6 right-6 text-white/20"><X /></button>
            <h2 className="text-2xl font-black italic mb-8 uppercase">{selectedGift.name}</h2>
            <div className="w-48 h-48 mx-auto mb-10"><GiftMedia url={selectedGift.image_url} className="w-full h-full" /></div>
            <GradientButton variant="green" className="w-full py-4 rounded-xl font-black uppercase text-xs" onClick={() => {toast.success("NFT придбано!"); setSelectedGift(null)}}>
              Купити за {selectedGift.price} CR
            </GradientButton>
          </div>
        </div>
      )}
    </div>
  );
};

export default Casino;
