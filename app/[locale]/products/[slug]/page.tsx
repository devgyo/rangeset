import type { Metadata } from "next";
import type { CSSProperties } from "react";
import {Link} from "@/i18n/navigation";
import {getTranslations} from "next-intl/server";
import {currentLocale} from "@/i18n/seo";
import {pageAlternates} from "@/i18n/routing";
import {activityLabel, categoryLabel, displayParameter, genderDisplay, type Translator} from "@/i18n/copy";
import { notFound } from "next/navigation";
import { ProductGallery } from "@/components/catalog/product-gallery";
import { CompareButton } from "@/components/catalog/compare-selection";
import { comparisonHref } from "@/lib/comparison";
import { GenderPill, ProductBadges } from "@/components/catalog/product-media";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { readProduct, relatedProducts } from "@/lib/catalog";
import { formatPrice, type ProductDetail } from "@/lib/arcteryx-view";
import { ParameterLabel, ParameterLegend, ParameterSections, ParameterValue } from "@/components/catalog/parameter-table";
import { parametersOf } from "@/lib/parameters/arcteryx";
import { compareValues, getParameter, keyParameters, parameterGroups } from "@/lib/parameters/model";
import {publicParameterGroups, withoutParameterEvidence} from "@/lib/public-parameters";
import { fieldsByKey, parameterVersion } from "@/lib/parameters/registry";

export async function generateMetadata({ params }: PageProps<"/[locale]/products/[slug]">): Promise<Metadata> {
  const [product, t, locale] = await Promise.all([readProduct((await params).slug), getTranslations(), currentLocale()]);
  if (!product) return { title: t("ui.product_not_found"), robots: { index: false } };
  return {
    title: [product.name, product.gender && genderDisplay(t, product.gender)].filter(Boolean).join(" · "),
    description: product.summary || t("seo.product_description", {brand: product.brand, name: product.name}),
    alternates: pageAlternates(`/products/${product.slug}`, locale),
    robots: product.example || product.status === "pending_review" ? { index: false, follow: true } : undefined,
    openGraph: product.hero ? { images: [product.hero] } : undefined,
  };
}

function delta(value: number | null, baseline: number | null, format: (difference: number) => string) {
  if (value === null || baseline === null || value === baseline) return null;
  const difference = value - baseline;
  return <span className="block text-xs text-muted-foreground">{difference > 0 ? "+" : "−"}{format(Math.abs(difference))}</span>;
}

function Trims({ product, siblings, t, locale }: {product: ProductDetail; siblings: ProductDetail[]; t: Translator; locale: string}) {
  if (!siblings.length) return null;
  const profile = parametersOf(product);
  const price = fieldsByKey.get("msrp")!;
  const weight = fieldsByKey.get("weight")!;
  const notes = keyParameters(profile).filter((field) => ["protection", "warmth", "sizing"].includes(field.group)
    && !["weight", "back_length", "helmet_hood"].includes(field.key)).slice(0, 2);
  const rows = [...siblings].sort((a, b) => (a.msrp ?? Infinity) - (b.msrp ?? Infinity) || a.name.localeCompare(b.name));
  const number = (value: ReturnType<typeof getParameter>) => value.state === "known" && typeof value.value === "number" ? value.value : null;
  const showDelta = (item: ProductDetail, field: typeof price, format: (n: number) => string) => {
    const before = getParameter(profile, field);
    const after = getParameter(parametersOf(item), field);
    if (compareValues(field, [before, after]).note) return null;
    return delta(number(after), number(before), format);
  };
  return <section className="mt-10" aria-labelledby="trim-heading">
    <h2 id="trim-heading" className="section-title mb-4">{t("ui.family_variants", {family: product.family ?? "", category: categoryLabel(t, product.category) ?? ""})} <span className="text-muted-foreground">— {genderDisplay(t, product.gender)}</span></h2>
    <div className="data-panel">
      <Table scrollLabel={t("ui.family_comparison")} className="spec-table">
        <TableHeader><TableRow>
          <TableHead scope="col">{t("field.model")}</TableHead><TableHead scope="col">{t("field.msrp")}</TableHead><TableHead scope="col">{t("field.weight")}</TableHead>
          <TableHead scope="col">{notes.map(({key}) => t("field." + key)).join(" / ") || t("ui.specifications")}</TableHead><TableHead scope="col"><span className="sr-only">{t("ui.compare")}</span></TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {rows.map((item) => <TableRow key={item.slug}>
            <TableHead scope="row" className="h-auto py-3">
              <Link href={`/products/${item.slug}`} prefetch={false} className="spec-link">{item.name}</Link>
              {item.status === "discontinued" && <Badge variant="outline" className="ml-2">{t("ui.discontinued")}</Badge>}
            </TableHead>
            <TableCell className="font-mono tabular-nums">{displayParameter(t, locale, price, getParameter(parametersOf(item), price))}{showDelta(item, price, (amount) => formatPrice(amount, getParameter(profile, price).reference?.unit))}</TableCell>
            <TableCell className="font-mono tabular-nums">{displayParameter(t, locale, weight, getParameter(parametersOf(item), weight))}{showDelta(item, weight, (number) => `${number} g`)}</TableCell>
            <TableCell>{notes.map((field) => displayParameter(t, locale, field, getParameter(parametersOf(item), field))).join(" · ") || t("status.missing")}</TableCell>
            <TableCell><Button asChild size="sm" variant="outline"><Link href={comparisonHref([product.slug, item.slug])}>{t("ui.compare")}</Link></Button></TableCell>
          </TableRow>)}
        </TableBody>
      </Table>
    </div>
  </section>;
}

