import {Link} from "@/i18n/navigation";
import {keyedItems} from "./list-keys";
import {displayCardCell, displayPrice} from "@/i18n/copy";
import {useCopy} from "@/i18n/ui-copy";
import {ArrowUpRight} from "lucide-react";
import {CompareButton} from "./compare-selection";
import {CatalogCardValue} from "./catalog-card-value";
import {CatalogPackshot} from "./catalog-packshot";
import {ColorDot, GenderPill, ProductBadges, ProductImage} from "./product-media";
import {ParameterHelp} from "./parameter-help";
import {cardFields} from "@/lib/parameters/registry";
import type {CatalogListing} from "@/lib/catalog";

export function CatalogCardView({ product, eager }: { product: CatalogListing; eager: boolean }) {
  const {t} = useCopy();
  return (
    <article className="gear-card min-w-0 overflow-hidden border bg-card">
      <Link href={`/products/${product.slug}`} prefetch={false} className="group relative block">
        {product.brandSlug === "arcteryx" ? <CatalogPackshot source={product.image} eager={eager} />
          : <ProductImage src={product.image} eager={eager} className="aspect-[4/5]" />}
        <div className="absolute inset-x-2 top-2 flex flex-wrap items-start gap-1">
          <GenderPill gender={product.gender} />
        </div>
        <span className="sr-only">{t("ui.view_product", {name: product.name})}</span>
        <span className="absolute right-2 bottom-2 hidden size-8 place-items-center bg-background text-foreground sm:grid">
          <ArrowUpRight size={15} aria-hidden="true" />
        </span>
      </Link>
      <div className="grid gap-2.5 p-2.5 sm:p-4">
        <div>
          <h2 className="text-balance text-[0.95rem] leading-tight font-semibold sm:text-lg">
            <Link href={`/products/${product.slug}`} prefetch={false} className="hover:text-primary">{product.name}</Link>
          </h2>
          <p className="text-xs text-muted-foreground">{product.brand}</p>
          <p className="mt-1 font-mono text-sm tabular-nums text-primary">{displayPrice(t, product.msrp, product.currency)}</p>
        </div>
        {product.swatchCount > 0 && (
          <div className="flex items-center gap-1.5" aria-label={t("ui.color_count", {count: product.swatchCount})}>
            {keyedItems(product.swatches, ({label, hex}) => JSON.stringify([label, hex])).map(([key, color]) => <span key={key} title={color.label}><ColorDot color={color} /></span>)}
            {product.swatchCount > 5 && <span className="font-mono text-[0.65rem] text-muted-foreground">+{product.swatchCount - 5}</span>}
          </div>
        )}
        <div className="flex min-h-5 flex-wrap items-center gap-1.5 empty:hidden"><ProductBadges product={product} /></div>
        <dl aria-label={t("ui.key_specs")} data-card-fields className="grid grid-cols-2 gap-px border border-border bg-border">
          {cardFields.map((field) => {
            const label = t(field.label);
            const {text, title} = displayCardCell(t, product.card, field.key);
            return <div key={field.key} data-card-field={field.key} data-parameter-row className="min-w-0 bg-card px-1.5 py-1.5 sm:px-2">
              <dt className="flex h-6 min-w-0 items-center gap-0.5 text-[0.65rem] text-muted-foreground">
                <span className="truncate" title={label}>{label}</span>
                {"help" in field && <ParameterHelp label={label} text={t(field.help)} />}
              </dt>
              <CatalogCardValue label={label} text={text} fullText={title} />
            </div>;
          })}
        </dl>
        <CompareButton slug={product.slug} name={product.name} image={product.image}
          category={product.category} gender={product.gender} compact />
      </div>
    </article>
  );
}
