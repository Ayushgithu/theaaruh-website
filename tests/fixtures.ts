import type { Banner, Enquiry, Product } from "@/lib/types";

export const makeProduct = (over: Partial<Product> = {}): Product => ({
  id: "64b7f0c2a1b2c3d4e5f60001",
  slug: "maroon-anarkali-suit",
  type: "clothing",
  name: "Maroon Anarkali Suit",
  brand: "",
  price: 32999,
  mrp: 74000,
  stock: "in-stock",
  category: "Suit Sets",
  tags: ["festive"],
  specs: { Fabric: "Pure cotton", Fit: "A-line" },
  highlights: ["Pure cotton", "A-line fit", "Festive wear"],
  description: "Soft, breathable everyday suit set.",
  featured: true,
  views: 120,
  createdAt: "2026-09-20T10:00:00.000Z",
  art: { kind: "cloth", tone: "graphite", hue: 215 },
  ...over,
});

export const makeBanner = (over: Partial<Banner> = {}): Banner => ({
  id: "64b7f0c2a1b2c3d4e5f60101",
  title: "Festive suit sale",
  subtitle: "Up to 40% off on suit sets and sarees.",
  cta: "Shop the sale",
  href: "/shop",
  theme: "blue",
  active: true,
  ...over,
});

export const makeEnquiry = (over: Partial<Enquiry> = {}): Enquiry => ({
  id: "64b7f0c2a1b2c3d4e5f60201",
  name: "Aarav Mehta",
  phone: "+91 98111 20001",
  source: "Product enquiry",
  message: "Is the Maroon Anarkali Suit available in size M?",
  products: ["Maroon Anarkali Suit"],
  status: "new",
  createdAt: "2026-09-29T09:00:00.000Z",
  ...over,
});

import type { CartLine, CustomerUser, Order } from "@/lib/types";

export const customer: CustomerUser = { id: "64b7f0c2a1b2c3d4e5f60aaa", name: "Ravi Kumar", email: "ravi@x.com", phone: "9876543210" };

export const makeLine = (over: { id?: string; name?: string; price?: number; quantity?: number; available?: number; type?: "clothing" } = {}): CartLine => {
  const id = over.id ?? "64b7f0c2a1b2c3d4e5f60001";
  return {
    productId: id, quantity: over.quantity ?? 1, addedAt: "2026-10-01T10:00:00.000Z", selected: true,
    product: { id, slug: "maroon-anarkali-suit", name: over.name ?? "Maroon Anarkali Suit", brand: "", price: over.price ?? 32999, mrp: 74000, stock: "in-stock", type: "clothing", art: { kind: "cloth", tone: "graphite", hue: 215 }, available: over.available ?? 5 },
  };
};

export const makeOrder = (over: Partial<Order> = {}): Order => ({
  id: "64b7f0c2a1b2c3d4e5f60ooo".replace(/o/g, "e"), orderNumber: "LC-251001-ABC123", userId: customer.id,
  customer: { name: "Ravi Kumar", email: "ravi@x.com", phone: "9876543210" },
  items: [{ productId: "64b7f0c2a1b2c3d4e5f60001", slug: "maroon-anarkali-suit", name: "Maroon Anarkali Suit", brand: "", price: 32999, quantity: 1, art: { kind: "cloth", tone: "graphite", hue: 215 } }],
  subtotal: 32999, shipping: 0, total: 32999,
  address: { name: "Ravi Kumar", phone: "9876543210", line1: "12 MG Road", city: "Pune", state: "Maharashtra", pincode: "411001" },
  payment: { method: "razorpay", status: "paid", razorpayPaymentId: "pay_1" },
  status: "confirmed", timeline: [{ status: "confirmed", at: "2026-10-01T10:00:00.000Z" }], createdAt: "2026-10-01T10:00:00.000Z", ...over,
});