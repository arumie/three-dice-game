import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6 } from "lucide-react";
import { cn } from "@/lib/utils";

const DICE_ICONS = [Dice1, Dice2, Dice3, Dice4, Dice5, Dice6] as const;

interface DiceSpinnerProps {
	className?: string;
	size?: number;
}

export function DiceSpinner({ className, size = 24 }: DiceSpinnerProps) {
	const DiceIcon = DICE_ICONS[0];

	return (
		<div
			className={cn("inline-flex items-center justify-center", className)}
			role="status"
			aria-label="Loading"
		>
			<DiceIcon
				className="dice-spinner text-primary"
				style={{ width: size, height: size }}
			/>
			<span className="sr-only">Loading...</span>
		</div>
	);
}
