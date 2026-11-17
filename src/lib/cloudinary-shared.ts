/** Smaller, faster version of a Cloudinary image (automatic format + quality). Other links are returned unchanged. */
export function cldImg(url: string, width: number) {
  return url.replace("/image/upload/", `/image/upload/f_auto,q_auto,w_${width},c_limit/`);
}