import {
  AlertCircle,
  Check,
  Loader2,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import type { PlayerVerifyStatus } from "@/lib/player-validation";

export function VerifyIndicator({ status }: { status: PlayerVerifyStatus }) {
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
