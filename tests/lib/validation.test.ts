import { describe, expect, it } from "vitest";
import { announcementInput, forgotSchema, resetSchema, bannerInput, contactSchema, loginSchema, newAdminSchema, passwordSchema, phoneSchema, productInput } from "@/lib/validation";

const validProduct = {
  type: "clothing", name: "Maroon Anarkali Suit", brand: "", category: "Suit Sets", price: 32999,
  units: 5, description: "Soft, breathable everyday suit set.",
};

describe("phoneSchema", () => {
  it.each(["9876543210", "98765 43210", "+91 98765 43210", "919876543210"])("accepts %s", (v) => {
    expect(phoneSchema.safeParse(v).success).toBe(true);
  });
  it.each(["", "12345", "5876543210", "98765432", "abcdefghij"])("rejects %j", (v) => {
    expect(phoneSchema.safeParse(v).success).toBe(false);
  });
});

describe("productInput (dashboard product payload)", () => {
  it("accepts a valid product and applies defaults", () => {
    const r = productInput.parse(validProduct);
    expect(r.featured).toBe(false);
    expect(r.tags).toEqual([]);
    expect(r.images).toEqual([]);
  });

  it("coerces numeric strings from forms", () => {
    const r = productInput.parse({ ...validProduct, price: "45000", units: "3", mrp: "60000" });
    expect(r.price).toBe(45000);
    expect(r.units).toBe(3);
  });

  it("treats empty optional numbers as missing", () => {
    const r = productInput.parse({ ...validProduct, mrp: "" });
    expect(r.mrp).toBeUndefined();
  });

  it("lower-cases tags", () => {
    expect(productInput.parse({ ...validProduct, tags: ["Festive", "DAILY"] }).tags).toEqual(["festive", "daily"]);
  });

  it.each([
    ["negative price", { price: -1 }],
    ["zero price", { price: 0 }],
    ["short name", { name: "ab" }],
    ["unknown type", { type: "phone" }],
    ["negative units", { units: -2 }],
    ["short description", { description: "short" }],
    ["image from another website", { images: ["https://evil.example/x.png"] }],
    ["image path traversal", { images: ["/api/images/../../etc/passwd"] }],
    ["more than 8 images", { images: Array.from({ length: 9 }, () => "/api/images/64b7f0c2a1b2c3d4e5f60718") }],
  ])("rejects %s", (_label, patch) => {
    expect(productInput.safeParse({ ...validProduct, ...patch }).success).toBe(false);
  });

  it("accepts our own image URLs", () => {
    expect(productInput.safeParse({ ...validProduct, images: ["/api/images/64b7f0c2a1b2c3d4e5f60718"] }).success).toBe(true);
  });
});

describe("bannerInput", () => {
  const base = { title: "Festive sale", subtitle: "Up to 60% off", cta: "Shop", href: "/shop", theme: "blue", active: true };
  it("accepts internal paths and https links", () => {
    expect(bannerInput.safeParse(base).success).toBe(true);
    expect(bannerInput.safeParse({ ...base, href: "https://example.com/offer" }).success).toBe(true);
  });
  it("rejects javascript: links (XSS)", () => {
    expect(bannerInput.safeParse({ ...base, href: "javascript:alert(1)" }).success).toBe(false);
  });
  it("rejects unknown themes", () => {
    expect(bannerInput.safeParse({ ...base, theme: "pink" }).success).toBe(false);
  });
});

describe("forms", () => {
  it("contact: needs name, valid phone and a real message", () => {
    expect(contactSchema.safeParse({ name: "Ravi", phone: "9876543210", message: "Do you have a green suit set?" }).success).toBe(true);
    expect(contactSchema.safeParse({ name: "R", phone: "9876543210", message: "Do you have a green suit set?" }).success).toBe(false);
    expect(contactSchema.safeParse({ name: "Ravi", phone: "123", message: "Do you have a green suit set?" }).success).toBe(false);
    expect(contactSchema.safeParse({ name: "Ravi", phone: "9876543210", message: "hi" }).success).toBe(false);
  });

  it("login: needs valid email and a password", () => {
    expect(loginSchema.safeParse({ email: "admin@shop.com", password: "x" }).success).toBe(true);
    expect(loginSchema.safeParse({ email: "not-an-email", password: "x" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "admin@shop.com", password: "" }).success).toBe(false);
  });

  it("password change: min 8 chars and confirmation must match", () => {
    expect(passwordSchema.safeParse({ current: "old", next: "newpassword", confirm: "newpassword" }).success).toBe(true);
    expect(passwordSchema.safeParse({ current: "old", next: "short", confirm: "short" }).success).toBe(false);
    const r = passwordSchema.safeParse({ current: "old", next: "newpassword", confirm: "different1" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toBe("Passwords do not match");
  });

  it("new admin: name, email and 8+ char password", () => {
    expect(newAdminSchema.safeParse({ name: "Sales", email: "sales@shop.com", password: "longenough" }).success).toBe(true);
    expect(newAdminSchema.safeParse({ name: "Sales", email: "sales@shop.com", password: "short" }).success).toBe(false);
  });
});

describe("top-bar announcements", () => {
  it("accepts text with an optional link; empty link becomes undefined", () => {
    expect(announcementInput.parse({ text: "Free delivery on suit sets", href: "", active: true }).href).toBeUndefined();
    expect(announcementInput.parse({ text: "Free delivery on suit sets", href: "/shop", active: true }).href).toBe("/shop");
    expect(announcementInput.safeParse({ text: "Free delivery", href: "https://example.com", active: false }).success).toBe(true);
  });
  it("rejects too short / too long text and unsafe links", () => {
    expect(announcementInput.safeParse({ text: "ab", active: true }).success).toBe(false);
    expect(announcementInput.safeParse({ text: "x".repeat(161), active: true }).success).toBe(false);
    expect(announcementInput.safeParse({ text: "Free delivery", href: "javascript:alert(1)", active: true }).success).toBe(false);
  });
});

describe("forgot / reset password schemas", () => {
  it("forgot needs a valid email", () => {
    expect(forgotSchema.safeParse({ email: "owner@shop.com" }).success).toBe(true);
    expect(forgotSchema.safeParse({ email: "nope" }).success).toBe(false);
  });
  it("reset needs a 64-char hex token and an 8+ char password", () => {
    const ok = { email: "owner@shop.com", token: "a".repeat(64), password: "brandnewpass" };
    expect(resetSchema.safeParse(ok).success).toBe(true);
    expect(resetSchema.safeParse({ ...ok, token: "short" }).success).toBe(false);
    expect(resetSchema.safeParse({ ...ok, token: "z".repeat(64) }).success).toBe(false);
    expect(resetSchema.safeParse({ ...ok, password: "short" }).success).toBe(false);
  });
});