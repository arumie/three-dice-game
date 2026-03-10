import { useId } from "react";

interface BeerBottleProps {
  fillLevel: number;
  className?: string;
}

const BOTTLE_PATH =
  "M10.5 1h3v1.5h-.25v4C13.25 8 15.5 10.5 15.5 14v12H8.5V14C8.5 10.5 10.75 8 10.75 6.5v-4h-.25z";

const FILLABLE_TOP = 2.5;
const FILLABLE_BOTTOM = 26;
const FILLABLE_HEIGHT = FILLABLE_BOTTOM - FILLABLE_TOP;

export function BeerBottle({ fillLevel, className }: BeerBottleProps) {
  const id = useId();
  const clamped = Math.max(0, Math.min(1, fillLevel));
  const fillHeight = clamped * FILLABLE_HEIGHT;
  const fillY = FILLABLE_BOTTOM - fillHeight;

  return (
    <svg
      viewBox="7 0 10 27"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {clamped > 0 && (
        <defs>
          <clipPath id={`bf-${id}`}>
            <rect x="0" y={fillY} width="24" height={fillHeight} />
          </clipPath>
        </defs>
      )}
      <path
        d={BOTTLE_PATH}
        stroke="currentColor"
        strokeWidth="1.0"
        strokeLinejoin="round"
      />
      {clamped > 0 && (
        <path
          d={BOTTLE_PATH}
          fill="currentColor"
          opacity="0.35"
          clipPath={`url(#bf-${id})`}
        />
      )}
    </svg>
  );
}
