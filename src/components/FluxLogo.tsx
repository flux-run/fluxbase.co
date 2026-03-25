import { cn } from "@/lib/utils";

interface FluxLogoProps {
  className?: string;
  size?: number;
}

export function FluxLogo({ className, size = 24 }: FluxLogoProps) {
  return null;
}

// Alias for compatibility with pre-existing pages (e.g. not-found.tsx)
export const FluxIcon = FluxLogo;
