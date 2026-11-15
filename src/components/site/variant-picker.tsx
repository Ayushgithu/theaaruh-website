"use client";
import * as React from "react";
import { Check } from "lucide-react";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";
import { joinSize } from "@/lib/size-variant";

/** Size + colour selection state shared by the product page and the quick-view popup. */
export function useVariant(product: Pick<Product, "sizes" | "kidSizes" | "colors" | "price" | "mrp">) {
  const sizes = product.sizes ?? [];
  const kidSizes = product.kidSizes ?? [];
  const colors = product.colors ?? [];
  const [kid, setKid] = React.useState<string | undefined>(() => (kidSizes.length === 1 ? kidSizes[0].label : undefined));
  const [size, setSize] = React.useState<string | undefined>(() => (sizes.length === 1 && sizes[0].qty > 0 ? sizes[0].label : undefined));
  const [color, setColor] = React.useState<string | undefined>(() => colors[0]?.name);
  const needSize = sizes.length > 0;
  const needKid = kidSizes.length > 0;
  const qtyLeft = needSize ? sizes.find((s) => s.label === size)?.qty : undefined;
  // the kid's size can add an extra price (set in the dashboard); stock is only on the women's size
  const extra = needKid && kid ? Math.max(0, kidSizes.find((k) => k.label === kid)?.extra ?? 0) : 0;
  const price = product.price + extra;
  const mrp = product.mrp != null ? product.mrp + extra : undefined;
  /** What is sent to the bag: "M", "Kids 3-4 Yr" or "M + Kids 3-4 Yr". */
  const sizeValue = joinSize(needSize ? size : undefined, needKid ? kid : undefined);
  const missing = needSize && !size ? "size" : needKid && !kid ? "kid" : null;
  return { sizes, kidSizes, colors, size, setSize, kid, setKid, color, setColor, needSize, needKid, qtyLeft, extra, price, mrp, sizeValue, missing };
}

export function SizePicker({ sizes, value, onChange, invalid }: { sizes: { label: string; qty: number }[]; value?: string; onChange: (s: string) => void; invalid?: boolean }) {
  const sel = sizes.find((s) => s.label === value);
  return (
    <div>
      <div role="radiogroup" aria-label="Size" className={cn("flex flex-wrap gap-2 rounded-xl", invalid && "ring-2 ring-red-300 ring-offset-4")}>
        {sizes.map((s) => {
          const out = s.qty <= 0;
          const on = value === s.label;
          return (
            <button
              key={s.label}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={`Size ${s.label}${out ? ", sold out" : ""}`}
              disabled={out}
              onClick={() => onChange(s.label)}
              className={cn(
                "relative flex h-11 min-w-12 items-center justify-center rounded-full border px-4 text-sm font-semibold transition",
                on ? "border-ink bg-ink text-card" : "border-line bg-card text-ink hover:border-ink",
                out && "cursor-not-allowed border-dashed text-slate-500 line-through opacity-60 hover:border-line",
              )}
            >
              {s.label}
            </button>
          );
        })}
      </div>
      {sel && sel.qty > 0 && sel.qty <= 3 && <p className="mt-2 text-xs font-semibold text-warning">Only {sel.qty} left in size {sel.label}</p>}
    </div>
  );
}

/** Kids' age sizes. No stock numbers; the price above updates when a size costs more. */
export function KidSizePicker({ sizes, value, onChange, invalid }: { sizes: { label: string; extra: number }[]; value?: string; onChange: (s: string) => void; invalid?: boolean }) {
  return (
    <div role="radiogroup" aria-label="Kid's size" className={cn("flex flex-wrap gap-2 rounded-xl", invalid && "ring-2 ring-red-300 ring-offset-4")}>
      {sizes.map((s) => {
        const on = value === s.label;
        return (
          <button
            key={s.label}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(s.label)}
            className={cn("flex h-11 min-w-12 items-center justify-center rounded-full border px-4 text-sm font-semibold leading-tight transition", on ? "border-ink bg-ink text-card" : "border-line bg-card text-ink hover:border-ink")}
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );
}

export function ColorPicker({ colors, value, onChange }: { colors: { name: string; hex?: string }[]; value?: string; onChange: (c: string) => void }) {
  return (
    <div role="radiogroup" aria-label="Colour" className="flex flex-wrap gap-2.5">
      {colors.map((c) => {
        const on = value === c.name;
        return c.hex ? (
          <button key={c.name} type="button" role="radio" aria-checked={on} aria-label={c.name} title={c.name} onClick={() => onChange(c.name)}
            className={cn("flex h-9 w-9 items-center justify-center rounded-full border-2 transition", on ? "border-ink" : "border-transparent ring-1 ring-line hover:ring-ink")}>
            <span className="flex h-7 w-7 items-center justify-center rounded-full ring-1 ring-black/10" style={{ background: c.hex }}>{on && <Check className="h-3.5 w-3.5 text-white mix-blend-difference" />}</span>
          </button>
        ) : (
          <button key={c.name} type="button" role="radio" aria-checked={on} onClick={() => onChange(c.name)}
            className={cn("rounded-full border px-3.5 py-1.5 text-sm font-medium transition", on ? "border-ink bg-ink text-card" : "border-line bg-card text-ink hover:border-ink")}>{c.name}</button>
        );
      })}
    </div>
  );
}