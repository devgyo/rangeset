import {arcLeafProductUrl} from "../../lib/brand-urls";
import {priceCents, snapshotVariantKey} from "../snapshot-observation";

type Json = Record<string, unknown>;
export type SpecValue = string | number | boolean | null;
export type Derived = {
  value: SpecValue;
  unit: string | null;
  source: "brand" | "not_published";
  sourceUrl: string;
  fetchedAt: string;
  rawText: string | null;
};

export type Observation = {
  variant: string;
  price: number | null;
  currency: string | null;
  inStock: boolean | null;
};

export type CatalogProduct = {
  externalId: string;
  slug: string;
  url: string;
  name: string;
  category: string | null;
  subTags: string[];
  gender: string | null;
  analyticsFamily: string | null;
  isHardshell: boolean;
  specs: Record<string, Derived>;
  prices: Observation[];
  raw: Json;
  crossCheck: string[];
  fetchedAt: string;
};

const object = (value: unknown): Json =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as Json : {};

const string = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : null;
const array = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
function text(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(text);
  const entry = string(value);
  return entry ? [entry] : [];
}
const number = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? value :
    typeof value === "string" && /^\d+(?:\.\d+)?$/.test(value.trim()) ? Number(value) : null;

function plain(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&").replace(/&#(?:39|x27);|&apos;/gi, "'")
    .replace(/\s+/g, " ").trim();
}

