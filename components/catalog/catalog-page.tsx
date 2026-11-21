import {getTranslations} from "next-intl/server";
import {pageAlternates, type Locale} from "@/i18n/routing";
import type {Metadata} from "next";
import {CatalogBrowser} from "@/components/catalog/catalog-browser";
import {catalogEnabled, listProducts, localCatalog} from "@/lib/catalog";
import {catalogFacets, catalogPageSize} from "@/lib/catalog/facets";
import {rankFeatured} from "@/lib/catalog/featured-sort";
import {matchesTaxonomy, taxonomyLabelKey, taxonomyPath, taxonomySlugs} from "@/lib/taxonomy";

export async function catalogMetadata(locale: Locale, category = ""): Promise<Metadata> {
  const t = await getTranslations({locale});
  return {
    title: t(category ? taxonomyLabelKey(category) : "ui.product_catalog"),
    description: t("seo.catalog_description"),
    alternates: pageAlternates(taxonomyPath(category), locale),
    robots: catalogEnabled && !localCatalog ? undefined : {index: false, follow: true},
  };
}

export async function CatalogPage({locale, category = ""}: {locale: Locale; category?: string}) {
  const [products, t] = await Promise.all([listProducts(), getTranslations({locale})]);
  const categoryCounts = Object.fromEntries(taxonomySlugs.map((slug) => [slug, products.filter((product) => matchesTaxonomy(product, slug)).length]));
  const matching = category ? products.filter((product) => matchesTaxonomy(product, category)) : products;
  return (
    <div className="site-width py-7 sm:py-8">
      <h1 className="page-title catalog-title">{t(category ? taxonomyLabelKey(category) : "ui.product_catalog")}</h1>
      <p className="mt-2 mb-4 text-sm text-muted-foreground">{t(localCatalog ? "ui.local_catalog" : catalogEnabled ? "ui.catalog_live" : "ui.example_data")}</p>
      <CatalogBrowser key={category} preview={rankFeatured(matching).slice(0, catalogPageSize).map(({product}) => product)}
        facets={catalogFacets(matching)} category={category} categoryCounts={categoryCounts} total={products.length} matchingCount={matching.length} />
    </div>
  );
}

