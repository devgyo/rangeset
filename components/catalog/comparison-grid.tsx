"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type CSSProperties } from "react";
import { Check, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { rememberSelection, useCompareSelection, type PickedProduct } from "@/components/catalog/compare-selection";
import { GenderPill, ProductImage } from "@/components/catalog/product-media";
import { formatPrice, genderLabel } from "@/lib/arcteryx-view";
import { comparisonHref, type ComparisonGroup } from "@/lib/comparison";
import { visibleInComparison } from "@/lib/parameters/model";
import { ParameterGroupSources, ParameterLabel, ParameterLegend, ParameterValue, SourcesSwitch } from "./parameter-table";

export type ComparisonProduct = PickedProduct & { msrp: number | null; currency?: string | null; priceLabel?: string; example?: boolean; discontinued?: boolean };
export type PickerProduct = ComparisonProduct & { keywords: string };

function ProductPicker({ products, selected, onPick, onClose }: {
  products: PickerProduct[]; selected: ComparisonProduct[]; onPick: (product: PickerProduct) => void; onClose: () => void;
}) {
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
      <h2 id="picker-heading" className="font-semibold">Add a product</h2>
      <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close product picker"><X aria-hidden="true" /></Button>
    </div>
    <label className="relative block">
      <span className="sr-only">Search products to compare</span>
      <Search size={16} className="pointer-events-none absolute top-3 left-3 text-muted-foreground" aria-hidden="true" />
      <input ref={input} type="search" placeholder="Search by name, category, or gender" value={query} onChange={(event) => setQuery(event.target.value)}
        className="catalog-input w-full pl-9" />
    </label>
    {results.length > 0 ? <ul className="mt-3 grid max-h-72 grid-cols-1 gap-px overflow-y-auto border bg-border md:grid-cols-2">
      {results.map((product) => <li key={product.slug}>
        <button type="button" onClick={() => onPick(product)} className="flex h-full w-full items-center gap-2.5 bg-card px-2 py-1.5 text-left hover:bg-muted focus-visible:relative focus-visible:z-10">
          <ProductImage src={product.image} sizes="32px" className="h-10 w-8 shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{product.name}</span>
            <span className="block truncate text-xs text-muted-foreground">{genderLabel(product.gender)}{product.category && ` · ${product.category}`}</span>
          </span>
          <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">{formatPrice(product.msrp, product.currency)}</span>
          <Plus size={14} className="shrink-0 text-primary" aria-hidden="true" />
        </button>
      </li>)}
    </ul> : <p role="status" className="mt-3 text-sm text-muted-foreground">No matching products.</p>}
  </section>;
}

function CompareTable({ products, groups, highlight, differencesOnly, remove }: {
  products: ComparisonProduct[]; groups: ComparisonGroup[]; highlight: boolean; differencesOnly: boolean;
  remove: (slug: string) => void;
}) {
  const visible = groups.flatMap(({ title, rows }) => {
    const filtered = rows.filter((row) => visibleInComparison(row, differencesOnly));
    return filtered.length ? [{ title, rows: filtered }] : [];
  });
  return <div className="comparison-frame" style={{ "--product-count": products.length } as CSSProperties}>
    <div role="region" aria-label="Scrollable product comparison" tabIndex={0} className="comparison-scroll">
      <table className="comparison-matrix" aria-label="Side-by-side product comparison">
        <colgroup><col className="comparison-label-col" />{products.map(({ slug }) => <col key={slug} />)}</colgroup>
        <thead><tr>
          <th scope="col" className="matrix-label align-bottom">Specs</th>
          {products.map((product) => <th scope="col" className="align-top" key={product.slug}>
            <div className="flex items-start justify-between gap-1">
              <ProductImage src={product.image} sizes="64px" className="compare-thumb" />
              <Button type="button" variant="ghost" size="icon-xs" aria-label={`Remove ${product.name} (${genderLabel(product.gender)})`} onClick={() => remove(product.slug)}>
                <X aria-hidden="true" />
              </Button>
            </div>
            <Link href={`/products/${product.slug}`} className="mt-2 block text-sm leading-snug font-semibold wrap-break-word hover:text-primary">{product.name}</Link>
            <div className="mt-1 flex flex-wrap gap-1"><GenderPill gender={product.gender} />
              {product.discontinued && <span className="text-xs text-[#efc9ae]">Discontinued</span>}
              {product.example && <span className="text-xs text-muted-foreground">Example</span>}
            </div>
            <span className="mt-1 block font-mono text-xs tabular-nums text-primary">{product.priceLabel ?? formatPrice(product.msrp, product.currency)}</span>
          </th>)}
        </tr></thead>
        {visible.map(({ title, rows }) => <ParameterGroupSources key={title}><tbody>
          <tr className="matrix-group"><th scope="rowgroup" colSpan={products.length + 1}><div className="parameter-group-heading"><span>{title}</span><SourcesSwitch /></div></th></tr>
          {rows.map(({ key, label, field, cells, differs, note, referenceNote }) => <tr key={key} data-parameter-row data-different={highlight && differs ? "true" : undefined}>
            <th scope="row" className="matrix-label">
              <ParameterLabel field={field} label={label} />
              {referenceNote && <span className="mt-1 block text-[0.625rem] font-normal text-muted-foreground">{referenceNote}</span>}
              {note && <span className="mt-1 block text-[0.625rem] font-normal text-[#f3cf92]">{note}</span>}
            </th>
            {cells.map((value, index) =>
              <td key={products[index].slug}><ParameterValue field={field} value={value} comparison /></td>)}
          </tr>)}
        </tbody></ParameterGroupSources>)}
      </table>
    </div>
    {!visible.length && products.length >= 2 && <p role="status" className="border-t p-4 text-sm text-muted-foreground">
      {differencesOnly ? "No confirmed differences among directly comparable values." : "No shared published specs."}
    </p>}
  </div>;
}

export function ComparisonGrid({ products, catalog, groups, explicitIds }: {
  products: ComparisonProduct[]; catalog: PickerProduct[]; groups: ComparisonGroup[]; explicitIds: boolean;
}) {
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
          {differences && <Check size={13} aria-hidden="true" />}Differences only
        </button>
        <button type="button" className="filter-pill border border-border" aria-pressed={highlight}
          onClick={() => setHighlight(!highlight)} disabled={products.length < 2}>
          {highlight && <Check size={13} aria-hidden="true" />}Highlight differences
        </button>
      </div>
      <Button type="button" ref={pickerButton} variant="outline" className="h-9 px-3" disabled={products.length >= 4 || pending}
        aria-controls={picking ? "comparison-picker" : undefined} aria-expanded={picking}
        onClick={() => picking ? closePicker() : setPicking(true)}>
        <Plus aria-hidden="true" />Add product
      </Button>
    </div>
    {picking && products.length < 4 && <ProductPicker products={catalog} selected={products} onClose={closePicker}
      onPick={(product) => { if (!pending) { update([...products, product]); closePicker(); } }} />}
    {mixed && <p className="border-b px-0 py-3 text-sm text-muted-foreground">Mixed categories · Some parameters may not apply</p>}
    {products.length < 2 && <p className="my-4 text-sm text-muted-foreground">{products.length ? "Add one more product to compare specs." : "Select two to four products to compare."}</p>}
    {products.length > 0 ? <div className="mt-3">
      {products.length > 1 && <div className="mb-3"><ParameterLegend /></div>}
      <CompareTable products={products} groups={products.length > 1 ? groups : []} highlight={highlight} differencesOnly={differences}
        remove={(slug) => { if (!pending) update(products.filter((product) => product.slug !== slug)); }} />
    </div> : <div className="mt-4 border bg-card p-5"><Button asChild variant="outline" className="h-9"><Link href="/products">Browse catalog</Link></Button></div>}
  </div>;
}
