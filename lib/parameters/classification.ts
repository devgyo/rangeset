import { plainText, record, type ProductDetail } from "../arcteryx-view";
import { known, missing, type Evidence, type Parameter } from "./model";
import { productTypes, protectionTypes, type ProductKind } from "./registry";

// Legacy type codes are recognized at the catalog boundary so stored shoe records can stay intact.
const footwearTypes = {shoe: "Shoe", boot: "Boot", sandal: "Sandal", mule: "Mule"} as const;
const classificationTypes = {...productTypes, ...footwearTypes};
type Style = keyof typeof classificationTypes;
type Shell = keyof typeof protectionTypes;
type Subject = Pick<ProductDetail, "name" | "category" | "subTags" | "isHardshell" | "url" | "verifiedAt" | "example">;
type StyleSubject = Pick<Subject, "name" | "category"> & {subTags?: string[]};
type Input = { raw?: Record<string, unknown>; fetchedAt?: string | null; overrides?: Map<string, unknown> };
export type Classification = { productType: Parameter; protectionType: Parameter; kind: ProductKind };

const namePatterns: [Style, RegExp][] = [
  ["base_layer_bottom", /\bbase[ -]layer bottoms?\b/i], ["base_layer_top", /\bbase[ -]layer tops?\b/i],
  ["backpack", /\bbackpacks?\b/i], ["bib_pants", /\bbibs?(?: pants?)?\b/i],
  ["t_shirt", /\b(?:t[ -]?shirts?|tees?|crew[ -]neck shirts?)\b/i],
  ["halter_top", /\bhalters?(?: tops?)?\b/i], ["cardigan", /\bcardigans?\b/i], ["blazer", /\bblazers?\b/i],
  ["bomber", /\bbombers?(?: jackets?)?\b/i],
  ["tank_top", /\b(?:tank(?: tops?)?|singlets?)\b/i], ["overshirt", /\bovershirts?\b/i], ["polo", /\bpolo(?: shirts?)?\b/i],
  ["sweatshirt", /\bsweatshirts?\b/i], ["sweater", /\bsweaters?\b/i],
  ["hoodie", /\b(?:hoodies?|hoodys?|hooded (?:pullovers?|sweatshirts?))\b/i], ["pullover", /\bpullovers?\b/i],
  ["anorak", /\banoraks?\b/i], ["parka", /\bparkas?\b/i], ["jacket", /\bjackets?\b/i], ["vest", /\bvests?\b/i], ["coat", /\bcoats?\b/i],
  ["tights", /\b(?:tights?|leggings?)\b/i], ["pants", /\b(?:pants?|trousers?)\b/i], ["shorts", /\bshorts(?:\b|$)/i],
  ["dress", /\b(?:dress|dresses)\b/i], ["skirt", /\bskirts?\b/i], ["skort", /\bskorts?\b/i],
  ["boot", /\bboots?\b/i], ["shoe", /\b(?:shoes?|sneakers?)\b/i], ["sandal", /\bsandals?\b/i], ["mule", /\bmules?\b/i],
  ["shirt", /\bshirts?\b/i], ["zip_top", /\bzip[ -]neck\b/i], ["crewneck", /\bcrew(?:[ -]neck)?$/i], ["suit", /\b(?:suits?|coveralls?)\b/i], ["mitten", /\b(?:mitts?|mittens?)\b/i],
  ["glove", /\bgloves?\b/i], ["beanie", /\bbeanies?\b/i], ["cap", /\bcaps?\b/i], ["hat", /\bhats?\b/i],
];

const exactStyles = new Map<string, Style>(Object.entries(classificationTypes).map(([key, label]) => [label.toLowerCase(), key as Style]));
function explicitStyle(text: string): Style | undefined {
  return exactStyles.get(text) ?? namePatterns.find(([, pattern]) => pattern.test(text) &&
    !text.includes(" and ") && !text.includes(" or ") && !text.includes("/"))?.[0];
}

function garmentStyle(product: StyleSubject, raw: Record<string, unknown>, tags: string[]): Style | undefined {
  const category = (product.category ?? "").toLowerCase();
  const name = product.name;
  const marketing = plainText(raw.marketingName);
  const text = [name, marketing].join(" ");
  if (category === "base layer" || /^base layer$/i.test(plainText(raw.category))) {
    if (tags.some((tag) => /^base layer bottoms?$/i.test(tag)) || /\b(?:bottoms?|pants?|tights?|leggings?)\b/i.test(text)) return "base_layer_bottom";
    if (tags.some((tag) => /^base layer tops?$/i.test(tag)) ||
      /\b(?:tops?|crew(?: neck)?|shirts?|hood(?:ie|y)|zip neck|henley)\b/i.test(text)) return "base_layer_top";
  }
  const declared = plainText(raw.productType).toLowerCase();
  const byName = (value: string) => namePatterns.find(([, pattern]) => pattern.test(value))?.[0];
  const style = byName(name) ?? byName(marketing);
  if (style && (style !== "shirt" || !tags.some((tag) => /^t[ -]?shirts?$/i.test(tag)))) return style;
  if (style === "shirt") return "t_shirt";
  if (declared) {
    const explicit = explicitStyle(declared);
    if (explicit) return explicit;
  }
  if (category === "pants" || category === "shorts") return category;
  const rawCategory = plainText(raw.category).toLowerCase();
  const concreteCategory = exactStyles.get(category) ?? exactStyles.get(rawCategory);
  if (concreteCategory) return concreteCategory;
  const candidates = [...new Set(tags.flatMap((tag) => {
    // A style tag is a whole label. Feature tags such as Leg Zippers are not styles.
    const key = exactStyles.get(tag.toLowerCase().replace(/(?<!pant|short)s$/, ""));
    return key ? [key] : [];
  }))];
  if (candidates.length === 1) return candidates[0];
  return undefined;
}

