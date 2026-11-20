import {getTranslations} from "next-intl/server";
import {currentLocale} from "@/i18n/seo";
import {pageAlternates} from "@/i18n/routing";
import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogBrowser } from "@/components/catalog/catalog-browser";
import { catalogEnabled, listProducts } from "@/lib/catalog";

export async function generateMetadata(): Promise<Metadata> {
  const [locale, t] = await Promise.all([currentLocale(), getTranslations()]);
  return {
    title: t("ui.arc_catalog"),
    description: t("seo.catalog_description"),
    alternates: pageAlternates("/products", locale),
    robots: catalogEnabled ? undefined : {index: false, follow: true},
  };
}

export default async function ProductsPage({ searchParams }: PageProps<"/[locale]/products">) {
  await searchParams;
  const [products, t] = await Promise.all([listProducts(), getTranslations()]);
  return (
    <div className="site-width py-7 sm:py-8">
      <h1 className="page-title catalog-title">{t(catalogEnabled ? "ui.arc_catalog" : "ui.product_catalog")}</h1>
      <p className="mt-2 mb-4 text-sm text-muted-foreground">{t(catalogEnabled ? "ui.catalog_live" : "ui.example_data")}</p>
      <Suspense fallback={<p className="border-t py-4 text-sm text-muted-foreground">{t("ui.loading_catalog_filters")}</p>}>
        <CatalogBrowser products={products} />
      </Suspense>
    </div>
  );
}
