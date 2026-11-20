import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogBrowser } from "@/components/catalog/catalog-browser";
import { catalogEnabled, listProducts } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Arc’teryx catalog",
  description: "Browse Arc’teryx US gear and compare published specifications across models.",
  alternates: { canonical: "/products" },
  robots: catalogEnabled ? undefined : { index: false, follow: true },
};

export default async function ProductsPage({ searchParams }: PageProps<"/products">) {
  await searchParams;
  const products = await listProducts();
  return (
    <div className="site-width py-7 sm:py-8">
      <h1 className="page-title catalog-title">{catalogEnabled ? "Arc’teryx catalog" : "Product catalog"}</h1>
      <p className="mt-2 mb-4 text-sm text-muted-foreground">{catalogEnabled ? "US catalog · Published specs and MSRP" : "Example data"}</p>
      <Suspense fallback={<p className="border-t py-4 text-sm text-muted-foreground">Loading catalog filters…</p>}>
        <CatalogBrowser products={products} />
      </Suspense>
    </div>
  );
}
