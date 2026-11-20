import {useTranslations} from "next-intl";
import {Link} from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations();
  return <div className="site-width page-space">
    <h1 className="page-title">{t("ui.not_found")}</h1>
    <Link href="/products" className="spec-link mt-4 inline-block">{t("ui.browse_catalog")}</Link>
  </div>;
}
