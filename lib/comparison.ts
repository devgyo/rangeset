import type { ProductDetail } from "./product-view";
import { parametersOf } from "./brands";
import { parameterGroups, type ParameterGroup } from "./parameters/model";
import {publicParameterGroups} from "./public-parameters";

export function comparisonHref(slugs: string[]) {
  return slugs.length ? "/compare?ids=" + slugs.map(encodeURIComponent).join(",") : "/compare";
}

export function comparisonIds(value: string | string[] | undefined) {
  if (typeof value !== "string") return [];
  return [...new Set(value.split(",", 20).map((slug) => slug.trim()).filter((slug) => /^[a-z0-9-]{1,200}$/i.test(slug)))];
}

export type ComparisonGroup = ParameterGroup;

export function buildComparison(products: ProductDetail[]): ComparisonGroup[] {
  return publicParameterGroups(parameterGroups(products.map(parametersOf), "compare"));
}
