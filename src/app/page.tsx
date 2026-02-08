import { Suspense } from "react";
import { NewGameForm } from "@/components/new-game-form";

export default function Home() {
	return (
		<Suspense>
			<NewGameForm />
		</Suspense>
	);
}
