import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initSecurityMeasures } from "./utils/security";

// Initialize security measures on app load
initSecurityMeasures();

createRoot(document.getElementById("root")!).render(<App />)
