"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();

  return (
    <button
      type="button"
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-styler-line bg-styler-surface text-styler-ink-soft shadow-soft transition-all hover:border-styler-line-strong hover:bg-styler-surface-2 hover:text-styler-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-styler-accent ${className}`}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      aria-pressed={theme === "dark"}
      title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      onClick={toggle}
    >
      {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  );
}