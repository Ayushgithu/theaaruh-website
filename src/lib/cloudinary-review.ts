import { createHash } from "crypto";

/** Reads CLOUDINARY_URL (cloudinary://KEY:SECRET@CLOUD_NAME) or the three CLOUDINARY_* variables. */
function creds() {
  const url = process.env.CLOUDINARY_URL;
  if (url) {
    const m = /^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/.exec(url.trim());
    if (m) return { apiKey: m[1], apiSecret: m[2], cloudName: m[3] };
  }
  const { CLOUDINARY_CLOUD_NAME: cloudName, CLOUDINARY_API_KEY: apiKey, CLOUDINARY_API_SECRET: apiSecret } = process.env;
  return cloudName && apiKey && apiSecret ? { cloudName, apiKey, apiSecret } : null;
}

export const reviewPhotosEnabled = () => !!creds();
export const reviewFolder = () => `${process.env.CLOUDINARY_FOLDER || "store"}/reviews`;

/** Signs a browser upload (so the API secret never leaves the server). Only the folder + timestamp are signed. */
export function signReviewUpload() {
  const c = creds();
  if (!c) return null;
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = reviewFolder();
  const signature = createHash("sha1").update(`folder=${folder}&timestamp=${timestamp}${c.apiSecret}`).digest("hex");
  return { cloudName: c.cloudName, apiKey: c.apiKey, folder, timestamp, signature };
}

/** Only accepts image links that live in OUR Cloudinary account, inside the reviews folder. */
export function isReviewPhotoUrl(u: string) {
  const c = creds();
  if (!c) return false;
  return u.startsWith(`https://res.cloudinary.com/${c.cloudName}/image/upload/`) && u.includes(`/${reviewFolder()}/`) && u.length < 400;
}