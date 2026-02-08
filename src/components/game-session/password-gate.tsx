"use client";

import { useEffect, useTransition, type ReactNode } from "react";
import { useSignals } from "@preact/signals-react/runtime";
import { signal } from "@preact/signals-react";
import { Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import {
	checkGameAuthAction,
	verifyGamePasswordAction,
} from "@/app/actions";

// Signals for gate state (keyed per gameSessionId via the component)
const isChecking = signal(true);
const isUnlocked = signal(false);
const password = signal("");
const error = signal<string | null>(null);
const showPassword = signal(false);

interface PasswordGateProps {
	gameSessionId: number;
	children: ReactNode;
}

export function PasswordGate({ gameSessionId, children }: PasswordGateProps) {
	useSignals();
	const [isPending, startTransition] = useTransition();

	// Check on mount if the user is already authenticated
	useEffect(() => {
		isChecking.value = true;
		isUnlocked.value = false;
		password.value = "";
		error.value = null;
		showPassword.value = false;

		checkGameAuthAction(gameSessionId).then((authed) => {
			isUnlocked.value = authed;
			isChecking.value = false;
		});
	}, [gameSessionId]);

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		error.value = null;

		startTransition(async () => {
			const success = await verifyGamePasswordAction(
				gameSessionId,
				password.value,
			);
			if (success) {
				isUnlocked.value = true;
			} else {
				error.value = "Incorrect password";
			}
		});
	}

	// While checking auth status, show a minimal loading state
	if (isChecking.value) {
		return (
			<div className="flex flex-1 items-center justify-center">
				<Loader2 className="size-6 animate-spin text-muted-foreground" />
			</div>
		);
	}

	// If unlocked, render the game content
	if (isUnlocked.value) {
		return <>{children}</>;
	}

	// Password prompt
	return (
		<div className="flex flex-1 flex-col items-center justify-center px-4 py-8">
			<Card className="w-full max-w-sm">
				<CardHeader className="text-center">
					<div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10">
						<Lock className="size-6 text-primary" />
					</div>
					<CardTitle className="text-lg">Game Protected</CardTitle>
					<CardDescription>
						Enter the game password to continue.
					</CardDescription>
				</CardHeader>
				<form onSubmit={handleSubmit}>
					<CardContent className="flex flex-col gap-4">
						<div className="flex flex-col gap-2">
							<Label htmlFor="game-password">Password</Label>
							<InputGroup>
								<InputGroupInput
									id="game-password"
									type={showPassword.value ? "text" : "password"}
									value={password.value}
									onChange={(e) => {
										password.value = e.target.value;
										error.value = null;
									}}
									placeholder="Enter password"
									autoComplete="off"
									autoFocus
								/>
								<InputGroupAddon align="inline-end">
									<InputGroupButton
										size="icon-xs"
										onClick={() => {
											showPassword.value = !showPassword.value;
										}}
									>
										{showPassword.value ? (
											<EyeOff className="size-4" />
										) : (
											<Eye className="size-4" />
										)}
									</InputGroupButton>
								</InputGroupAddon>
							</InputGroup>
							{error.value && (
								<p className="text-sm text-destructive">{error.value}</p>
							)}
						</div>
					</CardContent>
					<CardFooter>
						<Button
							type="submit"
							className="w-full mt-10"
							disabled={isPending || !password.value}
						>
							{isPending ? (
								<Loader2 className="size-4 animate-spin" />
							) : (
								<Lock className="size-4" />
							)}
							Unlock Game
						</Button>
					</CardFooter>
				</form>
			</Card>
		</div>
	);
}
