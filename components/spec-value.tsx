import {useCopy} from "@/i18n/copy";
import { formatSpec, type Field } from "@/lib/specs";
import type { Jacket } from "@/lib/types";

export function JacketSpec({
  specs, field, showWeightSize = true,
}: {
  specs: Jacket["specs"];
  field: Field;
  showWeightSize?: boolean;
}) {
  const {t, locale} = useCopy();
  const spec = specs[field.key];
  if (spec?.value == null) return <span className="text-muted-foreground">{t("status.missing")}</span>;

  return (
    <>
      <span className={typeof spec.value === "number" ? "font-mono tabular-nums" : undefined}>
        {typeof spec.value === "boolean" && locale !== "en" ? t(spec.value ? "symbol.yes" : "symbol.no") : formatSpec(spec, field.unit)}
      </span>
      {field.key === "weight" && showWeightSize && (
        <span className="block text-xs text-muted-foreground">
          {specs.weightSize?.value ? t("ui.size", {size: specs.weightSize.value}) : t("ui.weight_size_missing", {status: t("status.missing")})}
        </span>
      )}
      {(spec.method || field.key === "breathability") && (
        <span className="block text-xs text-muted-foreground">
          {spec.method || t("ui.test_method_missing", {status: t("status.missing")})}
        </span>
      )}
    </>
  );
}
