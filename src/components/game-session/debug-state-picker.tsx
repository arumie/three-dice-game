"use client";

import { Bug, Check } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	MOCK_PRESETS,
	DEFAULT_MOCK_KEY,
	type MockPresetKey,
} from "@/lib/mock/game-session";

interface DebugStatePickerProps {
	gameId: number;
}

export function DebugStatePicker({ gameId }: DebugStatePickerProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const currentKey = (searchParams.get("mock") as MockPresetKey) ?? DEFAULT_MOCK_KEY;

	function selectPreset(key: MockPresetKey) {
		const params = new URLSearchParams(searchParams.toString());
		params.set("mock", key);
		router.push(`/game-session/${gameId}?${params.toString()}`);
	}

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button
					variant="outline"
					size="icon"
					className="fixed bottom-6 right-20 z-50 size-10 rounded-full border-dashed border-yellow-500/50 bg-background shadow-lg hover:border-yellow-500"
					title="Debug: switch game state"
				>
					<Bug className="size-4 text-yellow-600 dark:text-yellow-400" />
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Debug State Picker</DialogTitle>
					<DialogDescription>
						Select a mock game state to preview different UI states.
					</DialogDescription>
				</DialogHeader>
				<div className="flex flex-col gap-2 py-2">
					{MOCK_PRESETS.map((preset) => {
						const isActive = preset.key === currentKey;
						return (
							<button
								key={preset.key}
								type="button"
								onClick={() => selectPreset(preset.key)}
								className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
									isActive
										? "border-primary bg-primary/5"
										: "border-border hover:border-primary/40 hover:bg-accent/50"
								}`}
							>
								<div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border">
									{isActive && (
										<Check className="size-3 text-primary" />
									)}
								</div>
								<div className="flex flex-col gap-0.5">
									<span className="text-sm font-medium">
										{preset.label}
									</span>
									<span className="text-xs text-muted-foreground">
										{preset.description}
									</span>
								</div>
							</button>
						);
					})}
				</div>
			</DialogContent>
		</Dialog>
	);
}
