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

/** "online" = UPI / card through Razorpay, "cod" = cash on delivery. Unknown in the bag, known at checkout. */
export type PayWay = "razorpay" | "cod";

/** Who is using the coupon. Phone and address are used to stop one person using it again from another account. */
export interface CouponWho { userId: string; phone?: string; address?: { line1: string; pincode: string } }

export type CouponResult =
  | { ok: true; discount: number; freeShipping: boolean }
  | { ok: false; reason: string; hide?: boolean; /** still needed in the bag */ needs?: number; /** only the payment way is wrong */ pay?: boolean };

export const cleanCode = (c: string) => c.trim().toUpperCase().replace(/\s+/g, "");
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The products a coupon is limited to (null = every product). */
async function scopeSet(c: Doc): Promise<Set<string> | null> {
  if (c.scope === "products") return new Set((c.products ?? []).map(String));
  if (c.scope === "collections") {
    const cols = (await CollectionModel.find({ _id: { $in: c.collections ?? [] } }).select("products").lean()) as Doc[];
    return new Set(cols.flatMap((x) => (x.products ?? []).map(String)));
  }
  return null;
}

/** Orders that belong to this person: same account, same phone, or same delivery address. */
function mine(who: CouponWho): Doc {
  const or: Doc[] = [{ user: who.userId }];
  const phone = (who.phone ?? "").replace(/\D/g, "").slice(-10);
  if (phone.length === 10) or.push({ "address.phone": phone }, { "customer.phone": { $regex: `${phone}$` } });
  const a = who.address;
  if (a?.line1?.trim() && /^\d{6}$/.test(a.pincode)) or.push({ "address.pincode": a.pincode, "address.line1": { $regex: `^${esc(a.line1.trim())}$`, $options: "i" } });
  return { $or: or };
}

export const offerLabel = (c: Doc) => (c.type === "percent" ? `${c.value}% OFF` : c.type === "flat" ? `₹${c.value} OFF` : "FREE DELIVERY");
export const payNoteOf = (c: Doc) => (c.payWith === "online" ? "Valid when you pay online (UPI / card)" : c.payWith === "cod" ? "Valid only on Cash on Delivery" : undefined);

/**
 * Can this customer use this coupon on this bag, and how much does it save?
 * `lines` are the ticked bag lines, `shipping` is the delivery fee the bag would pay without the coupon,
 * `method` is the payment way (only known at checkout).
 */
export async function evaluateCoupon(c: Doc, lines: CartLine[], shipping: number, who: CouponWho, method?: PayWay): Promise<CouponResult> {
  const now = Date.now();
  if (!c.active) return { ok: false, reason: "This coupon is not active.", hide: true };
  if (c.startsAt && +new Date(c.startsAt) > now) return { ok: false, reason: "This coupon is not active yet.", hide: true };
  if (c.endsAt && +new Date(c.endsAt) < now) return { ok: false, reason: "This coupon has expired.", hide: true };
  if (c.audience === "selected" && !(c.customers ?? []).some((x: unknown) => String(x) === who.userId)) return { ok: false, reason: "This coupon is not available for your account.", hide: true };

  const subtotal = lines.reduce((s, l) => s + l.product.price * l.quantity, 0);
  if (c.minOrder > 0 && subtotal < c.minOrder) return { ok: false, reason: `Add ${formatPrice(c.minOrder - subtotal)} more to use this coupon.`, needs: c.minOrder - subtotal };

  const scope = await scopeSet(c);
  const inScope = lines.filter((l) => !scope || scope.has(l.productId));
  const eligible = inScope.filter((l) => !(c.excludeSale && l.product.onSale)).reduce((s, l) => s + l.product.price * l.quantity, 0);
  if (eligible <= 0) {
    const onlySale = c.excludeSale && inScope.length > 0 && inScope.every((l) => l.product.onSale);
    return { ok: false, reason: onlySale ? "This coupon is not valid on items that are already on sale." : "This coupon does not apply to the items in your bag." };
  }

  await connectDB();
  const used = { "coupon.code": c.code, status: { $ne: "cancelled" } };
  if (c.usageLimit > 0 && (await OrderModel.countDocuments(used)) >= c.usageLimit) return { ok: false, reason: "This coupon has been fully used.", hide: true };
  if (c.perCustomer > 0 && (await OrderModel.countDocuments({ ...used, ...mine(who) })) >= c.perCustomer) return { ok: false, reason: "You have already used this coupon.", hide: true };
  if (c.firstOrderOnly && (await OrderModel.exists({ status: { $nin: ["cancelled", "pending_payment"] }, ...mine(who) }))) return { ok: false, reason: "This coupon is only for your first order.", hide: true };

  if (method && c.payWith === "online" && method === "cod") return { ok: false, pay: true, reason: "Choose online payment (UPI / card) to use this coupon." };
  if (method && c.payWith === "cod" && method !== "cod") return { ok: false, pay: true, reason: "Choose Cash on Delivery to use this coupon." };

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

/** About what a minimum-order coupon will save once the bag reaches the minimum. */
function unlockSaving(c: Doc, shipping: number): number {
  if (c.scope !== "all") return 0;
  if (c.type === "shipping") return Math.max(0, shipping);
  const base = c.minOrder;
  const d = c.type === "percent" ? Math.floor((base * c.value) / 100) : Math.min(c.value, base);
  return Math.max(0, c.type === "percent" && c.maxDiscount > 0 ? Math.min(d, c.maxDiscount) : d);
}

/** What the bag shows: the coupon the customer applied (if any) and the offers they can pick from. */
export async function couponPreview(who: CouponWho, lines: CartLine[], rules: StoreRules, code?: string, method?: PayWay): Promise<CouponPreview> {
  if (!lines.length) return { offers: [], subtotal: 0 };
  await connectDB();
  const subtotal = lines.reduce((s, l) => s + l.product.price * l.quantity, 0);
  const shipping = computeTotals(lines.map((l) => ({ price: l.product.price, quantity: l.quantity })), rules).shipping;
  const now = new Date();
  const docs = (await CouponModel.find({ active: true, visible: true, $or: [{ endsAt: null }, { endsAt: { $exists: false } }, { endsAt: { $gte: now } }] }).sort({ createdAt: -1 }).limit(20).lean()) as Doc[];

  const offers: CouponOffer[] = [];
  for (const c of docs) {
    const r = await evaluateCoupon(c, lines, shipping, who, method);
    if (!r.ok && r.hide) continue;
    offers.push({
      code: c.code, title: c.title || c.code, description: c.description ?? "", label: offerLabel(c),
      eligible: r.ok, reason: r.ok ? undefined : r.reason,
      saving: r.ok ? r.discount + (r.freeShipping ? shipping : 0) : 0, freeShipping: r.ok && r.freeShipping,
      ...(!r.ok && r.needs ? { needs: r.needs, minOrder: c.minOrder, unlockSaving: unlockSaving(c, shipping) } : {}),
      payNote: payNoteOf(c),
    });
  }
  offers.sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.saving - a.saving || (a.needs ?? 0) - (b.needs ?? 0));

  if (!code) return { offers, subtotal };
  const c = await findCoupon(code);
  if (!c) return { offers, subtotal, error: "This coupon code is not valid." };
  const r = await evaluateCoupon(c, lines, shipping, who, method);
  if (!r.ok) return r.pay ? { offers, subtotal, hold: { code: c.code, reason: r.reason } } : { offers, subtotal, error: r.reason };
  const applied: CouponApplied = { code: c.code, title: c.title || c.code, discount: r.discount, freeShipping: r.freeShipping };
  return { offers, subtotal, applied };
}