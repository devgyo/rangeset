import type { Metadata } from "next";
import { ComparisonGrid, type ComparisonProduct, type PickerProduct } from "@/components/catalog/comparison-grid";
import { genderLabel, type CatalogCard } from "@/lib/arcteryx-view";
import { listProducts, readProducts } from "@/lib/catalog";
import { buildComparison, comparisonIds } from "@/lib/comparison";

export const metadata: Metadata = {
  title: "Compare products",
  description: "Compare published specifications for up to four Arc’teryx products.",
  robots: { index: false, follow: true },
};

function summary(product: CatalogCard): ComparisonProduct {
  return { slug: product.slug, name: product.name, image: product.image, gender: product.gender,
    category: product.category, msrp: product.msrp, example: product.example, discontinued: product.status === "discontinued" };
}

function picker(product: CatalogCard): PickerProduct {
  return { ...summary(product), keywords: [product.name, product.family, product.category,
    product.gender, genderLabel(product.gender), ...product.subTags, product.specs.membrane?.value].join(" ").toLocaleLowerCase("en-US") };
}

export default async function ComparePage({ searchParams }: PageProps<"/compare">) {
  const { ids } = await searchParams;
  const [products, catalog] = await Promise.all([readProducts(comparisonIds(ids)), listProducts()]);
  return (
    <div className="site-width py-7 sm:py-11">
      <h1 className="page-title mb-5 sm:mb-7">Compare products</h1>
      <ComparisonGrid products={products.map(summary)} catalog={catalog.map(picker)}
        groups={buildComparison(products)} explicitIds={ids !== undefined} />
    </div>
  );
}
