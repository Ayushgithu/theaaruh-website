import mongoose, { Schema } from "mongoose";

/**
 * One "Shop by video" clip. `kind` says where the video comes from:
 *  - cloudinary: a video uploaded from the dashboard to Cloudinary (src = its https link)
 *  - link: a direct https link to an .mp4 / .webm file
 *  - youtube: a YouTube / Shorts link (src = the 11-character video id)
 *  - instagram: an Instagram reel link (src = the reel code)
 */
const VideoSchema = new Schema(
  {
    title: { type: String, default: "" },
    kind: { type: String, enum: ["cloudinary", "link", "youtube", "instagram"], required: true },
    src: { type: String, required: true },
    poster: { type: String, default: "" }, // /api/images/<id>, the cover photo
    products: { type: [Schema.Types.ObjectId], ref: "Product", default: [] }, // up to 4, in the order the owner picked
    active: { type: Boolean, default: true, index: true },
    order: { type: Number, default: 0, index: true },
  },
  { timestamps: true },
);

export const VideoModel = mongoose.models.Video || mongoose.model("Video", VideoSchema);