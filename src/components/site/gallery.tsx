"use client";
import * as React from "react";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { ChevronLeft, ChevronRight, Minus, Play, Plus, RotateCcw, X, ZoomIn } from "lucide-react";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ProductVisual } from "./product-art";
import { parseVideo } from "@/lib/video";
import { useSharedVariant } from "./variant-context";

const MAX_ZOOM = 4;
const TAP_ZOOM = 2.5;

function VideoStage({ url, name }: { url: string; name: string }) {
  const v = parseVideo(url);
  if (!v) return null;
  if (v.kind === "youtube") return <iframe title={`${name} video`} src={`https://www.youtube-nocookie.com/embed/${v.id}?rel=0`} allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowFullScreen className="aspect-[3/4] w-full" />;
  if (v.kind === "file") return <video src={v.src} controls playsInline preload="metadata" className="aspect-[3/4] w-full bg-black object-contain" />;
  return <a href={v.href} target="_blank" rel="noopener noreferrer" className="flex aspect-[3/4] w-full items-center justify-center bg-ink text-white">Watch the video ↗</a>;
}

type T = { s: number; x: number; y: number };

/** Full-screen photo that can be zoomed: tap / double-tap, mouse wheel, pinch, + / − buttons; drag to move when zoomed, swipe to change photo when not. */
function ZoomStage({ src, alt, onSwipe, controls }: { src: string; alt: string; onSwipe: (d: number) => void; controls: React.MutableRefObject<{ zoomBy: (f: number) => void; reset: () => void } | null> }) {
  const box = React.useRef<HTMLDivElement>(null);
  const img = React.useRef<HTMLImageElement>(null);
  const [t, setT] = React.useState<T>({ s: 1, x: 0, y: 0 });
  const tr = React.useRef<T>(t);
  const pts = React.useRef(new Map<number, { x: number; y: number }>());
  const pinch = React.useRef<{ d: number; s: number } | null>(null);
  const drag = React.useRef<{ x: number; y: number; tx: number; ty: number; moved: boolean } | null>(null);
  const lastTap = React.useRef(0);

  const apply = (n: T) => { tr.current = n; setT(n); };
  const clamp = (s: number, x: number, y: number): T => {
    s = Math.min(MAX_ZOOM, Math.max(1, s));
    if (s === 1 || !box.current || !img.current) return { s: 1, x: 0, y: 0 };
    const mx = Math.max(0, (img.current.offsetWidth * s - box.current.clientWidth) / 2);
    const my = Math.max(0, (img.current.offsetHeight * s - box.current.clientHeight) / 2);
    return { s, x: Math.max(-mx, Math.min(mx, x)), y: Math.max(-my, Math.min(my, y)) };
  };
  /** Zoom to scale `s`, keeping the point under (cx, cy) where it is. Without a point, zoom around the centre. */
  const zoomTo = (s: number, cx?: number, cy?: number) => {
    const r = box.current?.getBoundingClientRect();
    const cur = tr.current;
    const ns = Math.min(MAX_ZOOM, Math.max(1, s));
    const px = r && cx != null ? cx - (r.left + r.width / 2) : 0;
    const py = r && cy != null ? cy - (r.top + r.height / 2) : 0;
    apply(clamp(ns, px - (px - cur.x) * (ns / cur.s), py - (py - cur.y) * (ns / cur.s)));
  };

  React.useEffect(() => {
    controls.current = { zoomBy: (f) => zoomTo(tr.current.s * f), reset: () => apply({ s: 1, x: 0, y: 0 }) };
    return () => { controls.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controls]);

  const down = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.current.size === 2) {
      const [a, b] = [...pts.current.values()];
      pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, s: tr.current.s };
      drag.current = null;
    } else drag.current = { x: e.clientX, y: e.clientY, tx: tr.current.x, ty: tr.current.y, moved: false };
  };
  const move = (e: React.PointerEvent) => {
    if (!pts.current.has(e.pointerId)) return;
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.current.size === 2 && pinch.current) {
      const [a, b] = [...pts.current.values()];
      zoomTo(pinch.current.s * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.current.d), (a.x + b.x) / 2, (a.y + b.y) / 2);
      return;
    }
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 6) d.moved = true;
    if (tr.current.s > 1) apply(clamp(tr.current.s, d.tx + dx, d.ty + dy));
  };
  const up = (e: React.PointerEvent) => {
    const d = drag.current;
    pts.current.delete(e.pointerId);
    if (pinch.current) { if (pts.current.size < 2) pinch.current = null; drag.current = null; return; }
    drag.current = null;
    if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.moved) {
      // a tap: zoom in where you tapped, tap again to zoom out
      const now = Date.now();
      lastTap.current = now;
      zoomTo(tr.current.s > 1 ? 1 : TAP_ZOOM, e.clientX, e.clientY);
    } else if (tr.current.s === 1 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) onSwipe(dx < 0 ? 1 : -1);
  };
  const wheel = (e: React.WheelEvent) => zoomTo(tr.current.s * (e.deltaY < 0 ? 1.2 : 1 / 1.2), e.clientX, e.clientY);

  return (
    <div ref={box} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onWheel={wheel}
      className={cn("absolute inset-0 flex touch-none select-none items-center justify-center overflow-hidden", t.s > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in")}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={img} src={src} alt={alt} draggable={false} className="max-h-full max-w-full object-contain will-change-transform"
        style={{ transform: `translate(${t.x}px, ${t.y}px) scale(${t.s})`, transition: pts.current.size ? "none" : "transform 0.18s ease-out" }} />
    </div>
  );
}

export function Gallery({ product: base }: { product: Product }) {
  const shared = useSharedVariant();
  // choosing a colour switches to that colour's own photos (when the owner uploaded some)
  const colorImgs = base.colors?.find((c) => c.name === shared?.color)?.images;
  const product = React.useMemo(() => (colorImgs?.length ? { ...base, images: colorImgs } : base), [base, colorImgs]);
  const hasVideo = !!parseVideo(base.videoUrl);
  const [i, setI] = React.useState(0);
  const [zoom, setZoom] = React.useState(false);
  const [hover, setHover] = React.useState<{ x: number; y: number } | null>(null);
  const controls = React.useRef<{ zoomBy: (f: number) => void; reset: () => void } | null>(null);
  const photos = product.images?.length || 4;
  const real = !!product.images?.length;
  const n = photos + (hasVideo ? 1 : 0);
  const isVideo = hasVideo && i === photos;
  React.useEffect(() => setI(0), [shared?.color]);
  const go = React.useCallback((d: number) => setI((x) => (x + d + n) % n), [n]);
  const goPhoto = React.useCallback((d: number) => setI((x) => (x + d + photos) % photos), [photos]);
  const onDragEnd = (_: unknown, info: PanInfo) => { if (info.offset.x < -50) go(1); else if (info.offset.x > 50) go(-1); };

  React.useEffect(() => {
    if (!zoom) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoom(false);
      if (e.key === "ArrowRight") goPhoto(1);
      if (e.key === "ArrowLeft") goPhoto(-1);
      if (e.key === "+" || e.key === "=") controls.current?.zoomBy(1.4);
      if (e.key === "-") controls.current?.zoomBy(1 / 1.4);
      if (e.key === "0") controls.current?.reset();
    };
    window.addEventListener("keydown", key);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", key); };
  }, [zoom, goPhoto]);

  const thumbs = (cls: string, onPick: (k: number) => void, count = n) => Array.from({ length: count }, (_, k) => (
    <button key={k} type="button" onClick={() => onPick(k)} aria-label={hasVideo && k === photos ? "Play video" : `Show photo ${k + 1}`} aria-current={k === i}
      className={cn("relative overflow-hidden rounded-xl border-2 transition", cls, k === i ? "border-ink" : "border-transparent opacity-70 hover:opacity-100")}>
      <ProductVisual product={product} view={hasVideo && k === photos ? 0 : k} />
      {hasVideo && k === photos && <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-white"><Play className="h-6 w-6 fill-current" /></span>}
    </button>
  ));

  // desktop: move the mouse over the photo to magnify it in place
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!real || isVideo) return;
    const r = e.currentTarget.getBoundingClientRect();
    setHover({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  };

  return (
    <div className="grid gap-3 lg:grid-cols-[5rem_1fr]">
      <div className="no-scrollbar order-2 flex gap-2 overflow-x-auto lg:order-1 lg:max-h-[38rem] lg:flex-col lg:overflow-y-auto">{thumbs("w-16 shrink-0 lg:w-full", setI)}</div>
      <div className="relative order-1 overflow-hidden rounded-2xl bg-surface lg:order-2" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        {isVideo ? <VideoStage url={base.videoUrl!} name={base.name} /> : (
          <motion.div key={i} drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.2} onDragEnd={onDragEnd} onTap={() => { setHover(null); setZoom(true); }} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }} className={cn("overflow-hidden", real ? "cursor-zoom-in" : "cursor-pointer")}>
            <div className="transition-transform duration-200 ease-out" style={hover ? { transform: "scale(1.9)", transformOrigin: `${hover.x}% ${hover.y}%` } : undefined}>
              <ProductVisual product={product} view={i} />
            </div>
          </motion.div>
        )}
        {!isVideo && <button type="button" onClick={() => setZoom(true)} aria-label="Zoom photo" className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-ink shadow"><ZoomIn className="h-5 w-5" /></button>}
        {n > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow"><ChevronLeft className="h-5 w-5" /></button>
            <button type="button" onClick={() => go(1)} aria-label="Next photo" className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow"><ChevronRight className="h-5 w-5" /></button>
          </>
        )}
      </div>

      <AnimatePresence>
        {zoom && !isVideo && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-label="Photo zoom" className="fixed inset-0 z-[90] bg-black/95">
            <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2 p-3 text-white">
              <span className="rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium">{i + 1} / {photos}</span>
              <div className="flex items-center gap-2">
                {real && (<>
                  <button type="button" onClick={() => controls.current?.zoomBy(1 / 1.4)} aria-label="Zoom out" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 hover:bg-white/25"><Minus className="h-5 w-5" /></button>
                  <button type="button" onClick={() => controls.current?.zoomBy(1.4)} aria-label="Zoom in" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 hover:bg-white/25"><Plus className="h-5 w-5" /></button>
                  <button type="button" onClick={() => controls.current?.reset()} aria-label="Reset zoom" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 hover:bg-white/25"><RotateCcw className="h-5 w-5" /></button>
                </>)}
                <button type="button" onClick={() => setZoom(false)} aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 hover:bg-white/25"><X className="h-6 w-6" /></button>
              </div>
            </div>

            <div className="absolute inset-x-0 bottom-20 top-16">
              {real
                ? <ZoomStage key={`${i}-${product.images![i]}`} src={product.images![i]} alt={`${product.name} — photo ${i + 1}`} onSwipe={goPhoto} controls={controls} />
                : <div className="flex h-full items-center justify-center"><div className="max-h-full w-full max-w-xl overflow-hidden rounded-2xl"><ProductVisual product={product} view={i} /></div></div>}
            </div>

            {photos > 1 && (<>
              <button type="button" onClick={() => goPhoto(-1)} aria-label="Previous photo" className="absolute left-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 sm:flex"><ChevronLeft className="h-6 w-6" /></button>
              <button type="button" onClick={() => goPhoto(1)} aria-label="Next photo" className="absolute right-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 sm:flex"><ChevronRight className="h-6 w-6" /></button>
              <div className="no-scrollbar absolute inset-x-0 bottom-0 z-10 flex justify-center gap-2 overflow-x-auto p-3">{thumbs("h-14 w-11 shrink-0", setI, photos)}</div>
            </>)}
            {real && <p className="pointer-events-none absolute inset-x-0 bottom-[4.6rem] z-10 hidden text-center text-xs text-white/60 sm:block">Scroll or tap to zoom · drag to move</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}