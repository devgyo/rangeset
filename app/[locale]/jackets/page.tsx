import {ClientMessages} from "@/i18n/client-messages";
import {getTranslations} from "next-intl/server";
import {currentLocale} from "@/i18n/seo";
import {pageAlternates} from "@/i18n/routing";
import type { Metadata } from "next";
import { JacketTable } from "@/components/jacket-table";
import { catalogEnabled } from "@/lib/catalog";
import { listJackets } from "@/lib/jackets";

export async function generateMetadata(): Promise<Metadata> {
  const [locale, t] = await Promise.all([currentLocale(), getTranslations()]);
  return {
    title: t("ui.jacket_index"),
    robots: catalogEnabled ? undefined : {index: false, follow: true},
    description: t("seo.jackets_description"),
    alternates: pageAlternates("/jackets", locale),
  };
}

export default async function JacketsPage() {
  const [jackets, t] = await Promise.all([listJackets(), getTranslations()]);
  return (
    <div className="site-width page-space">
      <div className="mb-9">
        <h1 className="page-title">{t("ui.jacket_index")}</h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          {t("ui.jacket_intro")}
        </p>
      </div>
      <ClientMessages scope="jackets">
        <JacketTable jackets={jackets} />
      </ClientMessages>
    </div>
  );
}
