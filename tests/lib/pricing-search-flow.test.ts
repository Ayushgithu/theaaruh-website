import { describe, expect, it } from "vitest";
import { COD_MAX, FREE_SHIPPING_ABOVE, SHIPPING_FEE, codAvailable, computeTotals } from "@/lib/pricing";
import { editDistance, matchWord, normalize, scoreProduct, searchProducts, type Searchable } from "@/lib/search";
import { canTransition, customerCanCancel, nextStatuses } from "@/lib/order-flow";

describe("pricing", () => {
  it("high-value orders ship free", () => {
    expect(computeTotals([{ price: 14999, quantity: 1, type: "clothing" }])).toEqual({ subtotal: 14999, shipping: 0, total: 14999 });
  });
  it("orders below the threshold pay shipping", () => {
    expect(computeTotals([{ price: 599, quantity: 1, type: "clothing" }])).toEqual({ subtotal: 599, shipping: SHIPPING_FEE, total: 599 + SHIPPING_FEE });
  });
  it("orders at or above the threshold ship free", () => {
    expect(computeTotals([{ price: FREE_SHIPPING_ABOVE, quantity: 1, type: "clothing" }]).shipping).toBe(0);
    expect(computeTotals([{ price: 1000, quantity: 2, type: "clothing" }]).shipping).toBe(0);
  });
  it("multiplies by quantity and sums lines", () => {
    expect(computeTotals([{ price: 1500, quantity: 2, type: "clothing" }, { price: 20000, quantity: 1, type: "clothing" }]).subtotal).toBe(23000);
  });
  it("an empty cart costs nothing", () => {
    expect(computeTotals([])).toEqual({ subtotal: 0, shipping: 0, total: 0 });
  });
  it("cash on delivery has an upper limit", () => {
    expect(codAvailable(COD_MAX)).toBe(true);
    expect(codAvailable(COD_MAX + 1)).toBe(false);
  });
});

const p = (over: Partial<Searchable>): Searchable => ({ name: "", brand: "", category: "", tags: [], specs: {}, highlights: [], ...over });
const catalog: Searchable[] = [
  p({ name: "Maroon Anarkali Suit", brand: "Aaruh", category: "Suit Sets", tags: ["festive"], specs: { Fabric: "Pure cotton", Fit: "A-line" }, highlights: ["Pure cotton", "2 pc set"] }),
  p({ name: "Mustard Straight Suit Set", brand: "Aaruh", category: "Suit Sets", specs: { Fabric: "Rayon", Fit: "Straight" } }),
  p({ name: "Rose Pink Chanderi Saree", brand: "Zari", category: "Sarees", specs: { Fabric: "Chanderi silk" } }),
  p({ name: "Navy Printed Co-ord Set", brand: "Zari", category: "Co-ord Sets", tags: ["casual", "college"], specs: { Fabric: "Cotton blend" } }),
  p({ name: "Ivory Chikankari Kurti", brand: "Aaruh", category: "Kurtis" }),
  p({ name: "Cotton Dupatta", brand: "Aaruh", category: "Dupattas" }),
];
const names = (q: string) => searchProducts(catalog, q).map((x) => x.name);

