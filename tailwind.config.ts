import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        styler: {
          canvas: "color-mix(in srgb, var(--bg) calc(<alpha-value> * 100%), transparent)",
          "canvas-elev": "color-mix(in srgb, var(--bg-elev) calc(<alpha-value> * 100%), transparent)",
          surface: "color-mix(in srgb, var(--surface) calc(<alpha-value> * 100%), transparent)",
          "surface-2": "color-mix(in srgb, var(--surface-2) calc(<alpha-value> * 100%), transparent)",
          "surface-3": "color-mix(in srgb, var(--surface-3) calc(<alpha-value> * 100%), transparent)",
          ink: "color-mix(in srgb, var(--ink) calc(<alpha-value> * 100%), transparent)",
          "ink-soft": "color-mix(in srgb, var(--ink-soft) calc(<alpha-value> * 100%), transparent)",
          muted: "color-mix(in srgb, var(--muted) calc(<alpha-value> * 100%), transparent)",
          accent: "color-mix(in srgb, var(--accent) calc(<alpha-value> * 100%), transparent)",
          "accent-strong": "color-mix(in srgb, var(--accent-strong) calc(<alpha-value> * 100%), transparent)",
          "accent-soft": "color-mix(in srgb, var(--accent-soft) calc(<alpha-value> * 100%), transparent)",
          "accent-2": "color-mix(in srgb, var(--accent-2) calc(<alpha-value> * 100%), transparent)",
          line: "color-mix(in srgb, var(--line) calc(<alpha-value> * 100%), transparent)",
          "line-strong": "color-mix(in srgb, var(--line-strong) calc(<alpha-value> * 100%), transparent)",
          rose: "color-mix(in srgb, var(--rose) calc(<alpha-value> * 100%), transparent)",
          warning: "color-mix(in srgb, var(--warning) calc(<alpha-value> * 100%), transparent)",
          "warning-bg": "color-mix(in srgb, var(--warning-bg) calc(<alpha-value> * 100%), transparent)",
          success: "color-mix(in srgb, var(--success) calc(<alpha-value> * 100%), transparent)",
          "success-bg": "color-mix(in srgb, var(--success-bg) calc(<alpha-value> * 100%), transparent)",
          danger: "color-mix(in srgb, var(--danger) calc(<alpha-value> * 100%), transparent)",
          "danger-bg": "color-mix(in srgb, var(--danger-bg) calc(<alpha-value> * 100%), transparent)",
          info: "color-mix(in srgb, var(--info) calc(<alpha-value> * 100%), transparent)",
          "info-bg": "color-mix(in srgb, var(--info-bg) calc(<alpha-value> * 100%), transparent)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
        panel: "var(--shadow)",
      },
      borderRadius: {
        panel: "var(--radius)",
        sm: "var(--radius-sm)",
      },
    },
  },
  corePlugins: { preflight: false },
  plugins: [],
};

export default config;