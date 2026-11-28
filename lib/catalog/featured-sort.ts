export const defaultCatalogSort = "featured";
export const catalogSorts = [defaultCatalogSort, "name", "price-asc", "price-desc", "weight"] as const;
export type CatalogSort = (typeof catalogSorts)[number];

export function catalogSort(value: string | null): CatalogSort {
  return catalogSorts.find((sort) => sort === value) ?? defaultCatalogSort;
}

type Tier = "A" | "C";
const tiers: readonly Tier[] = ["A", "C"];

export type FeaturedProduct = {
  id?: number;
  slug: string;
  name: string;
  brandSlug: string;
  styleFamily: string | null;
  releaseSeason: number | null;
  cardValueCount: number;
  status: "active" | "discontinued" | "pending_review";
};

export function releaseSeasonRank(year: number | null, season: string): number | null {
  if (year === null) return null;
  const code = season.toLowerCase().trim().replace(/\s+/g, "").replace(/[–-]/g, "/");
  if (/^(s|ss|spring|summer|spring\/summer)$/.test(code)) return year * 2;
  if (/^(fw|aw|fall|autumn|winter|(?:fall|autumn)\/winter)$/.test(code)) return year * 2 + 1;
  return null;
}

function tierFor(product: FeaturedProduct): Tier {
  return product.cardValueCount < 3 || product.status === "discontinued" ? "C" : "A";
}

function groupBy<T, K>(products: readonly T[], keyOf: (product: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  for (const product of products) {
    const key = keyOf(product);
    const group = groups.get(key);
    if (group) group.push(product);
    else groups.set(key, [product]);
  }
  return groups;
}

const nameOrder = new Intl.Collator("en");

export function compareCatalogIdentity(a: Pick<FeaturedProduct, "id" | "slug">, b: Pick<FeaturedProduct, "id" | "slug">) {
  if (a.id !== undefined && b.id !== undefined) return a.id - b.id;
  if (a.id !== b.id) return a.id === undefined ? 1 : -1;
  return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
}

function brandQueue<T extends FeaturedProduct>(products: T[]): T[] {
  const ordered = [...products].sort((a, b) => (b.releaseSeason ?? -1) - (a.releaseSeason ?? -1)
    || nameOrder.compare(a.name, b.name) || compareCatalogIdentity(a, b));
  const families = groupBy(ordered, (product) =>
    JSON.stringify([product.releaseSeason, product.styleFamily, product.styleFamily ? null : product.slug]));
  return [...families.values()].flat();
}

function interleaveBrands<T extends FeaturedProduct>(products: T[]): T[] {
  const brands = groupBy(products, (product) => product.brandSlug);
  const active = [...brands.keys()].sort().map((brand) => {
    const queue = brandQueue(brands.get(brand)!);
    return {queue, count: queue.length, position: 0, current: 0};
  });
  const result: T[] = [];
  let total = products.length;
  while (active.length) {
    let selected = 0;
    for (const [index, brand] of active.entries()) {
      brand.current += brand.count;
      if (brand.current > active[selected].current) selected = index;
    }
    const brand = active[selected];
    result.push(brand.queue[brand.position++]);
    brand.current -= total;
    if (brand.position === brand.count) {
      active.splice(selected, 1);
      total -= brand.count;
    }
  }
  return result;
}

export function rankFeatured<T extends FeaturedProduct>(products: readonly T[]): {product: T; tier: Tier}[] {
  const grouped = groupBy(products, tierFor);
  return tiers.flatMap((tier) => interleaveBrands(grouped.get(tier) ?? []).map((product) => ({product, tier})));
}
