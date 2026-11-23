export const taxonomy = [
  {slug: "outerwear", leaves: [
    {key: "outer.hardshell", slug: "hardshell-jackets", definition: "A sleeved outer garment with a waterproof body and no fixed fill."},
    {key: "outer.insulated_shell", slug: "insulated-shells", definition: "An outer garment with a waterproof membrane and fixed insulation."},
    {key: "outer.down", slug: "down-jackets", definition: "An outer garment insulated primarily with down in the body."},
    {key: "outer.synthetic", slug: "synthetic-insulated-jackets", definition: "An outer garment insulated primarily with synthetic fill in the body."},
    {key: "outer.softshell", slug: "softshell-jackets", definition: "An outer garment whose body is declared to be a softshell."},
    {key: "outer.windshell", slug: "windshells", definition: "An unfilled outer garment designed primarily to block wind."},
    {key: "outer.tailoring", slug: "coats-and-tailoring", definition: "A tailored coat, trench coat or blazer without fixed fill or a waterproof body."},
    {key: "outer.vest", slug: "vests", definition: "A sleeveless outer garment of any construction."},
  ]},
  {slug: "fleece-and-midlayers", leaves: [
    {key: "fleece", slug: "fleece-and-midlayers", definition: "A fleece or knit midlayer without fixed fill."},
  ]},
  {slug: "tops", leaves: [
    {key: "tops", slug: "tops", definition: "A shirt, polo, lightweight hoodie, tank or other unfilled top."},
  ]},
  {slug: "base-layers", leaves: [
    {key: "base.top", slug: "base-layer-tops", definition: "A top designated as a base layer by the brand."},
    {key: "base.bottom", slug: "base-layer-bottoms", definition: "A lower-body garment designated as a base layer by the brand."},
  ]},
  {slug: "bottoms", leaves: [
    {key: "bottoms.hardshell", slug: "hardshell-pants", definition: "Waterproof pants or bib pants without fixed fill."},
    {key: "bottoms.insulated", slug: "insulated-pants", definition: "Pants or bib pants with fixed fill."},
    {key: "bottoms.softshell", slug: "softshell-pants", definition: "Pants declared to be a softshell."},
    {key: "bottoms.pants", slug: "pants", definition: "Other full-length pants, including hiking and casual pants."},
    {key: "bottoms.tights", slug: "tights-and-leggings", definition: "Tights or leggings outside the base layer category."},
    {key: "bottoms.shorts", slug: "shorts", definition: "Shorts and skorts."},
    {key: "bottoms.skirt", slug: "skirts", definition: "A separate skirt without integrated shorts."},
  ]},
  {slug: "dresses-and-one-pieces", leaves: [
    {key: "onepiece.dress", slug: "dresses", definition: "A one-piece garment with a skirt extending from the bodice."},
    {key: "onepiece.suit", slug: "one-piece-suits", definition: "A one-piece garment joining an upper body and pants."},
  ]},
  {slug: "accessories", leaves: [
    {key: "accessories", slug: "accessories", definition: "An accessory for clothing, gear, or product care."},
  ]},
  {slug: "backpacks", leaves: [
    {key: "packs.backpack", slug: "backpacks", definition: "A bag designed to be carried on the back using shoulder straps."},
  ]},
] as const;

export type TaxonomyLeaf = (typeof taxonomy)[number]["leaves"][number];
export type LeafKey = TaxonomyLeaf["key"];
export type TaxonomyResult =
  | {state: "classified"; leaf: LeafKey; manual?: true}
  | {state: "needs_review" | "hidden"; reason: string; manual?: true};

export type TaxonomyEvidence = {
  hidden?: string; accessory?: boolean; backpack?: boolean; base?: "top" | "bottom"; shape?: "suit" | "dress" | "skirt" | "shorts" | "tight" | "pants" | "vest" | "top" | "tailoring";
  waterproof?: boolean; membrane?: boolean; conflict?: string; fleece?: boolean; softshell?: boolean; windshell?: boolean;
  fill?: "down" | "synthetic" | "unknown"; threeInOne?: boolean;
};

const leaves = taxonomy.flatMap(({leaves}) => [...leaves] as TaxonomyLeaf[]);
const leafKeys = new Set<string>(leaves.map(({key}) => key));
const classified = (leaf: LeafKey): TaxonomyResult => ({state: "classified", leaf});
const review = (reason: string): TaxonomyResult => ({state: "needs_review", reason});

