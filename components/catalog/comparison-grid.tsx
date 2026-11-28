"use client";

import dynamic from "next/dynamic";
import {Link, useRouter} from "@/i18n/navigation";
import {displayPrice, genderDisplay, localNote, partDisplay, useCopy} from "@/i18n/copy";
import { Fragment, useEffect, useId, useLayoutEffect, useRef, useState, useTransition, type CSSProperties } from "react";
import { Check, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { rememberSelection, useCompareSelection, type PickedProduct } from "@/components/catalog/compare-selection";
import { GenderPill, ProductImage } from "@/components/catalog/product-media";
import {findCompareButton, neighborAfterRemoval} from "./compare-focus";
import {comparisonHref} from "@/lib/comparison-href";
import type {SearchableProduct} from "@/lib/catalog-search";
import type {ComparisonGroup} from "@/lib/comparison";
import { visibleInComparison } from "@/lib/parameters/model";
import { localGroup, ParameterLabel, ParameterLegend, ParameterValue } from "./parameter-table";

export type ComparisonProduct = PickedProduct & { msrp: number | null; currency?: string | null; priceLabel?: string; outbound?: string; example?: boolean; discontinued?: boolean };
export type PickerProduct = ComparisonProduct & SearchableProduct;

const ProductPicker = dynamic(() => import("./comparison-product-picker"), {ssr: false});

const overviewFields = ["weight", "membrane", "fit", "capacity", "msrp"];

export function CompareOverview({products, groups}: {products: ComparisonProduct[]; groups: ComparisonGroup[]}) {
  const {t} = useCopy();
  if (products.length !== 2) return null;
  const rows = groups.flatMap(({rows}) => rows);
  const differences = overviewFields.flatMap((key) => {
    const row = rows.find((row) => row.key === key);
    return row?.differs && !row.note && !row.weakDifference &&
      row.cells.every(({state}) => state === "known") ? [row] : [];
  }).slice(0, 3);
  if (!differences.length) return null;

  return <section className="mb-5 min-w-0" aria-label={t("ui.compare_key_differences")}>
    <h2 className="section-title mb-2">{t("ui.compare_key_differences")}</h2>
    <table className="compare-overview-table">
      <thead><tr>
        <th scope="col"><span className="sr-only">{t("ui.specs")}</span></th>
        {products.map(({slug, name, gender}) => <th scope="col" key={slug}>
          {name}<span className="mt-0.5 block text-xs font-normal text-muted-foreground">{genderDisplay(t, gender)}</span>
        </th>)}
      </tr></thead>
      <tbody>{differences.map(({key, field, cells, label}) => <tr key={key}>
        <th scope="row"><ParameterLabel field={field} label={label} /></th>
        {cells.map((cell, index) => <td key={products[index].slug}><ParameterValue field={field} value={cell} comparison /></td>)}
      </tr>)}</tbody>
    </table>
  </section>;
}

export function CompareTable({ products, groups, highlight, differencesOnly, remove }: {
  products: ComparisonProduct[]; groups: ComparisonGroup[]; highlight: boolean; differencesOnly: boolean;
  remove?: (slug: string, trigger: HTMLButtonElement) => void;
}) {
  const {t} = useCopy();
  const scrollId = useId();
  const scrollRegion = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState(0);

  function updateScrollEdges(element: HTMLDivElement) {
    setEdges((element.scrollLeft > 1 ? 1 : 0) | (element.scrollWidth - element.clientWidth - element.scrollLeft > 1 ? 2 : 0));
  }

  useEffect(() => {
    const element = scrollRegion.current;
    const table = element?.firstElementChild;
    if (!element || !table) return;
    const observer = new ResizeObserver(() => updateScrollEdges(element));
    observer.observe(element);
    observer.observe(table);
    return () => observer.disconnect();
  }, []);

  function scrollColumn(direction: -1 | 1) {
    const element = scrollRegion.current;
    const column = element?.querySelector("thead th:nth-child(2)");
    if (element && column) element.scrollBy({left: direction * column.getBoundingClientRect().width});
  }

  const visible = groups.flatMap(({ title, rows }) => {
    const filtered = rows.filter((row) => visibleInComparison(row, differencesOnly));
    return filtered.length ? [{ title, rows: filtered }] : [];
  });
  return <div className="comparison-frame" data-multiple-columns={products.length > 2 || undefined} style={{ "--product-count": products.length } as CSSProperties}>
    {edges !== 0 && <div className="flex justify-end gap-1 border-b px-2 py-1">
      <Button type="button" variant="ghost" size="icon" className="pointer-coarse:size-11 aria-disabled:opacity-40"
        aria-label={t("ui.compare_scroll_left")} aria-controls={scrollId} aria-disabled={(edges & 1) === 0}
        onClick={() => { if (edges & 1) scrollColumn(-1); }}><ChevronLeft aria-hidden="true" /></Button>
      <Button type="button" variant="ghost" size="icon" className="pointer-coarse:size-11 aria-disabled:opacity-40"
        aria-label={t("ui.compare_scroll_right")} aria-controls={scrollId} aria-disabled={(edges & 2) === 0}
        onClick={() => { if (edges & 2) scrollColumn(1); }}><ChevronRight aria-hidden="true" /></Button>
    </div>}
    <div id={scrollId} ref={scrollRegion} role="region" aria-label={t("ui.scroll_compare")} tabIndex={0}
      className="comparison-scroll" onScroll={(event) => updateScrollEdges(event.currentTarget)}>
      <table className="comparison-matrix" aria-label={t("ui.comparison_table")}>
        <colgroup><col className="comparison-label-col" />{products.map(({ slug }) => <col key={slug} />)}</colgroup>
        <thead><tr>
          <th scope="col" className="matrix-label align-bottom">{t("ui.specs")}</th>
          {products.map(({slug, name, gender}) => <th scope="col" className="align-top" key={slug}>
            <span className="line-clamp-2 leading-tight" aria-hidden="true">{name}</span>
            <span className="sr-only">{name} · {genderDisplay(t, gender)}</span>
          </th>)}
        </tr></thead>
        <tbody><tr className="comparison-product-info">
          <th scope="row" className="matrix-label">{t("field.model")}</th>
          {products.map((product) => <td key={product.slug}>
            <div className="flex items-start justify-between gap-1">
              <ProductImage src={product.image} className="compare-thumb" />
              {remove && <Button type="button" variant="ghost" size="icon-xs" className="compare-table-remove pointer-coarse:size-11" data-compare-remove={product.slug} aria-label={t("ui.compare_action", {action: t("ui.remove"), name: `${product.name} (${genderDisplay(t, product.gender)})`})} onClick={(event) => remove(product.slug, event.currentTarget)}>
                <X aria-hidden="true" />
              </Button>}
            </div>
            <Link href={`/products/${product.slug}`} className="mt-2 block text-sm leading-snug font-semibold wrap-break-word hover:text-primary">{product.name}</Link>
            <div className="mt-1 flex flex-wrap gap-1"><GenderPill gender={product.gender} />
              {product.discontinued && <span className="text-xs text-[#efc9ae]">{t("ui.discontinued")}</span>}
              {product.example && <span className="text-xs text-muted-foreground">{t("ui.example")}</span>}
            </div>
            <span className="mt-1 block font-mono text-xs tabular-nums text-primary">{product.priceLabel ?? displayPrice(t, product.msrp, product.currency)}</span>
            {product.outbound && <Button size="sm" variant="outline" className="mt-2 h-auto max-w-full whitespace-normal py-1 text-left text-xs" asChild>
              <a href={product.outbound}>{t("ui.view_on_brand_site")}</a>
            </Button>}
          </td>)}
        </tr></tbody>
        {visible.map(({ title, rows }) => <tbody key={title}>
          <tr className="matrix-group"><th scope="rowgroup" colSpan={products.length + 1}><div className="parameter-group-heading">{localGroup(t, title)}</div></th></tr>
          {rows.map(({ key, label, field, cells, differs, note, referenceNote, subgroup }, index) => <Fragment key={key}>
            {subgroup && subgroup !== rows[index - 1]?.subgroup && <tr className="matrix-group">
              <th colSpan={products.length + 1}><span className="parameter-group-heading">{partDisplay(t, subgroup)}</span></th>
            </tr>}
            <tr data-parameter-row data-different={highlight && differs ? "true" : undefined}>
              <th scope="row" className="matrix-label">
                <ParameterLabel field={field} label={label} />
                {referenceNote && <span className="mt-1 block text-[0.625rem] font-normal text-muted-foreground">{referenceNote.split(" · ").map((text) => localNote(t, text)).join(" · ")}</span>}
                {note && <span className="mt-1 block text-[0.625rem] font-normal text-[#f3cf92]">{localNote(t, note)}</span>}
              </th>
              {cells.map((value, index) =>
                <td key={products[index].slug}><ParameterValue field={field} value={value} comparison /></td>)}
            </tr>
          </Fragment>)}
        </tbody>)}
      </table>
    </div>
    {!visible.length && products.length >= 2 && <p role="status" className="border-t p-4 text-sm text-muted-foreground">
      {t(differencesOnly ? "ui.no_confirmed_differences_among_directly_" : "ui.no_shared_published_specs")}
    </p>}
  </div>;
}

export function ComparisonGrid({ products, catalog, groups, explicitIds }: {
  products: ComparisonProduct[]; catalog: PickerProduct[]; groups: ComparisonGroup[]; explicitIds: boolean;
}) {
  const {t} = useCopy();
  const [differences, setDifferences] = useState(false);
  const [highlight, setHighlight] = useState(true);
  const [picking, setPicking] = useState(false);
  const [pending, startTransition] = useTransition();
  const pickerButton = useRef<HTMLButtonElement>(null);
  const comparison = useRef<HTMLDivElement>(null);
  const changeFocus = useRef<{ids: string; target?: string; trigger: HTMLElement | null} | null>(null);
  const ids = products.map(({slug}) => slug).join(",");
  const router = useRouter();
  const saved = useCompareSelection();
  const mixed = new Set(products.map(({ category }) => category)).size > 1;
  const restore = !explicitIds && products.length === 0 && saved.length > 0;
  const restored = useRef(false);

  useEffect(() => {
    if (restore && !restored.current) {
      restored.current = true;
      router.replace(comparisonHref(saved.map(({ slug }) => slug)), { scroll: false });
    }
  }, [restore, router, saved]);

  useLayoutEffect(() => {
    const change = changeFocus.current;
    if (pending || !change) return;
    changeFocus.current = null;
    if (ids !== change.ids || (document.activeElement !== document.body && document.activeElement !== change.trigger)) return;
    const target = change.target && comparison.current && findCompareButton(comparison.current, "data-compare-remove", change.target);
    (target || pickerButton.current)?.focus();
  }, [ids, pending]);

  function closePicker() {
    setPicking(false);
    pickerButton.current?.focus();
  }

  function update(next: ComparisonProduct[]) {
    rememberSelection(next);
    startTransition(() => router.push(next.length ? comparisonHref(next.map(({ slug }) => slug)) : "/compare?ids=", { scroll: false }));
  }

  function remove(slug: string, trigger: HTMLButtonElement) {
    if (pending) return;
    const next = products.filter((product) => product.slug !== slug);
    if (document.activeElement === trigger) {
      changeFocus.current = {ids: next.map((product) => product.slug).join(","), target: neighborAfterRemoval(products, slug), trigger};
    }
    update(next);
  }

  function pick(product: PickerProduct) {
    if (pending) return;
    const next = [...products, product];
    if (next.length === 4) {
      changeFocus.current = {ids: next.map(({slug}) => slug).join(","), target: product.slug, trigger: pickerButton.current};
    }
    update(next);
    closePicker();
  }

  return <div ref={comparison} aria-busy={pending || undefined}>
    <p className="sr-only" role="status">{t("ui.compare_selection_status", {count: products.length})}</p>
    <div className="comparison-controls">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="filter-pill border border-border" aria-pressed={differences}
          onClick={() => setDifferences(!differences)} disabled={products.length < 2}>
          {differences && <Check size={13} aria-hidden="true" />}{t("ui.differences_only")}
        </button>
        <button type="button" className="filter-pill border border-border" aria-pressed={highlight}
          onClick={() => setHighlight(!highlight)} disabled={products.length < 2}>
          {highlight && <Check size={13} aria-hidden="true" />}{t("ui.highlight_differences")}
        </button>
      </div>
      <Button type="button" ref={pickerButton} variant="outline" className="h-9 px-3" disabled={products.length >= 4 || pending}
        aria-controls={picking ? "comparison-picker" : undefined} aria-expanded={picking}
        aria-describedby={products.length === 4 ? "comparison-limit" : undefined}
        onClick={() => picking ? closePicker() : setPicking(true)}>
        <Plus aria-hidden="true" />{t("ui.add_product")}
      </Button>
    </div>
    {products.length === 4 && <p id="comparison-limit" className="mt-2 text-xs text-muted-foreground">{t("ui.compare_up_to_four_products")}</p>}
    {picking && products.length < 4 && <ProductPicker products={catalog} selected={products} onClose={closePicker} onPick={pick} />}
    {mixed && <p className="border-b px-0 py-3 text-sm text-muted-foreground">{t("ui.mixed_categories_·_some_parameters_may_n")}</p>}
    {products.length < 2 && <p className="my-4 text-sm text-muted-foreground">{t(products.length ? "ui.add_one_more_product_to_compare_specs" : "ui.select_two_to_four_products_to_compare")}</p>}
    {products.length > 0 ? <div className="mt-3">
      <CompareOverview products={products} groups={groups} />
      {products.length > 1 && <>
        <h2 className="section-title mb-2">{t("ui.full_specifications")}</h2>
        <div className="mb-3"><ParameterLegend /></div>
      </>}
      <CompareTable products={products} groups={products.length > 1 ? groups : []} highlight={highlight} differencesOnly={differences}
        remove={remove} />
    </div> : <div className="mt-4 border bg-card p-5"><Button asChild variant="outline" className="h-9"><Link href="/products">{t("ui.browse_catalog")}</Link></Button></div>}
  </div>;
}
