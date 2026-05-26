import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { loadSavedTheme } from "./pages/Shop";

// ─── PASSWORD PERSISTENCE ────────────────────────────────────────────────────
// Раньше пароль хранился только в sessionStorage и стирался при закрытии Telegram/вкладки —
// из-за этого пользователю КАЖДЫЙ раз приходилось его вводить заново.
// Решение: зеркалим ключ `crp_password` между sessionStorage и localStorage.
// Сам пароль на сервере проверяется через bcrypt + rate-limit, поэтому
// хранение в localStorage в Telegram WebApp (изолированный origin) не ухудшает
// поверхность атаки сильнее, чем sessionStorage.
(function persistPassword() {
  try {
    const KEY = "crp_password";
    const MIRROR = "crp_password_persist";
    // 1) Восстановление при старте: если в sessionStorage пусто, а в localStorage есть — копируем.
    const persisted = localStorage.getItem(MIRROR);
    if (persisted && !sessionStorage.getItem(KEY)) {
      sessionStorage.setItem(KEY, persisted);
    }
    // 2) Перехватываем будущие записи/удаления.
    const origSet = sessionStorage.setItem.bind(sessionStorage);
    sessionStorage.setItem = (k: string, v: string) => {
      if (k === KEY) {
        try { localStorage.setItem(MIRROR, v); } catch {}
      }
      return origSet(k, v);
    };
    const origRem = sessionStorage.removeItem.bind(sessionStorage);
    sessionStorage.removeItem = (k: string) => {
      if (k === KEY) {
        try { localStorage.removeItem(MIRROR); } catch {}
      }
      return origRem(k);
    };
  } catch {
    /* no storage — игнорируем */
  }
})();

// Apply saved theme before render so there's no flash
loadSavedTheme();

// COPYRIGHT PROTECTION
console.clear();
console.log(
  "%cАВТОРСЬКІ ПРАВА ЗАХИЩЕНО. УСІ МАТЕРІАЛИ ЦЬОГО САЙТУ, ВКЛЮЧАЮЧИ ДИЗАЙН, СТРУКТУРУ ТА КОНТЕНТ, Є ІНТЕЛЕКТУАЛЬНОЮ ВЛАСНІСТЮ CHERNIHIV RP. ЗАХИСТ ЗДІЙСНЮЄТЬСЯ ВІДПОВІДНО ДО: ЗАКОНУ УКРАЇНИ «ПРО АВТОРСЬКЕ ПРАВО І СУМІЖНІ ПРАВА» № 3792-XII; ЦИВІЛЬНОГО КОДЕКСУ УКРАЇНИ СТАТТІ 418-508; КРИМІНАЛЬНОГО КОДЕКСУ УКРАЇНИ СТАТТІ 176 (ПОРУШЕННЯ АВТОРСЬКИХ ПРАВ — ДО 2 РОКІВ ПОЗБАВЛЕННЯ ВОЛІ); БЕРНСЬКОЇ КОНВЕНЦІЇ ПРО ОХОРОНУ ЛІТЕРАТУРНИХ І ХУДОЖНІХ ТВОРІВ. БУДЬ-ЯКЕ КОПІЮВАННЯ, ВІДТВОРЕННЯ, РОЗПОВСЮДЖЕННЯ АБО ВИКОРИСТАННЯ МАТЕРІАЛІВ БЕЗ ПИСЬМОВОГО ДОЗВОЛУ АДМІНІСТРАЦІЇ СУВОРО ЗАБОРОНЕНО. У РАЗІ ВИЯВЛЕННЯ ПЛАГІАТУ АДМІНІСТРАЦІЯ CHERNIHIV RP МАЄ ПРАВО: ЗВЕРНУТИСЯ ДО ПРАВООХОРОННИХ ОРГАНІВ УКРАЇНИ; ПОДАТИ ЦИВІЛЬНИЙ ПОЗОВ ПРО ВІДШКОДУВАННЯ МАТЕРІАЛЬНОЇ ТА МОРАЛЬНОЇ ШКОДИ; ВИМАГАТИ НЕГАЙНОГО ВИДАЛЕННЯ СКОПІЙОВАНИХ МАТЕРІАЛІВ; ПОВІДОМИТИ ХОСТИНГ-ПРОВАЙДЕРА (DMCA TAKEDOWN). ПОРУШНИК НЕСЕ ПОВНУ ЦИВІЛЬНУ ТА КРИМІНАЛЬНУ ВІДПОВІДАЛЬНІСТЬ ЗГІДНО З ЧИННИМ ЗАКОНОДАВСТВОМ УКРАЇНИ. COPYRIGHT " + new Date().getFullYear() + " CHERNIHIV RP. УСІ ПРАВА ЗАХИЩЕНІ.",
  "color: #ffffff; background: #cc0000; font-size: 22px; font-weight: 900; padding: 40px 50px; display: block; line-height: 2.2; letter-spacing: 1.5px;"
);

createRoot(document.getElementById("root")!).render(<App />);
