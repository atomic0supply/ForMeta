"use client";

import { useEffect } from "react";

export function PWARegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        // Detectar nuevas versiones del SW; se activarán en la próxima navegación
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              console.info("Nueva versión disponible; se aplicará en la próxima navegación.");
            }
          });
        });
      })
      .catch((error) => {
        console.warn("No se pudo registrar el service worker:", error);
      });
  }, []);
  return null;
}
