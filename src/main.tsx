import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ErrorBoundary } from "@/componentes/ErrorBoundary";
import { ProvedorTema } from "@/componentes/tema/ProvedorTema";

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <ProvedorTema>
      <App />
    </ProvedorTema>
  </ErrorBoundary>
);
