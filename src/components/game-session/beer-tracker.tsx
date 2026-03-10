import { cn } from "@/lib/utils";
import { BeerBottle } from "./beer-bottle";

const SIPS_PER_BEER = 14;
const MAX_INDIVIDUAL_BOTTLES = 6;

interface BeerTrackerProps {
  sipsDrunk: number;
}

export function BeerTracker({ sipsDrunk }: BeerTrackerProps) {
  if (sipsDrunk <= 0) return null;

  const fullBeers = Math.floor(sipsDrunk / SIPS_PER_BEER);
  const currentProgress = (sipsDrunk % SIPS_PER_BEER) / SIPS_PER_BEER;
  const totalBottles = fullBeers + (currentProgress > 0 ? 1 : 0);
  const beersDisplay = (sipsDrunk / SIPS_PER_BEER).toFixed(1);
  const title = `${beersDisplay} beers (${sipsDrunk} sips)`;
  const beerSize = "h-10 w-auto sm:h-16";

  const remainingLevel = 1 - currentProgress;

  if (totalBottles > MAX_INDIVIDUAL_BOTTLES) {
    return (
      <div className="flex items-center gap-1" title={title}>
        <BeerBottle fillLevel={0} className={cn(beerSize, "text-amber-500")} />
        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
          &times;{beersDisplay}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2" title={title}>
      {Array.from({ length: fullBeers }, (_, i) => (
        <BeerBottle
          // biome-ignore lint/suspicious/noArrayIndexKey: static identical elements
          key={`empty-${i}`}
          fillLevel={0}
          className={cn(beerSize, "text-amber-500")}
        />
      ))}
      {currentProgress > 0 && (
        <BeerBottle
          fillLevel={remainingLevel}
          className={cn(beerSize, "text-amber-500")}
        />
      )}
    </div>
  );
}
