import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom"; // <-- Agrega esto
import App from "./App.tsx";
import "./globals.css";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

