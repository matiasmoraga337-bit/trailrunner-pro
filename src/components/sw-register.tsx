"use client";

import { useEffect } from "react";

/** Registra el service worker en produccion. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        if (reg.waiting) {
          reg.waiting.postMessage("SKIP_WAITING");
        }
      } catch {
        // Fallo silencioso: la app sigue funcionando online
      }
    };

    register();
  }, []);

  return null;
}