import { cn } from "@/lib/utils";

interface ThreeDiceLogoProps {
	className?: string;
	size?: "xs" | "sm" | "md" | "lg";
}

const sizeMap = {
	xs: "h-3.5",
	sm: "h-6",
	md: "h-8 md:h-9",
	lg: "h-12 md:h-14",
};

// Rounded rect path: M(x+r,y) H(x+w-r) arc to (x+w,y+r) V(y+h-r) arc to (x+w-r,y+h) H(x+r) arc to (x,y+h-r) V(y+r) arc to (x+r,y)Z
// Circle cutout: M(cx-r,cy) A(r,r,0,1,0,cx+r,cy) A(r,r,0,1,0,cx-r,cy)Z

// Die 1: rect (5,5) 20x20 r=3, 1 dot at center (15,15) r=2
const die1 = [
	"M8,5 H22 A3,3,0,0,1,25,8 V22 A3,3,0,0,1,22,25 H8 A3,3,0,0,1,5,22 V8 A3,3,0,0,1,8,5Z",
	"M13,15 A2,2,0,1,0,17,15 A2,2,0,1,0,13,15Z",
].join(" ");

// Die 2: rect (18,18) 20x20 r=3, 2 dots at (33,23) and (23,33) r=1.8
const die2 = [
	"M21,18 H35 A3,3,0,0,1,38,21 V35 A3,3,0,0,1,35,38 H21 A3,3,0,0,1,18,35 V21 A3,3,0,0,1,21,18Z",
	"M31.2,23 A1.8,1.8,0,1,0,34.8,23 A1.8,1.8,0,1,0,31.2,23Z",
	"M21.2,33 A1.8,1.8,0,1,0,24.8,33 A1.8,1.8,0,1,0,21.2,33Z",
].join(" ");

// Die 3: rect (32,32) 20x20 r=3, 3 dots at (47,37), (42,42), (37,47) r=1.6
const die3 = [
	"M35,32 H49 A3,3,0,0,1,52,35 V49 A3,3,0,0,1,49,52 H35 A3,3,0,0,1,32,49 V35 A3,3,0,0,1,35,32Z",
	"M45.4,37 A1.6,1.6,0,1,0,48.6,37 A1.6,1.6,0,1,0,45.4,37Z",
	"M40.4,42 A1.6,1.6,0,1,0,43.6,42 A1.6,1.6,0,1,0,40.4,42Z",
	"M35.4,47 A1.6,1.6,0,1,0,38.6,47 A1.6,1.6,0,1,0,35.4,47Z",
].join(" ");

export function ThreeDiceLogo({ className, size = "md" }: ThreeDiceLogoProps) {
	return (
		<svg
			viewBox="0 0 57 57"
			fill="currentColor"
			fillRule="evenodd"
			xmlns="http://www.w3.org/2000/svg"
			className={cn(sizeMap[size], "w-auto", className)}
			aria-hidden="true"
		>
			<path d={die1} transform="rotate(-10 15 15)" />
			<path d={die2} />
			<path d={die3} transform="rotate(8 42 42)" />
		</svg>
	);
}
