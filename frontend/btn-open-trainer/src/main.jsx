import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./app.css";

const rootEl = document.getElementById("root");
if (!rootEl) {
  const msg = document.createElement("pre");
  msg.textContent = "Error: #root not found in index.html";
  document.body.appendChild(msg);
} else {
  createRoot(rootEl).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
