"use client";

import {Link} from "@/i18n/navigation";
import {activityCode, activityLabel, displayCardCell, displayParameter, displayPrice, optionLabel, useCopy} from "@/i18n/copy";
import { useSearchParams } from "next/navigation";
import { useDeferredValue, useEffect, useRef, useState } from "react";
import { ArrowUpRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CompareButton } from "@/components/catalog/compare-selection";
import { ColorDot, GenderPill, ProductBadges, ProductImage } from "@/components/catalog/product-media";
import type {CatalogCard} from "@/lib/product-view";
import {taxonomy, taxonomyGroup, taxonomyLabelKey, taxonomyPath} from "@/lib/taxonomy";

import {ParameterHelp} from "@/components/catalog/parameter-help";
import {catalogSort, defaultCatalogSort, rankFeatured, type CatalogSort} from "@/lib/catalog/featured-sort";
import {searchCatalog} from "@/lib/catalog-search";
import type {CatalogListing} from "@/lib/catalog";
import { cardFields, fieldsByKey } from "@/lib/parameters/registry";
import { missing } from "@/lib/parameters/model";

const PAGE_SIZE = 24;
const sortLabels: Record<CatalogSort, string> = {
  featured: "ui.sort_featured",
  name: "ui.sort_name",
  "price-asc": "ui.sort_price_asc",
  "price-desc": "ui.sort_price_desc",
  weight: "ui.sort_weight",
};
const genders = [["", "ui.all"], ["men", "ui.filter_men"], ["women", "ui.filter_women"], ["unisex", "gender.unisex"]];

function CatalogCardView({ product, eager }: { product: CatalogListing; eager: boolean }) {
  const {t} = useCopy();
  return (
    <article className="gear-card min-w-0 overflow-hidden border bg-card">
      <Link href={`/products/${product.slug}`} prefetch={false} className="group relative block">
        <ProductImage src={product.image} sizes="(min-width: 1280px) 320px, (min-width: 768px) 30vw, 46vw" eager={eager} className="aspect-[4/5]" />
        <div className="absolute inset-x-2 top-2 flex flex-wrap items-start gap-1">
          <GenderPill gender={product.gender} />
        </div>
        <span className="sr-only">{t("ui.view_product", {name: product.name})}</span>
        <span className="absolute right-2 bottom-2 hidden size-8 place-items-center bg-background text-foreground sm:grid">
          <ArrowUpRight size={15} aria-hidden="true" />
        </span>
      </Link>
      <div className="grid gap-2.5 p-2.5 sm:p-4">
        {product.swatches.length > 0 && (
          <div className="flex items-center gap-1.5" aria-label={t("ui.color_count", {count: product.swatches.length})}>
            {product.swatches.slice(0, 5).map((color, index) => <span key={index} title={color.label}><ColorDot color={color} /></span>)}
            {product.swatches.length > 5 && <span className="font-mono text-[0.65rem] text-muted-foreground">+{product.swatches.length - 5}</span>}
          </div>
        )}
        <div className="flex min-h-5 flex-wrap items-center gap-1.5 empty:hidden"><ProductBadges product={product} /></div>
        <div>
          <h2 className="text-balance text-[0.95rem] leading-tight font-semibold sm:text-lg">
            <Link href={`/products/${product.slug}`} prefetch={false} className="hover:text-primary">{product.name}</Link>
          </h2>
          <p className="text-xs text-muted-foreground">{product.brand}</p>
          <p className="mt-1 font-mono text-sm tabular-nums text-primary">{displayPrice(t, product.msrp, product.currency)}</p>
        </div>
        <dl aria-label={t("ui.key_specs")} data-card-fields className="grid grid-cols-2 gap-px border border-border bg-border">
          {cardFields.map((field) => {
            const label = t(field.label);
            const {text, title} = displayCardCell(t, product.card, field.key);
            return <div key={field.key} data-card-field={field.key} data-parameter-row className="min-w-0 bg-card px-1.5 py-1.5 sm:px-2">
              <dt className="flex h-6 min-w-0 items-center gap-0.5 text-[0.65rem] text-muted-foreground">
                <span className="truncate" title={label}>{label}</span>
                {"help" in field && <ParameterHelp label={label} text={t(field.help)} />}
              </dt>
              <dd data-parameter-value className="truncate font-mono text-[0.65rem] tabular-nums sm:text-xs" title={title}>{text}</dd>
            </div>;
          })}
        </dl>
        <CompareButton product={product} compact />
      </div>
    </article>
  );
}

