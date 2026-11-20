import type { ProductDetail } from "./arcteryx-view";
import { parametersOf } from "./parameters/arcteryx";
import { parameterGroups, type ParameterGroup } from "./parameters/model";
import { groups } from "./parameters/registry";

export function comparisonHref(slugs: string[]) {
  return slugs.length ? "/compare?ids=" + slugs.map(encodeURIComponent).join(",") : "/compare";
}

export function comparisonIds(value: string | string[] | undefined) {
  if (typeof value !== "string") return [];
  return [...new Set(value.split(",", 20).map((slug) => slug.trim()).filter((slug) => /^[a-z0-9-]{1,200}$/i.test(slug)))].slice(0, 4);
}

export type ComparisonGroup = ParameterGroup;

export function buildComparison(products: ProductDetail[]): ComparisonGroup[] {
  return parameterGroups(products.map(parametersOf)).filter(({ title }) => title !== groups.supplemental);
}
