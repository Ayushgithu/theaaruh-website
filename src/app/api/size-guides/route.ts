import { ok, publicRoute } from "@/lib/api-helpers";
import { getSizeGuides } from "@/lib/repo-size-guides";

export const dynamic = "force-dynamic";

/** Size charts for the "Size guide" pop-up. `?slugs=women,kids` limits it to the charts ticked on a product. */
export const GET = publicRoute(async (req) => {
  const slugs = (new URL(req.url).searchParams.get("slugs") ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 8);
  return ok({ guides: await getSizeGuides(slugs) });
});