"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { BadgeCheck, Camera, ChevronLeft, ChevronRight, MessageSquareHeart, Star, X } from "lucide-react";
import { toast } from "sonner";
import type { Fit, PublicReview, ReviewStats } from "@/lib/repo-reviews";
import { ApiError, postJson } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useCustomer } from "@/hooks/use-customer";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Stars } from "./stars";
import { cldImg } from "@/lib/cloudinary-shared";

const FIT_LABEL: Record<Exclude<Fit, "">, string> = { small: "Ran small", right: "True to size", large: "Ran large" };
const RATING_WORD = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];
const SORTS = [
  { v: "new", label: "Newest first" },
  { v: "photos", label: "With photos first" },
  { v: "high", label: "Highest rating" },
  { v: "low", label: "Lowest rating" },
] as const;

/** Phone photos are often 3-6 MB. Shrinking them here (max 1600px, WebP) keeps every upload small and fast. */
async function shrink(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.type === "image/svg+xml") return file;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * scale)), h = Math.max(1, Math.round(bmp.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close?.();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.82));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" });
  } catch {
    return file;
  }
}

/* ------------------------------------------------------------------ the form */
function ReviewForm({ product, photosOn, onDone }: { product: { id: string; name: string; sizes: string[] }; photosOn: boolean; onDone: () => void }) {
  const router = useRouter();
  const [rating, setRating] = React.useState(0);
  const [hover, setHover] = React.useState(0);
  const [title, setTitle] = React.useState("");
  const [text, setText] = React.useState("");
  const [fit, setFit] = React.useState<Fit>("");
  const [size, setSize] = React.useState("");
  const [files, setFiles] = React.useState<File[]>([]);
  const [previews, setPreviews] = React.useState<string[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const pick = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const ok = Array.from(list).filter((f) => f.type.startsWith("image/"));
    if (ok.length < list.length) toast.error("Only photos can be added");
    setFiles((cur) => { const next = [...cur, ...ok].slice(0, 3); if (cur.length + ok.length > 3) toast("You can add up to 3 photos"); return next; });
  };

  const submit = async () => {
    setError("");
    if (!rating) return setError("Please choose a star rating.");
    if (text.trim().length < 10) return setError("Please write at least 10 characters about the product.");
    setBusy(true);
    try {
      const photos: string[] = [];
      for (const f of files) { // each photo goes straight from the phone to Cloudinary; only its link is saved
        const sig = await postJson<{ cloudName: string; apiKey: string; folder: string; timestamp: number; signature: string }>("/api/reviews/sign", {});
        const fd = new FormData();
        fd.append("file", await shrink(f));
        fd.append("api_key", sig.apiKey);
        fd.append("timestamp", String(sig.timestamp));
        fd.append("folder", sig.folder);
        fd.append("signature", sig.signature);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, { method: "POST", body: fd });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.secure_url) throw new Error(data?.error?.message || "Could not upload a photo. Please try again.");
        photos.push(data.secure_url as string);
      }
      await postJson("/api/reviews", { productId: product.id, rating, title: title.trim(), text: text.trim(), fit, sizeBought: size, photos });
      toast.success("Thank you for your review!", { description: "It will appear on the website once our team approves it." });
      onDone();
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError || e instanceof Error ? e.message : "Could not send your review. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const label = "mb-2 block text-sm font-semibold text-ink";
  const field = "w-full rounded-xl border border-line bg-card px-3.5 py-3 text-[15px] text-ink outline-none transition placeholder:text-body/60 focus:border-primary focus:ring-2 focus:ring-primary/15";
  const chip = (on: boolean) => cn("rounded-full border px-3.5 py-2 text-sm font-medium transition", on ? "border-ink bg-ink text-card" : "border-line bg-card text-ink hover:border-ink");

  return (
    <div className="space-y-6">
      <p className="text-sm">Tell others about <strong className="text-ink">{product.name}</strong>. Your review is shown after our team approves it.</p>

      <div>
        <span className={label}>Your rating</span>
        <div role="radiogroup" aria-label="Your rating" className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? "s" : ""}`} onMouseEnter={() => setHover(n)} onClick={() => setRating(n)} className="rounded-md p-0.5 transition hover:scale-110">
              <Star className={cn("h-9 w-9 transition", n <= (hover || rating) ? "fill-gold text-gold" : "fill-line text-line")} />
            </button>
          ))}
          <span className="ml-2 text-sm font-semibold text-ink">{RATING_WORD[hover || rating]}</span>
        </div>
      </div>

      <div>
        <label htmlFor="rv-title" className={label}>Title <span className="font-normal text-body">(optional)</span></label>
        <input id="rv-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="e.g. Beautiful fabric, perfect fit" className={field} />
      </div>

      <div>
        <label htmlFor="rv-text" className={label}>Your review</label>
        <textarea id="rv-text" value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} rows={5} placeholder="How is the fabric, stitching and colour? Would you recommend it?" className={cn(field, "resize-y")} />
        <p className="mt-1 text-right text-xs">{text.length}/1000</p>
      </div>

      <div>
        <span className={label}>How was the size? <span className="font-normal text-body">(optional)</span></span>
        <div className="flex flex-wrap gap-2">
          {(["small", "right", "large"] as const).map((f) => <button key={f} type="button" aria-pressed={fit === f} className={chip(fit === f)} onClick={() => setFit(fit === f ? "" : f)}>{FIT_LABEL[f]}</button>)}
        </div>
        {product.sizes.length > 0 && (
          <div className="mt-3">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-body">Size you bought</span>
            <div className="flex flex-wrap gap-2">{product.sizes.map((s) => <button key={s} type="button" aria-pressed={size === s} className={chip(size === s)} onClick={() => setSize(size === s ? "" : s)}>{s}</button>)}</div>
          </div>
        )}
      </div>

      {photosOn && <div>
        <span className={label}>Add photos <span className="font-normal text-body">(optional, up to 3)</span></span>
        <div className="flex flex-wrap gap-3">
          {previews.map((u, i) => (
            <div key={u} className="relative h-20 w-20 overflow-hidden rounded-xl border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
              <button type="button" aria-label={`Remove photo ${i + 1}`} onClick={() => setFiles((c) => c.filter((_, k) => k !== i))} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white"><X className="h-3.5 w-3.5" /></button>
            </div>
          ))}
          {files.length < 3 && (
            <button type="button" onClick={() => pick.current?.click()} className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line bg-surface text-xs font-semibold text-primary transition hover:border-primary"><Camera className="h-5 w-5" />Add</button>
          )}
        </div>
        <input ref={pick} type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
      </div>}

      {error && <p role="alert" className="text-sm font-medium text-red-600">{error}</p>}
      <Button size="lg" className="w-full rounded-full" onClick={submit} disabled={busy}>{busy ? (files.length ? "Uploading photos…" : "Sending…") : "Submit review"}</Button>
    </div>
  );
}

/* ------------------------------------------------------------------ photo viewer */
function Lightbox({ photos, start, onClose }: { photos: string[]; start: number; onClose: () => void }) {
  const [i, setI] = React.useState(start);
  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setI((x) => Math.min(photos.length - 1, x + 1));
      if (e.key === "ArrowLeft") setI((x) => Math.max(0, x - 1));
    };
    window.addEventListener("keydown", key);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", key); };
  }, [photos.length, onClose]);
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Review photo" className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4" onClick={onClose}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={cldImg(photos[i], 1400)} alt="" className="max-h-full max-w-full rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
      <button type="button" aria-label="Close" onClick={onClose} className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/30"><X className="h-5 w-5" /></button>
      {photos.length > 1 && (
        <>
          <button type="button" aria-label="Previous photo" disabled={i === 0} onClick={(e) => { e.stopPropagation(); setI(i - 1); }} className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/30 disabled:opacity-30"><ChevronLeft className="h-5 w-5" /></button>
          <button type="button" aria-label="Next photo" disabled={i === photos.length - 1} onClick={(e) => { e.stopPropagation(); setI(i + 1); }} className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/30 disabled:opacity-30"><ChevronRight className="h-5 w-5" /></button>
        </>
      )}
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------------ the section on the product page */
export function ReviewsSection({ product, stats, reviews, mine, photosOn }: {
  product: { id: string; name: string; sizes: string[] };
  stats: ReviewStats;
  reviews: PublicReview[];
  mine: "pending" | "approved" | "rejected" | null;
  photosOn: boolean; // false when Cloudinary is not set up on the website
}) {
  const { user, openAuth } = useCustomer();
  const [open, setOpen] = React.useState(false);
  const [sort, setSort] = React.useState<(typeof SORTS)[number]["v"]>("new");
  const [shown, setShown] = React.useState(5);
  const [box, setBox] = React.useState<{ photos: string[]; i: number } | null>(null);
  const closeBox = React.useCallback(() => setBox(null), []);

  const list = React.useMemo(() => {
    const r = [...reviews];
    if (sort === "high") r.sort((a, b) => b.rating - a.rating);
    else if (sort === "low") r.sort((a, b) => a.rating - b.rating);
    else if (sort === "photos") r.sort((a, b) => b.photos.length - a.photos.length);
    return r;
  }, [reviews, sort]);

  const write = () => {
    if (!user || user.guest) openAuth("login", { then: () => setOpen(true) });
    else setOpen(true);
  };
  const pct = (n: number) => (stats.count ? Math.round((n / stats.count) * 100) : 0);
  const fitPct = (n: number) => (stats.fit.total ? Math.round((n / stats.fit.total) * 100) : 0);
  const topFit = (["right", "small", "large"] as const).reduce((a, b) => (stats.fit[b] > stats.fit[a] ? b : a), "right");

  const action = mine ? (
    <p className="rounded-xl bg-surface p-3 text-sm">
      {mine === "pending" && "Thank you! Your review is waiting for approval and will appear here soon."}
      {mine === "approved" && "You have reviewed this product. Thank you!"}
      {mine === "rejected" && "Your review could not be published. You can contact us if you have questions."}
    </p>
  ) : (
    <Button size="lg" className="rounded-full px-8" onClick={write}><MessageSquareHeart className="h-5 w-5" /> Write a review</Button>
  );

  return (
    <section id="reviews" aria-labelledby="reviews-title" className="container-x scroll-mt-24 border-t border-line py-12 sm:py-16">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Real feedback</p>
          <h2 id="reviews-title" className="mt-1 text-2xl sm:text-3xl">Customer reviews</h2>
        </div>
        {stats.count > 0 && !mine && <div className="hidden sm:block">{action}</div>}
      </div>

      {stats.count === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-surface px-6 py-12 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-faint text-primary"><MessageSquareHeart className="h-7 w-7" /></span>
          <h3 className="mt-4 text-lg">No reviews yet</h3>
          <p className="mt-1 max-w-sm text-sm">Be the first to share how this piece looks, feels and fits.</p>
          <div className="mt-5">{action}</div>
        </div>
      ) : (
        <>
          <div className="grid gap-8 rounded-2xl border border-line bg-card p-5 shadow-card sm:p-7 md:grid-cols-[13rem_1fr] lg:grid-cols-[13rem_1fr_17rem] lg:gap-10">
            <div className="text-center md:text-left">
              <p className="font-heading text-5xl font-semibold text-ink">{stats.avg.toFixed(1)}</p>
              <Stars value={stats.avg} size={20} className="mt-2" />
              <p className="mt-2 text-sm">Based on {stats.count} review{stats.count === 1 ? "" : "s"}</p>
            </div>
            <ul className="space-y-2" aria-label="Rating breakdown">
              {[5, 4, 3, 2, 1].map((n) => (
                <li key={n} className="flex items-center gap-3 text-sm">
                  <span className="w-8 shrink-0 font-medium text-ink">{n} ★</span>
                  <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface"><span className="block h-full rounded-full bg-gold" style={{ width: `${pct(stats.breakdown[n - 1])}%` }} /></span>
                  <span className="w-9 shrink-0 text-right tabular-nums">{pct(stats.breakdown[n - 1])}%</span>
                </li>
              ))}
            </ul>
            {stats.fit.total >= 1 && (
              <div className="md:col-span-2 lg:col-span-1">
                <p className="text-sm font-semibold text-ink">How does it fit?</p>
                <p className="mt-1 text-sm">{fitPct(stats.fit[topFit])}% say <strong className="text-ink">{FIT_LABEL[topFit].toLowerCase()}</strong></p>
                <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-surface" aria-hidden>
                  <span className="bg-primary/40" style={{ width: `${fitPct(stats.fit.small)}%` }} /><span className="bg-success" style={{ width: `${fitPct(stats.fit.right)}%` }} /><span className="bg-gold/60" style={{ width: `${fitPct(stats.fit.large)}%` }} />
                </div>
                <div className="mt-2 flex justify-between text-xs"><span>Ran small</span><span>True to size</span><span>Ran large</span></div>
              </div>
            )}
          </div>
          {!mine && <div className="mt-5 sm:hidden">{action}</div>}
          {mine && <div className="mt-5">{action}</div>}

          <div className="mt-8 flex items-center justify-between gap-3">
            <p className="text-sm"><strong className="text-ink">{stats.count}</strong> review{stats.count === 1 ? "" : "s"}</p>
            <label className="flex items-center gap-2 text-sm"><span className="sr-only sm:not-sr-only">Sort by</span>
              <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="h-10 rounded-full border border-line bg-card px-4 text-sm font-medium text-ink outline-none focus:border-primary">{SORTS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}</select>
            </label>
          </div>

          <ul className="mt-2 divide-y divide-line">
            {list.slice(0, shown).map((r) => (
              <li key={r.id} className="py-6">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Stars value={r.rating} size={16} />
                  {r.title && <h3 className="font-sans text-[15px] font-semibold tracking-normal text-ink">{r.title}</h3>}
                </div>
                <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-sm">
                  <span className="font-semibold text-ink">{r.name}</span>
                  {r.verified && <span className="inline-flex items-center gap-1 text-xs font-semibold text-success"><BadgeCheck className="h-4 w-4" /> Verified buyer</span>}
                  <span aria-hidden>·</span><span>{new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                </p>
                <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-ink/90">{r.text}</p>
                {(r.fit || r.sizeBought) && (
                  <p className="mt-3 flex flex-wrap gap-2 text-xs">
                    {r.sizeBought && <span className="rounded-full bg-surface px-3 py-1 font-medium text-ink">Size bought: {r.sizeBought}</span>}
                    {r.fit && <span className="rounded-full bg-surface px-3 py-1 font-medium text-ink">{FIT_LABEL[r.fit]}</span>}
                  </p>
                )}
                {r.photos.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {r.photos.map((u, i) => (
                      <li key={u}><button type="button" aria-label={`Open photo ${i + 1} of ${r.name}'s review`} onClick={() => setBox({ photos: r.photos, i })} className="block h-20 w-20 overflow-hidden rounded-xl border border-line transition hover:opacity-90">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={cldImg(u, 240)} alt="" loading="lazy" className="h-full w-full object-cover" /></button></li>
                    ))}
                  </ul>
                )}
                {r.reply && (
                  <div className="mt-4 rounded-xl border-l-4 border-primary bg-primary-faint p-4 text-sm">
                    <p className="font-semibold text-primary">Reply from The Aaruh</p>
                    <p className="mt-1 whitespace-pre-line text-ink/90">{r.reply.text}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
          {shown < list.length && <div className="mt-4 text-center"><Button variant="outline" size="lg" className="rounded-full px-10" onClick={() => setShown((n) => n + 5)}>Show more reviews</Button></div>}
        </>
      )}

      <Drawer open={open} onClose={() => setOpen(false)} title="Write a review" side="right">
        <ReviewForm product={product} photosOn={photosOn} onDone={() => setOpen(false)} />
      </Drawer>
      {box && <Lightbox photos={box.photos} start={box.i} onClose={closeBox} />}
    </section>
  );
}