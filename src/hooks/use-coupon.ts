"use client";
import * as React from "react";
import { postJson } from "@/lib/api";
import { useCustomer } from "./use-customer";
import type { CouponPreview } from "@/lib/coupon-shared";

/* The code the customer applied is remembered in this browser, so it is still there at checkout. */
const KEY = "aaruh-coupon";
let code = "";
let loaded = false;
const subs = new Set<() => void>();

const getCode = () => {
  if (!loaded) { loaded = true; try { code = localStorage.getItem(KEY) ?? ""; } catch { /* private mode */ } }
  return code;
};
export function setCouponCode(c: string) {
  code = c; loaded = true;
  try { if (c) localStorage.setItem(KEY, c); else localStorage.removeItem(KEY); } catch { /* private mode */ }
  subs.forEach((f) => f());
}
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };

/** Offers + the applied coupon for the ticked items in the bag. The server decides what a coupon is worth. */
export function useCoupon() {
  const { cart, user, ready } = useCustomer();
  const saved = React.useSyncExternalStore(subscribe, getCode, () => "");
  const selected = cart.filter((l) => l.selected);
  const sig = selected.map((l) => `${l.productId}|${l.size ?? ""}|${l.color ?? ""}|${l.quantity}`).join(",");
  const [data, setData] = React.useState<CouponPreview | null>(null);
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!ready || !user || !selected.length) { setData(null); return; }
    let dead = false;
    const t = setTimeout(async () => {
      try {
        const r = await postJson<CouponPreview>("/api/coupons/preview", { code: saved || undefined });
        if (dead) return;
        setData(r);
        if (saved && !r.applied) { setCouponCode(""); if (r.error) setError(r.error); } // a code that stopped working is dropped
      } catch { if (!dead) setData(null); }
    }, 200);
    return () => { dead = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user?.id, sig, saved]);

  const apply = async (c: string) => {
    const value = c.trim();
    if (!value) { setError("Enter a coupon code."); return false; }
    setBusy(true); setError("");
    try {
      const r = await postJson<CouponPreview>("/api/coupons/preview", { code: value });
      if (!r.applied) { setError(r.error ?? "This coupon cannot be used."); return false; }
      setData(r); setCouponCode(r.applied.code);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not check the coupon.");
      return false;
    } finally { setBusy(false); }
  };
  const remove = () => { setError(""); setCouponCode(""); };

  return { offers: data?.offers ?? [], applied: saved ? data?.applied : undefined, code: saved, apply, remove, busy, error, clearError: () => setError("") };
}
export type CouponState = ReturnType<typeof useCoupon>;