function normalizedName(value: string) {
  return value.toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

export function nameFamily(value: string) {
  const name = normalizedName(value);
  const family = name.replace(/\b(?:19|20)\d{2}\b/g, " ").replace(/\s+/g, " ").trim();
  return family || null;
}

function numericMatch(regexp: RegExp, lines: string[]): [number | null, string | null] {
  const matches = lines.flatMap((line) => [...plain(line).matchAll(regexp)].map((match) => ({
    value: Number(match[1].replaceAll(",", "")), line,
  }))).filter(({ value }) => Number.isFinite(value) && value > 0);
  const values = new Set(matches.map(({ value }) => value));
  return values.size === 1 ? [matches[0].value, matches[0].line] : [null, matches[0]?.line ?? null];
}

function choice<T extends string | boolean>(lines: string[], read: (line: string) => T | null): [T | null, string | null] {
  const matches = lines.flatMap((line) => {
    const value = read(plain(line));
    return value === null ? [] : [{ value, line }];
  });
  return new Set(matches.map(({ value }) => value)).size === 1
    ? [matches[0].value, matches[0].line] : [null, matches[0]?.line ?? null];
}

function membraneName(line: string) {
  const matches = new Set<string>();
  for (const match of line.matchAll(/\bGORE[-–— ]?TEX(?:[®™])?(?:\s+(PRO|PACLITE(?:\s+PLUS)?|ACTIVE|INFINIUM)(?:[®™])?)?(?:\s*(?:\(\s*|with\s+(?:an?\s+)?)?(ePE|ePTFE)\b)?/gi)) {
    const variant = match[1]?.toUpperCase();
    if (variant === "INFINIUM") continue;
    const chemistry = match[2]?.toLowerCase();
    matches.add(["GORE-TEX", variant, chemistry === "epe" ? "ePE" : chemistry === "eptfe" ? "ePTFE" : null].filter(Boolean).join(" "));
  }
  if (/\bDermizax\b/i.test(line)) matches.add("Dermizax");
  if (/\bPertex\s+Shield(?:\s+Air)?\b/i.test(line)) matches.add(/\bShield\s+Air\b/i.test(line) ? "Pertex Shield Air" : "Pertex Shield");
  return [...matches];
}

function feature(lines: string[], pattern: string): [boolean | null, string | null] {
  const negated = new RegExp(`\\b(?:no|without|lacks?)\\s+(?:(?:a|an|any|built-in|integrated)\\s+)?(?:${pattern})\\b|\\b(?:${pattern})\\s*[:–-]\\s*(?:no|false|none)\\b|\\b(?:not|non)[ -]+(?:${pattern})\\b`, "i");
  const positive = new RegExp(`\\b(?:${pattern})\\b`, "i");
  return choice(lines, (line) => negated.test(line) ? false : positive.test(line) ? true : null);
}

export function deriveSpecs(product: Json, sourceUrl: string, fetchedAt: string) {
  const weight = string(object(product.weight).value);
  const materials = text(product.materials);
  const primary = materials.filter((line) => /^\s*(?:main(?: fabric| material)?|shell(?: fabric)?|body(?: fabric)?|face fabric)\s*[:–]/i.test(plain(line)));
  const construction = primary.length ? primary : materials;
  const tags = string(product.subCategory)?.split(/\s*,\s*/).filter(Boolean) ?? [];
  const features = array(product.features).flatMap((entry) => {
    const feature = object(entry);
    const label = string(feature.label);
    const values = text(feature.value);
    return label && values.length ? values.map((value) => `${label}: ${value}`) : values;
  });
  const specsText = [...features, ...materials];
  const featureText = [...tags, ...features];
  const mvtr = numericMatch(/\b(?:breathability(?: rating)?|MVTR)\b[^\d;]{0,24}([\d,]+(?:\.\d+)?)\s*g\s*\/\s*m(?:2|²)\s*(?:\/|per)\s*24\s*h\b/gi, specsText);
  const ret = numericMatch(/\bRET\b[^\d;]{0,24}(\d+(?:\.\d+)?)\s*m(?:2|²)\s*[·⋅* ]?\s*Pa\s*\/\s*W\b/gi, specsText);
  const breathability = mvtr[0] !== null && ret[1] === null ? ["g/m²/24h", mvtr] as const :
    ret[0] !== null && mvtr[1] === null ? ["m²·Pa/W", ret] as const : [null, [null, mvtr[1] ?? ret[1]]] as const;
  const make = (unit: string | null, [value, rawText]: readonly [SpecValue, string | null]): Derived => ({
    value, unit, source: value === null ? "not_published" : "brand", sourceUrl, fetchedAt, rawText,
  });

  const grams = weight?.match(/(?:^|[\s/;(])(\d+(?:\.\d+)?)\s*(kg|g|grams?)(?![\w/])/i);
  const weightValue = grams ? Number(grams[1]) * (grams[2].toLowerCase() === "kg" ? 1000 : 1) : null;
  const membranes = [...construction, ...tags].flatMap((line) => membraneName(plain(line)).map((name) => ({ name, line })));
  // General marketing tags can repeat a more specific material name.
  const names = [...new Set(membranes.map(({ name }) => name))];
  const specific = names.filter((name) => !names.some((other) => other.startsWith(name + " ")));
  const membrane = specific.length === 1 ? specific[0] : null;
  const volumeFromSpecs = numericMatch(/(?:\b(?:pack|total|pack capacity)\s+)?\b(?:volume|capacity)\b[^\d;]{0,20}(\d+(?:\.\d+)?)\s*(?:L|lit(?:er|re)s?)\b/gi, specsText);
  const volume = volumeFromSpecs[0] !== null || volumeFromSpecs[1] !== null ? volumeFromSpecs :
    numericMatch(/(?:^|[\s/;(])(\d+(?:\.\d+)?)\s*(?:L|lit(?:er|re)s?)\b/gi, weight ? [weight] : []);
  const method = breathability[1][0] !== null
    ? breathability[1][1]?.match(/\b(?:ISO\s+11092|JIS\s+L\s+1099(?:\s+[AB]\d?)?|ASTM\s+E96(?:\/E96M)?)\b/i)?.[0] ?? null
    : null;
  const fit = string(product.fit) ?? string(object(product.fit).label);
  const weightSize = weight?.match(/(?:\b(?:size|sz[.])\s*[:=]?\s*)([a-z0-9]+(?:\/[a-z0-9]+)?)(?=\s|[),;]|$)/i)?.[1];

  return {
    weight_g: make("g", [weightValue && weightValue > 0 ? weightValue : null, weight]),
    weight_size: make(null, [weightSize ?? null, weight]),
    layers: make("layers", numericMatch(/\b(2\.5|[23])[-\s]*(?:layers?|L)\b/gi, construction)),
    membrane: make(null, [membrane, membranes.find((entry) => entry.name === membrane)?.line ?? membranes[0]?.line ?? null]),
    face_denier: make("D", numericMatch(/\b(\d+)(?:\s*|[-])(?:denier\b|D\b)/gi, construction)),
    fabric_gsm: make("g/m²", numericMatch(/\b(\d+(?:\.\d+)?)\s*(?:gsm\b|g\s*\/\s*m(?:²|2\b|\^2\b))/gi, construction)),
    centre_back_length_cm: make("cm", numericMatch(/\b(?:garment\s+)?cent(?:re|er)\s+back\s+length\b[^;]*?(\d+(?:\.\d+)?)\s*cm\b/gi, specsText)),
    inseam: make("cm", numericMatch(/\binseam\b[^;]*?(\d+(?:\.\d+)?)\s*cm\b/gi, specsText)),
    pack_volume_l: make("L", volume),
    helmet_hood: make(null, feature(featureText, "helmet[- ]compatible(?:\\s+(?:hood|stormhood))?|(?:hood|stormhood)[^.;]{0,36}compatible with (?:a )?helmet")),
    pit_zips: make(null, feature(featureText, "pit[- ]zip(?:s|pers?)?|underarm (?:zip(?:s|pers?)?|zippered vents?)")),
    recco: make(null, feature(featureText, "RECCO")),
    waterproof_mm: make("mm", numericMatch(/\b(?:hydrostatic head|waterproof(?:ness)? rating)\b[^\d;]{0,24}([\d,]+(?:\.\d+)?)\s*mm\b/gi, specsText)),
    breathability: make(breathability[0], breathability[1]),
    breathability_method: make(null, [method, breathability[1][1]]),
    fit: make(null, [fit, fit]),
  } satisfies Record<string, Derived>;
}

export function scripts(html: string, match: RegExp) {
  return [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)]
    .filter(([, attributes]) => match.test(attributes)).map(([, , content]) => content);
}

function findGroups(value: unknown): Json[] {
  if (Array.isArray(value)) return value.flatMap(findGroups);
  const node = object(value);
  const isGroup = node["@type"] === "ProductGroup" || array(node["@type"]).includes("ProductGroup");
  return [...(isGroup ? [node] : []), ...findNestedGroups(node["@graph"])];
}

function findNestedGroups(value: unknown) {
  return value == null ? [] : findGroups(value);
}

function stock(value: unknown) {
  const state = string(value)?.split("/").at(-1)?.replace(/[\s_-]/g, "").toLowerCase();
  if (state === "instock" || state === "available" || state === "lowstock" || state === "limitedavailability") return true;
  if (state === "outofstock" || state === "soldout" || state === "unavailable" || state === "notavailable") return false;
  if (typeof value === "boolean") return value;
  return null;
}

function productGroups(html: string) {
  return scripts(html, /\btype\s*=\s*["']application\/ld\+json["']/i).flatMap((block) => {
    try { return findGroups(JSON.parse(block)); } catch { return []; }
  });
}

function crossCheckVariants(groups: Json[], raw: Json, prices: Observation[]) {
  const variants = groups.flatMap((group) => array(group.hasVariant).map(object));
  const identifiers = new Map<string, Json>();
  const gtin = (value: unknown) => string(value)?.replace(/^0+(?=\d)/, "");
  for (const variant of variants) {
    for (const id of [string(variant.sku), gtin(variant.gtin14)]) if (id) identifiers.set(id, variant);
  }

  const observations = new Map(prices.map((price) => [price.variant, price]));
  return array(raw.variants).map(object).flatMap((variant) => {
    const id = string(variant.id);
    if (!id) return [];
    const observation = observations.get(id);
    const matched = identifiers.get(id) ?? identifiers.get(gtin(variant.upc) ?? "");
    if (!observation || !matched) return [];
    const offer = object(Array.isArray(matched.offers) ? matched.offers[0] : matched.offers);
    const price = number(offer.price);
    const inStock = stock(offer.availability);
    const discrepancies = [];
    if (price !== null && observation.price !== null && price !== observation.price) discrepancies.push(`${id}: price differs from JSON-LD`);
    if (inStock !== null && observation.inStock !== null && inStock !== observation.inStock) discrepancies.push(`${id}: stock differs from JSON-LD`);
    return discrepancies;
  });
}

function salePrice(record: Json) {
  const regular = number(record.price);
  const discount = number(record.discountPrice);
  return discount !== null && discount > 0 && (regular === null || discount <= regular) ? discount : regular;
}

function verifyLeafPrices(groups: Json[], sku: string, prices: Observation[]) {
  const [group] = groups;
  if (groups.length !== 1 || group.productGroupID !== sku) throw new Error("LEAF product identity differs from JSON-LD");
  const variants = array(group.hasVariant).map(object);
  const offers = new Map(variants.map((variant) => [string(variant.sku), object(variant.offers)]));
  const [parent, ...quoted] = prices;
  const matches = quoted.every(({variant, price, currency}) => {
    const offer = offers.get(variant);
    return price !== null && price > 0 && currency === "USD" && offer?.priceCurrency === currency && number(offer.price) === price;
  });
  if (!quoted.length || variants.length !== offers.size || offers.size !== quoted.length || !matches ||
    !quoted.some(({price, currency}) => price === parent.price && currency === parent.currency)) {
    throw new Error("LEAF prices differ from the published JSON-LD offers");
  }
}

function leafCategory(category: string | null, name: string, tags: string[]) {
  const pants = /\b(?:pants?|bottoms?|bibs?)\b/i.test(name);
  switch (category) {
    case "Accessories":
    case "Apparel Accessories": return "Accessories";
    case "Base Layer": return "Base Layer";
    case "Cold Weather Insulation": return pants ? "Pants" : "Insulated Jackets";
    case "Combat Uniform":
    case "Combat Uniforms": return pants ? "Pants" : "Shirts and Tops";
    case "Mid Layer": return pants ? "Pants"
      : tags.includes("Softshell") ? "Shell Jackets"
      : tags.includes("Synthetic Fill") ? "Insulated Jackets"
      : tags.includes("Fleece") ? "Fleece" : "Professional Use";
    case "Softshell":
    case "Wet Weather Protection": return pants ? "Pants" : "Shell Jackets";
    case "Load Carriage Equipment": return /\b(?:backpack|assault pack)\b/i.test(name) ? "Professional Use" : null;
    default: return null;
  }
}

export function parseArcteryx(html: string, url: string, fetchedAt: string): CatalogProduct {
  const [block] = scripts(html, /\bid\s*=\s*["']__NEXT_DATA__["']/i);
  if (!block) throw new Error("Missing __NEXT_DATA__ script");
  const payload = object(object(object(JSON.parse(block)).props).pageProps).product;
  if (typeof payload !== "string") throw new Error("Expected a JSON-string product payload");
  const raw = object(JSON.parse(payload));
  const leaf = Boolean(arcLeafProductUrl(url));
  const externalId = string(raw.id);
  const name = string(raw.name) ?? string(raw.marketingName);
  if (!externalId || !name) throw new Error("Missing product id or name");

  const sourceCategory = string(raw.categoryEnglish) ?? string(raw.category);
  const subTags = string(raw.subCategory)?.split(/\s*,\s*/).filter(Boolean) ?? [];
  if (leaf) {
    subTags.push("PRO", "LEAF");
    const materials = text(raw.materials).join(" · ");
    const description = plain(string(raw.shortDescription) ?? "");
    if (sourceCategory === "Wet Weather Protection" && /\bGORE[-–— ]TEX\b(?![®™ ]*\s*(?:INFINIUM|WINDSTOPPER))/i.test(materials)) {
      subTags.push("Hardshell");
    }
    if (sourceCategory === "Softshell" || sourceCategory === "Mid Layer" && /\bsoftshell\s+(?:pullover|jacket|anorak)\b/i.test(description)) {
      const fillTag = subTags.indexOf("Synthetic Fill");
      if (fillTag !== -1 && !/\b(?:synthetic insulation|coreloft|climashield)\b/i.test(materials)) subTags.splice(fillTag, 1);
      subTags.push("Softshell");
    } else if (/\b(?:synthetic insulation|coreloft|climashield)\b/i.test(materials)) {
      subTags.push("Synthetic Fill");
    } else if (sourceCategory === "Mid Layer" && /\b(?:midlayer fleece|fleece jacket|fleece fabric)\b/i.test(description + " " + materials)) {
      subTags.push("Fleece");
    }
  }
  const currency = string(raw.currencyCode);
  const variants = array(raw.variants).map(object).flatMap((variant) => {
    const id = string(variant.id);
    return id ? [{variant: id, price: salePrice(variant), currency: string(variant.currencyCode) ?? currency,
      inStock: leaf ? null : stock(variant.stockStatus)}] : [];
  });
  const states = variants.map(({ inStock }) => inStock);
  const inStock = states.includes(true) ? true : states.length && states.every((state) => state === false) ? false : null;
  const prices = [{ variant: "", price: salePrice(raw), currency, inStock }, ...new Map(variants.map((row) => [row.variant, row])).values()];
  const slug = [string(raw.slug) ?? name, externalId].map((value) => normalizedName(value).replace(/ /g, "-")).join("-");
  const category = leaf ? leafCategory(sourceCategory, name, subTags)
    : sourceCategory === "Apparel Accessories" ? "Accessories" : sourceCategory;
  const groups = productGroups(html);
  if (leaf) verifyLeafPrices(groups, externalId, prices);
  return {
    externalId, slug, url, name, category, subTags,
    gender: string(raw.gender),
    analyticsFamily: nameFamily(string(raw.analyticsName) ?? ""),
    isHardshell: /\bhard[ -]?shells?\b/i.test([category, ...subTags].join(" ")),
    specs: deriveSpecs(raw, url, fetchedAt),
    prices, raw, crossCheck: crossCheckVariants(groups, raw, prices), fetchedAt,
  };
}

export function arcSnapshotVariants(raw: Json, url?: string | null) {
  const leaf = Boolean(url && arcLeafProductUrl(url));
  const currency = string(raw.currencyCode);
  const colors = new Map(array(raw.colourOptions).map(object).map((item) => [string(item.id), string(item.label)]));
  const sizes = new Map(array(object(raw.sizeOptions).options).map(object).map((item) => [string(item.id) ?? string(item.value), string(item.label)]));
  return array(raw.variants).map(object).map((item) => {
    const colorId = string(item.colourId);
    const sizeId = string(item.sizeId);
    const color = string(item.colourLabel) ?? colors.get(colorId) ?? colorId;
    const size = string(item.sizeLabel) ?? sizes.get(sizeId) ?? sizeId;
    const unit = string(item.currencyCode) ?? currency;
    const price = priceCents(number(item.price));
    const discount = priceCents(number(item.discountPrice));
    return {
      variantKey: snapshotVariantKey(string(item.id), color, size), color, size, priceCents: price,
      salePriceCents: discount !== null && (price === null || discount < price) ? discount : null,
      currency: unit && /^[A-Z]{3}$/.test(unit) ? unit : null, inStock: leaf ? null : stock(item.stockStatus),
    };
  });
}
