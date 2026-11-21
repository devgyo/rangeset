import {notFound} from "next/navigation";
import {hasLocale} from "next-intl";
import {setRequestLocale} from "next-intl/server";
import {CatalogPage, catalogMetadata} from "@/components/catalog/catalog-page";
import {locales} from "@/i18n/routing";

type Props = PageProps<"/[locale]/products">;

export async function generateMetadata({params}: Props) {
  const {locale} = await params;
  if (!hasLocale(locales, locale)) notFound();
  return catalogMetadata(locale);
}

export default async function ProductsPage({params, searchParams}: Props) {
  const [{locale}] = await Promise.all([params, searchParams]);
  if (!hasLocale(locales, locale)) notFound();
  setRequestLocale(locale);
  return <CatalogPage locale={locale} />;
}
