/* Coupon types shared by the server and the browser (no database code here). */

export interface CouponOffer {
  code: string;
  title: string;
  description: string;
  /** the big text on the ticket, e.g. "10% OFF", "₹100 OFF", "FREE DELIVERY" */
  label: string;
  eligible: boolean;
  /** why it cannot be used right now, e.g. "Add ₹300 more to use this coupon" */
  reason?: string;
  /** what the customer saves on this bag (0 when not eligible) */
  saving: number;
  freeShipping: boolean;
  /** how much more the customer must add to the bag to unlock it (only for minimum-order coupons) */
  needs?: number;
  minOrder?: number;
  /** roughly what it will save once unlocked */
  unlockSaving?: number;
  /** "Pay online to get this" / "Only on Cash on Delivery" */
  payNote?: string;
}

export interface CouponApplied { code: string; title: string; discount: number; freeShipping: boolean }

/** A code the customer entered that is fine, but needs the other payment way chosen at checkout. */
export interface CouponHold { code: string; reason: string }

export interface CouponPreview { offers: CouponOffer[]; applied?: CouponApplied; hold?: CouponHold; error?: string; /** value of the ticked items */ subtotal?: number }