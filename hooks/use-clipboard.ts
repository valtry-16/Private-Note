"use client";

import { useCallback } from "react";

const CLIPBOARD_CLEAR_DELAY = 20_000; // 20 seconds

export function useClipboard() {
  const copyToClipboard = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text);
    setTimeout(async () => {
      try {
        const current = await navigator.clipboard.readText();
        if (current === text) {
          await navigator.clipboard.writeText("");
        }
      } catch {
        // Clipboard access may be denied; that's fine
      }
    }, CLIPBOARD_CLEAR_DELAY);
  }, []);

  return { copyToClipboard };
}
