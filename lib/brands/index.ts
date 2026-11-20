import {arcAdapter} from "./arcteryx";
import {mammutAdapter} from "./mammut";
import type {ProductDetail} from "../product-view";
import type {BrandAdapter} from "./types";

const adapters: Readonly<Record<string, BrandAdapter>> = {arcteryx: arcAdapter, mammut: mammutAdapter};

export function brandAdapter(slug: string) {
  return adapters[slug];
}

export function parametersOf(product: ProductDetail) {
  const slug = product.brandSlug ?? product.brand.normalize("NFKC").toLowerCase().replace(/[^a-z]/g, "");
  return product.parameters ?? (brandAdapter(slug) ?? arcAdapter).parameters(product);
}
