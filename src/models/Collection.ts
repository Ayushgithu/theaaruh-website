import mongoose, { Schema } from "mongoose";

/**
 * A hand-made collection (e.g. "Women", "Kids", "Twinning", "20% Off"). The owner creates it in
 * Dashboard → Collections, gives it a name and a photo, and picks which products are inside.
 * A product can be in any number of collections.
 */
const CollectionSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: String, default: "" },
    image: { type: String, default: "" }, // /api/images/<id>
    products: { type: [Schema.Types.ObjectId], ref: "Product", default: [] }, // in the order the owner picked them
    active: { type: Boolean, default: true, index: true },
    order: { type: Number, default: 0, index: true },
  },
  { timestamps: true },
);

export const CollectionModel = mongoose.models.Collection || mongoose.model("Collection", CollectionSchema);