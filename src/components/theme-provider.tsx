
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("styler-theme");
      const preferred = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches
        ? "dark"
        : "light";

      const initial: Theme =
        saved === "light" || saved === "dark" ? saved : preferred;

      setTheme(initial);
    } catch {
      setTheme("light");
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;

    try {
      localStorage.setItem("styler-theme", theme);
    } catch {
      // Theme still works when storage is unavailable.
    }
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((current) => (current === "light" ? "dark" : "light"));
  }, []);

  const value = useMemo(() => ({ theme, toggle }), [theme, toggle]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
}
