import { connectDB } from "./db";
import { ReviewModel } from "@/models/Review";
import { OrderModel } from "@/models/Order";
import { ProductModel } from "@/models/Product";
import type { Testimonial } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Doc = Record<string, any>;

export type Fit = "" | "small" | "right" | "large";

export interface PublicReview {
  id: string; name: string; rating: number; title: string; text: string; fit: Fit; sizeBought: string;
  photos: string[]; avatar: string; verified: boolean; createdAt: string; reply?: { text: string; at: string };
}

export interface ReviewStats {
  count: number; avg: number;
  breakdown: [number, number, number, number, number]; // how many 1★, 2★ … 5★
  fit: { small: number; right: number; large: number; total: number };
}

const iso = (d: unknown) => (d ? new Date(d as string).toISOString() : new Date().toISOString());

const toReview = (d: Doc): PublicReview => ({
  id: String(d._id), name: d.name || "Customer", rating: d.rating, title: d.title ?? "", text: d.text ?? "", fit: (d.fit ?? "") as Fit,
  sizeBought: d.sizeBought ?? "", photos: d.photos ?? [], avatar: d.avatar ?? "", verified: !!d.verified, createdAt: iso(d.createdAt),
  reply: d.reply?.text ? { text: d.reply.text, at: iso(d.reply.at) } : undefined,
});

/** Approved reviews of one product (newest first) and the numbers shown above them. */
export async function getProductReviews(productId: string): Promise<{ stats: ReviewStats; reviews: PublicReview[] }> {
  await connectDB();
  const docs = (await ReviewModel.find({ product: productId, status: "approved" }).sort({ createdAt: -1 }).limit(300).lean()) as Doc[];
  const stats: ReviewStats = { count: docs.length, avg: 0, breakdown: [0, 0, 0, 0, 0], fit: { small: 0, right: 0, large: 0, total: 0 } };
  let sum = 0;
  for (const d of docs) {
    sum += d.rating;
    stats.breakdown[d.rating - 1] += 1;
    if (d.fit === "small" || d.fit === "right" || d.fit === "large") { stats.fit[d.fit as "small" | "right" | "large"] += 1; stats.fit.total += 1; }
  }
  stats.avg = docs.length ? Math.round((sum / docs.length) * 10) / 10 : 0;
  return { stats, reviews: docs.map(toReview) };
}

/** The status of this customer's own review of the product (they can write only one), or null. */
export async function getMyReviewStatus(productId: string, userId: string): Promise<"pending" | "approved" | "rejected" | null> {
  await connectDB();
  const d = (await ReviewModel.findOne({ product: productId, user: userId }).select("status").lean()) as Doc | null;
  return d ? d.status : null;
}

/** True when the customer has a delivered order containing this product. */
export async function isVerifiedBuyer(userId: string, productId: string): Promise<boolean> {
  await connectDB();
  return !!(await OrderModel.exists({ user: userId, status: "delivered", "items.product": productId }));
}

/** Reviews the owner starred for the home page, plus the store-wide average. Empty list when none are starred. */
export async function getHomeReviews(): Promise<{ items: Testimonial[]; avg: number; count: number }> {
  await connectDB();
  const [featured, all] = await Promise.all([
    ReviewModel.find({ status: "approved", featured: true }).sort({ createdAt: -1 }).limit(12).lean() as Promise<Doc[]>,
    ReviewModel.aggregate([{ $match: { status: "approved" } }, { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } }]) as Promise<Doc[]>,
  ]);
  const ids = [...new Set(featured.map((f) => String(f.product)))];
  const prods = ids.length ? ((await ProductModel.find({ _id: { $in: ids } }).select("name").lean()) as Doc[]) : [];
  const names = new Map(prods.map((p) => [String(p._id), p.name as string]));
  const items = featured.map((f): Testimonial => ({
    id: String(f._id), name: f.name || "Customer", role: f.verified ? "Verified buyer" : "", rating: f.rating,
    text: f.title ? `${f.title}. ${f.text}` : f.text, product: names.get(String(f.product)) ?? "from The Aaruh",
  }));
  return { items, avg: Math.round((all[0]?.avg ?? 0) * 10) / 10, count: all[0]?.count ?? 0 };
}