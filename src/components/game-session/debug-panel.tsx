"use client";

import { useTransition, useState } from "react";
import { Bug, ClipboardCopy, Database, RefreshCw, Check, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { invalidateCacheAction, getRawGameDataAction } from "@/app/actions";
import type { GameModel } from "@/lib/models";

interface DebugPanelProps {
	session: GameModel;
	gameSessionId: number;
}

export function DebugPanel({ session, gameSessionId }: DebugPanelProps) {
	const [isPending, startTransition] = useTransition();
	const [copiedState, setCopiedState] = useState(false);
	const [copiedDb, setCopiedDb] = useState(false);
	const [open, setOpen] = useState(false);

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
		<div className="fixed bottom-4 left-4 z-50 flex items-end gap-1.5">
			{/* Toggle button */}
			<Button
				variant="outline"
				size="icon"
				className="size-8 shrink-0 rounded-full border bg-background/95 shadow-lg backdrop-blur supports-backdrop-filter:bg-background/80"
				onClick={() => setOpen((v) => !v)}
				title="Toggle debug panel"
			>
				{open ? (
					<ChevronRight className="size-3.5 rotate-180" />
				) : (
					<Bug className="size-3.5 text-muted-foreground" />
				)}
			</Button>

			{/* Expandable panel */}
			{open && (
				<div className="flex items-center gap-1.5 rounded-lg border bg-background/95 p-1.5 shadow-lg backdrop-blur supports-backdrop-filter:bg-background/80 animate-in slide-in-from-left-2 fade-in-0 duration-150">
					<Button
						variant="ghost"
						size="sm"
						className="h-7 gap-1.5 px-2 text-xs"
						onClick={handleCopyState}
					>
						{copiedState ? (
							<Check className="size-3 text-green-500" />
						) : (
							<ClipboardCopy className="size-3" />
						)}
						{copiedState ? "Copied" : "State"}
					</Button>
					<Button
						variant="ghost"
						size="sm"
						className="h-7 gap-1.5 px-2 text-xs"
						disabled={isPending}
						onClick={handleCopyDbRows}
					>
						{copiedDb ? (
							<Check className="size-3 text-green-500" />
						) : (
							<Database className="size-3" />
						)}
						{copiedDb ? "Copied" : "DB"}
					</Button>
					<Button
						variant="ghost"
						size="sm"
						className="h-7 gap-1.5 px-2 text-xs"
						disabled={isPending}
						onClick={handleInvalidateCache}
					>
						<RefreshCw className={`size-3 ${isPending ? "animate-spin" : ""}`} />
						Cache
					</Button>
				</div>
			)}
		</div>
	);
}
