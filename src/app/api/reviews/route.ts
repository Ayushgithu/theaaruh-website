import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { ReviewModel } from "@/models/Review";
import { ProductModel } from "@/models/Product";
import { HttpError, ok, readJson, userRoute } from "@/lib/api-helpers";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { isVerifiedBuyer } from "@/lib/repo-reviews";
import { isReviewPhotoUrl } from "@/lib/cloudinary-review";

const input = z.object({
  productId: z.string().regex(/^[a-f0-9]{24}$/),
  rating: z.number().int().min(1, "Choose a star rating").max(5),
  title: z.string().trim().max(80, "Keep the title under 80 characters").default(""),
  text: z.string().trim().min(10, "Please write at least 10 characters").max(1000, "Keep your review under 1000 characters"),
  fit: z.enum(["", "small", "right", "large"]).default(""),
  sizeBought: z.string().trim().max(30).default(""),
  avatar: z.string().refine((u) => u === "" || isReviewPhotoUrl(u), "Invalid photo").default(""),
  photos: z.array(z.string().refine(isReviewPhotoUrl, "Invalid photo")).max(3, "You can add up to 3 photos").default([]),
});

/** "Priya Sharma" → "Priya S." */
const publicName = (full: string) => {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "Customer";
  return parts.length === 1 ? parts[0] : `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
};

/** A signed-in customer writes a review. It is saved as "pending" and shows on the website only after the owner approves it. */
export const POST = userRoute(async (req, _ctx, user) => {
  if (user.guest) throw new HttpError("Please create an account to write a review.", 403);
  if (!rateLimit(`review:${user.id}:${clientIp(req)}`, 10, 60 * 60_000)) throw new HttpError("Too many reviews. Please try again later.", 429);
  const v = input.parse(await readJson(req));
  await connectDB();
  if (!mongoose.isValidObjectId(v.productId) || !(await ProductModel.exists({ _id: v.productId }))) throw new HttpError("This product was not found.", 404);
  if (await ReviewModel.exists({ user: user.id, product: v.productId })) throw new HttpError("You have already reviewed this product.", 409);
  const verified = await isVerifiedBuyer(user.id, v.productId);
  await ReviewModel.create({ product: v.productId, user: user.id, name: publicName(user.name), rating: v.rating, title: v.title, text: v.text, fit: v.fit, sizeBought: v.sizeBought, photos: v.photos, avatar: v.avatar, verified, status: "pending" });
  return ok({ ok: true }, 201);
});