export function isFootwearProduct(product: StyleSubject, {raw = {}, overrides}: Input = {}) {
  if (product.category?.trim().toLowerCase() === "footwear") return true;
  const manual = overrideCode(overrides?.get("parameters.product_type"));
  const tags = [...(product.subTags ?? []), ...plainText(raw.subCategory).split(",").map((tag) => tag.trim()).filter(Boolean)];
  const style = typeof manual === "string" && Object.hasOwn(classificationTypes, manual) ? manual : garmentStyle(product, raw, tags);
  return style !== undefined && Object.hasOwn(footwearTypes, style);
}

const protectiveStyles: Style[] = ["jacket", "coat", "parka", "vest", "anorak", "hoodie", "pants", "bib_pants", "suit", "bomber", "blazer"];
function shellType(product: Subject, style: Style | undefined, raw: Record<string, unknown>, tags: string[]): Shell | "unpublished" | "inapplicable" {
  if (style && !protectiveStyles.includes(style)) return "inapplicable";
  if (!style && !["Shell Jackets", "Insulated Jackets", "Pants", "Professional Use"].includes(product.category ?? "")) return "inapplicable";
  const description = [product.name, plainText(raw.marketingName), ...tags].join(" · ");
  const insulated = /\binsulated shell\b/i.test(description);
  const hard = product.isHardshell || /\bhard[ -]?shell\b/i.test(description);
  if (insulated || (hard && product.category === "Insulated Jackets")) return "insulated_shell";
  if (hard) return "hard_shell";
  if (/\bsoft[ -]?shell\b/i.test(description)) return "soft_shell";
  if (/\bwind[ -]?shell\b/i.test(description)) return "wind_shell";
  return /\bshell (?:jacket|pant|vest)\b|\bwaterproof\b|\bwindproof\b/i.test(description) ? "unpublished" : "inapplicable";
}

function overrideCode(value: unknown) {
  return typeof value === "string" ? value : record(value).value;
}

function manualParameter(value: unknown, key: string, options: Record<string, string>, url: string | null): Parameter {
  const code = overrideCode(value);
  const item = record(value);
  const evidence: Evidence[] = [{
    url, path: "manual_overrides." + key, raw: JSON.stringify(value) ?? "", method: "manual",
    updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : null,
  }];
  if (typeof code === "string" && Object.hasOwn(options, code)) return known(code, evidence);
  return { state: "review", evidence, note: "Manual value does not match the field definition." };
}

export function classifyArcProduct(product: Subject, { raw = {}, fetchedAt, overrides = new Map() }: Input = {}): Classification {
  const tags = [...product.subTags, ...plainText(raw.subCategory).split(",").map((tag) => tag.trim()).filter(Boolean)];
  const style = garmentStyle(product, raw, tags);
  const shell = shellType(product, style, raw, tags);
  const evidence: Evidence[] = [{
    url: product.url, path: "product.name / marketingName / productType / category / subCategory",
    raw: JSON.stringify({ name: product.name, marketingName: raw.marketingName, productType: raw.productType,
      category: product.category, rawCategory: raw.category, subTags: product.subTags, subCategory: raw.subCategory, isHardshell: product.isHardshell }),
    method: product.example ? "example" : "parsed", updatedAt: fetchedAt ?? product.verifiedAt,
  }];

  const styleKey = "parameters.product_type";
  const shellKey = "parameters.protection_type";
  const styleOverride = overrideCode(overrides.get(styleKey));
  const legacyShell = typeof styleOverride === "string" && Object.hasOwn(protectionTypes, styleOverride);
  const productType = overrides.has(styleKey) && !legacyShell ? manualParameter(overrides.get(styleKey), styleKey, productTypes, product.url)
    : style && Object.hasOwn(productTypes, style) ? known(style, evidence) : { ...missing("review"), evidence };
  const effectiveStyle = productType.state === "known" ? productType.value as Style : style;

  let protectionType: Parameter;
  if (effectiveStyle && !protectiveStyles.includes(effectiveStyle)) protectionType = missing("inapplicable");
  else if (overrides.has(shellKey)) {
    protectionType = overrides.get(shellKey) === null ? missing("unpublished") : manualParameter(overrides.get(shellKey), shellKey, protectionTypes, product.url);
  } else if (legacyShell) protectionType = manualParameter(overrides.get(styleKey), styleKey, protectionTypes, product.url);
  else if (shell === "unpublished" || shell === "inapplicable") protectionType = { ...missing(shell), evidence };
  else protectionType = known(shell, evidence);

  if (!effectiveStyle && !["Shell Jackets", "Insulated Jackets", "Pants", "Professional Use"].includes(product.category ?? "")) {
    protectionType = missing("inapplicable");
  }
  const normalizedShell = protectionType.state === "known" ? protectionType.value : undefined;
  const kind: ProductKind = (["pants", "bib_pants", "shorts", "tights", "base_layer_bottom"].some((type) => type === effectiveStyle) || product.category === "Pants") ? "pants"
    : normalizedShell === "hard_shell" || normalizedShell === "soft_shell" || normalizedShell === "wind_shell" ? normalizedShell
    : normalizedShell === "insulated_shell" || product.category === "Insulated Jackets" ? "insulated"
    : effectiveStyle === "coat" || effectiveStyle === "parka" ? "coat"
    : effectiveStyle && Object.hasOwn(productTypes, effectiveStyle) && !["backpack", "hat", "cap", "beanie", "mitten", "glove"].includes(effectiveStyle) ? "top"
    : "other";

  return { productType, protectionType, kind };
}

export function classificationFilterValue(parameter: Parameter) {
  return parameter.state === "known" ? String(parameter.value) : parameter.state;
}
