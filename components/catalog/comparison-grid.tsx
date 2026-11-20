"use client";
import {leafSlug, taxonomyLabelKey} from "@/lib/taxonomy";

import {Link, useRouter} from "@/i18n/navigation";
import {displayPrice, genderDisplay, localNote, partDisplay, useCopy} from "@/i18n/copy";
import { Fragment, useEffect, useRef, useState, useTransition, type CSSProperties } from "react";
import { Check, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { rememberSelection, useCompareSelection, type PickedProduct } from "@/components/catalog/compare-selection";
import { GenderPill, ProductImage } from "@/components/catalog/product-media";
import { comparisonHref, type ComparisonGroup } from "@/lib/comparison";
import { visibleInComparison } from "@/lib/parameters/model";
import { localGroup, ParameterLabel, ParameterLegend, ParameterValue } from "./parameter-table";

export type ComparisonProduct = PickedProduct & { msrp: number | null; currency?: string | null; priceLabel?: string; example?: boolean; discontinued?: boolean };
export type PickerProduct = ComparisonProduct & { keywords: string };

function ProductPicker({ products, selected, onPick, onClose }: {
  products: PickerProduct[]; selected: ComparisonProduct[]; onPick: (product: PickerProduct) => void; onClose: () => void;
}) {
  const {t} = useCopy();
  const [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { input.current?.focus(); }, []);
  const terms = query.toLocaleLowerCase("en-US").trim().split(/\s+/);
  const results = products.filter((product) => !selected.some(({ slug }) => slug === product.slug) &&
    terms.every((term) => {
      const gender = term.replace(/['’]s$/, "");
      return ["men", "women", "unisex"].includes(gender) ? product.gender === gender : product.keywords.includes(term);
    })).slice(0, 12);
  return <section id="comparison-picker" aria-labelledby="picker-heading" className="my-3 border bg-card p-3 sm:p-4"
    onKeyDown={(event) => { if (event.key === "Escape") onClose(); }}>
    <div className="mb-2 flex items-center justify-between gap-3">
      <h2 id="picker-heading" className="font-semibold">{t("ui.add_a_product")}</h2>
      <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label={t("ui.close_picker")}><X aria-hidden="true" /></Button>
    </div>
    <label className="relative block">
      <span className="sr-only">{t("ui.search_products_to_compare")}</span>
      <Search size={16} className="pointer-events-none absolute top-3 left-3 text-muted-foreground" aria-hidden="true" />
      <input ref={input} type="search" placeholder={t("ui.search_by_name_category_or_gender")} value={query} onChange={(event) => setQuery(event.target.value)}
        className="catalog-input w-full pl-9" />
    </label>
    {results.length > 0 ? <ul className="mt-3 grid max-h-72 grid-cols-1 gap-px overflow-y-auto border bg-border md:grid-cols-2">
      {results.map((product) => <li key={product.slug}>
        <button type="button" onClick={() => onPick(product)} className="flex h-full w-full items-center gap-2.5 bg-card px-2 py-1.5 text-left hover:bg-muted focus-visible:relative focus-visible:z-10">
          <ProductImage src={product.image} sizes="32px" className="h-10 w-8 shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{product.name}</span>
            <span className="block truncate text-xs text-muted-foreground">{genderDisplay(t, product.gender)}{leafSlug(product.taxonomy) && ` · ${t(taxonomyLabelKey(leafSlug(product.taxonomy)!))}`}</span>
          </span>
          <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">{displayPrice(t, product.msrp, product.currency)}</span>
          <Plus size={14} className="shrink-0 text-primary" aria-hidden="true" />
        </button>
      </li>)}
    </ul> : <p role="status" className="mt-3 text-sm text-muted-foreground">{t("ui.no_matching_products")}</p>}
  </section>;
}

function CompareTable({ products, groups, highlight, differencesOnly, remove }: {
  products: ComparisonProduct[]; groups: ComparisonGroup[]; highlight: boolean; differencesOnly: boolean;
  remove: (slug: string) => void;
}) {
  const {t} = useCopy();
  const visible = groups.flatMap(({ title, rows }) => {
    const filtered = rows.filter((row) => visibleInComparison(row, differencesOnly));
    return filtered.length ? [{ title, rows: filtered }] : [];
  });
  return <div className="comparison-frame" style={{ "--product-count": products.length } as CSSProperties}>
    <div role="region" aria-label={t("ui.scroll_compare")} tabIndex={0} className="comparison-scroll">
      <table className="comparison-matrix" aria-label={t("ui.comparison_table")}>
        <colgroup><col className="comparison-label-col" />{products.map(({ slug }) => <col key={slug} />)}</colgroup>
        <thead><tr>
          <th scope="col" className="matrix-label align-bottom">{t("ui.specs")}</th>
          {products.map((product) => <th scope="col" className="align-top" key={product.slug}>
            <div className="flex items-start justify-between gap-1">
              <ProductImage src={product.image} sizes="64px" className="compare-thumb" />
              <Button type="button" variant="ghost" size="icon-xs" aria-label={t("ui.compare_action", {action: t("ui.remove"), name: `${product.name} (${genderDisplay(t, product.gender)})`})} onClick={() => remove(product.slug)}>
                <X aria-hidden="true" />
              </Button>
            </div>
            <Link href={`/products/${product.slug}`} className="mt-2 block text-sm leading-snug font-semibold wrap-break-word hover:text-primary">{product.name}</Link>
            <div className="mt-1 flex flex-wrap gap-1"><GenderPill gender={product.gender} />
              {product.discontinued && <span className="text-xs text-[#efc9ae]">{t("ui.discontinued")}</span>}
              {product.example && <span className="text-xs text-muted-foreground">{t("ui.example")}</span>}
            </div>
            <span className="mt-1 block font-mono text-xs tabular-nums text-primary">{product.priceLabel ?? displayPrice(t, product.msrp, product.currency)}</span>
          </th>)}
        </tr></thead>
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

  function closePicker() {
    setPicking(false);
    pickerButton.current?.focus();
  }

  function update(next: ComparisonProduct[]) {
    rememberSelection(next);
    startTransition(() => router.push(next.length ? comparisonHref(next.map(({ slug }) => slug)) : "/compare?ids=", { scroll: false }));
  }

  return <div aria-busy={pending || undefined}>
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
        onClick={() => picking ? closePicker() : setPicking(true)}>
        <Plus aria-hidden="true" />{t("ui.add_product")}
      </Button>
    </div>
    {picking && products.length < 4 && <ProductPicker products={catalog} selected={products} onClose={closePicker}
      onPick={(product) => { if (!pending) { update([...products, product]); closePicker(); } }} />}
    {mixed && <p className="border-b px-0 py-3 text-sm text-muted-foreground">{t("ui.mixed_categories_·_some_parameters_may_n")}</p>}
    {products.length < 2 && <p className="my-4 text-sm text-muted-foreground">{t(products.length ? "ui.add_one_more_product_to_compare_specs" : "ui.select_two_to_four_products_to_compare")}</p>}
    {products.length > 0 ? <div className="mt-3">
      {products.length > 1 && <div className="mb-3"><ParameterLegend /></div>}
      <CompareTable products={products} groups={products.length > 1 ? groups : []} highlight={highlight} differencesOnly={differences}
        remove={(slug) => { if (!pending) update(products.filter((product) => product.slug !== slug)); }} />
    </div> : <div className="mt-4 border bg-card p-5"><Button asChild variant="outline" className="h-9"><Link href="/products">{t("ui.browse_catalog")}</Link></Button></div>}
  </div>;
}
