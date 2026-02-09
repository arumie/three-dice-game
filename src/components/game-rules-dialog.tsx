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
				<DialogContent className="scrollbar-thin max-h-[85vh] overflow-y-auto sm:max-w-lg">
					<DialogHeader className="sticky -top-6 z-10 -mx-6 -mt-6 bg-background px-6 pt-6 pb-4 border-b border-transparent [.is-scrolled_&]:border-border transition-colors">
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
									The first player rolls and can re-roll up to{" "}
										<strong className="text-foreground">3 times</strong> total,
										picking which dice to keep each time.
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
												The number of sips equals your position in the round
												(1st player = 1 sip, 2nd = 2, etc.).
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

										<div className="rounded-md border p-2.5">
											<div className="mb-0.5 font-medium">
												Lowest Roll{" "}
												<span className="text-xs text-muted-foreground">
													(2-2-3 = 7 pts)
												</span>
											</div>
											<p className="text-muted-foreground">
												Rock bottom! The lowest possible score that isn&apos;t
												already a special roll.{" "}
												<strong className="text-foreground">
													Everyone takes 1 sip
												</strong>{" "}
												every time someone rolls it &mdash; even on a mid-turn
												re-roll. And no, it{" "}
												<strong className="text-foreground">doesn&apos;t</strong>{" "}
												make you safe. You can still lose the round on top of it, but hey... <strong className="text-foreground">at least you're dragging everyone down with you.</strong>
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

								{/* Risk & reward */}
								<section>
									<h3 className="mb-1.5 font-semibold">Risk &amp; Reward</h3>
									<p className="text-muted-foreground">
										The real fun is in the gamble. Re-rolling safe dice
										to chase a three of a kind, keeping a low score hoping
										everyone else rolls worse, or sacrificing a solid hand
										to go for stairs &mdash; fortune favours the bold!
										The best moments come from daring plays that either pay
										off spectacularly or crash and burn.
									</p>
								</section>

							{/* False start */}
							<section>
								<h3 className="mb-1.5 font-semibold">False Start</h3>
								<p className="text-muted-foreground">
									Got too lucky too soon? If the first player lands a special roll
									on their very first throw, karma strikes instantly &mdash; the
									round is over and <em>they</em> drink the penalty. No one else
									even has to lift a finger.
								</p>
							</section>

							{/* Tied loss */}
							<section>
								<h3 className="mb-1.5 font-semibold">Tied Loss</h3>
								<p className="text-muted-foreground">
									If two or more players end the round with the same lowest score
									(and aren&apos;t safe), they{" "}
									<strong className="text-foreground">all</strong> drink the full
									penalty. Then a tiebreaker die roll decides who starts the next
									round &mdash; each tied loser rolls a single die, highest roll
									wins. Still tied? Re-roll until someone comes out on top.
								</p>
							</section>
						</div>

					<DialogFooter showCloseButton className="sticky -bottom-6 z-10 -mx-6 -mb-6 bg-background px-6 pb-6 pt-4 border-t border-border" />
				</DialogContent>
			</Dialog>
		</>
	);
}
