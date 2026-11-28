"use client";

import {Link, usePathname, useRouter} from "@/i18n/navigation";
import {activityLabel, useCopy} from "@/i18n/ui-copy";
import { useSearchParams } from "next/navigation";
import { Suspense, useDeferredValue, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type CompositionEvent, type FormEvent, type MouseEvent, type ReactNode } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Dialog } from "radix-ui";
import { Button } from "@/components/ui/button";
import {taxonomy, taxonomyGroup, taxonomyLabelKey, taxonomyPath} from "@/lib/taxonomy";

import {hasLocale} from "next-intl";
import {localizedPath, locales} from "@/i18n/routing";
import {ParameterHelp} from "@/components/catalog/parameter-help";
import {catalogSort, defaultCatalogSort, type CatalogSort} from "@/lib/catalog/featured-sort";
import type {CatalogListing} from "@/lib/catalog";

import {catalogBrand} from "@/lib/catalog-scope";
import {seriesMatches, seriesSelection, visibleSeries} from "@/lib/catalog/series";
import type {catalogFacets} from "@/lib/catalog/facets";
import {catalogPageSize, catalogPageSlice} from "@/lib/catalog/pagination";
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
  function restoreHistoryQuery() {
    clearSearchNavigation();
    filterNavigation = undefined;
    listener();
  }
  window.addEventListener(queryChangeEvent, listener);
  window.addEventListener("popstate", restoreHistoryQuery);
  return () => {
    window.removeEventListener(queryChangeEvent, listener);
    window.removeEventListener("popstate", restoreHistoryQuery);
  };
}

const currentQuery = () => window.location.search.slice(1);
const prerenderedQuery = () => "";

type SearchDraft = {input: HTMLInputElement; pathname: string; destination: string; expires: number};
let searchNavigation: SearchDraft | undefined;
let filterNavigation: {destination: string; expires: number} | undefined;

function clearSearchNavigation() {
  searchNavigation = undefined;
}

function takeFilterNavigation() {
  if (!filterNavigation || performance.now() > filterNavigation.expires ||
    location.pathname + location.search !== filterNavigation.destination) return false;
  filterNavigation = undefined;
  return true;
}

function rememberFilterNavigation(destination: string) {
  filterNavigation = {destination, expires: performance.now() + 30_000};
}

function replaceCatalogQuery(params: URLSearchParams) {
  const search = params.toString();
  window.history.replaceState(null, "", location.pathname + (search ? "?" + search : ""));
  window.dispatchEvent(new Event(queryChangeEvent));
}

function setSearchTerm(params: URLSearchParams, value: string) {
  if (value) params.set("q", value);
  else params.delete("q");
}

type ReturnPosition = {url: string; count: number; top: number};

function readReturnPosition() {
  const position: ReturnPosition | undefined = window.history.state?.rangesetCatalog;
  return position?.url === location.pathname + location.search ? JSON.stringify(position) : "";
}

async function fetchCatalog() {
  const response = fetch("/api/catalog").then(async (result) => {
    if (!result.ok) throw new Error("Catalog request failed");
    return await result.json() as CatalogListing[];
  });
  const [products, {filterCatalog}, {default: Cards}] = await Promise.all([
    response, import("./catalog-filter-results"), import("./catalog-result-cards"),
  ]);
  return {products, filterCatalog, Cards};
}

let catalogRequest: ReturnType<typeof fetchCatalog> | undefined;

function loadCatalog() {
  return catalogRequest ??= fetchCatalog().catch((error: unknown) => {
    catalogRequest = undefined;
    throw error;
  });
}

const cardsLayout = "grid grid-cols-2 items-stretch gap-2.5 md:grid-cols-3 md:gap-4 xl:grid-cols-4";

function CatalogQueryObserver() {
  const query = useSearchParams();
  useEffect(() => {
    // App Router also changes the URL during Link navigation and history traversal.
    window.dispatchEvent(new Event(queryChangeEvent));
  }, [query]);
  return null;
}

