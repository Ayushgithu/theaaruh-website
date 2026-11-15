import { connectDB } from "./db";
import { SizeGuideModel } from "@/models/SizeGuide";
import { DEFAULT_SIZE_GUIDES } from "./size-guide-defaults";
import type { SizeGuide } from "./size-guide-types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Doc = Record<string, any>;

/**
 * Size guides for the website, from Dashboard → Size guides.
 * `slugs` = the guides ticked on a product; none ticked (or none found) = show every active guide.
 * Until the owner saves anything in the dashboard, the starter Women / Kids charts are used.
 */
export async function getSizeGuides(slugs?: string[]): Promise<SizeGuide[]> {
  let all: SizeGuide[] = DEFAULT_SIZE_GUIDES;
  try {
    await connectDB();
    if ((await SizeGuideModel.estimatedDocumentCount()) > 0) {
      const docs = (await SizeGuideModel.find({ active: true }).sort({ order: 1, createdAt: 1 }).lean()) as Doc[];
      all = docs.map((d) => ({ slug: d.slug, name: d.name, unit: d.unit ?? "inches", columns: (d.columns ?? []).map(String), rows: (d.rows ?? []).map((r: unknown[]) => r.map(String)), tips: (d.tips ?? []).map(String) }));
    }
  } catch { /* a database hiccup must not break the page: fall back to the starter charts */ }
  const wanted = slugs?.length ? all.filter((g) => slugs.includes(g.slug)) : [];
  return wanted.length ? wanted : all;
}