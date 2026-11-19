import { formatSpec, notPublished, type Field } from "@/lib/specs";
import type { Jacket } from "@/lib/types";

export function JacketSpec({
  specs, field, showWeightSize = true,
}: {
  specs: Jacket["specs"];
  field: Field;
  showWeightSize?: boolean;
}) {
  const spec = specs[field.key];
  if (spec?.value == null) return <span className="text-muted-foreground">{notPublished}</span>;

  return (
    <>
      <span className={typeof spec.value === "number" ? "font-mono tabular-nums" : undefined}>
        {formatSpec(spec, field.unit)}
      </span>
      {field.key === "weight" && showWeightSize && (
        <span className="block text-xs text-muted-foreground">
          {specs.weightSize?.value ? `Size ${specs.weightSize.value}` : `Reference size: ${notPublished}`}
        </span>
      )}
      {(spec.method || field.key === "breathability") && (
        <span className="block text-xs text-muted-foreground">
          {spec.method || `Test method: ${notPublished}`}
        </span>
      )}
    </>
  );
}
