import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { loadSavedTheme } from "./pages/Shop";

// Apply saved theme before render so there's no flash
loadSavedTheme();

createRoot(document.getElementById("root")!).render(<App />);
