import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import "./index.css";
import App from "./App";

// GitHub Pages has no server-side rewrite, so a direct/refreshed deep link
// like /client/:id 404s under BrowserRouter. HashRouter (/#/client/:id)
// needs no server cooperation at all, so the demo build uses it.
const Router = import.meta.env.VITE_DEMO_MODE === "1" ? HashRouter : BrowserRouter;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Router>
      <App />
    </Router>
  </StrictMode>,
);
