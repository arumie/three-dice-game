import { List, Users } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { NewGameDebugPanel } from "@/components/new-game-debug-panel";
import { NewGameForm } from "@/components/new-game-form";
import { Button } from "@/components/ui/button";
import { getAllGames } from "@/lib/cached-queries";

export default async function Home() {
  const games = await getAllGames();
  const requiresCreationPassword = !!process.env.GAME_CREATION_PASSWORD;
  const inProgressCount = games.filter(
    (g) => g.status === "in_progress",
  ).length;

  return (
    <div className="flex flex-1 flex-col items-center px-4 py-8 sm:px-6 md:py-12">
      {/* New Game Form */}
      <Suspense>
        <NewGameForm
          requiresCreationPassword={requiresCreationPassword}
          inProgressCount={inProgressCount}
        />
      </Suspense>

      {/* Links to games and players lists */}
      {games.length > 0 && (
        <div className="mt-6 flex w-full max-w-sm flex-col gap-2 sm:max-w-md">
          <Button variant="outline" asChild className="w-full">
            <Link href="/games">
              <List className="size-4" />
              View All Games ({games.length})
            </Link>
          </Button>
          <Button variant="outline" asChild className="w-full">
            <Link href="/players">
              <Users className="size-4" />
              View All Players
            </Link>
          </Button>
        </div>
      )}

      <NewGameDebugPanel />
    </div>
  );
}
