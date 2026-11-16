"use client";
import * as React from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Play, Volume2, VolumeX, X } from "lucide-react";
import type { PublicVideo } from "@/lib/repo-videos";
import { cloudinaryPoster, videoSrc, ytThumb } from "@/lib/video-shared";
import { cn, formatPrice } from "@/lib/utils";

const isFile = (v: PublicVideo) => v.kind === "cloudinary" || v.kind === "link";
const fileSrc = (v: PublicVideo) => videoSrc(v.kind, v.src);
const coverOf = (v: PublicVideo) => v.poster || (v.kind === "youtube" ? ytThumb(v.src) : v.kind === "cloudinary" ? cloudinaryPoster(v.src) : undefined);
const heading = (v: PublicVideo) => v.title || v.products[0]?.name || "";
const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ------------------------------------------------------------------ the row on the home page */
function StripCard({ v, onOpen }: { v: PublicVideo; onOpen: () => void }) {
  const box = React.useRef<HTMLButtonElement>(null);
  const vid = React.useRef<HTMLVideoElement>(null);
  const cover = coverOf(v);
  const first = v.products[0];

  // Play the little preview only while the card is on screen, so a long row stays light.
  React.useEffect(() => {
    const el = box.current;
    const video = vid.current;
    if (!el || !video || reduced()) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) video.play().catch(() => {}); else video.pause(); }, { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <button ref={box} type="button" onClick={onOpen} aria-label={`Watch ${heading(v) || "video"}`}
      className="group relative aspect-[9/16] w-[9.5rem] shrink-0 snap-start overflow-hidden rounded-3xl bg-ink/90 text-left shadow-md ring-1 ring-line transition duration-300 hover:-translate-y-1 hover:shadow-xl sm:w-52">
      {isFile(v) ? (
        <video ref={vid} src={cover ? fileSrc(v) : `${fileSrc(v)}#t=0.1`} poster={cover} muted loop playsInline preload="metadata" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
      ) : cover ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={cover} alt="" loading="lazy" draggable={false} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
      ) : null}
      <span className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-primary shadow backdrop-blur transition group-hover:scale-110"><Play className="h-4 w-4 fill-current" /></span>
      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 pt-12 text-white">
        {heading(v) && <span className="line-clamp-2 block text-[13px] font-semibold leading-snug sm:text-sm">{heading(v)}</span>}
        {first && (
          <span className="mt-1 flex items-baseline gap-1.5 text-xs">
            <span className="font-bold">{formatPrice(first.price)}</span>
            {first.mrp && <span className="text-white/60 line-through">{formatPrice(first.mrp)}</span>}
          </span>
        )}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ full-screen viewer */
function Slide({ v, active, near, muted }: { v: PublicVideo; active: boolean; near: boolean; muted: boolean }) {
  const ref = React.useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = React.useState(false);
  const cover = coverOf(v);
  const hasBar = v.products.length > 0;

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (active) { setPaused(false); el.play().catch(() => {}); }
    else { el.pause(); el.currentTime = 0; }
  }, [active]);

  const tap = () => {
    const el = ref.current;
    if (!el) return;
    if (el.paused) { el.play().catch(() => {}); setPaused(false); } else { el.pause(); setPaused(true); }
  };

  const iframe = (src: string, title: string) => <iframe src={src} title={title} allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen className="h-full w-full border-0" />;

  return (
    <div className="relative h-full w-full snap-start snap-always bg-black">
      <div className={cn("absolute inset-x-0 top-0 mx-auto max-w-[30rem]", hasBar ? "bottom-[8.75rem] sm:bottom-[9.5rem]" : "bottom-0")}>
        {isFile(v) ? (
          <>
            {near && <video ref={ref} src={fileSrc(v)} poster={cover} loop playsInline muted={muted} preload={active ? "auto" : "metadata"} onClick={tap} className="h-full w-full cursor-pointer object-contain" />}
            {paused && <span className="pointer-events-none absolute inset-0 flex items-center justify-center"><span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/50 text-white"><Play className="h-7 w-7 fill-current" /></span></span>}
          </>
        ) : v.kind === "youtube" ? (
          active ? iframe(`https://www.youtube.com/embed/${v.src}?autoplay=1&mute=${muted ? 1 : 0}&loop=1&playlist=${v.src}&playsinline=1&rel=0&modestbranding=1`, heading(v) || "Video")
            : cover && /* eslint-disable-next-line @next/next/no-img-element */ <img src={cover} alt="" className="h-full w-full object-contain" />
        ) : active ? (
          <div className="h-full w-full overflow-y-auto bg-white">{iframe(`https://www.instagram.com/reel/${v.src}/embed`, heading(v) || "Instagram reel")}</div>
        ) : cover ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={cover} alt="" className="h-full w-full object-contain" />
        ) : null}
      </div>

      {hasBar && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent px-4 pb-5 pt-10">
          <div className="mx-auto max-w-[30rem]">
            {v.title && <p className="mb-2 line-clamp-1 text-sm font-semibold text-white">{v.title}</p>}
            <ul className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4">
              {v.products.map((p) => (
                <li key={p.id} className={cn("snap-start", v.products.length === 1 ? "w-full" : "w-[84%] shrink-0")}>
                  <Link href={`/product/${p.slug}`} className="flex items-center gap-3 rounded-2xl bg-white p-2 pr-3 shadow-lg transition active:scale-[0.99]">
                    <span className="flex h-16 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {p.image && <img src={p.image} alt="" className="h-full w-full object-cover" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-1 block text-sm font-semibold text-ink">{p.name}</span>
                      <span className="flex items-baseline gap-1.5 text-sm"><strong className="text-ink">{formatPrice(p.price)}</strong>{p.mrp && <s className="text-xs text-body">{formatPrice(p.mrp)}</s>}</span>
                    </span>
                    <span className="shrink-0 rounded-full bg-primary px-3.5 py-2 text-xs font-bold text-white">View product</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function Viewer({ videos, start, onClose }: { videos: PublicVideo[]; start: number; onClose: () => void }) {
  const box = React.useRef<HTMLDivElement>(null);
  const [active, setActive] = React.useState(start);
  const [muted, setMuted] = React.useState(true);
  const current = videos[active];
  const soundable = current && current.kind !== "instagram";

  const go = React.useCallback((i: number) => {
    const el = box.current;
    if (el && i >= 0 && i < videos.length) el.scrollTo({ top: i * el.clientHeight, behavior: "smooth" });
  }, [videos.length]);

  React.useEffect(() => {
    const el = box.current;
    if (el) el.scrollTo({ top: start * el.clientHeight });
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => { go(a + 1); return a; }); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => { go(a - 1); return a; }); }
    };
    window.addEventListener("keydown", key);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", key); };
  }, [start, onClose, go]);

  const onScroll = () => {
    const el = box.current;
    if (el) setActive(Math.round(el.scrollTop / el.clientHeight));
  };

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Shop by video" className="fixed inset-0 z-[200] bg-black">
      <div ref={box} onScroll={onScroll} className="no-scrollbar h-full snap-y snap-mandatory overflow-y-auto overscroll-contain">
        {videos.map((v, i) => <div key={v.id} className="h-dvh"><Slide v={v} active={i === active} near={Math.abs(i - active) <= 1} muted={muted} /></div>)}
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent p-3 text-white">
        <span className="rounded-full bg-black/40 px-3 py-1 text-xs font-semibold">{active + 1} / {videos.length}</span>
        <div className="pointer-events-auto flex gap-2">
          {soundable && <button type="button" onClick={() => setMuted((m) => !m)} aria-label={muted ? "Turn sound on" : "Turn sound off"} className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 backdrop-blur transition hover:bg-black/60">{muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}</button>}
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 backdrop-blur transition hover:bg-black/60"><X className="h-5 w-5" /></button>
        </div>
      </div>

      {videos.length > 1 && (
        <div className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 flex-col gap-2 text-white md:flex">
          <button type="button" aria-label="Previous video" disabled={active === 0} onClick={() => go(active - 1)} className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-white/15 backdrop-blur transition hover:bg-white/30 disabled:opacity-30"><ChevronLeft className="h-5 w-5 rotate-90" /></button>
          <button type="button" aria-label="Next video" disabled={active === videos.length - 1} onClick={() => go(active + 1)} className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-white/15 backdrop-blur transition hover:bg-white/30 disabled:opacity-30"><ChevronRight className="h-5 w-5 rotate-90" /></button>
        </div>
      )}
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------------ public component */
export function VideoStrip({ videos }: { videos: PublicVideo[] }) {
  const [open, setOpen] = React.useState<number | null>(null);
  const row = React.useRef<HTMLUListElement>(null);
  const close = React.useCallback(() => setOpen(null), []);
  const scrollBy = (dir: 1 | -1) => row.current?.scrollBy({ left: dir * row.current.clientWidth * 0.8, behavior: "smooth" });

  return (
    <div className="relative">
      <ul ref={row} className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-3 pt-1 sm:mx-0 sm:gap-5 sm:px-0">
        {videos.map((v, i) => <li key={v.id} className="shrink-0"><StripCard v={v} onOpen={() => setOpen(i)} /></li>)}
      </ul>
      {videos.length > 4 && (
        <>
          <button type="button" aria-label="Scroll left" onClick={() => scrollBy(-1)} className="absolute -left-4 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-card text-ink shadow-md transition hover:bg-primary hover:text-white lg:flex"><ChevronLeft className="h-5 w-5" /></button>
          <button type="button" aria-label="Scroll right" onClick={() => scrollBy(1)} className="absolute -right-4 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-card text-ink shadow-md transition hover:bg-primary hover:text-white lg:flex"><ChevronRight className="h-5 w-5" /></button>
        </>
      )}
      {open !== null && <Viewer videos={videos} start={open} onClose={close} />}
    </div>
  );
}