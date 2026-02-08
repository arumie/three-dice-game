"use client";

import { useSignals } from "@preact/signals-react/runtime";
import { BookOpen, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { theme, toggleTheme } from "@/lib/signals/theme";
import { gameRulesOpen, hasGameDrawer } from "@/lib/signals/ui";

/**
 * Fixed bottom toolbar shown on mobile when the MobileGameDrawer is NOT present.
 * Provides quick access to theme toggle and game rules on all pages.
 */
export function MobileToolbar() {
	useSignals();

	// Hide when the game session drawer is mounted (it has its own menu)
	if (hasGameDrawer.value) return null;

	const isDark = theme.value === "dark";

	return (
		<div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-center gap-2 border-t bg-background/95 px-4 py-2.5 backdrop-blur supports-backdrop-filter:bg-background/80 lg:hidden">
			<Button
				variant="ghost"
				size="sm"
				className="gap-1.5"
				onClick={() => { gameRulesOpen.value = true; }}
			>
				<BookOpen className="size-4" />
				Rules
			</Button>
			<Button
				variant="ghost"
				size="sm"
				className="gap-1.5"
				onClick={toggleTheme}
				aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
			>
				{isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
				{isDark ? "Light" : "Dark"}
			</Button>
		</div>
	);
}
