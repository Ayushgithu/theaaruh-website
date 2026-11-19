"use client";
import * as React from "react";
import { Check, Tag, X } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { CouponState } from "@/hooks/use-coupon";

/** "Have a coupon?" box with the offers the owner made visible. Shown in the bag and at checkout. */
export function CouponBox({ coupon }: { coupon: CouponState }) {
  const { offers, applied, apply, remove, busy, error, clearError } = coupon;
  const [text, setText] = React.useState("");
  const [open, setOpen] = React.useState(false);

  if (applied) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white"><Check className="h-4 w-4" strokeWidth={3} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-emerald-800">&ldquo;{applied.code}&rdquo; applied</p>
            <p className="text-xs text-emerald-700">{applied.discount > 0 ? `You save ${formatPrice(applied.discount)}` : "Free delivery on this order"}</p>
          </div>
          <button type="button" onClick={remove} aria-label="Remove coupon" className="rounded-full p-1.5 text-emerald-800 hover:bg-emerald-100"><X className="h-4 w-4" /></button>
        </div>
      </div>
    );
  }

  const submit = async (c: string) => { if (await apply(c)) setText(""); };
  return (
    <div>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open || offers.length > 0} className="flex w-full items-center gap-2 text-sm font-semibold text-ink">
        <Tag className="h-4 w-4 text-primary" /> Have a coupon?
        <span className="ml-auto text-xs font-medium text-primary">{open ? "Hide" : "Enter code"}</span>
      </button>
      {(open || error) && (
        <form className="mt-3" onSubmit={(e) => { e.preventDefault(); void submit(text); }}>
          <div className="flex gap-2">
            <input value={text} onChange={(e) => { setText(e.target.value.toUpperCase()); if (error) clearError(); }} placeholder="Enter coupon code" maxLength={30} autoCapitalize="characters" aria-label="Coupon code" aria-invalid={!!error}
              className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-card px-3.5 text-sm uppercase text-ink outline-none transition placeholder:normal-case placeholder:text-body/60 focus:border-primary focus:ring-2 focus:ring-primary/15" />
            <Button type="submit" variant="outline" disabled={busy || !text.trim()} className="h-11 rounded-xl">{busy ? "Checking…" : "Apply"}</Button>
          </div>
          {error && <p role="alert" className="mt-2 text-sm font-medium text-red-600">{error}</p>}
        </form>
      )}
      {offers.length > 0 && (
        <ul className="mt-3 space-y-2" aria-label="Available offers">
          {offers.map((o) => (
            <li key={o.code} className={cn("rounded-xl border border-dashed p-3", o.eligible ? "border-primary/50 bg-primary-faint" : "border-line bg-surface")}>
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{o.title}</p>
                  <p className="mt-0.5"><span className="inline-block rounded-md border border-dashed border-primary/60 bg-card px-2 py-0.5 font-mono text-xs font-bold tracking-wider text-primary">{o.code}</span></p>
                  {o.description && <p className="mt-1 text-xs">{o.description}</p>}
                  {o.eligible
                    ? <p className="mt-1 text-xs font-semibold text-emerald-700">{o.freeShipping ? "Free delivery" : `You save ${formatPrice(o.saving)}`}</p>
                    : o.reason && <p className="mt-1 text-xs font-medium text-amber-700">{o.reason}</p>}
                </div>
                <Button type="button" size="sm" variant={o.eligible ? "primary" : "outline"} disabled={!o.eligible || busy} onClick={() => void submit(o.code)} className="shrink-0 rounded-full">Apply</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}