import * as React from "react";
import type { ArtKind, Product, Tone } from "@/lib/types";
import { cn } from "@/lib/utils";

/* Soft outfit illustration shown until real product photos are uploaded.
   Every product gets 4 "views" so the gallery, zoom and swipe still work without photos. */

interface ArtProps {
  kind?: ArtKind;
  tone?: Tone;
  hue: number;
  view?: number;
  className?: string;
  title?: string;
}

/** Elegant placeholder shown until real photos are uploaded (a kurti on a hanger over a soft tinted background). */
function ClothArt({ hue, view, className, title }: { hue: number; view: number; className?: string; title?: string }) {
  const uid = React.useId().replace(/:/g, "");
  const dots = Array.from({ length: 16 }, (_, i) => ({ x: 100 + ((i * 37 + view * 11) % 100), y: 150 + ((i * 53 + view * 17) % 160) }));
  return (
    <svg viewBox="0 0 300 400" className={cn("h-full w-full", className)} role="img" aria-label={title ?? "Outfit illustration"} preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={`bg${uid}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={`hsl(${hue} 70% 96%)`} /><stop offset="1" stopColor={`hsl(${(hue + 20) % 360} 55% 88%)`} /></linearGradient>
        <linearGradient id={`fb${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={`hsl(${hue} 55% 46%)`} /><stop offset="1" stopColor={`hsl(${(hue + 18) % 360} 60% 34%)`} /></linearGradient>
      </defs>
      <rect width="300" height="400" fill={`url(#bg${uid})`} />
      <circle cx="240" cy="70" r="70" fill="#fff" opacity="0.35" />
      <path d="M150 52v-10a9 9 0 1 1 9 9" fill="none" stroke="#b88a3e" strokeWidth="3" strokeLinecap="round" />
      <path d="M150 52 L62 108 M150 52 L238 108" stroke="#b88a3e" strokeWidth="3" strokeLinecap="round" />
      <g transform={view % 2 ? "translate(0 0)" : "translate(0 0)"}>
        <path d="M112 96 Q150 122 188 96 L232 118 L212 170 L226 340 Q150 362 74 340 L88 170 L68 118 Z" fill={`url(#fb${uid})`} />
        <path d="M112 96 Q150 122 188 96" fill="none" stroke="#e7c98a" strokeWidth="3" />
        <path d="M88 330 Q150 350 226 330" fill="none" stroke="#e7c98a" strokeWidth="4" strokeDasharray="2 7" strokeLinecap="round" />
        {dots.map((d, i) => <circle key={i} cx={d.x + (i % 2 ? 8 : -8)} cy={d.y} r={view === 1 ? 4 : 2.2} fill="#f4e8d1" opacity="0.75" />)}
      </g>
      <ellipse cx="150" cy="378" rx="86" ry="6" fill="#28181d" opacity="0.08" />
    </svg>
  );
}

export function ProductArt({ hue, view = 0, className, title }: ArtProps) {
  return <ClothArt hue={hue} view={view} className={className} title={title} />;
}

/* ------------------------------ Product image ----------------------------- */
export function ProductVisual({ product, view = 0, className }: { product: Product; view?: number; className?: string }) {
  const { hue } = product.art;
  const src = product.images?.[view];
  return (
    <div
      className={cn("relative w-full overflow-hidden", "aspect-[3/4]", className)}
      style={{ background: `linear-gradient(140deg, hsl(${hue} 100% 98%), hsl(${hue} 85% 92%))` }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={product.name} className="h-full w-full object-cover" loading="lazy" decoding="async" />
      ) : (
        <ProductArt {...product.art} view={view} title={product.name} />
      )}
    </div>
  );
}