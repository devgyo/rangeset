import {ClientMessages} from "@/i18n/client-messages";
import {CatalogCardView} from "./catalog-card-view";
import {displayParameter, optionLabel} from "@/i18n/copy";
import {fieldsByKey} from "@/lib/parameters/registry";
import {missing} from "@/lib/parameters/model";
import {notFound} from "next/navigation";
import {getTranslations} from "next-intl/server";
import {localizedPath, pageAlternates, type Locale} from "@/i18n/routing";
import type {Metadata} from "next";
import {CatalogBrowser} from "@/components/catalog/catalog-browser";
import {catalogEnabled, listProducts, localCatalog} from "@/lib/catalog";
import {catalogFacets} from "@/lib/catalog/facets";
import {catalogPageSize, catalogPageSlice} from "@/lib/catalog/pagination";
import {rankFeatured} from "@/lib/catalog/featured-sort";
import {matchesTaxonomy, taxonomyLabelKey, taxonomyPath, taxonomySlugs} from "@/lib/taxonomy";

function paginatedPath(category: string, page: number) {
  const path = taxonomyPath(category);
  return page === 1 ? path : category ? path + "/page/" + page : path + "?page=" + page;
}

export async function catalogMetadata(locale: Locale, category = "", page = 1): Promise<Metadata> {
  const t = await getTranslations({locale});
  return {
    title: t(category ? taxonomyLabelKey(category) : "ui.product_catalog"),
    description: t("seo.catalog_description"),
    alternates: pageAlternates(paginatedPath(category, page), locale),
    robots: catalogEnabled && !localCatalog ? undefined : {index: false, follow: true},
  };
}

export async function CatalogPage({locale, category = "", page = 1}: {locale: Locale; category?: string; page?: number}) {
  const [products, t] = await Promise.all([listProducts(), getTranslations({locale})]);
  const categoryCounts = Object.fromEntries(taxonomySlugs.map((slug) => [slug, products.filter((product) => matchesTaxonomy(product, slug)).length]));
  const matching = category ? products.filter((product) => matchesTaxonomy(product, category)) : products;
  const pages = Math.max(1, Math.ceil(matching.length / catalogPageSize));
  if (page > pages) notFound();
  const preview = catalogPageSlice(rankFeatured(matching), page);
  const crawlLinks = [page - 1, page + 1].filter((number) => number >= 1 && number <= pages);
  function styleFilter(fieldKey: "product_type" | "protection_type") {
    const field = fieldsByKey.get(fieldKey)!;
    const options: [string, string][] = Object.entries(field.options ?? {}).map(([key, label]) => [key, optionLabel(t, field, key, label)]);
    for (const state of ["review", "unpublished", "inapplicable"] as const) {
      options.push([state, displayParameter(t, locale, field, missing(state))]);
    }
    return {label: t("field." + fieldKey), options};
  }
  return (
    <div className="site-width py-7 sm:py-8">
      <h1 className="page-title catalog-title">{t(category ? taxonomyLabelKey(category) : "ui.product_catalog")}</h1>
      {catalogEnabled && <p className="mt-2 mb-4 text-sm text-muted-foreground">{t(localCatalog ? "ui.local_catalog" : "ui.catalog_live")}</p>}
      <ClientMessages scope="catalog">
        <CatalogBrowser key={category + ":" + page} startPage={page} previewCount={preview.length}
          previewCards={preview.map(({product}, index) => <CatalogCardView key={product.slug} product={product} eager={index < 2} />)}
          styleFilters={{type: styleFilter("product_type"), protection: styleFilter("protection_type")}}
          facets={catalogFacets(matching)} category={category} categoryCounts={categoryCounts} total={products.length} matchingCount={matching.length} />
      </ClientMessages>
      {crawlLinks.length > 0 && <noscript>
        <nav className="my-5 flex gap-4" aria-label={t("ui.catalog_pagination")}>
          {crawlLinks.map((number) => <a className="spec-link" key={number} href={localizedPath(paginatedPath(category, number), locale)}>
            {t("ui.catalog_page", {page: number})}
          </a>)}
        </nav>
      </noscript>}
    </div>
  );
}