export function CatalogBrowser({previewCards, previewCount, pagination, startPage, styleFilters, facets: catalogOptions, category, categoryCounts, total, matchingCount}: {
  previewCards: ReactNode; previewCount: number; pagination: ReactNode; startPage: number; styleFilters: StyleFilters;
  facets: ReturnType<typeof catalogFacets>; category: string;
  categoryCounts: Record<string, number>; total: number; matchingCount: number;
}) {
  const {t, locale} = useCopy();
  const router = useRouter();
  const pathname = usePathname();
  const queryString = useSyncExternalStore(subscribeToQuery, currentQuery, prerenderedQuery);
  const savedPosition = useSyncExternalStore(subscribeToQuery, readReturnPosition, prerenderedQuery);
  const returnPosition = savedPosition ? JSON.parse(savedPosition) as ReturnPosition : null;
  const restoredPosition = useRef("");
  const sentinel = useRef<HTMLDivElement>(null);
  const params = new URLSearchParams(queryString);
  const query = params.get("q") ?? "";
  const gender = params.get("gender") ?? "";
  const legacyLine = params.get("line");
  const selections = (key: string) => params.getAll(key);
  const series = selections("series").filter((value) => {
    const {brand} = seriesSelection(value);
    return !brand || brand === catalogBrand;
  });
  const activity = selections("activity");
  const family = params.get("family") ?? "";
  const sort = catalogSort(params.get("sort"));
  const productType = params.get("type") ?? "";
  const protectionType = params.get("protection") ?? (params.get("hard") === "1" ? "hard_shell" : "");
  const deferredQuery = useDeferredValue(query);

  const [page, setPage] = useState({ filters: "", count: catalogPageSize });
  const searchInput = useRef<HTMLInputElement>(null);
  const composing = useRef(false);
  const [catalog, setCatalog] = useState<Awaited<ReturnType<typeof fetchCatalog>> | null>(null);
  const [failed, setFailed] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterRoutePending, setFilterRoutePending] = useState(false);
  const filterTrigger = useRef<HTMLButtonElement>(null);
  const hasFilters = Boolean(query || gender || legacyLine || series.length || activity.length || family ||
    productType || protectionType || sort !== defaultCatalogSort);
  const currentPage = hasFilters ? 1 : startPage;
  const count = Math.max(page.filters === queryString ? page.count : catalogPageSize, returnPosition?.count ?? 0);
  const needsCatalog = hasFilters || count > catalogPageSize;

  useEffect(() => {
    if (startPage !== 1) return;
    const frame = requestAnimationFrame(() => {
      if (takeFilterNavigation()) setFiltersOpen(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname, queryString, startPage]);

  useEffect(() => {
    if (!needsCatalog || catalog || failed) return;
    let active = true;
    loadCatalog().then((loaded) => {
      if (active) setCatalog(loaded);
    }).catch(() => {
      if (active) setFailed(true);
    });
    return () => { active = false; };
  }, [needsCatalog, catalog, failed]);

  useLayoutEffect(() => {
    const handoff = searchNavigation;
    const input = searchInput.current;
    if (!input || !handoff || startPage !== 1 || location.pathname !== handoff.pathname ||
      location.pathname + location.search !== handoff.destination) return;
    searchNavigation = undefined;
    if (performance.now() > handoff.expires) return;

    const previous = handoff.input;
    const {value, selectionStart, selectionEnd, selectionDirection} = previous;
    // Restore the latest draft even if the route response was generated for an earlier keystroke.
    const params = new URLSearchParams(location.search);
    if ((params.get("q") ?? "") !== value) {
      setSearchTerm(params, value);
      replaceCatalogQuery(params);
    }
    input.value = value;
    if (document.activeElement === document.body || document.activeElement === previous) {
      input.focus({preventScroll: true});
      input.setSelectionRange(selectionStart, selectionEnd, selectionDirection ?? undefined);
    }
  }, [pathname, queryString, startPage]);

  useEffect(() => {
    if (composing.current || searchNavigation?.input === searchInput.current) return;
    // Read the current location so a deferred router update cannot overwrite a newer keystroke.
    const current = new URLSearchParams(window.location.search).get("q") ?? "";
    if (searchInput.current && searchInput.current.value !== current) searchInput.current.value = current;
  }, [query]);

  function updateSearch(input: HTMLInputElement) {
    const next = new URLSearchParams(window.location.search);
    const previousTerm = next.get("q") ?? "";
    next.delete("page");
    next.delete("brand");
    setSearchTerm(next, input.value);
    if (startPage === 1) {
      if ((next.get("q") ?? "") !== previousTerm) replaceCatalogQuery(next);
      return;
    }

    if (searchNavigation?.input === input && performance.now() <= searchNavigation.expires) return;
    if (!hasLocale(locales, locale)) return;
    const firstPage = taxonomyPath(category);
    const queryPart = next.size ? "?" + next.toString() : "";
    const targetPath = localizedPath(firstPage, locale);
    searchNavigation = {input, pathname: targetPath, destination: targetPath + queryPart, expires: performance.now() + 30_000};
    router.replace(firstPage + queryPart, {scroll: false});
  }

  function searchChanged(event: FormEvent<HTMLInputElement>) {
    if (!composing.current) updateSearch(event.currentTarget);
  }

  function searchComposed(event: CompositionEvent<HTMLInputElement>) {
    composing.current = false;
    updateSearch(event.currentTarget);
  }

  function writeQuery(next: URLSearchParams) {
    clearSearchNavigation();
    next.delete("page");
    next.delete("brand");
    const search = next.toString();
    const suffix = search ? "?" + search : "";
    if (!filtersOpen) window.scrollTo(0, 0);
    if (startPage > 1) {
      const firstPage = taxonomyPath(category);
      if (filtersOpen && hasLocale(locales, locale)) {
        setFilterRoutePending(true);
        rememberFilterNavigation(localizedPath(firstPage, locale) + suffix);
      }
      router.push(firstPage + suffix, {scroll: !filtersOpen});
      return;
    }
    window.history.pushState(null, "", location.pathname + suffix);
    window.dispatchEvent(new Event(queryChangeEvent));
  }

  function update(values: Record<string, string>) {
    const next = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(values)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    writeQuery(next);
  }

  function toggle(key: string, value: string) {
    const next = new URLSearchParams(window.location.search);
    const prior = next.getAll(key);
    next.delete(key);
    for (const item of prior.includes(value) ? prior.filter((item) => item !== value) : [...prior, value]) next.append(key, item);
    writeQuery(next);
  }

  const selectedSeries = series.length ? series : legacyLine === "veilance" ? ["Veilance"] : [];

  function toggleSeries(brandScope: string, line: string) {
    const next = new URLSearchParams(window.location.search);
    const existing = series;
    const selections = existing.length ? existing : next.get("line") === "veilance" ? ["Veilance"] : [];
    const matches = brandScope ? (value: string) => seriesMatches(value, brandScope, line) :
      (value: string) => seriesSelection(value).line === line;
    const updated = selections.some(matches) ? selections.filter((value) => !matches(value)) :
      [...selections, brandScope ? brandScope + ":" + line : line];
    next.delete("line");
    next.delete("series");
    for (const value of updated) next.append("series", value);
    writeQuery(next);
  }

  function categoryHref(slug: string) {
    const next = new URLSearchParams(params.toString());
    for (const key of ["category", "family", "hard", "type", "protection", "page", "brand"]) next.delete(key);
    const search = next.toString();
    return taxonomyPath(slug) + (search ? "?" + search : "");
  }

  const group = taxonomyGroup(category);
  const typeFilters = [
    {queryKey: "type", selected: productType, present: catalogOptions.productTypes},
    {queryKey: "protection", selected: protectionType, present: catalogOptions.protectionTypes},
  ].map(({queryKey, selected, present}) => {
    const descriptor = styleFilters[queryKey as keyof StyleFilters];
    return {queryKey, selected, label: descriptor.label,
      options: descriptor.options.filter(([key]) => present.includes(key) || key === selected)};
  });
  const selectedFilters: {key: string; label: string; remove: () => void}[] = [];
  function addFilter(key: string, label: string, remove: () => void) {
    selectedFilters.push({key, label, remove});
  }
  if (gender) addFilter("gender", t(genders.find(([value]) => value === gender)?.[1] ?? "field.gender"), () => update({gender: ""}));
  for (const value of new Set(activity)) {
    addFilter("activity:" + value, activityLabel(t, catalogOptions.activities.find(([code]) => code === value)?.[1] ?? value),
      () => toggle("activity", value));
  }
  for (const value of new Set(series)) {
    addFilter("series:" + value, seriesSelection(value).line, () => toggle("series", value));
  }
  if (!series.length && legacyLine === "veilance") addFilter("line", "Veilance", () => update({line: ""}));
  if (family) addFilter("family", family, () => update({family: ""}));
  for (const {label, queryKey, selected, options} of typeFilters) {
    if (!selected) continue;
    const option = options.find(([key]) => key === selected);
    addFilter(queryKey, option ? t(option[1]) : t(label),
      () => update(queryKey === "protection" ? {protection: "", hard: ""} : {type: ""}));
  }
  if (sort !== defaultCatalogSort) addFilter("sort", t(sortLabels[sort]), () => update({sort: ""}));
  const topFamilies = catalogOptions.families;
  const familyFilters = family && !topFamilies.includes(family) ? [...topFamilies, family] : topFamilies;

  const filtered = catalog && catalog.filterCatalog(catalog.products, {
    category, gender, family, brand: [], series, legacyLine, activity, productType, protectionType, query: deferredQuery, sort, translate: t,
  });
  const results = filtered?.results;
  const seriesOptions = visibleSeries(catalogOptions.series, [catalogBrand], filtered?.counts ?? (hasFilters ? [] : undefined));
  const resultCount = results?.length ?? matchingCount;
  const pending = needsCatalog && !catalog;
  const shown = catalogPageSlice(results ?? [], currentPage, count);
  const displayedCount = results ? shown.length : previewCount;
  const last = (currentPage - 1) * catalogPageSize + displayedCount;
  const canLoad = !pending && last < resultCount;
  const Cards = catalog?.Cards;

  useEffect(() => {
    if (!canLoad || !sentinel.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      setPage({filters: queryString, count: count + catalogPageSize});
    }, {rootMargin: window.innerHeight + "px 0px"});
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [canLoad, count, queryString]);

  useEffect(() => {
    if (!savedPosition || pending || restoredPosition.current === savedPosition) return;
    const frame = requestAnimationFrame(() => {
      restoredPosition.current = savedPosition;
      window.scrollTo(0, (JSON.parse(savedPosition) as ReturnPosition).top);
    });
    return () => cancelAnimationFrame(frame);
  }, [pending, savedPosition]);

  function saveReturnPosition(event: MouseEvent<HTMLDivElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey ||
      !(event.target instanceof Element) || !event.target.closest("a[href]")) return;
    restoredPosition.current = "";
    window.history.replaceState({...window.history.state, rangesetCatalog: {
      url: location.pathname + location.search, count: displayedCount, top: window.scrollY,
    } satisfies ReturnPosition}, "");
  }

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
      <Dialog.Root open={filtersOpen} onOpenChange={(open) => {
        setFiltersOpen(open);
        if (!open) {
          filterNavigation = undefined;
          setFilterRoutePending(false);
        }
      }}>
        <div className="catalog-toolbar">
          <label className="relative min-w-[min(100%,10rem)] flex-1">
            <span className="sr-only">{t("ui.search_catalog")}</span>
            <Search size={16} className="pointer-events-none absolute top-3 left-3 text-muted-foreground" aria-hidden="true" />
            <input ref={searchInput} type="search" defaultValue={query} onChange={searchChanged}
              onCompositionStart={() => { composing.current = true; }} onCompositionEnd={searchComposed}
              placeholder={t("card.search_placeholder")} className="catalog-input min-h-11 w-full pl-9" />
          </label>
          <Dialog.Trigger asChild>
            <Button ref={filterTrigger} variant="outline" className="min-h-11 shrink-0 gap-2">
              <SlidersHorizontal aria-hidden="true" />
              {t("ui.catalog_filters")}
              {selectedFilters.length > 0 && <span className="font-mono text-primary">{selectedFilters.length}</span>}
            </Button>
          </Dialog.Trigger>
        </div>
        <Dialog.Portal>
          <Dialog.Overlay className="catalog-filter-overlay" />
          <Dialog.Content className="catalog-filter-panel" aria-describedby={undefined}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              filterTrigger.current?.focus({preventScroll: true});
            }}>
            <div className="flex min-w-0 items-center justify-between gap-2 border-b px-4 py-2">
              <Dialog.Title className="text-base font-semibold">{t("ui.catalog_filters")}</Dialog.Title>
              <Dialog.Close asChild>
                <Button type="button" variant="ghost" className="min-h-11">{t("ui.catalog_done")}</Button>
              </Dialog.Close>
            </div>
            <fieldset disabled={filterRoutePending} aria-busy={filterRoutePending} className="catalog-filter-fields">
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
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <div role="group" aria-label={t("field.gender")} className="filter-group">
                  <span className="control-label">{t("field.gender")}</span>
                  {genders.map(([value, label]) => <button key={value} type="button" className="filter-pill" aria-pressed={gender === value}
                    onClick={() => update({ gender: value })}>{t(label)}</button>)}
                </div>
                {catalogOptions.activities.length > 0 && <div role="group" aria-label={t("field.activities")} className="filter-group">
                  <span className="control-label">{t("field.activities")}</span>
                  {catalogOptions.activities.map(([value, name]) => <button key={value} type="button" className="filter-pill"
                    aria-pressed={activity.includes(value)} onClick={() => toggle("activity", value)}>{activityLabel(t, name)}</button>)}
                </div>}
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
            </fieldset>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 text-sm text-muted-foreground">
              <p role="status">{t(filterRoutePending ? "ui.loading_catalog_filters" : pending
                ? failed ? "ui.catalog_load_failed" : "ui.loading_catalog_filters" : "ui.product_count", {count: resultCount})}</p>
              {pending && failed && <Button type="button" size="sm" variant="outline"
                onClick={() => setFailed(false)}>{t("ui.catalog_retry")}</Button>}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      {selectedFilters.length > 0 && <ul aria-label={t("ui.catalog_active_filters")} className="mb-3 flex flex-wrap gap-1.5">
        {selectedFilters.map(({key, label, remove}) => <li key={key} className="min-w-0">
          <Button type="button" variant="outline" size="sm" className="h-auto min-h-8 max-w-full whitespace-normal text-left pointer-coarse:min-h-11"
            aria-label={t("ui.catalog_remove_filter", {label})} onClick={(event) => {
              const current = event.currentTarget;
              const next = current.closest("li")?.nextElementSibling?.querySelector("button");
              remove();
              (next ?? filterTrigger.current)?.focus({preventScroll: true});
            }}>
            {label}<X aria-hidden="true" />
          </Button>
        </li>)}
      </ul>}
      <div className="mb-3 flex min-h-8 flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p role="status" className="font-mono text-xs tabular-nums text-muted-foreground">{t(pending && !failed ? "ui.loading_catalog_filters" : "ui.product_count", {count: resultCount})}</p>
        {!hasFilters && pagination}
        {selectedFilters.length > 0 &&
          <button type="button" className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            onClick={() => {
              const next = new URLSearchParams();
              setSearchTerm(next, query);
              writeQuery(next);
              filterTrigger.current?.focus({preventScroll: true});
            }}>{t("ui.reset_filters")}</button>}
      </div>
      {pending && failed && <div className="mb-3 flex items-center gap-3 text-sm text-muted-foreground" role="alert">
        <span>{t("ui.catalog_load_failed")}</span>
        <Button type="button" variant="outline" size="sm" onClick={() => setFailed(false)}>{t("ui.catalog_retry")}</Button>
      </div>}
      {(!pending || !hasFilters) && (resultCount > 0
        ? <div className={cardsLayout} onClickCapture={saveReturnPosition}>
          {Cards ? <Cards products={shown} /> : previewCards}
        </div>
        : <p className="border bg-card p-6 text-muted-foreground">{t("ui.no_products_match_these_filters")} {query && t("ui.catalog_search_hint")}</p>)}
      {pending && !failed && <div aria-hidden="true" className={cardsLayout + " mt-3"}>
        {Array.from({length: 4}, (_, index) => <div key={index} className="min-w-0 border bg-card">
          <div className="aspect-[4/5] bg-muted" />
          <div className="grid gap-2 p-3">
            <div className="h-4 w-3/4 bg-muted" />
            <div className="h-10 bg-muted" />
          </div>
        </div>)}
      </div>}
      {canLoad && <div ref={sentinel} className="h-px" aria-hidden="true" />}
      {!pending && !canLoad && resultCount > 0 && <p role="status" className="mt-6 text-center text-sm text-muted-foreground">
        {t("ui.catalog_all_shown", {count: displayedCount})}
      </p>}
    </>
  );
}
