import {getTranslations} from "next-intl/server";
import {currentLocale} from "@/i18n/seo";
import {pageAlternates} from "@/i18n/routing";
import {displayParameter} from "@/i18n/copy";
import type { Metadata } from "next";
import { ComparisonGrid, type ComparisonProduct, type PickerProduct } from "@/components/catalog/comparison-grid";
import { genderLabel, type CatalogCard, type ProductDetail } from "@/lib/arcteryx-view";
import { listProducts, readProducts } from "@/lib/catalog";
import { buildComparison, comparisonIds } from "@/lib/comparison";

import { parametersOf } from "@/lib/parameters/arcteryx";
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

function summary(product: CatalogCard): ComparisonProduct {
  return { slug: product.slug, name: product.name, image: product.image, gender: product.gender,
    category: product.category, msrp: product.msrp, currency: product.currency, example: product.example, discontinued: product.status === "discontinued" };
}

function picker(product: CatalogCard): PickerProduct {
  return { ...summary(product), keywords: [product.name, product.family, product.category,
    product.gender, genderLabel(product.gender), ...product.subTags, product.specs.membrane?.value].join(" ").toLocaleLowerCase("en-US") };
}

export default async function ComparePage({ searchParams }: PageProps<"/[locale]/compare">) {
  const { ids } = await searchParams;
  const [products, catalog, t, locale] = await Promise.all([readProducts(comparisonIds(ids)), listProducts(), getTranslations(), currentLocale()]);
  const price = fieldsByKey.get("msrp")!;
  const selected = products.map((product: ProductDetail) => ({
    ...summary(product), priceLabel: displayParameter(t, locale, price, getParameter(parametersOf(product), price)),
  }));
  return (
    <div className="site-width py-7 sm:py-11">
      <h1 className="page-title mb-5 sm:mb-7">{t("ui.compare_products")}</h1>
      <ComparisonGrid products={selected} catalog={catalog.map(picker)}
        groups={buildComparison(products)} explicitIds={ids !== undefined} />
    </div>
  );
}
