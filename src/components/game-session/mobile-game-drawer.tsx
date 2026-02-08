"use client";

import { useEffect, useTransition, useState } from "react";
import Link from "next/link";
import { useSignals } from "@preact/signals-react/runtime";
import {
	BarChart3,
	BookOpen,
	Bug,
	Check,
	ClipboardCopy,
	Database,
	EllipsisVertical,
	Home,
	ListOrdered,
	Moon,
	RefreshCw,
	Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { theme, toggleTheme } from "@/lib/signals/theme";
import { gameRulesOpen, hasGameDrawer } from "@/lib/signals/ui";
import { invalidateCacheAction, getRawGameDataAction } from "@/app/actions";
import { GameStateCard } from "./game-state-card";
import { RoundInfoCard } from "./round-info-card";
import type { GameModel, ParticipantStats, RoundModel } from "@/lib/models";

interface MobileGameDrawerProps {
	session: GameModel;
	stats: ParticipantStats[];
	currentRound: RoundModel;
	currentParticipantId?: number;
	gameSessionId: number;
}

export function MobileGameDrawer({
	session,
	stats,
	currentRound,
	currentParticipantId,
	gameSessionId,
}: MobileGameDrawerProps) {
	useSignals();

	const [isPending, startTransition] = useTransition();
	const [copiedState, setCopiedState] = useState(false);
	const [copiedDb, setCopiedDb] = useState(false);

	// Signal the layout toolbar to hide while this drawer is mounted
	useEffect(() => {
		hasGameDrawer.value = true;
		return () => {
			hasGameDrawer.value = false;
		};
	}, []);

	const isDark = theme.value === "dark";

	function handleCopyState() {
		const json = JSON.stringify(session, null, 2);
		navigator.clipboard.writeText(json).then(() => {
			setCopiedState(true);
			setTimeout(() => setCopiedState(false), 2000);
		});
	}

	function handleCopyDbRows() {
		startTransition(async () => {
			const data = await getRawGameDataAction(gameSessionId);
			const json = JSON.stringify(data, null, 2);
			await navigator.clipboard.writeText(json);
			setCopiedDb(true);
			setTimeout(() => setCopiedDb(false), 2000);
		});
	}

	function handleInvalidateCache() {
		startTransition(async () => {
			await invalidateCacheAction(gameSessionId);
		});
	}

	return (
		<div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/80 lg:hidden">
			{/* Home */}
			<Button
				variant="ghost"
				size="sm"
				asChild
			>
				<Link href="/">
					<Home className="size-4" />
				</Link>
			</Button>

			{/* Game State Sheet */}
			<Sheet>
				<SheetTrigger asChild>
					<Button
						variant="secondary"
						size="sm"
						className="shadow-lg"
					>
						<BarChart3 className="size-4" />
						Game Info
					</Button>
				</SheetTrigger>
				<SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
					<SheetHeader>
						<SheetTitle>Game Overview</SheetTitle>
						<SheetDescription>
							Scoreboard and game status
						</SheetDescription>
					</SheetHeader>
					<div className="px-4 pb-4">
						<GameStateCard session={session} stats={stats} gameSessionId={gameSessionId} />
					</div>
				</SheetContent>
			</Sheet>

			{/* Round Info Sheet */}
			<Sheet>
				<SheetTrigger asChild>
					<Button
						variant="secondary"
						size="sm"
						className="shadow-lg"
					>
						<ListOrdered className="size-4" />
						Round Info
					</Button>
				</SheetTrigger>
				<SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
					<SheetHeader>
						<SheetTitle>Round {currentRound.roundNumber}</SheetTitle>
						<SheetDescription>
							Player order and results
						</SheetDescription>
					</SheetHeader>
					<div className="px-4 pb-4">
						<RoundInfoCard
							round={currentRound}
							participants={session.participants}
							currentParticipantId={currentParticipantId}
						/>
					</div>
				</SheetContent>
			</Sheet>

			{/* More menu: theme, rules, debug */}
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="ghost" size="sm">
						<EllipsisVertical className="size-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent side="top" align="end" className="w-48">
					<DropdownMenuItem onClick={() => { gameRulesOpen.value = true; }}>
						<BookOpen className="size-4" />
						Game Rules
					</DropdownMenuItem>
					<DropdownMenuItem onClick={toggleTheme}>
						{isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
						{isDark ? "Light Mode" : "Dark Mode"}
					</DropdownMenuItem>

					<DropdownMenuSeparator />
					<DropdownMenuLabel className="text-muted-foreground">
						<Bug className="mr-1 inline size-3" />
						Debug
					</DropdownMenuLabel>
					<DropdownMenuItem onClick={handleCopyState}>
						{copiedState ? <Check className="size-4 text-green-500" /> : <ClipboardCopy className="size-4" />}
						{copiedState ? "Copied!" : "Copy State"}
					</DropdownMenuItem>
					<DropdownMenuItem disabled={isPending} onClick={handleCopyDbRows}>
						{copiedDb ? <Check className="size-4 text-green-500" /> : <Database className="size-4" />}
						{copiedDb ? "Copied!" : "Copy DB Rows"}
					</DropdownMenuItem>
					<DropdownMenuItem disabled={isPending} onClick={handleInvalidateCache}>
						<RefreshCw className={`size-4 ${isPending ? "animate-spin" : ""}`} />
						Invalidate Cache
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
