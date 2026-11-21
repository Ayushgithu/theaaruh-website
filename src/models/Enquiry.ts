import mongoose, { Schema } from "mongoose";

const EnquirySchema = new Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    source: { type: String, enum: ["Contact form", "Product enquiry", "WhatsApp"], required: true },
    message: { type: String, default: "" },
    products: { type: [String], default: [] }, // product names at the time of enquiry
    status: { type: String, enum: ["new", "contacted", "closed"], default: "new", index: true },
  },
  { timestamps: true },
);

export const EnquiryModel = mongoose.models.Enquiry || mongoose.model("Enquiry", EnquirySchema);