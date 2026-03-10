"use client";

import { useEffect } from "react";

export function usePWA() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch(() => {
          // Service worker registration failed — that's okay
        });
    }
  }, []);
}
