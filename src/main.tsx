import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { InstallApp } from "./InstallApp";
import "./styles.css";
import "./theme-family.css";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <InstallApp />
    <App />
  </React.StrictMode>,
);

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .catch((error) =>
        console.warn("No se pudo preparar la instalación sin conexión.", error),
      );
  });
}
