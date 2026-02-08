"use client";

import { useState, useEffect } from "react";
import { Dices, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface EnterDiceDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	diceCount: number;
	onConfirm: (values: number[]) => void;
}

const DICE_VALUES = [1, 2, 3, 4, 5, 6];

function DieValuePicker({
	value,
	onChange,
	label,
}: {
	value: number | null;
	onChange: (v: number) => void;
	label: string;
}) {
	return (
		<div className="flex flex-col items-center gap-2">
			<span className="text-xs font-medium text-muted-foreground">
				{label}
			</span>
			<div className="grid grid-cols-3 gap-1.5">
				{DICE_VALUES.map((v) => (
					<button
						key={v}
						type="button"
						onClick={() => onChange(v)}
						className={cn(
							"flex size-10 items-center justify-center rounded-lg border-2 text-sm font-bold transition-all",
							value === v
								? "border-primary bg-primary/10 text-primary shadow-sm"
								: "border-border bg-card text-foreground hover:border-primary/50 hover:bg-primary/5",
						)}
					>
						{v}
					</button>
				))}
			</div>
		</div>
	);
}

export function EnterDiceDialog({
	open,
	onOpenChange,
	diceCount,
	onConfirm,
}: EnterDiceDialogProps) {
	const [values, setValues] = useState<(number | null)[]>([]);

	// Reset values whenever the dialog opens or diceCount changes
	useEffect(() => {
		if (open) {
			setValues(Array(diceCount).fill(null));
		}
	}, [open, diceCount]);

	function setValue(index: number, value: number) {
		setValues((prev) => {
			const next = [...prev];
			next[index] = value;
			return next;
		});
	}

	const allSelected = values.length > 0 && values.every((v) => v !== null);

	function randomRoll() {
		setValues((prev) =>
			prev.map(() => Math.floor(Math.random() * 6) + 1),
		);
	}

	function handleConfirm() {
		if (!allSelected) return;
		onConfirm(values as number[]);
		onOpenChange(false);
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Dices className="size-5" />
						Enter Dice Values
					</DialogTitle>
					<DialogDescription>
						Roll your real dice and enter the {diceCount === 1 ? "value" : "values"} you got.
					</DialogDescription>
				</DialogHeader>

				<div className="flex justify-center gap-6 py-4">
					{values.map((val, idx) => (
						<DieValuePicker
							key={idx}
							value={val}
							onChange={(v) => setValue(idx, v)}
							label={`Die ${idx + 1}`}
						/>
					))}
				</div>

				<DialogFooter className="flex-row gap-2 sm:justify-between">
					<Button
						variant="ghost"
						onClick={randomRoll}
						className="mr-auto"
					>
						<Shuffle className="size-4" />
						Roll for me
					</Button>
					<div className="flex gap-2">
						<Button
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button onClick={handleConfirm} disabled={!allSelected}>
							Confirm
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
