import { connectDB } from "./db";
import { CollectionModel } from "@/models/Collection";
import { ProductModel } from "@/models/Product";
import { toProduct } from "./repo";
import type { Product } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Doc = Record<string, any>;

export interface PublicCollection {
  id: string;
  name: string;
  slug: string;
  description: string;
  count: number;
  image?: string;
  productIds: string[]; // only products that still exist, in the order the owner picked them
}

/**
 * The collections the owner made in Dashboard → Collections. Hidden ones and empty ones are left out.
 * The photo is the one the owner uploaded, or the first product's photo when there is none.
 */
export async function getCollections(): Promise<PublicCollection[]> {
  await connectDB();
  const docs = (await CollectionModel.find({ active: true }).sort({ order: 1, createdAt: 1 }).lean()) as Doc[];
  if (!docs.length) return [];
  const ids = [...new Set(docs.flatMap((c) => (c.products ?? []).map(String)))];
  const prods = (await ProductModel.find({ _id: { $in: ids }, type: "clothing" }).select("images").lean()) as Doc[];
  const byId = new Map(prods.map((p) => [String(p._id), p]));
  return docs
    .map((c) => {
      const productIds = ((c.products ?? []) as unknown[]).map(String).filter((id) => byId.has(id));
      const firstImage = productIds.map((id) => byId.get(id)?.images?.[0]).find(Boolean) as string | undefined;
      return { id: String(c._id), name: c.name as string, slug: c.slug as string, description: (c.description ?? "") as string, count: productIds.length, image: (c.image || firstImage || undefined) as string | undefined, productIds };
    })
    .filter((c) => c.count > 0);
}

/** One collection with its products (in the owner's order). Null when it does not exist, is hidden or is empty. */
export async function getCollectionBySlug(slug: string): Promise<{ collection: PublicCollection; products: Product[] } | null> {
  const all = await getCollections();
  const collection = all.find((c) => c.slug === slug);
  if (!collection) return null;
  const docs = (await ProductModel.find({ _id: { $in: collection.productIds } }).lean()) as Doc[];
  const byId = new Map(docs.map((d) => [String(d._id), toProduct(d)]));
  return { collection, products: collection.productIds.map((id) => byId.get(id)).filter((p): p is Product => !!p) };
}