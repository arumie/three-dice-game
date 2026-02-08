import { Dices } from "lucide-react";

const APP_VERSION = "v0.1.0";
const GITHUB_URL = "https://github.com/arumie";

export function SiteFooter() {
	return (
		<footer className="w-full pb-16 pt-8 sm:pb-8">
			<div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 text-xs text-muted-foreground sm:flex-row sm:justify-between sm:px-6">
				<div className="flex items-center gap-1.5">
					<Dices className="size-3.5" />
					<span>Three Dice Game</span>
					<span className="text-muted-foreground/60">{APP_VERSION}</span>
				</div>
				<div className="flex items-center gap-1.5">
					<span>Made by</span>
					<a
						href={GITHUB_URL}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center gap-1 font-medium text-foreground/70 transition-colors hover:text-primary"
					>
						<svg
							role="img"
							viewBox="0 0 24 24"
							className="size-3.5 fill-current"
							aria-label="GitHub"
						>
							<path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
						</svg>
						arumie
					</a>
				</div>
			</div>
		</footer>
	);
}
