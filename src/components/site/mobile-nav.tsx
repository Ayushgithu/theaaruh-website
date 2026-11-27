"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Home, LayoutGrid, LogOut, Package, ShoppingBag, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCustomer } from "@/hooks/use-customer";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const tab = "relative flex h-14 w-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium";
const row = "flex min-h-12 items-center rounded-xl px-4 text-[15px] text-ink hover:bg-surface";

/** App-style bottom bar for phones. It also carries what the old top menu had: Shop opens the shop pages and collections,
 *  Account opens sign in / orders / help links. Hidden on the product page (it has its own sticky Add-to-bag bar) and at checkout. */
export function MobileNav({ collections = [] }: { collections?: { name: string; slug: string }[] }) {
  const pathname = usePathname();
  const customer = useCustomer();
  const { cartCount, wishlist, user } = customer;
  const [sheet, setSheet] = React.useState<null | "shop" | "account">(null);
  const close = () => setSheet(null);
  React.useEffect(() => setSheet(null), [pathname]);

  if (pathname.startsWith("/product/") || pathname.startsWith("/checkout")) return null;
  const on = (h: string) => (h === "/" ? pathname === "/" : pathname.startsWith(h));
  const shopOn = on("/shop") || on("/collections");
  const accountOn = on("/account");
  const signedIn = !!user && !user.guest;

  const badge = (n: number) => n > 0 && <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">{n}</span>;

  return (
    <>
      <nav aria-label="Quick links" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden print:hidden">
        <ul className="grid grid-cols-5">
          <li>
            <Link href="/" aria-current={on("/") ? "page" : undefined} className={cn(tab, on("/") ? "text-primary" : "text-body")}>
              <span className="relative"><Home className={cn("h-[22px] w-[22px]", on("/") && "fill-primary/10")} /></span>
              Home
            </Link>
          </li>
          <li>
            <button type="button" onClick={() => setSheet("shop")} aria-haspopup="dialog" className={cn(tab, shopOn ? "text-primary" : "text-body")}>
              <span className="relative"><LayoutGrid className={cn("h-[22px] w-[22px]", shopOn && "fill-primary/10")} /></span>
              Shop
            </button>
          </li>
          <li>
            <Link href="/wishlist" aria-current={on("/wishlist") ? "page" : undefined} className={cn(tab, on("/wishlist") ? "text-primary" : "text-body")}>
              <span className="relative"><Heart className={cn("h-[22px] w-[22px]", on("/wishlist") && "fill-primary/10")} />{badge(wishlist.length)}</span>
              Wishlist
            </Link>
          </li>
          <li>
            <Link href="/cart" aria-current={on("/cart") ? "page" : undefined} className={cn(tab, on("/cart") ? "text-primary" : "text-body")}>
              <span className="relative"><ShoppingBag className={cn("h-[22px] w-[22px]", on("/cart") && "fill-primary/10")} />{badge(cartCount)}</span>
              Bag
            </Link>
          </li>
          <li>
            <button type="button" onClick={() => setSheet("account")} aria-haspopup="dialog" className={cn(tab, accountOn ? "text-primary" : "text-body")}>
              <span className="relative"><User className={cn("h-[22px] w-[22px]", accountOn && "fill-primary/10")} /></span>
              Account
            </button>
          </li>
        </ul>
      </nav>

      <Drawer open={sheet === "shop"} onClose={close} title="Shop" side="bottom">
        <nav aria-label="Shop pages" className="flex flex-col gap-0.5">
          <Link href="/shop" onClick={close} className={cn(row, "font-semibold")}>Shop all</Link>
          <Link href="/shop?sort=new" onClick={close} className={row}>New arrivals</Link>
          <Link href="/shop?sort=discount" onClick={close} className={row}>Sale</Link>
        </nav>
        {collections.length > 0 && (
          <div className="mt-4 border-t border-line pt-4">
            <p className="eyebrow px-4">Collections</p>
            <ul className="mt-2">
              {collections.map((c) => <li key={c.slug}><Link href={`/collections/${c.slug}`} onClick={close} className={row}>{c.name}</Link></li>)}
            </ul>
          </div>
        )}
      </Drawer>

      <Drawer open={sheet === "account"} onClose={close} title="Account" side="bottom">
        <div className="space-y-2">
          {signedIn ? (
            <>
              <p className="px-1 pb-1 text-sm font-semibold text-ink">Hi, {user!.name.split(" ")[0]}</p>
              <Button asChild variant="outline" size="lg" className="w-full justify-start"><Link href="/account/orders" onClick={close}><Package className="h-4 w-4" /> My orders</Link></Button>
              <Button asChild variant="outline" size="lg" className="w-full justify-start"><Link href="/account/wishlist" onClick={close}><Heart className="h-4 w-4" /> Wishlist</Link></Button>
              <Button asChild variant="outline" size="lg" className="w-full justify-start"><Link href="/account" onClick={close}><User className="h-4 w-4" /> Profile &amp; password</Link></Button>
              <Button variant="ghost" size="lg" className="w-full justify-start" onClick={() => { close(); void customer.logout(); }}><LogOut className="h-4 w-4" /> Sign out</Button>
            </>
          ) : (
            <Button size="lg" className="w-full" onClick={() => { close(); customer.openAuth("login"); }}><User className="h-4 w-4" /> Sign in / Create account</Button>
          )}
        </div>
        <div className="mt-5 border-t border-line pt-4">
          <p className="eyebrow px-4">Help</p>
          <ul className="mt-2">
            <li><Link href="/track" onClick={close} className={row}>Track my order</Link></li>
            <li><Link href="/size-guide" onClick={close} className={row}>Size guide</Link></li>
            <li><Link href="/contact" onClick={close} className={row}>Contact us</Link></li>
            <li><Link href="/about" onClick={close} className={row}>About us</Link></li>
          </ul>
          <div className="flex justify-center pt-3"><ThemeToggle /></div>
        </div>
      </Drawer>
    </>
  );
}