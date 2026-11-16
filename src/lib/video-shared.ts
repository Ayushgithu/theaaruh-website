/* Small helpers shared by the dashboard and the website. No database here, so the browser can use them too. */

export const VIDEO_MAX_BYTES = 100 * 1024 * 1024; // Cloudinary's free plan accepts up to 100 MB per video
export const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

/** cloudinary = uploaded from the dashboard (stored on Cloudinary) · link = any direct https .mp4 · youtube / instagram = pasted links */
export type VideoKind = "cloudinary" | "link" | "youtube" | "instagram";

export const ytThumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

const CLD = /^https:\/\/res\.cloudinary\.com\/([^/]+)\/video\/upload\/(.+)$/;
const VERSION = /\/video\/upload\/(v\d+\/)/;

/** The video's id inside Cloudinary (needed to delete it later). Null if this is not a Cloudinary video link. */
export function cloudinaryPublicId(url: string): string | null {
  const m = CLD.exec(url.split("?")[0]);
  if (!m) return null;
  const parts = m[2].split("/");
  const v = parts.findIndex((p) => /^v\d+$/.test(p));
  const rest = v >= 0 ? parts.slice(v + 1) : parts;
  return rest.length ? rest.join("/").replace(/\.[a-z0-9]+$/i, "") : null;
}

/** What the player loads. For Cloudinary videos: automatic format + quality, 720px wide at most, so it is light on phones. */
export function videoSrc(kind: VideoKind, src: string): string {
  if (kind !== "cloudinary") return src;
  return src.replace(VERSION, "/video/upload/f_auto:video,q_auto,w_720,c_limit/$1");
}

/** A still picture of a Cloudinary video (its first frame), used as the cover when the owner adds none. */
export function cloudinaryPoster(src: string): string | undefined {
  if (!CLD.test(src.split("?")[0]) || !VERSION.test(src)) return undefined;
  return src.replace(VERSION, "/video/upload/so_0,f_jpg,q_auto,w_480,c_limit/$1").split("?")[0].replace(/\.[a-z0-9]+$/i, ".jpg");
}

/** Reads a pasted link: a Cloudinary video, YouTube / Shorts, an Instagram reel, or a direct https .mp4 / .webm / .mov file. Null if it is none of these. */
export function parseVideoLink(input: string): { kind: VideoKind; src: string } | null {
  let u: URL;
  try { u = new URL(input.trim()); } catch { return null; }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const host = u.hostname.replace(/^(www|m)\./, "");
  const yt = (id?: string | null) => (id && /^[\w-]{11}$/.test(id) ? { kind: "youtube" as const, src: id } : null);
  if (host === "youtu.be") return yt(u.pathname.split("/")[1]);
  if (host === "youtube.com" || host === "music.youtube.com") {
    const m = /^\/(?:shorts|embed|live)\/([\w-]{11})/.exec(u.pathname);
    return yt(m?.[1] ?? u.searchParams.get("v"));
  }
  if (host === "instagram.com") {
    const m = /^\/(?:[^/]+\/)?(?:reel|reels|p|tv)\/([\w-]+)/.exec(u.pathname);
    return m ? { kind: "instagram", src: m[1] } : null;
  }
  if (u.protocol === "https:" && CLD.test(`${u.origin}${u.pathname}`)) return { kind: "cloudinary", src: u.toString() };
  if (u.protocol === "https:" && /\.(mp4|webm|mov)$/i.test(u.pathname)) return { kind: "link", src: u.toString() };
  return null;
}