"use client";

import { useEffect } from "react";
import { useSignals } from "@preact/signals-react/runtime";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { theme, toggleTheme, applyTheme, type Theme } from "@/lib/signals/theme";

const STORAGE_KEY = "three-dice-theme";

export function ThemeToggle() {
	useSignals();

	// Initialize on mount to handle SSR/hydration correctly
	useEffect(() => {
		const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
		const initial =
			stored === "dark" || stored === "light"
				? stored
				: window.matchMedia("(prefers-color-scheme: dark)").matches
					? "dark"
					: "light";

		theme.value = initial;
		applyTheme(initial);
	}, []);

	const isDark = theme.value === "dark";

	return (
		<Button
			variant="outline"
			size="icon"
			onClick={toggleTheme}
			className="hidden lg:fixed lg:inline-flex right-4 bottom-4 z-50 size-8 rounded-full shadow-lg backdrop-blur supports-backdrop-filter:bg-background/80"
			aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
		>
			{isDark ? (
				<Sun className="size-3.5" />
			) : (
				<Moon className="size-3.5" />
			)}
		</Button>
	);
}
