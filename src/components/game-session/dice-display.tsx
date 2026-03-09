"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

// Pip positions on a 3x3 grid for each die face value
const PIP_POSITIONS: Record<number, [row: number, col: number][]> = {
	1: [[1, 1]],
	2: [[0, 2], [2, 0]],
	3: [[0, 2], [1, 1], [2, 0]],
	4: [[0, 0], [0, 2], [2, 0], [2, 2]],
	5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
	6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};

interface DieProps {
	value: number;
	selected?: boolean;
	rolling?: boolean;
	size?: "sm" | "md" | "lg";
	interactive?: boolean;
	onClick?: () => void;
}

const sizeClasses = {
	sm: "size-10",
	md: "size-14",
	lg: "size-18",
} as const;

const pipSizeClasses = {
	sm: "size-1.5",
	md: "size-2",
	lg: "size-2.5",
} as const;

const gapClasses = {
	sm: "gap-0.5 p-1.5",
	md: "gap-1 p-2",
	lg: "gap-1 p-2.5",
} as const;

function Die({ value, selected, rolling, size = "md", interactive, onClick }: DieProps) {
	const [displayValue, setDisplayValue] = useState(value);

	useEffect(() => {
		if (!rolling) {
			setDisplayValue(value);
			return;
		}

		setDisplayValue(Math.ceil(Math.random() * 6));
		const interval = setInterval(() => {
			setDisplayValue(Math.ceil(Math.random() * 6));
		}, 80);
		return () => clearInterval(interval);
	}, [rolling, value]);

	const pips = PIP_POSITIONS[displayValue] ?? [];

	return (
		<button
			type="button"
			disabled={!interactive}
			onClick={onClick}
			className={cn(
				"relative grid grid-cols-3 grid-rows-3 rounded-lg border-2 transition-all",
				sizeClasses[size],
				gapClasses[size],
			rolling
				? "border-primary/50 bg-primary/5 scale-105"
				: selected
				? "border-primary bg-primary/10 shadow-sm shadow-primary/20 ring-2 ring-primary/30"
				: "border-border bg-card",
				interactive && "cursor-pointer hover:border-primary/60 hover:bg-primary/5",
				!interactive && "cursor-default",
			)}
		>
			{Array.from({ length: 9 }).map((_, idx) => {
				const row = Math.floor(idx / 3);
				const col = idx % 3;
				const hasPip = pips.some(([r, c]) => r === row && c === col);

				return (
					<div key={idx} className="flex items-center justify-center">
						{hasPip && (
							<div
								className={cn(
									"rounded-full",
									pipSizeClasses[size],
									selected ? "bg-primary" : "bg-foreground",
								)}
							/>
						)}
					</div>
				);
			})}
		</button>
	);
}

interface DiceDisplayProps {
	dice: { value: number; kept: boolean }[];
	selectedIndices?: Set<number>;
	rollingIndices?: Set<number>;
	size?: "sm" | "md" | "lg";
	interactive?: boolean;
	onToggleKeep?: (index: number) => void;
}

export function DiceDisplay({
	dice,
	selectedIndices,
	rollingIndices,
	size = "md",
	interactive = false,
	onToggleKeep,
}: DiceDisplayProps) {
	return (
		<div className="flex items-center gap-2 sm:gap-3">
			{dice.map((die, idx) => (
				<Die
					key={idx}
					value={die.value}
					selected={selectedIndices?.has(idx)}
					rolling={rollingIndices?.has(idx)}
					size={size}
					interactive={interactive}
					onClick={() => onToggleKeep?.(idx)}
				/>
			))}
		</div>
	);
}
