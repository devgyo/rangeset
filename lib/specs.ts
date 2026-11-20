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
  { key: "membrane", label: "field.legacy_membrane", group: "Specs" },
  { key: "layers", label: "field.legacy_layers", group: "Specs" },
  { key: "faceDenier", label: "field.legacy_face_denier", group: "Specs", unit: "D" },
  { key: "weight", label: "field.weight", group: "Numbers", unit: "g" },
  { key: "backLength", label: "field.legacy_back_length", group: "Numbers", unit: "cm" },
  { key: "waterproof", label: "field.legacy_waterproof", group: "Numbers", unit: "mm" },
  { key: "breathability", label: "field.breathability", group: "Numbers" },
  { key: "fit", label: "field.fit", group: "Features" },
  { key: "price", label: "field.legacy_price", group: "Numbers", unit: "USD" },
  { key: "pitZips", label: "field.legacy_pit_zips", group: "Features" },
  { key: "helmetHood", label: "field.legacy_helmet_hood", group: "Features" },
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