export function CatalogBrowser({products, category, categoryCounts, total}: {
  products: CatalogListing[]; category: string; categoryCounts: Record<string, number>; total: number;
}) {
  const {t, locale} = useCopy();
  const params = useSearchParams();
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
  const [page, setPage] = useState({ filters: "", count: PAGE_SIZE });
  const searchInput = useRef<HTMLInputElement>(null);

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
    if (key === "series") next.delete("line");
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
    {key: "brand", label: "field.brand", selected: brand, options: [...new Map(products.map(({brandSlug, brand}) => [brandSlug, brand]))]},
    {key: "series", label: "ui.line", selected: series.length ? series : legacyLine === "veilance" ? ["Veilance"] : [],
      options: [...new Set(products.flatMap(({series}) => series ?? []))].sort().map((value) => [value, value])},
    {key: "activity", label: "field.activities", selected: activity,
      options: [...new Map(products.flatMap(({activities}) => activities.map((value) => [activityCode(value), value] as const)))].sort((a, b) => a[1].localeCompare(b[1]))},
  ];
  const typeFilters = [
    { field: fieldsByKey.get("product_type")!, queryKey: "type", selected: productType, read: (product: CatalogCard) => product.productType },
    { field: fieldsByKey.get("protection_type")!, queryKey: "protection", selected: protectionType, read: (product: CatalogCard) => product.protectionType },
  ].map((filter) => {
    const present = new Set(products.map(filter.read));
    const options = [...Object.entries(filter.field.options ?? {}).map(([key, label]) => [key, optionLabel(t, filter.field, key, label)]), ...(["review", "unpublished", "inapplicable"] as const)
      .map((state) => [state, displayParameter(t, locale, filter.field, missing(state))])].filter(([key]) => present.has(key) || key === filter.selected);
    return { ...filter, options };
  });
  const familyCounts = new Map<string, number>();
  for (const product of products) if (product.family) familyCounts.set(product.family, (familyCounts.get(product.family) ?? 0) + 1);
  const topFamilies = [...familyCounts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 8).map(([name]) => name);
  const familyFilters = family && !topFamilies.includes(family) ? [...topFamilies, family] : topFamilies;

  const filtered = products.filter((product) =>
    (!gender || product.gender === gender) && (!family || product.family === family) &&
    (!brand.length || brand.includes(product.brandSlug)) &&
    (!series.length ? !legacyLine || product.veilance === (legacyLine === "veilance") : series.some((value) => product.series?.includes(value))) &&
    (!activity.length || activity.some((value) => product.activities.some((label) => activityCode(label) === value))) && (!productType || product.productType === productType) &&
    (!protectionType || product.protectionType === protectionType));
  const matches = searchCatalog(filtered, deferredQuery);
  const results = sort === defaultCatalogSort ? rankFeatured(matches).map(({product}) => product)
    : [...matches].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      const first = sort === "weight" ? a.card.weight : a.msrp;
      const second = sort === "weight" ? b.card.weight : b.msrp;
      if (typeof first !== "number") return typeof second === "number" ? 1 : 0;
      if (typeof second !== "number") return -1;
      if (sort !== "weight" && a.currency !== b.currency) {
        return (a.currency ?? "").localeCompare(b.currency ?? "");
      }
      return (first - second) * (sort === "price-desc" ? -1 : 1) || a.name.localeCompare(b.name);
    });
  const count = page.filters === deferredParams ? page.count : PAGE_SIZE;

  return (
    <>
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
        </div>
        <div className="flex flex-wrap gap-2.5">
          {typeFilters.map(({ field, queryKey, selected, options }) => (
            <label key={queryKey} className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{t("field." + field.key)}</span>
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
        <p role="status" className="font-mono text-xs tabular-nums text-muted-foreground">{t("ui.product_count", {count: results.length})}</p>
        {Boolean(query || gender || legacyLine || brand.length || series.length || activity.length || family || productType || protectionType || sort !== defaultCatalogSort) &&
          <button type="button" className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            onClick={() => window.history.pushState(null, "", location.pathname)}>{t("ui.reset_filters")}</button>}
      </div>
      {results.length > 0
        ? <div className="grid grid-cols-2 items-stretch gap-2.5 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
          {results.slice(0, count).map((product, index) => <CatalogCardView key={product.slug} product={product} eager={index < 2} />)}
        </div>
        : <p className="border bg-card p-6 text-muted-foreground">{t("ui.no_products_match_these_filters")}</p>}
      {results.length > count && <div className="mt-7 flex justify-center">
        <Button type="button" variant="outline" className="h-10 px-5" onClick={() => setPage({ filters: deferredParams, count: count + PAGE_SIZE })}>{t("ui.show_more_products")}</Button>
      </div>}
    </>
  );
}
