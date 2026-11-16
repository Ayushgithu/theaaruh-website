import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ShopView } from "@/components/site/shop-view";
import { PageHero } from "@/components/site/page-hero";
import { getCollectionBySlug } from "@/lib/repo-collections";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const found = await getCollectionBySlug((await params).slug);
  if (!found) return {};
  const { collection: c } = found;
  return { title: c.name, description: c.description || `Shop ${c.name}.`, alternates: { canonical: `/collections/${c.slug}` }, openGraph: c.image ? { images: [c.image] } : undefined };
}

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const found = await getCollectionBySlug((await params).slug);
  if (!found) notFound();
  const { collection: c, products } = found;
  return (
    <>
      <PageHero title={c.name} description={c.description || `${products.length} ${products.length === 1 ? "style" : "styles"} in this collection.`} crumbs={[{ label: "Shop", href: "/shop" }, { label: c.name }]} />
      <Suspense fallback={null}><ShopView products={products} lockedCollection={c.name} /></Suspense>
    </>
  );
}