import type { Jacket, Spec } from "@/lib/types";

export const notPublished = "Not published";

export const groups = ["Specs", "Numbers", "Features"] as const;
export type SpecGroup = (typeof groups)[number];

type SpecKey = keyof Jacket["specs"];
export type Field = {
  key: Exclude<SpecKey, "weightSize">;
  label: string;
  group: SpecGroup;
  unit?: string;
};

export const fields: Field[] = [
  { key: "membrane", label: "Membrane", group: "Specs" },
  { key: "layers", label: "Layers", group: "Specs" },
  { key: "faceDenier", label: "Face fabric denier", group: "Specs", unit: "D" },
  { key: "weight", label: "Weight", group: "Numbers", unit: "g" },
  { key: "backLength", label: "Center back length", group: "Numbers", unit: "cm" },
  { key: "waterproof", label: "Waterproof rating", group: "Numbers", unit: "mm" },
  { key: "breathability", label: "Breathability", group: "Numbers" },
  { key: "fit", label: "Fit", group: "Features" },
  { key: "price", label: "Price", group: "Numbers", unit: "USD" },
  { key: "pitZips", label: "Pit zips", group: "Features" },
  { key: "helmetHood", label: "Helmet hood", group: "Features" },
];

const numberFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 });

export function formatSpec(spec?: Spec<string | number | boolean>, defaultUnit?: string) {
  if (spec?.value == null) return notPublished;
  const { value } = spec;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  const unit = spec.unit ?? defaultUnit;
  const formatted = typeof value === "number" ? numberFormat.format(value) : value;
  if (unit === "USD") return `$${formatted} USD`;
  return unit ? `${formatted} ${unit}` : formatted;
}
