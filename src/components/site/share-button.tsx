"use client";
import * as React from "react";
import { Check, Copy, Mail, Share2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/** Share a product: opens the phone's own share sheet when there is one, otherwise a small menu (WhatsApp, Facebook, X, Telegram, Email, Copy link). */
export function ShareButton({ title, text, path, className }: { title: string; text?: string; path: string; className?: string }) {
  const [open, setOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const box = React.useRef<HTMLDivElement>(null);
  const url = () => (typeof window === "undefined" ? path : new URL(path, window.location.origin).toString());

  React.useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  const click = async () => {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function" && window.matchMedia("(pointer: coarse)").matches) {
      try { await navigator.share({ title, text: text ?? title, url: url() }); return; }
      catch (e) { if ((e as Error)?.name === "AbortError") return; }
    }
    setOpen((o) => !o);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url());
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch { toast.error("Could not copy. Please copy the address from the browser."); }
  };

  const msg = encodeURIComponent(`${text ?? title} ${url()}`);
  const link = encodeURIComponent(url());
  const item = "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-ink transition hover:bg-surface";
  const targets = [
    { name: "WhatsApp", href: `https://wa.me/?text=${msg}`, dot: "bg-[#25D366]" },
    { name: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${link}`, dot: "bg-[#1877F2]" },
    { name: "X (Twitter)", href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text ?? title)}&url=${link}`, dot: "bg-black" },
    { name: "Telegram", href: `https://t.me/share/url?url=${link}&text=${encodeURIComponent(text ?? title)}`, dot: "bg-[#229ED9]" },
  ];

  return (
    <div ref={box} className={cn("relative shrink-0", className)}>
      <button type="button" onClick={click} aria-label="Share this product" aria-haspopup="menu" aria-expanded={open}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-card text-ink transition hover:border-primary hover:text-primary">
        <Share2 className="h-[18px] w-[18px]" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-12 z-40 w-56 rounded-2xl border border-line bg-card p-2 shadow-xl">
          <p className="px-3 pb-1 pt-1.5 text-xs font-semibold uppercase tracking-wide text-body">Share this product</p>
          {targets.map((t) => (
            <a key={t.name} role="menuitem" href={t.href} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} className={item}>
              <span className={cn("h-3 w-3 rounded-full", t.dot)} />{t.name}
            </a>
          ))}
          <a role="menuitem" href={`mailto:?subject=${encodeURIComponent(title)}&body=${msg}`} onClick={() => setOpen(false)} className={item}><Mail className="h-4 w-4 text-body" />Email</a>
          <button type="button" role="menuitem" onClick={copy} className={item}>{copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4 text-body" />}{copied ? "Copied!" : "Copy link"}</button>
        </div>
      )}
    </div>
  );
}