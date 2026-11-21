import {notFound} from "next/navigation";
import {hasLocale} from "next-intl";
import {setRequestLocale} from "next-intl/server";
import {CatalogPage, catalogMetadata} from "@/components/catalog/catalog-page";
import {locales} from "@/i18n/routing";
import {taxonomyGroup} from "@/lib/taxonomy";

export const revalidate = 300;
type Props = PageProps<"/[locale]/products/category/[category]">;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({params}: Props) {
  const {category, locale} = await params;
  if (!hasLocale(locales, locale) || !taxonomyGroup(category)) notFound();
  return catalogMetadata(locale, category);
}

export default async function CategoryPage({params}: Props) {
  const {category, locale} = await params;
  if (!hasLocale(locales, locale) || !taxonomyGroup(category)) notFound();
  setRequestLocale(locale);
  return <CatalogPage category={category} locale={locale} />;
}
