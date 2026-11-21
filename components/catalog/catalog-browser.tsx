"use client";

import {Link} from "@/i18n/navigation";
import {activityLabel, useCopy} from "@/i18n/ui-copy";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { Suspense, useDeferredValue, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {taxonomy, taxonomyGroup, taxonomyLabelKey, taxonomyPath} from "@/lib/taxonomy";

import {ParameterHelp} from "@/components/catalog/parameter-help";
import {catalogSort, defaultCatalogSort, type CatalogSort} from "@/lib/catalog/featured-sort";
import type {CatalogListing} from "@/lib/catalog";

import {pruneSeries, seriesMatches, seriesSelection, visibleSeries} from "@/lib/catalog/series";
import {catalogPageSize, type catalogFacets} from "@/lib/catalog/facets";
const CatalogResultCards = dynamic(() => import("./catalog-result-cards"), {ssr: false});
type StyleFilters = Record<"type" | "protection", {label: string; options: [string, string][]}>;

const sortLabels: Record<CatalogSort, string> = {
  featured: "ui.sort_featured",
  name: "ui.sort_name",
  "price-asc": "ui.sort_price_asc",
  "price-desc": "ui.sort_price_desc",
  weight: "ui.sort_weight",
};
const genders = [["", "ui.all"], ["men", "ui.filter_men"], ["women", "ui.filter_women"], ["unisex", "gender.unisex"]];

const queryChangeEvent = "rangeset:catalog-query";

function subscribeToQuery(listener: () => void) {
  window.addEventListener(queryChangeEvent, listener);
  return () => window.removeEventListener(queryChangeEvent, listener);
}

const currentQuery = () => window.location.search.slice(1);
const prerenderedQuery = () => "";

function CatalogQueryObserver() {
  const query = useSearchParams();
  useEffect(() => {
    // App Router also changes the URL during Link navigation and history traversal.
    window.dispatchEvent(new Event(queryChangeEvent));
  }, [query]);
  return null;
}

export function CatalogBrowser({previewCards, previewCount, styleFilters, facets: catalogOptions, category, categoryCounts, total, matchingCount}: {
  previewCards: ReactNode; previewCount: number; styleFilters: StyleFilters;
  facets: ReturnType<typeof catalogFacets>; category: string;
  categoryCounts: Record<string, number>; total: number; matchingCount: number;
}) {
  const {t} = useCopy();
  const queryString = useSyncExternalStore(subscribeToQuery, currentQuery, prerenderedQuery);
  const params = new URLSearchParams(queryString);
  const query = params.get("q") ?? "";
  const gender = params.get("gender") ?? "";
  const legacyLine = params.get("line");
  const selections = (key: string) => params.getAll(key);
  const brand = selections("brand");
  const series = selections("series");
  const activity = selections("activity");
  const family = params.get("family") ?? "";
  const sort = catalogSort(params.get("sort"));
  const productType = params.get("type") ?? "";
  const protectionType = params.get("protection") ?? (params.get("hard") === "1" ? "hard_shell" : "");
  const deferredQuery = useDeferredValue(query);
  const deferredParams = useDeferredValue(params.toString());
  const [page, setPage] = useState({ filters: "", count: catalogPageSize });
  const searchInput = useRef<HTMLInputElement>(null);
  const [catalog, setCatalog] = useState<{
    products: CatalogListing[];
    filter: typeof import("./catalog-filter-results").filterCatalog;
  } | null>(null);
  const [failed, setFailed] = useState(false);
  const hasFilters = Boolean(query || gender || legacyLine || brand.length || series.length || activity.length || family ||
    productType || protectionType || sort !== defaultCatalogSort);
  const count = page.filters === deferredParams ? page.count : catalogPageSize;
  const needsCatalog = hasFilters || count > previewCount && matchingCount > previewCount;

  useEffect(() => {
    if (!needsCatalog || catalog || failed) return;
    const controller = new AbortController();
    const listings = fetch("/api/catalog", {signal: controller.signal}).then(async (response) => {
      if (!response.ok) throw new Error("Catalog request failed");
      return await response.json() as CatalogListing[];
    });
    Promise.all([listings, import("./catalog-filter-results")]).then(([products, {filterCatalog}]) => {
      if (!controller.signal.aborted) setCatalog({products, filter: filterCatalog});
    }).catch(() => {
      if (!controller.signal.aborted) setFailed(true);
    });
    return () => controller.abort();
  }, [needsCatalog, catalog, failed]);

  useEffect(() => {
    // Read the current location so a deferred router update cannot overwrite a newer keystroke.
    const current = new URLSearchParams(window.location.search).get("q") ?? "";
    if (searchInput.current && searchInput.current.value !== current) searchInput.current.value = current;
  }, [query]);

  function update(values: Record<string, string>, replace = false) {
    const next = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(values)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    const search = next.toString();
    window.history[replace ? "replaceState" : "pushState"](null, "", location.pathname + (search ? "?" + search : ""));
  }

  function toggle(key: string, value: string) {
    const next = new URLSearchParams(window.location.search);
    const prior = next.getAll(key);
    next.delete(key);
    for (const item of prior.includes(value) ? prior.filter((item) => item !== value) : [...prior, value]) next.append(key, item);
    if (key === "brand") pruneSeries(next, catalogOptions.series);
    const search = next.toString();
    window.history.pushState(null, "", location.pathname + (search ? "?" + search : ""));
  }

  const selectedSeries = series.length ? series : legacyLine === "veilance" ? ["Veilance"] : [];

  function toggleSeries(brandScope: string, line: string) {
    const next = new URLSearchParams(window.location.search);
    const existing = next.getAll("series");
    const selections = existing.length ? existing : next.get("line") === "veilance" ? ["Veilance"] : [];
    const matches = brandScope ? (value: string) => seriesMatches(value, brandScope, line) :
      (value: string) => seriesSelection(value).line === line;
    const updated = selections.some(matches) ? selections.filter((value) => !matches(value)) :
      [...selections, brandScope ? brandScope + ":" + line : line];
    next.delete("line");
    next.delete("series");
    for (const value of updated) next.append("series", value);
    const search = next.toString();
    window.history.pushState(null, "", location.pathname + (search ? "?" + search : ""));
  }

  function categoryHref(slug: string) {
    const next = new URLSearchParams(params.toString());
    for (const key of ["category", "family", "hard", "type", "protection"]) next.delete(key);
    const search = next.toString();
    return taxonomyPath(slug) + (search ? "?" + search : "");
  }

  const group = taxonomyGroup(category);
  const facets = [
    {key: "brand", label: "field.brand", selected: brand, options: catalogOptions.brands},
    {key: "activity", label: "field.activities", selected: activity, options: catalogOptions.activities},
  ];
  const typeFilters = [
    {queryKey: "type", selected: productType, present: catalogOptions.productTypes},
    {queryKey: "protection", selected: protectionType, present: catalogOptions.protectionTypes},
  ].map(({queryKey, selected, present}) => {
    const descriptor = styleFilters[queryKey as keyof StyleFilters];
    return {queryKey, selected, label: descriptor.label,
      options: descriptor.options.filter(([key]) => present.includes(key) || key === selected)};
  });
  const topFamilies = catalogOptions.families;
  const familyFilters = family && !topFamilies.includes(family) ? [...topFamilies, family] : topFamilies;

  const filtered = catalog && catalog.filter(catalog.products, {
    category, gender, family, brand, series, legacyLine, activity, productType, protectionType, query: deferredQuery, sort,
  });
  const results = filtered?.results;
  const seriesOptions = visibleSeries(catalogOptions.series, brand, filtered?.counts ?? (hasFilters ? [] : undefined));
  const resultCount = results?.length ?? matchingCount;
  const pending = needsCatalog && !catalog;

  return (
    <>
      <Suspense fallback={null}><CatalogQueryObserver /></Suspense>
      <nav aria-label={t("ui.product_categories")} className="catalog-tabs">
        <Link href={categoryHref("")} aria-current={category ? undefined : "page"} className="catalog-tab">
          {t("ui.all")} <span>{total}</span>
        </Link>
        {taxonomy.map(({slug}) =>
          <Link key={slug} href={categoryHref(slug)} aria-current={group?.slug === slug ? "page" : undefined} className="catalog-tab">
            {t(taxonomyLabelKey(slug))} <span>{categoryCounts[slug]}</span>
          </Link>)}
      </nav>
      {group && group.leaves.length > 1 && <nav aria-label={t("ui.subcategories")} className="catalog-tabs">
        {[{slug: group.slug}, ...group.leaves].map(({slug}) =>
          <Link key={slug} href={categoryHref(slug)} aria-current={category === slug ? "page" : undefined} className="catalog-tab">
            {slug === group.slug ? t("ui.all") : t(taxonomyLabelKey(slug))}
            <span>{categoryCounts[slug]}</span>
          </Link>)}
      </nav>}
      <section aria-label={t("ui.catalog_filters")} className="catalog-filters">
        <div className="flex flex-wrap items-center gap-2.5">
          <label className="relative min-w-[min(100%,16rem)] flex-1">
            <span className="sr-only">{t("ui.search_catalog")}</span>
            <Search size={16} className="pointer-events-none absolute top-3 left-3 text-muted-foreground" aria-hidden="true" />
            <input ref={searchInput} type="search" defaultValue={query} onChange={(event) => update({ q: event.target.value }, true)}
              placeholder={t("card.search_placeholder")} className="catalog-input w-full pl-9" />
          </label>
          <div className="flex items-center gap-2" data-parameter-inline>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{t("ui.sort")}</span>
              <select value={sort} data-parameter-value
                onChange={(event) => update({ sort: event.target.value === defaultCatalogSort ? "" : event.target.value })} className="catalog-input">
                {Object.entries(sortLabels).map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}
              </select>
            </label>
            <ParameterHelp label={t("ui.sort_featured")} text={t("ui.sort_featured_help")} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <div role="group" aria-label={t("field.gender")} className="filter-group">
            <span className="control-label">{t("field.gender")}</span>
            {genders.map(([value, label]) => <button key={value} type="button" className="filter-pill" aria-pressed={gender === value}
              onClick={() => update({ gender: value })}>{t(label)}</button>)}
          </div>
          {facets.map(({key, label, selected, options}) => options.length > 0 && (
            <div key={key} role="group" aria-label={t(label)} className="filter-group">
              <span className="control-label">{t(label)}</span>
              {options.map(([value, name]) => <button key={value} type="button" className="filter-pill" aria-pressed={selected.includes(value)}
                onClick={() => toggle(key, value)}>{key === "activity" ? activityLabel(t, name) : name}</button>)}
            </div>
          ))}
          {seriesOptions.length > 0 && <div role="group" aria-label={t("ui.line")} className="filter-group min-w-0">
            <span className="control-label">{t("ui.line")}</span>
            {seriesOptions.map(({brand: scope, name, options}) => <div key={scope} className="filter-group"
              role={scope ? "group" : undefined} aria-label={scope ? name : undefined}>
              {scope && <span className="control-label">{name}</span>}
              {options.map(([line, amount]) => <button key={line} type="button" className="filter-pill"
                aria-pressed={selectedSeries.some((value) => scope ? seriesMatches(value, scope, line) : seriesSelection(value).line === line)}
                onClick={() => toggleSeries(scope, line)}>{line} <span className="font-mono tabular-nums">{amount}</span></button>)}
            </div>)}
          </div>}
        </div>
        <div className="flex flex-wrap gap-2.5">
          {typeFilters.map(({ label, queryKey, selected, options }) => (
            <label key={queryKey} className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{label}</span>
              <select value={selected} onChange={(event) => update({ [queryKey]: event.target.value, hard: queryKey === "protection" ? "" : params.get("hard") ?? "" })}
                className="catalog-input h-8">
                <option value="">{t("ui.all")}</option>
                {options.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </label>
          ))}
        </div>
        {familyFilters.length > 0 && <div role="group" aria-label={t("ui.family")} className="filter-group">
          <span className="control-label">{t("ui.family")}</span>
          {familyFilters.map((name) => <button key={name} type="button" className="filter-pill" aria-pressed={family === name}
            onClick={() => update({ family: family === name ? "" : name })}>{name}</button>)}
        </div>}
      </section>
      <div className="mb-3 flex min-h-7 items-center justify-between gap-3">
        <p role="status" className="font-mono text-xs tabular-nums text-muted-foreground">{t(pending ? "ui.loading_catalog_filters" : "ui.product_count", {count: resultCount})}</p>
        {hasFilters &&
          <button type="button" className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            onClick={() => window.history.pushState(null, "", location.pathname)}>{t("ui.reset_filters")}</button>}
      </div>
      {pending && failed && <div className="mb-3 flex items-center gap-3 text-sm text-muted-foreground" role="alert">
        <span>{t("ui.catalog_load_failed")}</span>
        <Button type="button" variant="outline" size="sm" onClick={() => setFailed(false)}>{t("ui.catalog_retry")}</Button>
      </div>}
      {(!pending || !hasFilters) && (resultCount > 0
        ? <div className="grid grid-cols-2 items-stretch gap-2.5 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
          {results ? <CatalogResultCards products={results.slice(0, count)} /> : previewCards}
        </div>
        : <p className="border bg-card p-6 text-muted-foreground">{t("ui.no_products_match_these_filters")}</p>)}
      {!pending && resultCount > count && <div className="mt-7 flex justify-center">
        <Button type="button" variant="outline" className="h-10 px-5" onClick={() => setPage({ filters: deferredParams, count: count + catalogPageSize })}>{t("ui.show_more_products")}</Button>
      </div>}
    </>
  );
}
