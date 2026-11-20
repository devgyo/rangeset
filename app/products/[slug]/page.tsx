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
import { applicableMetric, formatMetric, formatPrice, genderLabel, keyMetrics, metricLabels, unpublished, type CatalogSpec, type ProductDetail } from "@/lib/arcteryx-view";

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

function SpecProvenance({ spec, example }: { spec?: CatalogSpec; example?: boolean }) {
  if (!spec) return null;
  const source = example ? "Example data" : spec.source === "manual" ? "Manual override" : spec.source === "brand" ? "Brand official" : "Third party";
  return <p className="mt-1 text-xs leading-snug text-muted-foreground">{source}{spec.date && <> · verified <time dateTime={spec.date} className="whitespace-nowrap">{spec.date}</time></>}</p>;
}

function weight(product: ProductDetail) {
  const value = product.specs.weight_g?.value;
  return typeof value === "number" ? value : null;
}

function delta(value: number | null, baseline: number | null, format: (difference: number) => string) {
  if (value === null || baseline === null || value === baseline) return null;
  const difference = value - baseline;
  return <span className="block text-xs text-muted-foreground">{difference > 0 ? "+" : "−"}{format(Math.abs(difference))}</span>;
}

function Trims({ product, siblings }: { product: ProductDetail; siblings: ProductDetail[] }) {
  if (!siblings.length) return null;
  const keys = product.category === "Insulated Jackets" ? ["insulation"]
    : ["Pants", "Shorts"].includes(product.category ?? "") ? ["inseam"]
      : ["Shell Jackets", "Professional Use"].includes(product.category ?? "") ? ["membrane", "layers"]
        : product.category === "Footwear" ? ["drop"] : ["fit"];
  const rows = [...siblings].sort((a, b) => (a.msrp ?? Infinity) - (b.msrp ?? Infinity) || a.name.localeCompare(b.name));
  return <section className="mt-10" aria-labelledby="trim-heading">
    <h2 id="trim-heading" className="section-title mb-4">Other {product.family} {product.category} <span className="text-muted-foreground">— {genderLabel(product.gender)}</span></h2>
    <div className="data-panel">
      <Table scrollLabel="Scrollable family comparison" className="spec-table">
        <TableHeader><TableRow>
          <TableHead scope="col">Model</TableHead><TableHead scope="col">MSRP</TableHead><TableHead scope="col">Weight</TableHead>
          <TableHead scope="col">{keys.map((key) => metricLabels[key]).join(" / ")}</TableHead><TableHead scope="col"><span className="sr-only">Compare</span></TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {rows.map((item) => <TableRow key={item.slug}>
            <TableHead scope="row" className="h-auto py-3">
              <Link href={`/products/${item.slug}`} prefetch={false} className="spec-link">{item.name}</Link>
              {item.status === "discontinued" && <Badge variant="outline" className="ml-2">Discontinued</Badge>}
            </TableHead>
            <TableCell className="font-mono tabular-nums">{formatPrice(item.msrp)}{delta(item.msrp, product.msrp, formatPrice)}</TableCell>
            <TableCell className="font-mono tabular-nums">{formatMetric(item.specs.weight_g)}{delta(weight(item), weight(product), (number) => `${number} g`)}</TableCell>
            <TableCell>{keys.map((key) => item.specs[key] && formatMetric(item.specs[key])).filter(Boolean).join(" · ") || unpublished}</TableCell>
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
  const core = keyMetrics(product, true);
  const all = [...new Set([...core, ...Object.keys(metricLabels).filter((key) => product.specs[key] ||
    (["centre_back_length_cm", "helmet_hood", "pit_zips", "recco"].includes(key) && product.isHardshell))])]
    .filter((key) => applicableMetric(key, product.category));
  const release = [product.year, product.season].filter(Boolean).join(" · ");

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
          <p className="font-mono text-2xl tabular-nums text-primary">{formatPrice(product.msrp)}</p>
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
        {core.map((key) => <div key={key} className={`min-w-0 bg-card p-3 sm:p-4 ${core.length % 2 ? "max-sm:last:col-span-2" : ""}`}>
          <dt className="control-label">{metricLabels[key]}</dt>
          <dd className="mt-1 break-words font-mono text-sm leading-snug tabular-nums sm:text-base">{formatMetric(product.specs[key])}</dd>
          <dd><SpecProvenance spec={product.specs[key]} example={product.example} /></dd>
        </div>)}
      </dl>
    </section>
    <Trims product={product} siblings={siblings} />
    <section className="mt-10" aria-labelledby="full-heading">
      <h2 id="full-heading" className="section-title mb-4">Full specifications</h2>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div className="min-w-0 border bg-card p-4 sm:p-5">
          <h3 className="mb-3 font-semibold">Measurements &amp; construction</h3>
          <dl>
            {all.map((key) => <div key={key} className="detail-row">
              <dt className="text-muted-foreground">{metricLabels[key]}</dt>
              <dd className="min-w-0"><span className="font-mono tabular-nums">{formatMetric(product.specs[key])}</span>
                <SpecProvenance spec={product.specs[key]} example={product.example} /></dd>
            </div>)}
          </dl>
          {!product.example && (product.isHardshell || product.category === "Shell Jackets") &&
            !product.specs.waterproof_mm && !product.specs.breathability &&
            <p className="mt-4 border-t pt-3 text-sm text-muted-foreground">Arc’teryx does not publish hydrostatic head (mm) or breathability ratings for this product.</p>}
        </div>
        <div className="grid min-w-0 gap-4">
          <div className="border bg-card p-4 sm:p-5">
            <h3 className="mb-3 font-semibold">Materials</h3>
            {product.materials.length ? <ul className="space-y-2 text-sm text-muted-foreground">
              {product.materials.map((material, index) => <li key={index} className="border-t pt-2">{material}</li>)}
            </ul> : <p className="text-sm text-muted-foreground">{unpublished}</p>}
          </div>
          <div className="border bg-card p-4 sm:p-5">
            <h3 className="mb-3 font-semibold">Product information</h3>
            <dl>
              {[
                ["Manufacturing facility", product.facility], ["Release year / season", release],
                ["Available sizes", product.sizes.join(", ")], ["Last verified", product.verifiedAt],
              ].map(([label, value]) => <div className="detail-row" key={label}>
                <dt className="text-muted-foreground">{label}</dt><dd>{value || unpublished}</dd>
              </div>)}
            </dl>
          </div>
        </div>
      </div>
    </section>
    <section aria-labelledby="features-heading" className="mt-10">
      <h2 id="features-heading" className="section-title mb-4">Features</h2>
      {product.features.length ? <div className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {product.features.map(({ label, values }, index) => <div className="min-w-0 border bg-card p-4" key={index}>
          <h3 className="font-semibold">{label}</h3>
          <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm leading-relaxed text-muted-foreground">
            {values.map((value, index) => <li key={index}>{value}</li>)}
          </ul>
        </div>)}
      </div> : <p className="text-sm text-muted-foreground">{unpublished}</p>}
    </section>
  </article>;
}
