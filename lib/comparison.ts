import { applicableMetric, formatMetric, formatPrice, genderLabel, metricLabels, normalizedValue, unpublished, type ProductDetail } from "./arcteryx-view";

export function comparisonHref(slugs: string[]) {
  return slugs.length ? "/compare?ids=" + slugs.map(encodeURIComponent).join(",") : "/compare";
}

export function comparisonIds(value: string | string[] | undefined) {
  if (typeof value !== "string") return [];
  return [...new Set(value.split(",", 20).map((slug) => slug.trim()).filter((slug) => /^[a-z0-9-]{1,200}$/i.test(slug)))].slice(0, 4);
}

type Value = string | number | boolean | readonly string[] | null;
export type ComparisonCell = { value: Value; text: string | string[]; numeric?: boolean };
type Row = { key: string; label: string; cells: ComparisonCell[]; differs: boolean };
export type ComparisonGroup = { title: string; rows: Row[] };

function cell(value: Value, text?: string | string[], numeric?: boolean): ComparisonCell {
  return { value, text: text ?? (Array.isArray(value) ? [...value] : value === null ? unpublished : String(value)), numeric };
}

function listCell(values: string[]) {
  return values.length ? cell(values, values) : cell(null);
}

function metricCell(product: ProductDetail, key: string) {
  const spec = product.specs[key];
  if (!spec) return cell(null);
  return cell(spec.value, formatMetric(spec), typeof spec.value === "number");
}

export function buildComparison(products: ProductDetail[]): ComparisonGroup[] {
  const specRows = (keys: string[]) => keys.filter((key) => products.every((product) => applicableMetric(key, product.category)))
    .map((key) => row(key, metricLabels[key], (product) => metricCell(product, key)));
  const row = (key: string, label: string, read: (product: ProductDetail) => ComparisonCell): Row => {
    const cells = products.map(read);
    return { key, label, cells, differs: new Set(cells.map(({ value, text }) => {
      // The display supplies the unit when a spec has one. The scalar preserves the meaning of false and zero.
      return typeof value === "number" && typeof text === "string" ? normalizedValue(text) : normalizedValue(value);
    })).size > 1 };
  };
  const groups: ComparisonGroup[] = [
    { title: "Overview", rows: [
      row("category", "Category", (product) => cell(product.category)),
      row("gender", "Gender", (product) => cell(product.gender, genderLabel(product.gender))),
      row("family", "Family", (product) => cell(product.family)),
      row("price", "Price (MSRP)", (product) => cell(product.msrp, formatPrice(product.msrp), product.msrp !== null)),
      ...specRows(["weight_g", "fit"]),
      row("activities", "Activities", (product) => listCell(product.activities)),
      row("release", "Release year / season", (product) => cell([product.year, product.season].filter(Boolean).join(" · ") || null)),
    ]},
    { title: "Protection & shell", rows: specRows(["membrane", "layers", "face_denier", "fabric_gsm", "helmet_hood", "pit_zips", "recco"]) },
    { title: "Dimensions", rows: specRows(["centre_back_length_cm", "inseam"]) },
    { title: "Footwear", rows: specRows(["drop", "stack", "lugs", "outsole", "shoe_waterproof"]) },
    { title: "Construction & specs", rows: [
      ...specRows(["insulation"]),
      row("materials", "Materials", (product) => listCell(product.materials)),
      row("facility", "Manufacturing facility", (product) => cell(product.facility || null)),
      row("colors", "Colors", (product) => cell(product.swatches.length || null, undefined, true)),
      row("sizes", "Sizes", (product) => listCell(product.sizes)),
    ]},
  ];
  return groups.flatMap(({ title, rows }) => {
    const published = rows.filter(({ cells }) => cells.some(({ value }) => value !== null));
    return published.length ? [{ title, rows: published }] : [];
  });
}
