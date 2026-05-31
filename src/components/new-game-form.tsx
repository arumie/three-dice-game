"use client";

import { useState, useEffect, useCallback, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  X,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Info,
  UserPlus,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { ThreeDiceLogo } from "@/components/three-dice-logo";
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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
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
import {
  createGameAction,
  verifyOrRegisterPlayerAction,
  type CreateGameResult,
  type VerifyResult,
} from "@/app/actions";
import { toast } from "sonner";

const MIN_PLAYERS = 3;
const MAX_PLAYERS = 20;
const MIN_LOADING_MS = 2000;

const USERNAME_REGEX = /^[a-zA-Z0-9_-]+$/;

const newGameSchema = z.object({
  name: z.string().min(1, "Game name is required").max(100),
  password: z.string().min(1, "Password is required").max(100),
  creationPassword: z.string().optional(),
  players: z
    .array(
      z.object({
        name: z
          .string()
          .min(1, "Player name is required")
          .max(30, "Player name must be 30 characters or less"),
        playerPassword: z.string().max(100).optional(),
        playerId: z.number().optional(),
        verifyStatus: z
          .enum([
            "idle",
            "verifying",
            "verified",
            "available",
            "admin_verified",
            "wrong_password",
            "invalid_username",
          ])
          .optional(),
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
    )
    .refine(
      (players) => {
        const ids = players
          .map((p) => p.playerId)
          .filter((id): id is number => id != null);
        return new Set(ids).size === ids.length;
      },
      { message: "A registered player can only appear once per game" },
    ),
  randomTurnOrder: z.boolean(),
});

type NewGameFormValues = z.infer<typeof newGameSchema>;

const DEFAULT_PLAYERS = Array.from({ length: MIN_PLAYERS }, () => ({
  name: "",
  playerPassword: "",
  playerId: undefined as number | undefined,
  verifyStatus: "idle" as const,
}));

interface NewGameFormProps {
  requiresCreationPassword?: boolean;
  inProgressCount?: number;
}

type PlayerVerifyStatus = NonNullable<
  NewGameFormValues["players"][number]["verifyStatus"]
>;

function VerifyIndicator({ status }: { status: PlayerVerifyStatus }) {
  let content: React.ReactNode = null;

  switch (status) {
    case "verifying":
      content = (
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      );
      break;
    case "verified":
      content = <Check className="size-4 text-green-600 dark:text-green-400" />;
      break;
    case "admin_verified":
      content = (
        <ShieldCheck className="size-4 text-green-600 dark:text-green-400" />
      );
      break;
    case "available":
      content = (
        <UserPlus className="size-4 text-blue-600 dark:text-blue-400" />
      );
      break;
    case "wrong_password":
    case "invalid_username":
      content = <AlertCircle className="size-4 text-destructive" />;
      break;
  }

  return (
    <span className="flex size-4 shrink-0 items-center justify-center">
      {content}
    </span>
  );
}

export function NewGameForm({
  requiresCreationPassword = false,
  inProgressCount = 0,
}: NewGameFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showCreationPassword, setShowCreationPassword] = useState(false);
  const [showPlayerPasswords, setShowPlayerPasswords] = useState<
    Record<number, boolean>
  >({});

  useEffect(() => {
    setIsLoading(false);
  }, []);

  const form = useForm<NewGameFormValues>({
    resolver: zodResolver(newGameSchema),
    defaultValues: {
      name: "",
      password: "",
      creationPassword: "",
      players: DEFAULT_PLAYERS,
      randomTurnOrder: false,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "players",
  });

  const verifyPlayer = useCallback(
    async (index: number) => {
      const name = form.getValues(`players.${index}.name`).trim();
      const pw = form.getValues(`players.${index}.playerPassword`) ?? "";

      if (!name || !pw) return;

      form.setValue(`players.${index}.verifyStatus`, "verifying");
      form.setValue(`players.${index}.playerId`, undefined);

      try {
        const result = await verifyOrRegisterPlayerAction(name, pw);

        form.setValue(
          `players.${index}.verifyStatus`,
          result.status as PlayerVerifyStatus,
        );

        if ("playerId" in result) {
          form.setValue(`players.${index}.playerId`, result.playerId);
        }

        if (result.status === "wrong_password") {
          toast.error(`Wrong password for "${name}"`);
        } else if (result.status === "available") {
          toast.success(`"${name}" will be registered when the game starts`);
        } else if (result.status === "invalid_username") {
          toast.error(
            "Username can only contain letters, digits, spaces, hyphens and underscores",
          );
        }
      } catch {
        form.setValue(`players.${index}.verifyStatus`, "idle");
        toast.error("Verification failed. Please try again.");
      }
    },
    [form],
  );

  const handlePlayerFieldEvent = useCallback(
    (index: number, event: React.KeyboardEvent | React.FocusEvent) => {
      if (event.type === "keydown") {
        const ke = event as React.KeyboardEvent;
        if (ke.key !== "Enter") return;
        ke.preventDefault();
      }

      const name = form.getValues(`players.${index}.name`).trim();
      const pw = form.getValues(`players.${index}.playerPassword`) ?? "";
      if (name && pw) {
        verifyPlayer(index);
      }
    },
    [form, verifyPlayer],
  );

  const resetVerification = useCallback(
    (index: number) => {
      const current = form.getValues(`players.${index}.verifyStatus`);
      if (current !== "idle" && current !== "verifying") {
        form.setValue(`players.${index}.verifyStatus`, "idle");
        form.setValue(`players.${index}.playerId`, undefined);
      }
    },
    [form],
  );

  const onSubmit = useCallback(
    async (values: NewGameFormValues) => {
      setIsLoading(true);
      try {
        const [result] = (await Promise.all([
          createGameAction({
            name: values.name,
            password: values.password,
            players: values.players.map((p) => ({
              name: p.name.trim(),
              playerId: p.playerId,
              playerPassword:
                p.verifyStatus === "available" ? p.playerPassword : undefined,
            })),
            randomTurnOrder: values.randomTurnOrder,
            creationPassword: values.creationPassword,
          }),
          new Promise((resolve) => setTimeout(resolve, MIN_LOADING_MS)),
        ])) as [CreateGameResult, unknown];

        if ("duplicateGameId" in result) {
          setIsLoading(false);
          toast("A game with these settings is already in progress.", {
            action: {
              label: "Go to game",
              onClick: () =>
                router.push(`/game-session/${result.duplicateGameId}`),
            },
            duration: 10000,
          });
          return;
        }

        router.push(`/game-session/${result.id}`);
      } catch {
        setIsLoading(false);
        toast.error("Something went wrong. Please try again.");
      }
    },
    [router],
  );

  const canRemove = fields.length > MIN_PLAYERS;
  const canAdd = fields.length < MAX_PLAYERS;

  return (
    <div className="flex w-full flex-col items-center">
      <div className="mb-8 flex flex-col items-center gap-2 md:mb-10">
        <div className="flex items-center justify-center rounded-xl bg-primary text-primary-foreground p-2 md:p-2.5">
          <ThreeDiceLogo size="md" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
          Three Dice Game
        </h1>
      </div>

      {inProgressCount > 0 && (
        <div className="mb-4 w-full max-w-sm sm:max-w-md">
          <Button variant="outline" asChild className="w-full text-primary">
            <Link href="/games">
              {inProgressCount} {inProgressCount === 1 ? "game" : "games"} in
              progress
            </Link>
          </Button>
        </div>
      )}

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
              <div>
                <CardContent className="flex flex-col gap-5 px-4 sm:gap-6 sm:px-6">
                  <form onSubmit={form.handleSubmit(onSubmit)}>
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
                  </form>

                  <form onSubmit={form.handleSubmit(onSubmit)}>
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Game Password</FormLabel>
                          <InputGroup>
                            <FormControl>
                              <InputGroupInput
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter a password"
                                autoComplete="current-password"
                                {...field}
                              />
                            </FormControl>
                            <InputGroupAddon align="inline-end">
                              <InputGroupButton
                                size="icon-xs"
                                onClick={() => setShowPassword((v) => !v)}
                              >
                                {showPassword ? (
                                  <EyeOff className="size-4" />
                                ) : (
                                  <Eye className="size-4" />
                                )}
                                <span className="sr-only">
                                  {showPassword ? "Hide" : "Show"} password
                                </span>
                              </InputGroupButton>
                            </InputGroupAddon>
                          </InputGroup>
                          <FormDescription className="text-xs sm:text-sm">
                            Required to access the game session.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </form>

                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <FormLabel>Players ({fields.length})</FormLabel>
                        {canAdd && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              append({
                                name: "",
                                playerPassword: "",
                                playerId: undefined,
                                verifyStatus: "idle",
                              })
                            }
                          >
                            <Plus className="size-4" />
                            Add Player
                          </Button>
                        )}
                      </div>
                      <div className="flex gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2.5">
                        <Info className="mt-0.5 size-4 shrink-0 text-primary" />
                        <div className="flex flex-col gap-0.5">
                          <p className="text-xs font-medium sm:text-sm">
                            Want to track your stats?
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Add a password next to a player name to create a
                            profile with stats across games. Or leave it blank
                            to join as a guest.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      {fields.map((field, index) => {
                        const verifyStatus =
                          form.watch(`players.${index}.verifyStatus`) ?? "idle";
                        const showPw = showPlayerPasswords[index] ?? false;

                        return (
                          <div key={field.id} className="flex flex-col gap-1">
                            <form
                              className="flex flex-col gap-1 sm:flex-row sm:gap-2"
                              onSubmit={(e) => e.preventDefault()}
                            >
                              <FormField
                                control={form.control}
                                name={`players.${index}.name`}
                                render={({ field: nameField }) => (
                                  <FormItem className="flex-1">
                                    <FormControl>
                                      <Input
                                        placeholder={`Player ${index + 1}`}
                                        autoComplete="username"
                                        maxLength={30}
                                        {...nameField}
                                        onChange={(e) => {
                                          nameField.onChange(e);
                                          resetVerification(index);
                                        }}
                                        onBlur={(e) => {
                                          nameField.onBlur();
                                          handlePlayerFieldEvent(index, e);
                                        }}
                                        onKeyDown={(e) =>
                                          handlePlayerFieldEvent(index, e)
                                        }
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <div className="flex items-center gap-1">
                                <FormField
                                  control={form.control}
                                  name={`players.${index}.playerPassword`}
                                  render={({ field: pwField }) => (
                                    <FormItem className="flex-1">
                                      <InputGroup>
                                        <FormControl>
                                          <InputGroupInput
                                            type={showPw ? "text" : "password"}
                                            placeholder="Password (optional)"
                                            autoComplete="current-password"
                                            {...pwField}
                                            onChange={(e) => {
                                              pwField.onChange(e);
                                              resetVerification(index);
                                            }}
                                            onBlur={(e) => {
                                              pwField.onBlur();
                                              handlePlayerFieldEvent(index, e);
                                            }}
                                            onKeyDown={(e) =>
                                              handlePlayerFieldEvent(index, e)
                                            }
                                          />
                                        </FormControl>
                                        <InputGroupAddon align="inline-end">
                                          <VerifyIndicator
                                            status={verifyStatus}
                                          />
                                          <InputGroupButton
                                            size="icon-xs"
                                            onClick={() =>
                                              setShowPlayerPasswords(
                                                (prev) => ({
                                                  ...prev,
                                                  [index]: !prev[index],
                                                }),
                                              )
                                            }
                                          >
                                            {showPw ? (
                                              <EyeOff className="size-3.5" />
                                            ) : (
                                              <Eye className="size-3.5" />
                                            )}
                                          </InputGroupButton>
                                        </InputGroupAddon>
                                      </InputGroup>
                                    </FormItem>
                                  )}
                                />
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
                            </form>
                            {verifyStatus === "wrong_password" && (
                              <p className="text-xs text-destructive">
                                Wrong password for this player
                              </p>
                            )}
                            {verifyStatus === "invalid_username" && (
                              <p className="text-xs text-destructive">
                                Only letters, digits, hyphens and underscores
                                allowed
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {form.formState.errors.players?.root && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.players.root.message}
                      </p>
                    )}

                    {canAdd && (
                      <p className="text-xs text-muted-foreground">
                        {MIN_PLAYERS}&ndash;{MAX_PLAYERS} players allowed.
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
                  {requiresCreationPassword && (
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                      <FormField
                        control={form.control}
                        name="creationPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Creation Password</FormLabel>
                            <InputGroup>
                              <FormControl>
                                <InputGroupInput
                                  type={
                                    showCreationPassword ? "text" : "password"
                                  }
                                  placeholder="Enter creation password"
                                  autoComplete="current-password"
                                  {...field}
                                />
                              </FormControl>
                              <InputGroupAddon align="inline-end">
                                <InputGroupButton
                                  size="icon-xs"
                                  onClick={() =>
                                    setShowCreationPassword((v) => !v)
                                  }
                                >
                                  {showCreationPassword ? (
                                    <EyeOff className="size-4" />
                                  ) : (
                                    <Eye className="size-4" />
                                  )}
                                  <span className="sr-only">
                                    {showCreationPassword ? "Hide" : "Show"}{" "}
                                    creation password
                                  </span>
                                </InputGroupButton>
                              </InputGroupAddon>
                            </InputGroup>
                            <FormDescription className="text-xs sm:text-sm">
                              This game is still in development. A special
                              password is required to create new games.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </form>
                  )}
                </CardContent>
                <CardFooter className="px-4 pt-2 pb-5 sm:px-6 sm:pb-6">
                  <Button
                    type="button"
                    size="lg"
                    className="w-full"
                    onClick={form.handleSubmit(onSubmit)}
                  >
                    Start Game
                  </Button>
                </CardFooter>
              </div>
            </Form>
          </>
        )}
      </Card>
    </div>
  );
}
