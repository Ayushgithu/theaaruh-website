/**
 * Size choices on one cart / order line are stored in a single text:
 *   women's size only  -> "M"
 *   kid's size only    -> "Kids 3-4 Yr"
 *   twinning set       -> "M + Kids 3-4 Yr"
 * Stock is tracked on the women's size only. The kid's size can add an extra price (set in the dashboard).
 */
export const KID_PREFIX = "Kids ";
export interface SizeChoice { women?: string; kid?: string }

export function parseSize(size?: string | null): SizeChoice {
  const out: SizeChoice = {};
  if (!size) return out;
  for (const raw of size.split(" + ")) {
    const t = raw.trim();
    if (!t) continue;
    if (t.startsWith(KID_PREFIX)) out.kid = t.slice(KID_PREFIX.length).trim();
    else out.women = t;
  }
  return out;
}

export function joinSize(women?: string, kid?: string): string | undefined {
  return [women, kid ? `${KID_PREFIX}${kid}` : undefined].filter(Boolean).join(" + ") || undefined;
}

/** The part of a size that has stock (the women's size), if any. */
export const womenPart = (size?: string | null) => parseSize(size).women;