describe("fuzzy search", () => {
  it("normalizes case, punctuation and accents", () => {
    expect(normalize("  Anarkali™  Suit-Set! ")).toBe("anarkali suit set");
    expect(normalize("Café")).toBe("cafe");
  });

  it("edit distance counts a swapped pair as one edit", () => {
    expect(editDistance("anarkali", "anrakali", 2)).toBe(1);
    expect(editDistance("suit", "suit", 2)).toBe(0);
    expect(editDistance("abc", "xyzxyz", 1)).toBeGreaterThan(1);
  });

  it("matches words exactly, by prefix, and with typos", () => {
    expect(matchWord("suit", "suit")).toBe(1);
    expect(matchWord("ana", "anarkali")).toBeGreaterThan(0.9);
    expect(matchWord("anarkli", "anarkali")).toBeGreaterThan(0.4);
    expect(matchWord("zzzz", "anarkali")).toBe(0);
  });

  it("finds products by name", () => expect(names("saree")).toEqual(["Rose Pink Chanderi Saree"]));
  it("tolerates a typo", () => expect(names("anarkli")[0]).toBe("Maroon Anarkali Suit"));
  it("tolerates a swapped-letter typo", () => expect(names("chnaderi")[0]).toBe("Rose Pink Chanderi Saree"));
  it("finds by brand", () => {
    expect(names("aaruh")).toEqual(expect.arrayContaining(["Maroon Anarkali Suit", "Mustard Straight Suit Set", "Ivory Chikankari Kurti", "Cotton Dupatta"]));
    expect(names("aaruh")).not.toContain("Rose Pink Chanderi Saree");
  });
  it("needs EVERY word to match: 'suit maroon' excludes other suit sets", () => {
    expect(names("suit maroon")).toEqual(["Maroon Anarkali Suit"]);
  });
  it("understands spec-style queries like '2pc'", () => {
    expect(names("2pc")).toEqual(["Maroon Anarkali Suit"]);
  });
  it("combines typos and specs: 'maroon anarkli 2pc'", () => expect(names("maroon anarkli 2pc")).toEqual(["Maroon Anarkali Suit"]));
  it("matches tags and categories", () => {
    expect(names("festive")).toEqual(["Maroon Anarkali Suit"]);
    expect(names("college")).toEqual(["Navy Printed Co-ord Set"]);
    expect(names("kurti")).toEqual(["Ivory Chikankari Kurti"]);
  });
  it("finds by fabric", () => expect(names("rayon")).toEqual(["Mustard Straight Suit Set"]));
  it("ranks a name match above a spec-only match", () => {
    const r = searchProducts([p({ name: "Suit Dupatta", brand: "Aaruh" }), p({ name: "Gift Bag", brand: "X", specs: { Pairs: "Suit sets" } })], "suit");
    expect(r[0].name).toBe("Suit Dupatta");
  });
  it("returns nothing for gibberish, empty or one-letter queries", () => {
    expect(names("qqqqzzzz")).toEqual([]);
    expect(names("")).toEqual([]);
    expect(names("   ")).toEqual([]);
  });
  it("respects the limit", () => expect(searchProducts(catalog, "suit", 1)).toHaveLength(1));
  it("scores 0 when any word has no match", () => expect(scoreProduct(catalog[0], "suit banana")).toBe(0));
});

describe("order status flow", () => {
  it("allows the normal path", () => {
    expect(canTransition("placed", "confirmed")).toBe(true);
    expect(canTransition("confirmed", "shipped")).toBe(true);
    expect(canTransition("shipped", "delivered")).toBe(true);
  });
  it("blocks skipping steps and going backwards", () => {
    expect(canTransition("placed", "shipped")).toBe(false);
    expect(canTransition("placed", "delivered")).toBe(false);
    expect(canTransition("delivered", "shipped")).toBe(false);
  });
  it("delivered and cancelled are final", () => {
    expect(nextStatuses("delivered")).toEqual([]);
    expect(nextStatuses("cancelled")).toEqual([]);
  });
  it("can cancel until it ships", () => {
    expect(["pending_payment", "placed", "confirmed"].every((s) => canTransition(s as never, "cancelled"))).toBe(true);
    expect(canTransition("shipped", "cancelled")).toBe(true); // admin only; customers are blocked below
  });
  it("customers can only cancel before shipping", () => {
    expect(customerCanCancel("placed")).toBe(true);
    expect(customerCanCancel("confirmed")).toBe(true);
    expect(customerCanCancel("pending_payment")).toBe(true);
    expect(customerCanCancel("shipped")).toBe(false);
    expect(customerCanCancel("delivered")).toBe(false);
  });
});