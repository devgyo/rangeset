import {getTranslations} from "next-intl/server";
import {currentLocale} from "@/i18n/seo";
import {pageAlternates} from "@/i18n/routing";
import {displayParameter} from "@/i18n/copy";
import type { Metadata } from "next";
import { ComparisonGrid, type ComparisonProduct, type PickerProduct } from "@/components/catalog/comparison-grid";
import { genderLabel, type CatalogCard, type ProductDetail } from "@/lib/product-view";
import { listProducts, readProducts, type CatalogListing } from "@/lib/catalog";
import {brandLink} from "@/lib/outbound";
import { buildComparison, comparisonIds } from "@/lib/comparison";

import { parametersOf } from "@/lib/brands";
import { getParameter } from "@/lib/parameters/model";
import { fieldsByKey } from "@/lib/parameters/registry";

export async function generateMetadata(): Promise<Metadata> {
  const [locale, t] = await Promise.all([currentLocale(), getTranslations()]);
  return {
    title: t("ui.compare_products"),
    description: t("seo.compare_description"),
    alternates: pageAlternates("/compare", locale),
    robots: {index: false, follow: true},
  };
}

function summary(product: Pick<CatalogCard, "slug" | "name" | "image" | "gender" | "category" | "taxonomy" | "msrp" | "currency" | "example" | "status">): ComparisonProduct {
  return { slug: product.slug, name: product.name, image: product.image, gender: product.gender,
    category: product.category, taxonomy: product.taxonomy, msrp: product.msrp, currency: product.currency, example: product.example, discontinued: product.status === "discontinued" };
}

function picker(product: CatalogListing): PickerProduct {
  return { ...summary(product), keywords: [product.name, product.brand, product.family, product.category, ...(product.modelNumbers ?? []),
    product.gender, genderLabel(product.gender), ...product.subTags, product.membrane].join(" ").toLocaleLowerCase("en-US") };
}

export default async function ComparePage({ searchParams }: PageProps<"/[locale]/compare">) {
  const { ids } = await searchParams;
  const [products, catalog, t, locale] = await Promise.all([readProducts(comparisonIds(ids)), listProducts(), getTranslations(), currentLocale()]);
  const price = fieldsByKey.get("msrp")!;
  const compared = products.slice(0, 4);
  const selected = compared.map((product: ProductDetail) => ({
    ...summary(product), outbound: brandLink(product, locale), priceLabel: displayParameter(t, locale, price, getParameter(parametersOf(product), price)),
  }));
  return (
    <div className="site-width py-7 sm:py-11">
      <h1 className="page-title mb-5 sm:mb-7">{t("ui.compare_products")}</h1>
      <ComparisonGrid products={selected} catalog={catalog.map(picker)}
        groups={buildComparison(compared)} explicitIds={ids !== undefined} />
    </div>
  );
}
