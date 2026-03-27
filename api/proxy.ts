export default async function handler(req: any, res: any) {
  // ... твій код перевірки origin ...

  const { table, chain } = req.body;
  const SUPABASE_URL = "https://kafivvwxqulxmkpyqinz.supabase.co";
  
  // Змінюємо назву змінної на ZYNX_SERVICE_KEY
  const SERVICE_KEY = process.env.ZYNX_SERVICE_KEY; 

  if (!SERVICE_KEY) {
    // Додаємо вивід усіх ключів (без значень!), щоб зрозуміти, що бачить сервер
    const keys = Object.keys(process.env).join(", ");
    console.error(`❌ Доступні ключі: ${keys}`);
    return res.status(500).json({ error: "ZYNX_SERVICE_KEY not found" });
  }
  // ... решта коду ...
