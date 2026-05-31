import { effect, signal } from "@preact/signals-react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "three-dice-theme";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "dark" || stored === "light") return stored;

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export const theme = signal<Theme>(
  typeof window === "undefined" ? "light" : getInitialTheme(),
);

/** Apply the theme class and persist to localStorage */
export function applyTheme(value: Theme) {
  document.documentElement.classList.toggle("dark", value === "dark");
  localStorage.setItem(STORAGE_KEY, value);
}

/** Toggle between light and dark */
export function toggleTheme() {
  theme.value = theme.value === "dark" ? "light" : "dark";
}

// Auto-apply whenever the signal changes (client-side only)
if (typeof window !== "undefined") {
  effect(() => {
    applyTheme(theme.value);
  });
}
