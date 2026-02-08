import { signal } from "@preact/signals-react";
import type { GameSessionConfig } from "@/db/schema";

export const currentGameConfig = signal<GameSessionConfig | null>(null);
