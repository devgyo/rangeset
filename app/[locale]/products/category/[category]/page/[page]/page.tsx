import {notFound} from "next/navigation";
import {hasLocale} from "next-intl";
import {setRequestLocale} from "next-intl/server";
import {CatalogPage, catalogMetadata} from "@/components/catalog/catalog-page";
import {locales} from "@/i18n/routing";
import {parseCatalogPage} from "@/lib/catalog/pagination";
import {taxonomyGroup} from "@/lib/taxonomy";

export const revalidate = 300;
type Props = PageProps<"/[locale]/products/category/[category]/page/[page]">;

export function generateStaticParams() {
  return [];
}

async function pagination(params: Props["params"]) {
  const {category, locale, page: value} = await params;
  const page = parseCatalogPage(value);
  if (!hasLocale(locales, locale) || !taxonomyGroup(category) || page < 2) notFound();
  return {category, locale, page};
}

export async function generateMetadata({params}: Props) {
  const {category, locale, page} = await pagination(params);
  return catalogMetadata(locale, category, page);
}

export default async function CategoryPage({params}: Props) {
  const {category, locale, page} = await pagination(params);
  setRequestLocale(locale);
  return <CatalogPage category={category} locale={locale} page={page} />;
}
