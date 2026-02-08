import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ThreeDiceLogo } from "@/components/three-dice-logo";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

const SAD_DIE_ART = `    +-------+
   /       /|
  +-------+ |
  | o   o | |
  |   >   | +
 |  ___  |/
+-------+`;

export default function GameSessionNotFound() {
	return (
		<div className="flex flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6 md:py-12">
			<div className="mb-8 flex flex-col items-center gap-2 md:mb-10">
				<div className="flex items-center justify-center rounded-xl bg-primary text-primary-foreground p-2 md:p-2.5">
					<ThreeDiceLogo size="md" />
				</div>
				<h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
					Three Dice Game
				</h1>
			</div>

			<Card className="w-full max-w-sm sm:max-w-md">
				<CardHeader className="px-4 pt-5 sm:px-6 sm:pt-6 text-center">
					<CardTitle className="text-lg sm:text-xl">
						Game Session Not Found
					</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col items-center gap-4 px-4 sm:px-6 text-center">
					<pre className="font-[family-name:var(--font-geist-mono)] text-xs leading-tight text-muted-foreground/70 sm:text-sm">{SAD_DIE_ART}</pre>
					<p className="text-sm text-muted-foreground">
						Oh, this is not the game you&apos;re looking for.
					</p>
					<Button asChild variant="outline" className="w-full">
						<Link href="/">
							<ArrowLeft className="size-4" />
							Back to Home
						</Link>
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
