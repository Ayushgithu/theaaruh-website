import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/** Read-only star row that can show part of a star (4.6 fills 4 and a bit). */
export function Stars({ value, size = 16, className }: { value: number; size?: number; className?: string }) {
  const row = (cls: string) => (
    <span className="inline-flex gap-0.5">{Array.from({ length: 5 }).map((_, i) => <Star key={i} width={size} height={size} className={cls} />)}</span>
  );
  return (
    <span role="img" aria-label={`${value} out of 5 stars`} className={cn("relative inline-flex shrink-0", className)}>
      {row("text-line fill-line")}
      <span className="absolute inset-y-0 left-0 overflow-hidden whitespace-nowrap" style={{ width: `${Math.max(0, Math.min(5, value)) * 20}%` }}>{row("fill-gold text-gold")}</span>
    </span>
  );
}