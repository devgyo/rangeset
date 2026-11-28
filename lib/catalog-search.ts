import {leafSlug, taxonomyGroup, taxonomyLabelKey, taxonomySlugs} from "./taxonomy";
import type {CatalogCard} from "./product-view";

export type SearchableProduct = Pick<CatalogCard, "slug" | "name" | "family" | "subTags" | "gender" | "modelNumbers"> &
  Partial<Pick<CatalogCard, "brand" | "brandSlug" | "category" | "taxonomy" | "series">> & {membrane?: string | number | boolean};

type Translate = (key: string) => string;
const optionalQualifiers = new Set(["hooded", "hoodie", "hoody"]);
const arcFamilyAliases: Record<string, string> = {
  alpha: "阿尔法 アルファ",
  atom: "原子 アトム",
  beta: "贝塔 貝塔 ベータ",
  cerium: "铈 鈰 セリウム",
  gamma: "伽马 伽馬 ガンマ",
  proton: "质子 質子 プロトン",
};

function normalized(value: string) {
  return value.normalize("NFKC").toLowerCase().replaceAll("’", "'");
}

function tokenize(query: string) {
  return normalized(query).match(/[^\s]+/g) ?? [];
}

function matches(product: SearchableProduct, tokens: string[], translate?: Translate) {
  const numbers = product.modelNumbers ?? product.slug.toLowerCase().match(/-(\d{4})-(x\d+)$/)?.slice(1) ?? [];
  const leaf = leafSlug(product.taxonomy);
  const taxonomy = leaf && taxonomySlugs.includes(leaf) ? leaf : undefined;
  const group = taxonomy && taxonomyGroup(taxonomy)?.slug;
  const categories = [...new Set([taxonomy, group].filter((slug) => slug !== undefined))];
  const arc = product.brandSlug === "arcteryx" || product.slug.startsWith("arcteryx-");
  const familyWords = tokenize([product.family, product.name].join(" "));
  const aliases = arc ? ["arcteryx arc'teryx 始祖鸟 始祖鳥 アークテリクス", ...familyWords.map((word) => arcFamilyAliases[word])] : [];
  const text = normalized([product.name, product.brand, product.family, product.category, ...product.subTags,
    product.membrane, ...(product.series ?? []), ...aliases, ...categories.map((slug) => translate?.(taxonomyLabelKey(slug)))]
    .join(" "));
  const gender = normalized(product.gender && translate ? translate("gender." + product.gender) : "");
  return tokens.every((token) => {
    if (/^(?:\d{4}(?:-\d{5})?|x\d+)$/.test(token)) return numbers.some((number) => number.toLowerCase() === token);
    const genderCode = token.replace(/'s$/, "");
    if (["men", "women", "unisex"].includes(genderCode)) return product.gender === genderCode;
    return token === gender || text.includes(token);
  });
}

export function searchCatalog<T extends SearchableProduct>(products: readonly T[], query: string, translate?: Translate): T[] {
  const tokens = tokenize(query);
  if (!tokens.length) return [...products];
  const exact = products.filter((product) => matches(product, tokens, translate));
  if (exact.length) return exact;

  const fallback = tokens.filter((token) => !optionalQualifiers.has(token))
    .map((token) => token === "jacket's" ? "jacket" : token);
  if (!fallback.length || (fallback.length === tokens.length && fallback.every((token, index) => token === tokens[index]))) return [];
  const retried = products.filter((product) => matches(product, fallback, translate));
  const name = fallback.join(" ");
  const exactNames = retried.filter((product) => tokenize(product.name).join(" ") === name);
  return exactNames.length ? exactNames : retried;
}
