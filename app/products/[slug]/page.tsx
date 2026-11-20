import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { ProductGallery } from "@/components/catalog/product-gallery";
import { CompareButton } from "@/components/catalog/compare-selection";
import { comparisonHref } from "@/lib/comparison";
import { GenderPill, ProductBadges } from "@/components/catalog/product-media";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { readProduct, relatedProducts } from "@/lib/catalog";
import { formatPrice, genderLabel, type ProductDetail } from "@/lib/arcteryx-view";
import { ParameterLabel, ParameterSections, ParameterValue } from "@/components/catalog/parameter-table";
import { parametersOf } from "@/lib/parameters/arcteryx";
import { compareValues, formatValue, getParameter, keyParameters, parameterGroups } from "@/lib/parameters/model";
import { fieldsByKey, parameterVersion } from "@/lib/parameters/registry";

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const product = await readProduct((await params).slug);
  if (!product) return { title: "Product not found", robots: { index: false } };
  return {
    title: [product.name, product.gender && genderLabel(product.gender)].filter(Boolean).join(" · "),
    description: product.summary || `Published configuration and specs for the ${product.brand} ${product.name}.`,
    alternates: { canonical: `/products/${product.slug}` },
    robots: product.example || product.status === "pending_review" ? { index: false, follow: true } : undefined,
    openGraph: product.hero ? { images: [product.hero] } : undefined,
  };
}

function delta(value: number | null, baseline: number | null, format: (difference: number) => string) {
  if (value === null || baseline === null || value === baseline) return null;
  const difference = value - baseline;
  return <span className="block text-xs text-muted-foreground">{difference > 0 ? "+" : "−"}{format(Math.abs(difference))}</span>;
}

function Trims({ product, siblings }: { product: ProductDetail; siblings: ProductDetail[] }) {
  if (!siblings.length) return null;
  const profile = parametersOf(product);
  const price = fieldsByKey.get("msrp")!;
  const weight = fieldsByKey.get("weight")!;
  const notes = keyParameters(profile).filter((field) => ["protection", "warmth", "footwear", "sizing"].includes(field.group)
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
    <h2 id="trim-heading" className="section-title mb-4">Other {product.family} {product.category} <span className="text-muted-foreground">— {genderLabel(product.gender)}</span></h2>
    <div className="data-panel">
      <Table scrollLabel="Scrollable family comparison" className="spec-table">
        <TableHeader><TableRow>
          <TableHead scope="col">Model</TableHead><TableHead scope="col">{price.label}</TableHead><TableHead scope="col">{weight.label}</TableHead>
          <TableHead scope="col">{notes.map(({ label }) => label).join(" / ") || "Specifications"}</TableHead><TableHead scope="col"><span className="sr-only">Compare</span></TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {rows.map((item) => <TableRow key={item.slug}>
            <TableHead scope="row" className="h-auto py-3">
              <Link href={`/products/${item.slug}`} prefetch={false} className="spec-link">{item.name}</Link>
              {item.status === "discontinued" && <Badge variant="outline" className="ml-2">Discontinued</Badge>}
            </TableHead>
            <TableCell className="font-mono tabular-nums">{formatValue(price, getParameter(parametersOf(item), price))}{showDelta(item, price, formatPrice)}</TableCell>
            <TableCell className="font-mono tabular-nums">{formatValue(weight, getParameter(parametersOf(item), weight))}{showDelta(item, weight, (number) => `${number} g`)}</TableCell>
            <TableCell>{notes.map((field) => formatValue(field, getParameter(parametersOf(item), field))).join(" · ") || "Not published"}</TableCell>
            <TableCell><Button asChild size="sm" variant="outline"><Link href={comparisonHref([product.slug, item.slug])}>Compare</Link></Button></TableCell>
          </TableRow>)}
        </TableBody>
      </Table>
    </div>
  </section>;
}

export default async function ProductPage({ params }: PageProps<"/products/[slug]">) {
  const product = await readProduct((await params).slug);
  if (!product) notFound();
  const siblings = await relatedProducts(product);
  const profile = parametersOf(product);
  const core = keyParameters(profile);
  const sections = parameterGroups([profile]);
  const priceField = fieldsByKey.get("msrp")!;

  return <article className="site-width py-7 sm:py-11">
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_.9fr] lg:gap-12">
      <div className="min-w-0 lg:col-start-2 lg:row-start-1">
        <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Link href="/products" className="hover:text-primary">{product.brand}</Link>
          {product.category && <><span aria-hidden="true">/</span><Link href={`/products?category=${encodeURIComponent(product.category)}`} className="hover:text-primary">{product.category}</Link></>}
          {product.gender && <><span aria-hidden="true">/</span><span>{genderLabel(product.gender)}</span></>}
        </nav>
        <div className="mb-3 flex flex-wrap items-center gap-1.5"><GenderPill gender={product.gender} /><ProductBadges product={product} /></div>
        <h1 className="page-title text-balance">{product.name}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <p className="font-mono text-2xl tabular-nums text-primary">{formatValue(priceField, getParameter(profile, priceField))}</p>
          <span className="control-label">MSRP</span>
          <Badge variant="outline" className="text-muted-foreground">
            {product.inStock === true ? "In stock" : product.inStock === false ? "Out of stock" : "Stock not published"}
          </Badge>
        </div>
        {(product.summary || product.description) && <p className="mt-5 max-w-prose text-base leading-relaxed text-muted-foreground">{product.summary || product.description}</p>}
        {product.activities.length > 0 && <ul aria-label="Activities" className="mt-4 flex flex-wrap gap-1.5">
          {product.activities.map((activity) => <li key={activity}><Badge variant="outline">{activity}</Badge></li>)}
        </ul>}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <CompareButton product={{ slug: product.slug, name: product.name, image: product.image, category: product.category, gender: product.gender }} />
          {product.url && <a href={product.url} className="back-link px-1 py-2">
            {product.example ? "Example source" : "Official Arc’teryx page"} <ArrowUpRight size={16} aria-hidden="true" />
          </a>}
        </div>
      </div>
      <div className="min-w-0 lg:col-start-1 lg:row-start-1">
        <ProductGallery name={product.name} colorways={product.colorways} hero={product.hero} cutout={product.image} />
      </div>
    </div>
    <section className="mt-9" aria-labelledby="key-heading">
      <h2 id="key-heading" className="section-title mb-4">Key specs</h2>
      <dl className="key-spec-strip grid gap-px border bg-border" style={{ "--metric-count": core.length } as CSSProperties}>
        {core.map((field) => <div data-parameter-row key={field.key} className={`min-w-0 bg-card p-3 sm:p-4 ${core.length % 2 ? "max-sm:last:col-span-2" : ""}`}>
          <dt className="control-label"><ParameterLabel field={field} /></dt>
          <dd className="mt-1 break-words text-sm leading-snug sm:text-base"><ParameterValue field={field} value={getParameter(profile, field)} withEvidence={false} /></dd>
        </div>)}
      </dl>
    </section>
    <Trims product={product} siblings={siblings} />
    <section className="mt-10" aria-labelledby="full-heading">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="full-heading" className="section-title">Full specifications</h2>
        <span className="font-mono text-xs text-muted-foreground">Parameter standard v{parameterVersion}</span>
      </div>
      <ParameterSections groups={sections} />
    </section>
  </article>;
}
