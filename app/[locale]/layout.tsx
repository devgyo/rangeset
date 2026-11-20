import type {Metadata} from "next";
import {notFound} from "next/navigation";
import {hasLocale, NextIntlClientProvider, useTranslations} from "next-intl";
import {getTranslations, setRequestLocale} from "next-intl/server";
import {Link} from "@/i18n/navigation";
import {languageTags, routing} from "@/i18n/routing";
import {CatalogNav, CompareDock} from "@/components/catalog/compare-selection";
import {LanguageSwitcher} from "@/components/catalog/language-switcher";
import {siteUrl} from "@/lib/site";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({locale}));
}

export async function generateMetadata({params}: LayoutProps<"/[locale]">): Promise<Metadata> {
  const {locale} = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({locale});
  return {
    metadataBase: siteUrl,
    title: {default: t("seo.title"), template: t("seo.template", {title: "%s"})},
    description: t("seo.description"),
    openGraph: {siteName: t("brand.name"), type: "website"},
  };
}

function SiteContents({children}: {children: React.ReactNode}) {
  const t = useTranslations();
  return <>
    <a href="#main" className="skip-link">{t("ui.skip_to_content")}</a>
    <header className="border-b border-border">
      <div className="site-width flex min-h-17 flex-wrap items-center justify-between gap-x-2 gap-y-1 py-2">
        <Link href="/" className="wordmark inline-flex items-center gap-2 sm:gap-3" aria-label={t("ui.home_label")}>
          <span className="brand-mark" aria-hidden="true" />
          {t("brand.wordmark")}
        </Link>
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 sm:gap-x-5">
          <CatalogNav />
          <LanguageSwitcher />
        </div>
      </div>
    </header>
    <main id="main" className="flex flex-1 flex-col">{children}</main>
    <CompareDock />
    <footer className="border-t border-border">
      <div className="site-width py-5 font-mono text-xs tracking-wider text-muted-foreground">
        {t("brand.name")} <span aria-hidden="true">/</span> {t("ui.footer")}
      </div>
    </footer>
  </>;
}

export default async function LocaleLayout({children, params}: LayoutProps<"/[locale]">) {
  const {locale} = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return <html lang={languageTags[locale]} className="dark">
    <body className="flex min-h-dvh flex-col">
      <NextIntlClientProvider><SiteContents>{children}</SiteContents></NextIntlClientProvider>
    </body>
  </html>;
}
