import { cn } from "@/lib/utils";

interface FluxLogoProps {
  className?: string;
  size?: number;
}

export function FluxLogo({ className, size = 24 }: FluxLogoProps) {
  return (
    <svg 
      width={size}
      height={size}
      viewBox="0 0 100 100" 
      fill="currentColor" 
      className={cn("text-current", className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" />
      <path d="M50 20 L50 40 M20 50 L40 50 M50 60 L50 80 M60 50 L80 50" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
      <path d="M35 35 L65 65 M35 65 L65 35" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
    </svg>
  );
}

// Alias for compatibility with pre-existing pages (e.g. not-found.tsx)
export const FluxIcon = FluxLogo;