export default async function ProductPage({ params }: PageProps<"/[locale]/products/[slug]">) {
  const product = await readProduct((await params).slug);
  if (!product) notFound();
  const [siblings, t, locale] = await Promise.all([relatedProducts(product), getTranslations(), currentLocale()]);
  const profile = parametersOf(product);
  const core = keyParameters(profile);
  const sections = publicParameterGroups(parameterGroups([profile]));
  const priceField = fieldsByKey.get("msrp")!;

  return <article className="site-width py-7 sm:py-11">
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_.9fr] lg:gap-12">
      <div className="min-w-0 lg:col-start-2 lg:row-start-1">
        <nav aria-label={t("ui.breadcrumb")} className="mb-5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Link href="/products" className="hover:text-primary">{product.brand}</Link>
          {product.category && <><span aria-hidden="true">/</span><Link href={`/products?category=${encodeURIComponent(product.category)}`} className="hover:text-primary">{categoryLabel(t, product.category)}</Link></>}
          {product.gender && <><span aria-hidden="true">/</span><span>{genderDisplay(t, product.gender)}</span></>}
        </nav>
        <div className="mb-3 flex flex-wrap items-center gap-1.5"><GenderPill gender={product.gender} /><ProductBadges product={product} /></div>
        <h1 className="page-title text-balance">{product.name}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <p className="font-mono text-2xl tabular-nums text-primary">{displayParameter(t, locale, priceField, getParameter(profile, priceField))}</p>
          <span className="control-label">{t("ui.msrp")}</span>
          <Badge variant="outline" className="text-muted-foreground">
            {t(product.inStock === true ? "ui.in_stock" : product.inStock === false ? "ui.out_of_stock" : "ui.stock_not_published")}
          </Badge>
        </div>
        {product.activities.length > 0 && <ul aria-label={t("field.activities")} className="mt-4 flex flex-wrap gap-1.5">
          {product.activities.map((activity) => <li key={activity}><Badge variant="outline">{activityLabel(t, activity)}</Badge></li>)}
        </ul>}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <CompareButton product={{ slug: product.slug, name: product.name, image: product.image, category: product.category, gender: product.gender }} />
        </div>
      </div>
      <div className="min-w-0 lg:col-start-1 lg:row-start-1">
        <ProductGallery name={product.name} colorways={product.colorways} hero={product.hero} cutout={product.image} />
      </div>
    </div>
    {core.length > 0 && <section className="mt-9" aria-labelledby="key-heading">
      <h2 id="key-heading" className="section-title mb-4">{t("ui.key_specs")}</h2>
      <dl className="key-spec-strip grid gap-px border bg-border" style={{ "--metric-count": core.length } as CSSProperties}>
        {core.map((field) => <div data-parameter-row key={field.key} className={`min-w-0 bg-card p-3 sm:p-4 ${core.length % 2 ? "max-sm:last:col-span-2" : ""}`}>
          <dt className="control-label"><ParameterLabel field={field} /></dt>
          <dd className="mt-1 break-words text-sm leading-snug sm:text-base"><ParameterValue field={field} value={withoutParameterEvidence(field, getParameter(profile, field))} /></dd>
        </div>)}
      </dl>
    </section>}
    <Trims product={product} siblings={siblings} t={t} locale={locale} />
    <section className="mt-10" aria-labelledby="full-heading">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="full-heading" className="section-title">{t("ui.full_specifications")}</h2>
        <span className="font-mono text-xs text-muted-foreground">{t("ui.parameter_version", {version: parameterVersion})}</span>
      </div>
      <div className="mb-4"><ParameterLegend /></div>
      <ParameterSections groups={sections} />
    </section>
  </article>;
}
