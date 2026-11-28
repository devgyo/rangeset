import {useState, type Ref} from "react";
import { ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { genderDisplay, useCopy } from "@/i18n/ui-copy";
import { comparisonHref } from "@/lib/comparison-href";
import { ProductImage } from "./product-media";
import type { PickedProduct } from "./compare-selection";

export default function CompareDockPanel({selection, onRemove, dockRef, entrance}: {
  selection: PickedProduct[];
  onRemove: (slug: string | undefined, trigger: HTMLButtonElement) => void;
  dockRef: Ref<HTMLElement>;
  entrance: boolean;
}) {
  const {t} = useCopy();
  const [entering] = useState(entrance);
  const mixed = new Set(selection.map(({ category }) => category)).size > 1;
  return (
    <aside ref={dockRef} data-compare-dock data-entering={entering ? "" : undefined} aria-label={t("ui.compare_dock")} className="compare-dock">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex gap-1.5 overflow-x-auto px-0.5 py-1">
            {selection.map((product) => (
              <div key={product.slug} className="flex max-w-44 shrink-0 items-center gap-2 border border-border bg-card p-1">
                <ProductImage src={product.image} className="size-7 shrink-0" />
                <Link href={`/products/${product.slug}`} className="truncate text-xs hover:text-primary" title={product.name}>
                  {product.name} <span className="sr-only">{genderDisplay(t, product.gender)}</span>
                </Link>
                <button type="button" data-compare-remove={product.slug} aria-label={t("ui.compare_action", {action: t("ui.remove"), name: `${product.name} (${genderDisplay(t, product.gender)})`})}
                  className="compare-dock-remove grid size-7 shrink-0 place-items-center hover:text-primary pointer-coarse:size-11"
                  onClick={(event) => onRemove(product.slug, event.currentTarget)}>
                  <X size={14} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
          {mixed && <p className="mt-1 text-xs text-muted-foreground">{t("ui.mixed_categories_·_some_parameters_may_n")}</p>}
        </div>
        <div className="ml-auto flex shrink-0 gap-1.5">
          <Button type="button" variant="ghost" className="h-9" onClick={(event) => onRemove(undefined, event.currentTarget)}>{t("ui.clear")}</Button>
          {selection.length < 2 ? <Button className="h-9" disabled>{t("ui.compare_count", {count: 1})}</Button> :
            <Button asChild className="h-9"><Link href={comparisonHref(selection.map(({ slug }) => slug))}>{t("ui.compare_count", {count: selection.length})} <ArrowRight aria-hidden="true" /></Link></Button>}
        </div>
      </div>
      {selection.length === 4 && <p id="catalog-compare-limit" className="mt-1 text-xs text-muted-foreground">{t("ui.compare_up_to_four_products")}</p>}
    </aside>
  );
}
