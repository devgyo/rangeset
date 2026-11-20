import {getTranslations} from "next-intl/server";
import {currentLocale} from "@/i18n/seo";
import {pageAlternates} from "@/i18n/routing";
import type {Metadata} from "next";
import {Suspense} from "react";
import {CatalogBrowser} from "@/components/catalog/catalog-browser";
import {catalogEnabled, listProducts, localCatalog} from "@/lib/catalog";
import {matchesTaxonomy, taxonomyLabelKey, taxonomyPath, taxonomySlugs} from "@/lib/taxonomy";

export async function catalogMetadata(category = ""): Promise<Metadata> {
  const [locale, t] = await Promise.all([currentLocale(), getTranslations()]);
  return {
    title: t(category ? taxonomyLabelKey(category) : "ui.product_catalog"),
    description: t("seo.catalog_description"),
    alternates: pageAlternates(taxonomyPath(category), locale),
    robots: catalogEnabled && !localCatalog ? undefined : {index: false, follow: true},
  };
}

export async function CatalogPage({category = ""}: {category?: string}) {
  const [products, t] = await Promise.all([listProducts(), getTranslations()]);
  const categoryCounts = Object.fromEntries(taxonomySlugs.map((slug) => [slug, products.filter((product) => matchesTaxonomy(product, slug)).length]));
  const matching = category ? products.filter((product) => matchesTaxonomy(product, category)) : products;
  return (
    <div className="site-width py-7 sm:py-8">
      <h1 className="page-title catalog-title">{t(category ? taxonomyLabelKey(category) : "ui.product_catalog")}</h1>
      <p className="mt-2 mb-4 text-sm text-muted-foreground">{t(localCatalog ? "ui.local_catalog" : catalogEnabled ? "ui.catalog_live" : "ui.example_data")}</p>
      <Suspense fallback={<p className="border-t py-4 text-sm text-muted-foreground">{t("ui.loading_catalog_filters")}</p>}>
        <CatalogBrowser products={matching} category={category} categoryCounts={categoryCounts} total={products.length} />
      </Suspense>
    </div>
  );
}

