import { cn } from "@/lib/utils";
import type { EnquiryStatus, Stock } from "@/lib/types";
import { CheckCircle2, CircleAlert, CircleOff } from "lucide-react";

export function Badge({ className, ...p }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full bg-primary-faint px-2.5 py-1 text-xs font-semibold text-primary", className)}
      {...p}
    />
  );
}

export function StockBadge({ stock, count, className }: { stock: Stock; count?: number; className?: string }) {
  const map = {
    "in-stock": { label: "In stock", cls: "text-emerald-700", Icon: CheckCircle2 },
    low: { label: count ? `Only ${count} left` : "Low stock", cls: "text-amber-700", Icon: CircleAlert },
    out: { label: "Sold out", cls: "text-slate-500", Icon: CircleOff },
  }[stock];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold", map.cls, className)}>
      <map.Icon className="h-3.5 w-3.5" aria-hidden /> {map.label}
    </span>
  );
}

export function StatusBadge({ status }: { status: EnquiryStatus }) {
  const map = {
    new: "bg-blue-50 text-blue-700 ring-blue-200",
    contacted: "bg-amber-50 text-amber-700 ring-amber-200",
    closed: "bg-slate-100 text-slate-600 ring-slate-200",
  }[status];
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset", map)}>
      {status}
    </span>
  );
}