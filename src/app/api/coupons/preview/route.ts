import { z } from "zod";
import { fail, ok, readJson, userRoute } from "@/lib/api-helpers";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { getCartLines } from "@/lib/repo-shop";
import { getRules } from "@/lib/settings";
import { couponPreview } from "@/lib/coupons";

/** The offers available for the ticked items in the bag, and (when a code is sent) whether that code works and what it saves. */
export const POST = userRoute(async (req, _ctx, user) => {
  if (!rateLimit(`coupon:${user.id}:${clientIp(req)}`, 120, 10 * 60_000)) return fail("Too many attempts. Please wait a few minutes.", 429);
  const v = z.object({ code: z.string().trim().max(30).optional(), method: z.enum(["razorpay", "cod"]).optional() }).parse(await readJson(req));
  const lines = (await getCartLines(user.id)).filter((l) => l.selected);
  return ok(await couponPreview({ userId: user.id, phone: user.phone }, lines, await getRules(), v.code, v.method));
});