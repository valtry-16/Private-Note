"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";

export type ColorTheme = "blue" | "emerald" | "rose" | "violet" | "amber" | "cyan" | "crimson";
export type FontFamily = "inter" | "system" | "mono";

interface AppearanceState {
  colorTheme: ColorTheme;
  fontFamily: FontFamily;
  radius: string;
}

interface AppearanceContextValue extends AppearanceState {
  setColorTheme: (theme: ColorTheme) => void;
  setFontFamily: (font: FontFamily) => void;
  setRadius: (radius: string) => void;
}

const STORAGE_KEY = "zerovault-appearance";

const defaults: AppearanceState = {
  colorTheme: "blue",
  fontFamily: "inter",
  radius: "0.5",
};

const fontMap: Record<FontFamily, string> = {
  inter: "'Inter', sans-serif",
  system: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
};

const AppearanceContext = createContext<AppearanceContextValue | undefined>(undefined);

function applyToDOM(state: AppearanceState) {
  const root = document.documentElement;
  // Color theme
  if (state.colorTheme === "blue") {
    root.removeAttribute("data-color-theme");
  } else {
    root.setAttribute("data-color-theme", state.colorTheme);
  }
  // Radius
  root.setAttribute("data-radius", state.radius);
  // Font — set on body to override Next.js font class
  document.body.style.fontFamily = fontMap[state.fontFamily];
}

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppearanceState>(defaults);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<AppearanceState>;
        const merged = { ...defaults, ...parsed };
        setState(merged);
        applyToDOM(merged);
      } else {
        applyToDOM(defaults);
      }
    } catch {
      applyToDOM(defaults);
    }
  }, []);

  const persist = useCallback((next: AppearanceState) => {
    setState(next);
    applyToDOM(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const setColorTheme = useCallback(
    (colorTheme: ColorTheme) => persist({ ...state, colorTheme }),
    [state, persist]
  );

  const setFontFamily = useCallback(
    (fontFamily: FontFamily) => persist({ ...state, fontFamily }),
    [state, persist]
  );

  const setRadius = useCallback(
    (radius: string) => persist({ ...state, radius }),
    [state, persist]
  );

  return (
    <AppearanceContext.Provider value={{ ...state, setColorTheme, setFontFamily, setRadius }}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const ctx = useContext(AppearanceContext);
  if (!ctx) throw new Error("useAppearance must be used within AppearanceProvider");
  return ctx;
}
