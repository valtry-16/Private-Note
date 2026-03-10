"use client";

import { useEffect, useRef, useCallback } from "react";
import { useVault } from "./use-vault";

const DEFAULT_TIMEOUT_MS = 60_000; // 60 seconds

export function useAutoLock(timeoutMs: number = DEFAULT_TIMEOUT_MS) {
  const { isVaultUnlocked, lockVault } = useVault();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (isVaultUnlocked) {
      timerRef.current = setTimeout(() => {
        lockVault();
      }, timeoutMs);
    }
  }, [isVaultUnlocked, lockVault, timeoutMs]);

  useEffect(() => {
    if (!isVaultUnlocked) return;

    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];
    events.forEach((e) => document.addEventListener(e, resetTimer));
    resetTimer();

    return () => {
      events.forEach((e) => document.removeEventListener(e, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isVaultUnlocked, resetTimer]);
}
