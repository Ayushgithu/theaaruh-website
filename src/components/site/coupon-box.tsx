"use client";
import * as React from "react";
import { Check, ChevronDown, Gift, Tag, X } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import type { CouponState } from "@/hooks/use-coupon";

/** Coupons in the bag and at checkout: a closed row that opens into ticket-style offers, plus a bar that shows how close the next coupon is. */
export function CouponBox({ coupon }: { coupon: CouponState }) {
  const { offers, subtotal, applied, hold, apply, remove, busy, error, clearError } = coupon;
  const [text, setText] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const shown = open || !!error;

  const usable = offers.filter((o) => o.eligible).length;
  const next = offers.filter((o) => !o.eligible && (o.needs ?? 0) > 0).sort((a, b) => (a.needs ?? 0) - (b.needs ?? 0))[0];
  const submit = async (c: string) => { if (await apply(c)) { setText(""); setOpen(false); } };

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

  return (
    <div className="space-y-3">
      {hold && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white"><Tag className="h-4 w-4" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-amber-900">&ldquo;{hold.code}&rdquo; is saved</p>
              <p className="text-xs text-amber-800">{hold.reason}</p>
            </div>
            <button type="button" onClick={remove} aria-label="Remove coupon" className="rounded-full p-1.5 text-amber-900 hover:bg-amber-100"><X className="h-4 w-4" /></button>
          </div>
        </div>
      )}

      {next && next.minOrder ? (
        <div className="rounded-xl border border-primary/20 bg-primary-faint p-3.5">
          <p className="flex items-start gap-2 text-sm text-ink"><Gift className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>Add <strong>{formatPrice(next.needs ?? 0)}</strong> more to unlock <strong className="font-mono tracking-wide text-primary">{next.code}</strong>{(next.unlockSaving ?? 0) > 0 && <> and save <strong>{formatPrice(next.unlockSaving ?? 0)}</strong></>}</span>
          </p>
          <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-card" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(Math.min(100, (subtotal / next.minOrder) * 100))} aria-label="Progress to the next coupon">
            <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${Math.min(100, (subtotal / next.minOrder) * 100)}%` }} />
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-line">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={shown} aria-controls="coupon-panel" className="flex min-h-12 w-full items-center gap-2.5 px-3.5 text-left">
          <Tag className="h-4 w-4 shrink-0 text-primary" />
          <span className="text-sm font-semibold text-ink">Coupons &amp; offers</span>
          {usable > 0 && <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-white">{usable} available</span>}
          <ChevronDown className={cn("ml-auto h-4 w-4 shrink-0 transition-transform", shown && "rotate-180")} />
        </button>

        {shown && (
          <div id="coupon-panel" className="space-y-3 border-t border-line p-3.5">
            <form onSubmit={(e) => { e.preventDefault(); void submit(text); }}>
              <div className="flex gap-2">
                <input value={text} onChange={(e) => { setText(e.target.value.toUpperCase()); if (error) clearError(); }} placeholder="Have a code? Enter it here" maxLength={30} autoCapitalize="characters" aria-label="Coupon code" aria-invalid={!!error}
                  className="h-11 min-w-0 flex-1 rounded-lg border border-line bg-card px-3.5 text-sm uppercase text-ink outline-none transition placeholder:normal-case placeholder:text-body/60 focus:border-primary focus:ring-2 focus:ring-primary/15" />
                <button type="submit" disabled={busy || !text.trim()} className="h-11 shrink-0 rounded-lg bg-ink px-5 text-sm font-semibold text-card transition hover:opacity-90 disabled:opacity-40">{busy ? "Checking…" : "Apply"}</button>
              </div>
              {error && <p role="alert" className="mt-2 text-sm font-medium text-red-600">{error}</p>}
            </form>

            {offers.length > 0 ? (
              <ul className="space-y-3" aria-label="Available offers">
                {offers.map((o) => (
                  <li key={o.code} className={cn("relative flex overflow-hidden rounded-xl border bg-card", o.eligible ? "border-primary/40" : "border-line")}>
                    {/* the two round notches where the ticket tears */}
                    <span aria-hidden className="absolute left-[5.5rem] top-0 z-10 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-line bg-card" />
                    <span aria-hidden className="absolute bottom-0 left-[5.5rem] z-10 h-3.5 w-3.5 -translate-x-1/2 translate-y-1/2 rounded-full border border-line bg-card" />
                    <div className={cn("flex w-[5.5rem] shrink-0 items-center justify-center px-2 py-3 text-center text-sm font-extrabold uppercase leading-tight tracking-wide text-white", o.eligible ? "bg-primary" : "bg-slate-400")}>{o.label}</div>
                    <div className="min-w-0 flex-1 border-l-2 border-dashed border-line p-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 text-sm font-semibold leading-snug text-ink">{o.title}</p>
                        <button type="button" disabled={!o.eligible || busy} onClick={() => void submit(o.code)}
                          className={cn("shrink-0 rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition", o.eligible ? "border border-primary text-primary hover:bg-primary hover:text-white" : "cursor-not-allowed text-body/50")}>Apply</button>
                      </div>
                      <p className="mt-1.5"><span className="inline-block rounded border border-dashed border-primary/60 px-2 py-0.5 font-mono text-xs font-bold tracking-wider text-primary">{o.code}</span></p>
                      {o.description && <p className="mt-1.5 text-xs leading-relaxed">{o.description}</p>}
                      {o.payNote && <p className="mt-1.5 text-xs font-medium text-ink/80">{o.payNote}</p>}
                      {o.eligible
                        ? <p className="mt-1.5 text-xs font-semibold text-emerald-700">{o.freeShipping ? "You get free delivery" : `You save ${formatPrice(o.saving)} on this bag`}</p>
                        : o.reason && <p className="mt-1.5 text-xs font-medium text-amber-700">{o.reason}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm">No offers right now. Have a code? Type it above.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}