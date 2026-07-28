import React from "react";
import { createRoot } from "react-dom/client";
import "@/entrypoints/shared.css";
import "@/lib/i18n";
import { App } from "@/entrypoints/options/App";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
