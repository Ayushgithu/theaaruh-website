/* Coupon types shared by the server and the browser (no database code here). */

export interface CouponOffer {
  code: string;
  title: string;
  description: string;
  eligible: boolean;
  /** why it cannot be used right now, e.g. "Add ₹300 more to use this coupon" */
  reason?: string;
  /** what the customer saves on this bag (0 when not eligible) */
  saving: number;
  freeShipping: boolean;
}

export interface CouponApplied { code: string; title: string; discount: number; freeShipping: boolean }

export interface CouponPreview { offers: CouponOffer[]; applied?: CouponApplied; error?: string }