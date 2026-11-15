import type { Metadata } from "next";
import { PageHero } from "@/components/site/page-hero";
import { SizeGuideTabs } from "@/components/site/size-guide";
import { getSizeGuides } from "@/lib/repo-size-guides";
import { waLink } from "@/lib/site";

export const metadata: Metadata = { title: "Size guide" };
export const dynamic = "force-dynamic"; // always show the charts saved in the dashboard

export default async function SizeGuidePage() {
  const guides = await getSizeGuides();
  return (
    <>
      <PageHero title="Size guide" description="Find your perfect fit." crumbs={[{ label: "Size guide" }]} />
      <div className="container-x max-w-3xl space-y-6 py-12">
        <SizeGuideTabs guides={guides} />
        <p>Need help choosing? <a className="font-semibold text-primary hover:underline" href={waLink("Hi! Can you help me choose my size?")} target="_blank" rel="noopener noreferrer">Message us on WhatsApp</a>.</p>
      </div>
    </>
  );
}