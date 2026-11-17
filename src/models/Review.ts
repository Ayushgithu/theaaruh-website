import mongoose, { Schema } from "mongoose";

/**
 * A customer's review of one product. It stays "pending" and invisible on the website until the owner approves it
 * in Dashboard → Reviews. A customer can review a product once.
 */
const ReviewSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, default: "" }, // shown publicly, e.g. "Priya S."
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, default: "" },
    text: { type: String, required: true },
    fit: { type: String, enum: ["", "small", "right", "large"], default: "" }, // how the size felt
    sizeBought: { type: String, default: "" },
    photos: { type: [String], default: [] }, // Cloudinary links (https://res.cloudinary.com/...)
    verified: { type: Boolean, default: false }, // the customer has a delivered order of this product
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
    featured: { type: Boolean, default: false }, // shown in the home page "customers" carousel
    reply: { type: new Schema({ text: { type: String, default: "" }, at: Date }, { _id: false }), default: undefined },
  },
  { timestamps: true },
);
ReviewSchema.index({ user: 1, product: 1 }, { unique: true });

export const ReviewModel = mongoose.models.Review || mongoose.model("Review", ReviewSchema);