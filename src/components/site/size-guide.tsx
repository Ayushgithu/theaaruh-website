"use client";
import * as React from "react";
import Link from "next/link";
import { Ruler } from "lucide-react";
import { Dialog } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { waLink } from "@/lib/site";
import type { SizeGuide } from "@/lib/size-guide-types";

export function SizeChartTable({ guide }: { guide: SizeGuide }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line">
      <table className="w-full min-w-[22rem] text-center text-sm">
        <thead className="bg-primary-faint text-ink">
          <tr>{guide.columns.map((c, i) => <th key={i} scope="col" className="px-3 py-3 font-semibold">{c}</th>)}</tr>
        </thead>
        <tbody>
          {guide.rows.map((r, i) => (
            <tr key={i} className={i % 2 ? "bg-surface/70" : "bg-card"}>
              {r.map((cell, j) => j === 0 ? <th key={j} scope="row" className="px-3 py-2.5 font-semibold text-ink">{cell}</th> : <td key={j} className="px-3 py-2.5">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-line px-3 py-2 text-xs">All measurements are body measurements in {guide.unit}.</p>
    </div>
  );
}

/** One chart, or tabs (Women | Kids) when a product has several (for example twinning sets). */
export function SizeGuideTabs({ guides, showTips = true }: { guides: SizeGuide[]; showTips?: boolean }) {
  const [i, setI] = React.useState(0);
  const g = guides[Math.min(i, guides.length - 1)];
  if (!g) return null;
  return (
    <div>
      {guides.length > 1 && (
        <div role="tablist" aria-label="Size charts" className="mb-4 flex flex-wrap gap-2">
          {guides.map((x, k) => (
            <button key={x.slug} type="button" role="tab" aria-selected={k === i} onClick={() => setI(k)} className={cn("rounded-full border px-4 py-1.5 text-sm font-semibold transition", k === i ? "border-primary bg-primary text-white" : "border-line bg-card text-ink hover:border-primary")}>{x.name}</button>
          ))}
        </div>
      )}
      <div role="tabpanel">
        <SizeChartTable guide={g} />
        {showTips && g.tips.length > 0 && <ul className="mt-4 list-disc space-y-1.5 pl-5 text-sm">{g.tips.map((t) => <li key={t}>{t}</li>)}</ul>}
      </div>
    </div>
  );
}

export function SizeGuideButton({ className, slugs }: { className?: string; slugs?: string[] }) {
  const [open, setOpen] = React.useState(false);
  const [guides, setGuides] = React.useState<SizeGuide[] | null>(null);
  const [failed, setFailed] = React.useState(false);
  const key = (slugs ?? []).join(",");

  React.useEffect(() => {
    if (!open || guides) return;
    let live = true;
    fetch(`/api/size-guides${key ? `?slugs=${encodeURIComponent(key)}` : ""}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => { if (live) setGuides(j.guides ?? []); })
      .catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [open, guides, key]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className ?? "inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline"}>
        <Ruler className="h-4 w-4" /> Size guide
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Size guide" wide>
        {guides ? <SizeGuideTabs guides={guides} /> : <p className="text-sm">{failed ? "Could not load the size guide. Please try again." : "Loading…"}</p>}
        <p className="mt-4 text-sm">Still unsure? <a href={waLink("Hi! Can you help me choose my size?")} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">Ask us on WhatsApp</a> or see the <Link href="/size-guide" onClick={() => setOpen(false)} className="font-semibold text-primary hover:underline">full size guide</Link>.</p>
      </Dialog>
    </>
  );
}