import { connectDB } from "./db";
import { CouponModel } from "@/models/Coupon";
import { CollectionModel } from "@/models/Collection";
import { OrderModel } from "@/models/Order";
import { computeTotals } from "./pricing";
import { formatPrice } from "./utils";
import type { StoreRules } from "./rules";
import type { CartLine } from "./types";
import type { CouponApplied, CouponOffer, CouponPreview } from "./coupon-shared";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Doc = Record<string, any>;

export type CouponResult =
  | { ok: true; discount: number; freeShipping: boolean }
  | { ok: false; reason: string; hide?: boolean };

export const cleanCode = (c: string) => c.trim().toUpperCase().replace(/\s+/g, "");

/** The products a coupon is limited to (null = every product). */
async function scopeSet(c: Doc): Promise<Set<string> | null> {
  if (c.scope === "products") return new Set((c.products ?? []).map(String));
  if (c.scope === "collections") {
    const cols = (await CollectionModel.find({ _id: { $in: c.collections ?? [] } }).select("products").lean()) as Doc[];
    return new Set(cols.flatMap((x) => (x.products ?? []).map(String)));
  }
  return null;
}

/**
 * Can this customer use this coupon on this bag, and how much does it save?
 * `lines` are the ticked bag lines, `shipping` is the delivery fee the bag would pay without the coupon.
 */
export async function evaluateCoupon(c: Doc, lines: CartLine[], shipping: number, userId: string): Promise<CouponResult> {
  const now = Date.now();
  if (!c.active) return { ok: false, reason: "This coupon is not active.", hide: true };
  if (c.startsAt && +new Date(c.startsAt) > now) return { ok: false, reason: "This coupon is not active yet.", hide: true };
  if (c.endsAt && +new Date(c.endsAt) < now) return { ok: false, reason: "This coupon has expired.", hide: true };

  const subtotal = lines.reduce((s, l) => s + l.product.price * l.quantity, 0);
  if (c.minOrder > 0 && subtotal < c.minOrder) return { ok: false, reason: `Add ${formatPrice(c.minOrder - subtotal)} more to use this coupon.` };

  const scope = await scopeSet(c);
  const eligible = lines.filter((l) => !scope || scope.has(l.productId)).reduce((s, l) => s + l.product.price * l.quantity, 0);
  if (eligible <= 0) return { ok: false, reason: "This coupon does not apply to the items in your bag." };

  await connectDB();
  const used = { "coupon.code": c.code, status: { $ne: "cancelled" } };
  if (c.usageLimit > 0 && (await OrderModel.countDocuments(used)) >= c.usageLimit) return { ok: false, reason: "This coupon has been fully used.", hide: true };
  if (c.perCustomer > 0 && (await OrderModel.countDocuments({ ...used, user: userId })) >= c.perCustomer) return { ok: false, reason: "You have already used this coupon.", hide: true };
  if (c.firstOrderOnly && (await OrderModel.exists({ user: userId, status: { $nin: ["cancelled", "pending_payment"] } }))) return { ok: false, reason: "This coupon is only for your first order.", hide: true };

  if (c.type === "shipping") {
    if (shipping <= 0) return { ok: false, reason: "Delivery is already free on this bag." };
    return { ok: true, discount: 0, freeShipping: true };
  }
  let discount = c.type === "percent" ? Math.floor((eligible * c.value) / 100) : Math.min(c.value, eligible);
  if (c.type === "percent" && c.maxDiscount > 0) discount = Math.min(discount, c.maxDiscount);
  discount = Math.max(0, Math.min(discount, subtotal));
  if (discount <= 0) return { ok: false, reason: "This coupon gives no discount on your bag." };
  return { ok: true, discount, freeShipping: false };
}

export async function findCoupon(code: string): Promise<Doc | null> {
  const c = cleanCode(code);
  if (!c) return null;
  await connectDB();
  return (await CouponModel.findOne({ code: c }).lean()) as Doc | null;
}

/** What the bag shows: the coupon the customer applied (if any) and the offers they can pick from. */
export async function couponPreview(userId: string, lines: CartLine[], rules: StoreRules, code?: string): Promise<CouponPreview> {
  if (!lines.length) return { offers: [] };
  await connectDB();
  const shipping = computeTotals(lines.map((l) => ({ price: l.product.price, quantity: l.quantity })), rules).shipping;
  const now = new Date();
  const docs = (await CouponModel.find({ active: true, visible: true, $or: [{ endsAt: null }, { endsAt: { $exists: false } }, { endsAt: { $gte: now } }] }).sort({ createdAt: -1 }).limit(12).lean()) as Doc[];

  const offers: CouponOffer[] = [];
  for (const c of docs) {
    const r = await evaluateCoupon(c, lines, shipping, userId);
    if (!r.ok && r.hide) continue;
    offers.push({
      code: c.code, title: c.title || c.code, description: c.description ?? "",
      eligible: r.ok, reason: r.ok ? undefined : r.reason,
      saving: r.ok ? r.discount + (r.freeShipping ? shipping : 0) : 0, freeShipping: r.ok && r.freeShipping,
    });
  }
  offers.sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.saving - a.saving);

  if (!code) return { offers };
  const c = await findCoupon(code);
  if (!c) return { offers, error: "This coupon code is not valid." };
  const r = await evaluateCoupon(c, lines, shipping, userId);
  if (!r.ok) return { offers, error: r.reason };
  const applied: CouponApplied = { code: c.code, title: c.title || c.code, discount: r.discount, freeShipping: r.freeShipping };
  return { offers, applied };
}