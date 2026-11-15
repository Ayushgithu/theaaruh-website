"use client";
import type { Product } from "@/lib/types";
import { discountPct, formatPrice } from "@/lib/utils";
import { useSharedVariant } from "./variant-context";

/** Price block of the product page. Changes when the customer picks a kid's size that costs more. */
export function ProductPrice({ product: p }: { product: Product }) {
  const v = useSharedVariant();
  const price = v?.price ?? p.price;
  const mrp = v ? v.mrp : p.mrp;
  const off = discountPct(price, mrp);
  return (
    <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span className="text-3xl font-bold text-ink">{formatPrice(price)}</span>
      {mrp && mrp > price && <span className="text-lg text-slate-500 line-through">{formatPrice(mrp)}</span>}
      {off > 0 && <span className="rounded-full bg-primary-faint px-3 py-1 text-sm font-bold text-primary">{off}% OFF</span>}
    </div>
  );
}