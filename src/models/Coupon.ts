import mongoose, { Schema } from "mongoose";

/**
 * A discount code the owner makes in Dashboard → Coupons.
 * type: "percent" (value = % off), "flat" (value = ₹ off) or "shipping" (free delivery).
 * visible: listed under "Available offers" in the bag and at checkout; when off, only people who know the code can use it.
 */
const CouponSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    title: { type: String, default: "" }, // shown to customers, e.g. "Festive 10% off"
    description: { type: String, default: "" }, // small print, e.g. "On orders above ₹1499"
    type: { type: String, enum: ["percent", "flat", "shipping"], required: true },
    value: { type: Number, default: 0 },
    maxDiscount: { type: Number, default: 0 }, // cap for % coupons (0 = no cap)
    minOrder: { type: Number, default: 0 }, // minimum bag value (0 = none)
    startsAt: { type: Date },
    endsAt: { type: Date },
    usageLimit: { type: Number, default: 0 }, // total uses (0 = unlimited)
    perCustomer: { type: Number, default: 0 }, // uses per customer (0 = unlimited)
    firstOrderOnly: { type: Boolean, default: false },
    scope: { type: String, enum: ["all", "products", "collections"], default: "all" },
    products: { type: [Schema.Types.ObjectId], default: [] },
    collections: { type: [Schema.Types.ObjectId], default: [] },
    excludeSale: { type: Boolean, default: false }, // items on a running flash sale do not get this discount
    payWith: { type: String, enum: ["any", "online", "cod"], default: "any" }, // works only with this payment way
    audience: { type: String, enum: ["everyone", "selected"], default: "everyone" },
    customers: { type: [Schema.Types.ObjectId], default: [] }, // the customers who can use it when audience = "selected"
    active: { type: Boolean, default: true, index: true },
    visible: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const CouponModel = mongoose.models.Coupon || mongoose.model("Coupon", CouponSchema);