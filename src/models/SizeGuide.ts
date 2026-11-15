import mongoose, { Schema } from "mongoose";

/**
 * A size chart (e.g. "Women", "Kids"). Fully free-form: the owner chooses the column headings
 * and fills the rows in Dashboard → Size guides. Products pick which guides apply to them (by slug).
 */
const SizeGuideSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    unit: { type: String, default: "inches" },
    columns: { type: [String], default: [] },
    rows: { type: [[String]], default: [] },
    tips: { type: [String], default: [] },
    active: { type: Boolean, default: true, index: true },
    order: { type: Number, default: 0, index: true },
  },
  { timestamps: true },
);

export const SizeGuideModel = mongoose.models.SizeGuide || mongoose.model("SizeGuide", SizeGuideSchema);