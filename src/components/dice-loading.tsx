"use client";

import { useState, useEffect } from "react";
import { Dices } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { DiceSpinner } from "@/components/dice-spinner";

const LOADING_MESSAGES = [
	"Rolling the dice...",
	"Shaking the cup...",
	"Polishing the pips...",
	"Stacking the odds...",
	"Warming up the wrists...",
	"Blowing for good luck...",
	"Finding the lucky table...",
	"Counting all six sides...",
];

interface DiceLoadingProps {
	message?: string;
	cycleMessages?: boolean;
}

export function DiceLoading({ message, cycleMessages = true }: DiceLoadingProps) {
	const [messageIndex, setMessageIndex] = useState(() =>
		Math.floor(Math.random() * LOADING_MESSAGES.length),
	);

	useEffect(() => {
		if (!cycleMessages || message) return;
		const interval = setInterval(() => {
			setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
		}, 1500);
		return () => clearInterval(interval);
	}, [cycleMessages, message]);

	const displayMessage = message ?? LOADING_MESSAGES[messageIndex];

	return (
		<CardContent className="flex flex-col items-center justify-center gap-4 px-4 py-12 sm:px-6 sm:py-16">
			<DiceSpinner size={48} />
			<p className="text-sm text-muted-foreground animate-in fade-in duration-300">
				{displayMessage}
			</p>
		</CardContent>
	);
}

export function DiceLoadingPage({ message, cycleMessages }: DiceLoadingProps) {
	return (
		<div className="flex flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6 md:py-12">
			<div className="mb-8 flex flex-col items-center gap-2 md:mb-10">
				<div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground md:size-14">
					<Dices className="size-6 md:size-7" />
				</div>
				<h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
					Three Dice Game
				</h1>
			</div>

			<Card className="w-full max-w-sm sm:max-w-md">
				<DiceLoading message={message} cycleMessages={cycleMessages} />
			</Card>
		</div>
	);
}
