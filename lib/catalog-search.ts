import type {CatalogCard} from "./product-view";

type SearchableProduct = Pick<CatalogCard, "slug" | "name" | "family" | "subTags" | "gender" | "modelNumbers"> & {brand?: string; membrane?: string | number | boolean};
const optionalQualifiers = new Set(["hooded", "hoodie", "hoody"]);

function tokenize(query: string) {
  return query.normalize("NFKC").toLowerCase().replaceAll("’", "'").match(/[^\s]+/g) ?? [];
}

function matches(product: SearchableProduct, tokens: string[]) {
  const numbers = product.modelNumbers ?? product.slug.toLowerCase().match(/-(\d{4})-(x\d+)$/)?.slice(1) ?? [];
  const text = [product.name, product.brand, product.family, product.gender, ...product.subTags, product.membrane]
    .join(" ").normalize("NFKC").toLowerCase().replaceAll("’", "'");
  return tokens.every((token) => /^(?:\d{4}(?:-\d{5})?|x\d+)$/.test(token) ? numbers.some((number) => number.toLowerCase() === token) : text.includes(token));
}

export function searchCatalog<T extends SearchableProduct>(products: T[], query: string): T[] {
  const tokens = tokenize(query);
  if (!tokens.length) return products;
  const exact = products.filter((product) => matches(product, tokens));
  if (exact.length) return exact;

  const fallback = tokens.filter((token) => !optionalQualifiers.has(token))
    .map((token) => token === "jacket's" ? "jacket" : token);
  if (!fallback.length || (fallback.length === tokens.length && fallback.every((token, index) => token === tokens[index]))) return [];
  const retried = products.filter((product) => matches(product, fallback));
  const name = fallback.join(" ");
  const exactNames = retried.filter((product) => tokenize(product.name).join(" ") === name);
  return exactNames.length ? exactNames : retried;
}
