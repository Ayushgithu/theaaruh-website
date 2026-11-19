"use client";
import * as React from "react";
import { Check, Copy } from "lucide-react";

/** The coupon code as a small tap-to-copy chip. */
export function CopyCode({ code }: { code: string }) {
  const [done, setDone] = React.useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setDone(true); setTimeout(() => setDone(false), 1800); } catch { /* clipboard blocked */ }
  };
  return (
    <button type="button" onClick={() => void copy()} aria-label={`Copy coupon code ${code}`} className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-primary/60 bg-card px-2 py-0.5 font-mono text-xs font-bold tracking-wider text-primary transition hover:bg-primary-faint">
      {code}{done ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}