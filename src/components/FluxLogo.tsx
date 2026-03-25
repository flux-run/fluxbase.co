import { cn } from "@/lib/utils";

export function FluxLogo({ className }: { className?: string }) {
  return (
    <svg 
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
