import Link from "next/link";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HomeButton() {
  return (
    <Button variant="ghost" size="sm" asChild className="gap-1.5">
      <Link href="/">
        <Home className="size-4" />
        Home
      </Link>
    </Button>
  );
}
