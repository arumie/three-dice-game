"use client";

import { useSignals } from "@preact/signals-react/runtime";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { gameRulesOpen } from "@/lib/signals/ui";

const DICE_POINTS = [
	{ face: 1, points: 100 },
	{ face: 2, points: 2 },
	{ face: 3, points: 3 },
	{ face: 4, points: 4 },
	{ face: 5, points: 5 },
	{ face: 6, points: 60 },
];

export function GameRulesDialog() {
	useSignals();

	return (
		<>
			{/* Desktop-only floating button */}
			<Button
				variant="outline"
				size="icon"
				onClick={() => { gameRulesOpen.value = true; }}
				className="hidden lg:fixed lg:inline-flex right-14 bottom-4 z-50 size-8 rounded-full shadow-lg backdrop-blur supports-backdrop-filter:bg-background/80"
				aria-label="Game rules"
			>
				<BookOpen className="size-3.5" />
			</Button>

			<Dialog open={gameRulesOpen.value} onOpenChange={(v) => { gameRulesOpen.value = v; }}>
				<DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<BookOpen className="size-5" />
							Game Rules
						</DialogTitle>
					</DialogHeader>

					<div className="space-y-5 text-sm">
						{/* Overview */}
						<section>
							<h3 className="mb-1.5 font-semibold">Overview</h3>
							<p className="text-muted-foreground">
								Roll three dice, pray for a high score, and try not to be the
								one drinking at the end. The lowest scorer each round takes the
								punishment!
							</p>
						</section>

						{/* Scoring */}
						<section>
							<h3 className="mb-1.5 font-semibold">Scoring</h3>
							<p className="mb-2 text-muted-foreground">
								Not all dice are created equal. Ones are king and sixes
								aren&apos;t bad either &mdash; everything else is basically
								worthless.
							</p>
							<div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
								{DICE_POINTS.map(({ face, points }) => (
									<div
										key={face}
										className="flex flex-col items-center rounded-md border bg-muted/50 px-2 py-1.5"
									>
										<span className="text-base font-bold tabular-nums">
											{face}
										</span>
										<span className="text-xs text-muted-foreground">
											{points} pts
										</span>
									</div>
								))}
							</div>
						</section>

						{/* How a round works */}
						<section>
							<h3 className="mb-1.5 font-semibold">How a Round Works</h3>
							<ol className="list-inside list-decimal space-y-1 text-muted-foreground">
								<li>
									The first player rolls and can re-roll as many times as they
									dare, picking which dice to keep each time.
								</li>
								<li>
									However many rolls they take becomes the limit for everyone
									else &mdash; so choose wisely!
								</li>
								<li>
									The rest of the players take turns trying to beat the scores
									on the board.
								</li>
								<li>
									When everyone&apos;s done, the unlucky soul with the lowest
									score (who isn&apos;t safe) drinks up.
								</li>
							</ol>
						</section>

						{/* Special rolls */}
						<section>
							<h3 className="mb-1.5 font-semibold">Special Rolls</h3>
							<div className="space-y-2.5">
								<div className="rounded-md border p-2.5">
									<div className="mb-0.5 font-medium">
										Three of a Kind{" "}
										<span className="text-xs text-muted-foreground">
											(e.g. 3-3-3)
										</span>
									</div>
									<p className="text-muted-foreground">
										Triple trouble! You&apos;re{" "}
										<strong className="text-foreground">safe</strong> from
										losing, but the penalty pot grows by the dice value (three
										1s? That&apos;s +7 sips for the loser).
									</p>
								</div>

								<div className="rounded-md border p-2.5">
									<div className="mb-0.5 font-medium">
										Stairs{" "}
										<span className="text-xs text-muted-foreground">
											(1-2-3)
										</span>
									</div>
									<p className="text-muted-foreground">
										You&apos;re{" "}
										<strong className="text-foreground">safe</strong> and you
										get to play bartender &mdash; pick someone to drink!
									</p>
								</div>

								<div className="rounded-md border p-2.5">
									<div className="mb-0.5 font-medium">
										Super Stairs{" "}
										<span className="text-xs text-muted-foreground">
											(4-5-6)
										</span>
									</div>
									<p className="text-muted-foreground">
										The legendary follow-up! Only works if the player before
										you rolled Stairs. You&apos;re{" "}
										<strong className="text-foreground">safe</strong> and the
										penalty gets doubled. Ouch.
									</p>
								</div>

								<div className="rounded-md border p-2.5">
									<div className="mb-0.5 font-medium">
										Shit Stairs{" "}
										<span className="text-xs text-muted-foreground">
											(2-3-4 or 3-4-5)
										</span>
									</div>
									<p className="text-muted-foreground">
										Looks like stairs, smells like stairs&hellip; but nope.{" "}
										<strong className="text-foreground">Not safe</strong>. Just
										a sad, regular roll. Better luck next time.
									</p>
								</div>
							</div>
						</section>

						{/* Penalty */}
						<section>
							<h3 className="mb-1.5 font-semibold">Penalty</h3>
							<p className="text-muted-foreground">
								Every round starts with a base penalty of{" "}
								<strong className="text-foreground">1 sip</strong>. Any Three of
								a Kind rolled during the round piles on extra sips. The poor
								loser drinks the whole lot.
							</p>
						</section>

						{/* First player immunity */}
						<section>
							<h3 className="mb-1.5 font-semibold">First Player Immunity</h3>
							<p className="text-muted-foreground">
								Got too lucky too soon? If the first player lands a special roll
								on their very first throw, karma strikes instantly &mdash; the
								round is over and <em>they</em> drink the penalty. No one else
								even has to lift a finger.
							</p>
						</section>
					</div>

					<DialogFooter showCloseButton />
				</DialogContent>
			</Dialog>
		</>
	);
}
