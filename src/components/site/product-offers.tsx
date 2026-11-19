import { Tag } from "lucide-react";
import { connectDB } from "@/lib/db";
import { CouponModel } from "@/models/Coupon";
import { CollectionModel } from "@/models/Collection";
import { OrderModel } from "@/models/Order";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@/lib/types";
import { payNoteOf } from "@/lib/coupons";
import { CopyCode } from "./copy-code";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Doc = Record<string, any>;

/** "Use FESTIVE10 and save ₹100": the coupons the owner chose to show, that really work on this product. */
export async function ProductOffers({ product: p }: { product: Product }) {
  let list: Doc[] = [];
  try {
    await connectDB();
    const now = new Date();
    const docs = (await CouponModel.find({ active: true, visible: true, audience: { $ne: "selected" }, startsAt: { $not: { $gt: now } }, $or: [{ endsAt: null }, { endsAt: { $exists: false } }, { endsAt: { $gte: now } }] }).sort({ createdAt: -1 }).limit(10).lean()) as Doc[];
    const cols = docs.some((c) => c.scope === "collections") ? ((await CollectionModel.find({ products: p.id }).select("_id").lean()) as Doc[]).map((x) => String(x._id)) : [];
    for (const c of docs) {
      if (c.excludeSale && p.flash) continue;
      if (c.scope === "products" && !(c.products ?? []).some((x: unknown) => String(x) === p.id)) continue;
      if (c.scope === "collections" && !(c.collections ?? []).some((x: unknown) => cols.includes(String(x)))) continue;
      if (c.usageLimit > 0 && (await OrderModel.countDocuments({ "coupon.code": c.code, status: { $ne: "cancelled" } })) >= c.usageLimit) continue;
      list.push(c);
      if (list.length === 2) break;
    }
  } catch { list = []; }
  if (!list.length) return null;

  const line = (c: Doc) => {
    const min = c.minOrder > 0 && c.minOrder > p.price ? ` on orders above ${formatPrice(c.minOrder)}` : "";
    if (c.type === "shipping") return `Free delivery${min}`;
    if (c.type === "flat") return `Save ${formatPrice(Math.min(c.value, p.price))}${min}`;
    const d = Math.floor((p.price * c.value) / 100);
    return min ? `${c.value}% off${c.maxDiscount > 0 ? ` (up to ${formatPrice(c.maxDiscount)})` : ""}${min}` : `Save ${formatPrice(c.maxDiscount > 0 ? Math.min(d, c.maxDiscount) : d)} (${c.value}% off)`;
  };

  return (
    <ul className="mt-4 space-y-2" aria-label="Offers on this product">
      {list.map((c) => (
        <li key={c.code} className="flex items-start gap-3 rounded-xl border border-dashed border-primary/40 bg-primary-faint p-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-white"><Tag className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-semibold text-ink">{line(c)}</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">Use code <CopyCode code={c.code} /> in your bag{payNoteOf(c) ? <span>· {payNoteOf(c)}</span> : null}</p>
            {c.description && <p className="mt-1 text-xs">{c.description}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}