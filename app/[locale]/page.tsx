import type { Metadata } from "next";
import {Link} from "@/i18n/navigation";
import {getTranslations} from "next-intl/server";
import {currentLocale} from "@/i18n/seo";
import {pageAlternates} from "@/i18n/routing";
import {genderDisplay} from "@/i18n/copy";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/catalog/product-media";
import {matchesTaxonomy, taxonomy, taxonomyLabelKey, taxonomyPath} from "@/lib/taxonomy";
import { listProducts } from "@/lib/catalog";

export async function generateMetadata(): Promise<Metadata> {
  return {alternates: pageAlternates("/", await currentLocale())};
}

export default async function Home() {
  const [products, t] = await Promise.all([listProducts(), getTranslations()]);
  const categories = taxonomy.map(({slug}) => ({slug, count: products.filter((product) => matchesTaxonomy(product, slug)).length}));
  const feature = products.find((item) => item.hero && item.status === "active");
  const familyCounts = new Map<string, number>();
  for (const {family} of products) if (family) familyCounts.set(family, (familyCounts.get(family) ?? 0) + 1);
  const families = [...familyCounts].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name]) => name);
  return (
    <>
      <section className="hero border-b">
        <div className="site-width grid items-center gap-8 py-9 sm:py-12 lg:grid-cols-[1.15fr_.85fr] lg:gap-12 lg:py-13">
          <div>
            <h1 className="home-title font-semibold">
              <span className="control-label mb-4 block text-primary">{t("brand.name")}<span className="sr-only"> — </span></span>
              {t("ui.hero_first")} <br /><span className="text-primary">{t("ui.hero_second")}</span>
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">{t("ui.hero_description")}</p>
            <Button asChild className="mt-6 h-10 gap-3 px-4">
              <Link href="/products">{t("ui.browse_catalog")} <ArrowRight aria-hidden="true" /></Link>
            </Button>
          </div>
          {feature && <Link href={`/products/${feature.slug}`} className="group block max-w-lg border bg-card">
            <ProductImage src={feature.hero} studio={false} eager sizes="(min-width: 1024px) 40vw, 90vw" className="home-image" />
            <div className="flex items-center justify-between gap-2 px-3.5 py-2.5">
              <span className="text-sm font-medium">{feature.name} <span className="ml-1 text-xs text-muted-foreground">{genderDisplay(t, feature.gender)}</span></span>
              <ArrowUpRight size={16} className="text-primary" aria-hidden="true" />
            </div>
          </Link>}
        </div>
      </section>
      <div className="site-width grid gap-9 py-8 sm:py-12">
        <section aria-labelledby="categories-heading">
          <h2 id="categories-heading" className="section-title mb-4">{t("ui.browse_by_category")}</h2>
          <div className="grid grid-cols-2 gap-px border bg-border sm:grid-cols-3 lg:grid-cols-5">
            {categories.map(({ slug, count }) =>
              <Link key={slug} href={taxonomyPath(slug)} className="category-card">
                <div className="flex items-center justify-between gap-2"><span className="font-mono text-xl tabular-nums text-primary">{count}</span><ArrowUpRight size={15} aria-hidden="true" /></div>
                <span className="text-sm font-medium">{t(taxonomyLabelKey(slug))}</span>
              </Link>)}
          </div>
        </section>
        {families.length > 0 && <section aria-labelledby="families-heading">
          <h2 id="families-heading" className="section-title mb-4">{t("ui.families")}</h2>
          <div className="flex flex-wrap gap-2">
            {families.map((family) => <Button asChild key={family} variant="outline" className="h-9 px-4">
              <Link href={`/products?family=${encodeURIComponent(family)}`}>{family} <ArrowUpRight aria-hidden="true" /></Link>
            </Button>)}
          </div>
        </section>}
      </div>
    </>
  );
}