export function classifyTaxonomy(facts: TaxonomyEvidence, override?: unknown): TaxonomyResult {
  if (facts.hidden) return {state: "hidden", reason: facts.hidden};
  const selected = typeof override === "object" && override !== null && "value" in override ? override.value : override;
  if (typeof selected === "string" && leafKeys.has(selected)) return {state: "classified", leaf: selected as LeafKey, manual: true};
  if (selected !== undefined) return {...review("Manual taxonomy requires review"), manual: true};
  const {shape, waterproof, membrane, conflict, fleece, softshell, windshell} = facts;
  const fill = facts.threeInOne ? undefined : facts.fill;
  if (facts.accessory) return classified("accessories");
  if (facts.backpack) return classified("packs.backpack");
  if (facts.base) return classified(facts.base === "top" ? "base.top" : "base.bottom");
  if (shape === "suit") return classified("onepiece.suit");
  if (shape === "dress") return classified("onepiece.dress");
  if (shape === "skirt") return classified("bottoms.skirt");
  if (shape === "shorts") return classified("bottoms.shorts");
  if (shape === "tight") return classified("bottoms.tights");
  if (shape === "pants") {
    if (fill) return classified("bottoms.insulated");
    if (conflict) return review(conflict);
    if (waterproof) return classified("bottoms.hardshell");
    return classified(softshell ? "bottoms.softshell" : "bottoms.pants");
  }
  if (conflict) return review(conflict);
  if (shape === "vest") return classified("outer.vest");
  if (fleece && !fill) return classified("fleece");
  if (shape === "top" && !fill && !softshell && !waterproof) return classified("tops");
  if (fill) {
    if (waterproof && membrane) return classified("outer.insulated_shell");
    if (fill === "down") return classified("outer.down");
    if (fill === "synthetic") return classified("outer.synthetic");
    return review("Fixed fill is stated but the main fill is unresolved");
  }
  if (waterproof) return classified("outer.hardshell");
  if (shape === "tailoring") return classified("outer.tailoring");
  if (softshell) return classified("outer.softshell");
  if (windshell) return classified("outer.windshell");
  return review("No conclusive body construction or garment type");
}

type TaxonomyItem = {brand: string; name: string; taxonomy?: TaxonomyResult};

export function consistentTaxonomy<T extends TaxonomyItem>(items: T[]): T[] {
  const groups = new Map<string, Set<LeafKey>>();
  const key = ({brand, name}: T) => brand.toLowerCase() + ":" + name.normalize("NFKC").trim().toLowerCase()
    .replace(/\s+(?:men|women|unisex)$/i, "");
  for (const item of items) {
    if (item.taxonomy?.state !== "classified") continue;
    const id = key(item);
    if (!groups.has(id)) groups.set(id, new Set());
    groups.get(id)!.add(item.taxonomy.leaf);
  }
  return items.map((item) => item.taxonomy?.state === "classified" && !item.taxonomy.manual && (groups.get(key(item))?.size ?? 0) > 1
    ? {...item, taxonomy: review("Same-model variants resolve to different categories")} : item);
}

export function taxonomyGroup(slug: string) {
  return taxonomy.find((group) => group.slug === slug || (group.leaves as readonly TaxonomyLeaf[]).some((leaf) => leaf.slug === slug));
}

export function taxonomyLabelKey(slug: string) {
  return "taxonomy." + slug.replaceAll("-", "_");
}

export function matchesTaxonomy(item: TaxonomyItem, slug: string) {
  if (item.taxonomy?.state !== "classified") return false;
  const key = item.taxonomy.leaf;
  const group = taxonomyGroup(slug);
  return Boolean(group && (group.leaves as readonly TaxonomyLeaf[]).some((leaf) => leaf.key === key && (group.slug === slug || leaf.slug === slug)));
}

export const taxonomySlugs: readonly string[] = [...new Set([...taxonomy.map(({slug}) => slug), ...leaves.map(({slug}) => slug)])];

export const legacyTaxonomy: Readonly<Record<string, string>> = {
  "Shell Jackets": "outerwear", "Insulated Jackets": "outerwear", Pants: "bottoms",
  Fleece: "fleece-and-midlayers", "Shirts and Tops": "tops", "Base Layer": "base-layers",
  Shorts: "shorts", "Dresses and Skirts": "dresses-and-one-pieces", Accessories: "accessories",
  // Professional Use is now the PRO series facet.
  "Professional Use": "",
};

export const taxonomyPath = (slug = "") => slug ? "/products/category/" + slug : "/products";

export function leafSlug(result: TaxonomyResult | undefined) {
  return result?.state === "classified" ? leaves.find(({key}) => key === result.leaf)?.slug : undefined;
}
