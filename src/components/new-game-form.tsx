"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Dices, Plus, X } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod/v4";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";

import { DiceLoading } from "@/components/dice-loading";
import { createGameAction } from "@/app/actions";

const MIN_PLAYERS = 3;
const MAX_PLAYERS = 20;
const MIN_LOADING_MS = 2000;

const newGameSchema = z.object({
	name: z.string().min(1, "Game name is required").max(100),
	players: z
		.array(
			z.object({
				name: z.string().min(1, "Player name is required").max(50),
			}),
		)
		.min(MIN_PLAYERS, `At least ${MIN_PLAYERS} players are required`)
		.max(MAX_PLAYERS, `Maximum ${MAX_PLAYERS} players allowed`)
		.refine(
			(players) => {
				const names = players
					.map((p) => p.name.trim().toLowerCase())
					.filter((n) => n.length > 0);
				return new Set(names).size === names.length;
			},
			{ message: "Player names must be unique" },
		),
	randomTurnOrder: z.boolean(),
});

type NewGameFormValues = z.infer<typeof newGameSchema>;

const DEFAULT_PLAYERS = Array.from({ length: MIN_PLAYERS }, () => ({
	name: "",
}));

export function NewGameForm() {
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(false);

	const form = useForm<NewGameFormValues>({
		resolver: zodResolver(newGameSchema),
		defaultValues: {
			name: "",
			players: DEFAULT_PLAYERS,
			randomTurnOrder: false,
		},
	});

	const { fields, append, remove } = useFieldArray({
		control: form.control,
		name: "players",
	});

	const onSubmit = useCallback(
		async (values: NewGameFormValues) => {
			setIsLoading(true);
			try {
				const [result] = await Promise.all([
					createGameAction({
						name: values.name,
						players: values.players,
						randomTurnOrder: values.randomTurnOrder,
					}),
					new Promise((resolve) => setTimeout(resolve, MIN_LOADING_MS)),
				]);

				router.push(`/game-session/${result.id}`);
			} catch {
				setIsLoading(false);
			}
		},
		[router],
	);

	const canRemove = fields.length > MIN_PLAYERS;
	const canAdd = fields.length < MAX_PLAYERS;

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
				{isLoading ? (
					<DiceLoading />
				) : (
					<>
						<CardHeader className="px-4 pt-5 pb-0 sm:px-6 sm:pt-6">
							<CardTitle className="text-lg sm:text-xl">
								Start New Game
							</CardTitle>
							<CardDescription className="text-sm">
								Configure your game session and start playing.
							</CardDescription>
						</CardHeader>
						<Form {...form}>
							<form onSubmit={form.handleSubmit(onSubmit)}>
								<CardContent className="flex flex-col gap-5 px-4 sm:gap-6 sm:px-6">
									<FormField
										control={form.control}
										name="name"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Game Name</FormLabel>
												<FormControl>
													<Input
														placeholder="e.g. Friday Night Dice"
														autoComplete="off"
														{...field}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									<div className="flex flex-col gap-3">
										<div className="flex items-center justify-between">
											<FormLabel>
												Players ({fields.length})
											</FormLabel>
											{canAdd && (
												<Button
													type="button"
													variant="ghost"
													size="sm"
													onClick={() => append({ name: "" })}
												>
													<Plus className="size-4" />
													Add Player
												</Button>
											)}
										</div>

										<div className="flex flex-col gap-2">
											{fields.map((field, index) => (
												<FormField
													key={field.id}
													control={form.control}
													name={`players.${index}.name`}
													render={({ field }) => (
														<FormItem>
															<div className="flex items-center gap-2">
																<FormControl>
																	<Input
																		placeholder={`Player ${index + 1}`}
																		autoComplete="off"
																		{...field}
																	/>
																</FormControl>
																{canRemove && (
																	<Button
																		type="button"
																		variant="ghost"
																		size="icon"
																		className="size-9 shrink-0 text-muted-foreground hover:text-destructive"
																		onClick={() => remove(index)}
																	>
																		<X className="size-4" />
																		<span className="sr-only">
																			Remove player {index + 1}
																		</span>
																	</Button>
																)}
															</div>
															<FormMessage />
														</FormItem>
													)}
												/>
											))}
										</div>

										{form.formState.errors.players?.root && (
											<p className="text-sm text-destructive">
												{form.formState.errors.players.root.message}
											</p>
										)}

										{canAdd && (
											<p className="text-xs text-muted-foreground">
												{MIN_PLAYERS}&ndash;{MAX_PLAYERS} players allowed
											</p>
										)}
									</div>

									<FormField
										control={form.control}
										name="randomTurnOrder"
										render={({ field }) => (
											<FormItem className="flex flex-row items-center justify-between gap-4 rounded-lg border p-3 sm:p-4">
												<div className="space-y-0.5">
													<FormLabel className="text-sm font-medium sm:text-base">
														Random Turn Order
													</FormLabel>
													<FormDescription className="text-xs sm:text-sm">
														Randomize player order each round.
													</FormDescription>
												</div>
												<FormControl>
													<Switch
														checked={field.value}
														onCheckedChange={field.onChange}
													/>
												</FormControl>
											</FormItem>
										)}
									/>
								</CardContent>
								<CardFooter className="px-4 pt-2 pb-5 sm:px-6 sm:pb-6">
									<Button type="submit" size="lg" className="w-full">
										Start Game
									</Button>
								</CardFooter>
							</form>
						</Form>
					</>
				)}
			</Card>
		</div>
	);
}
