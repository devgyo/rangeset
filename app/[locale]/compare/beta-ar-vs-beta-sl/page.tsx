import {cache} from "react";
import type {Metadata} from "next";
import {notFound} from "next/navigation";
import {hasLocale} from "next-intl";
import {getTranslations, setRequestLocale} from "next-intl/server";
import {CompareOverview, CompareTable} from "@/components/catalog/comparison-grid";
import {ParameterLegend} from "@/components/catalog/parameter-table";
import {Button} from "@/components/ui/button";
import {ClientMessages} from "@/i18n/client-messages";
import {displayParameter} from "@/i18n/copy";
import {Link} from "@/i18n/navigation";
import {locales, pageAlternates} from "@/i18n/routing";
import {parametersOf} from "@/lib/brands";
import {localCatalog, readProducts} from "@/lib/catalog";
import {buildComparison, comparisonHref} from "@/lib/comparison";
import {betaShellComparison} from "@/lib/curated-comparison";
import {brandLink} from "@/lib/outbound";
import {getParameter} from "@/lib/parameters/model";
import {fieldsByKey} from "@/lib/parameters/registry";

type Props = PageProps<"/[locale]/compare/beta-ar-vs-beta-sl">;

const comparisonProducts = cache(async () => {
  const products = await readProducts(betaShellComparison.slugs);
  if (products.length !== 2 || products.some(({example, status}) => example || status === "pending_review")) notFound();
  return products;
});

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale} = await params;
  if (!hasLocale(locales, locale)) notFound();
  await comparisonProducts();
  const t = await getTranslations({locale});
  return {
    title: t("seo.beta_shell_title"),
    description: t("seo.beta_shell_description"),
    alternates: pageAlternates(betaShellComparison.path, locale),
    robots: localCatalog ? {index: false, follow: true} : undefined,
  };
}

export default async function BetaShellComparison({params}: Props) {
  const {locale} = await params;
  if (!hasLocale(locales, locale)) notFound();
  setRequestLocale(locale);
  const [products, t] = await Promise.all([comparisonProducts(), getTranslations({locale})]);
  const price = fieldsByKey.get("msrp")!;
  const groups = buildComparison(products);
  const compared = products.map((product) => ({
    slug: product.slug, name: product.name, image: product.image, gender: product.gender, category: product.category,
    msrp: product.msrp, currency: product.currency, discontinued: product.status === "discontinued",
    priceLabel: displayParameter(t, locale, price, getParameter(parametersOf(product), price)),
    outbound: brandLink(product, locale),
  }));
  return <article className="site-width py-7 sm:py-11">
    <h1 className="page-title mb-4">{t("seo.beta_shell_title")}</h1>
    <p className="mb-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">{t("seo.beta_shell_description")}</p>
    <ClientMessages scope="compare">
      <CompareOverview products={compared} groups={groups} />
      <h2 className="section-title mb-2">{t("ui.full_specifications")}</h2>
      <div className="mb-3"><ParameterLegend /></div>
      <CompareTable products={compared} groups={groups} highlight differencesOnly={false} />
    </ClientMessages>
    <Button asChild variant="outline" className="mt-5">
      <Link href={comparisonHref(betaShellComparison.slugs)}>{t("ui.compare_products")}</Link>
    </Button>
  </article>;
}
