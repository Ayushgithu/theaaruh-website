import { z } from "zod";
import { ok, readJson, userRoute } from "@/lib/api-helpers";
import { setCartSelection } from "@/lib/cart";

const ref = z.object({ productId: z.string().regex(/^[a-f0-9]{24}$/), size: z.string().trim().max(40).optional(), color: z.string().trim().max(30).optional() });

/** Tick / untick bag lines. Send `lines` for some lines, or `all: true` for every line. */
export const PATCH = userRoute(async (req, _ctx, user) => {
  const body = z.object({ selected: z.boolean(), lines: z.array(ref).max(100).optional(), all: z.boolean().optional() }).parse(await readJson(req));
  return ok({ cart: await setCartSelection(user.id, body.all ? null : (body.lines ?? []), body.selected) });
});