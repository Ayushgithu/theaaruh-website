import { HttpError, ok, userRoute } from "@/lib/api-helpers";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { signReviewUpload } from "@/lib/cloudinary-review";

/** Gives a signed-in customer a short-lived signature to upload review photos straight to Cloudinary. */
export const POST = userRoute(async (req, _ctx, user) => {
  if (user.guest) throw new HttpError("Please create an account to add photos.", 403);
  if (!rateLimit(`review-sign:${user.id}:${clientIp(req)}`, 20, 60 * 60_000)) throw new HttpError("Too many uploads. Please try again later.", 429);
  const s = signReviewUpload();
  if (!s) throw new HttpError("Photo upload is not available right now.", 503);
  return ok(s);
});