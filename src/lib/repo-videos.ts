import { connectDB } from "./db";
import { VideoModel } from "@/models/Video";
import { SettingModel } from "@/models/Setting";
import { ProductModel } from "@/models/Product";
import { toProduct } from "./repo";
import type { VideoKind } from "./video-shared";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Doc = Record<string, any>;

export interface VideoProduct { id: string; name: string; slug: string; price: number; mrp?: number; image?: string }
export interface PublicVideo { id: string; title: string; kind: VideoKind; src: string; poster?: string; products: VideoProduct[] }
export interface VideoShelf { title: string; subtitle: string; videos: PublicVideo[] }

const DEFAULTS = { enabled: true, title: "Shop by video", subtitle: "Watch it styled, then shop the look." };

/** The home-page "Shop by video" block, or null when the owner switched it off or there are no visible videos. */
export async function getVideoShelf(): Promise<VideoShelf | null> {
  await connectDB();
  const setting = (await SettingModel.findOne({ key: "videos" }).lean()) as Doc | null;
  const section = { ...DEFAULTS, ...(setting?.data ?? {}) };
  if (!section.enabled) return null;
  const docs = (await VideoModel.find({ active: true }).sort({ order: 1, createdAt: 1 }).lean()) as Doc[];
  if (!docs.length) return null;
  const ids = [...new Set(docs.flatMap((v) => (v.products ?? []).map(String)))];
  const prods = ids.length ? ((await ProductModel.find({ _id: { $in: ids } }).lean()) as Doc[]) : [];
  const byId = new Map(prods.map((d) => { const p = toProduct(d); return [p.id, { id: p.id, name: p.name, slug: p.slug, price: p.price, mrp: p.mrp && p.mrp > p.price ? p.mrp : undefined, image: p.images?.[0] } as VideoProduct]; }));
  const videos = docs.map((v) => ({
    id: String(v._id), title: (v.title ?? "") as string, kind: v.kind as VideoKind, src: v.src as string, poster: (v.poster || undefined) as string | undefined,
    products: ((v.products ?? []) as unknown[]).map(String).map((id) => byId.get(id)).filter((p): p is VideoProduct => !!p),
  }));
  return { title: section.title, subtitle: section.subtitle, videos };
}