"use client";

import {useEffect, useRef, useState} from "react";
import {Plus, Search, X} from "lucide-react";
import {Button} from "@/components/ui/button";
import {displayPrice} from "@/i18n/copy";
import {genderDisplay, useCopy} from "@/i18n/ui-copy";
import {leafSlug, taxonomyLabelKey} from "@/lib/taxonomy";
import {ProductImage} from "./product-media";
import type {ComparisonProduct, PickerProduct} from "./comparison-grid";

export default function ProductPicker({ products, selected, onPick, onClose }: {
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
          <ProductImage src={product.image} className="h-10 w-8 shrink-0" />
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
