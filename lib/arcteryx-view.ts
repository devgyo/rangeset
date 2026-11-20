import { decode } from "html-entities";
import { formatMoney, type Profile } from "./parameters/model";

export const unpublished = "Not published";
export const categoryOrder = [
  "Shell Jackets", "Insulated Jackets", "Pants", "Fleece", "Shirts and Tops",
  "Footwear", "Base Layer", "Professional Use", "Shorts", "Dresses and Skirts",
];
export const featuredFamilies = ["Beta", "Alpha", "Atom", "Gamma", "Norvan"];
const families = new Map([
  ...featuredFamilies, "Cerium", "Proton", "Kragg", "Konseal", "Rho", "Kyanite", "Delta",
  "Covert", "Sentinel", "Sabre", "Vertex", "Cormac", "Satoro", "Squamish", "Nuclei",
  "Thorium", "Rush", "Aerios", "Incendo", "Sylan", "Motus", "Essent", "Lana",
].map((name) => [name.toLowerCase(), name]));

export type Gender = "men" | "women" | "unisex";
export type ColorSwatch = { label: string; hex: string | null };
type Scalar = number | string | boolean;
export type CatalogSpec = { value: Scalar; unit: string | null; source: "brand" | "manual" | "third_party"; date: string | null };
export type CatalogCard = {
  slug: string; name: string; brand: string; category: string | null; gender: Gender | null;
  family: string | null; subTags: string[]; veilance: boolean; isHardshell: boolean;
  status: "active" | "discontinued" | "pending_review"; example?: boolean;
  image: string | null; hero: string | null; swatches: ColorSwatch[];
  activities: string[]; summary: string; msrp: number | null; inStock: boolean | null;
  specs: Record<string, CatalogSpec | undefined>;
  productType?: string; protectionType?: string; currency?: string | null;
};
export type Photo = { url: string; label: string; height: string; size: string };
export type Colorway = ColorSwatch & { photos: Photo[] };
export type ProductDetail = CatalogCard & {
  url: string | null; verifiedAt: string | null; description: string; materials: string[];
  features: { label: string; values: string[] }[];
  facility: string; year: number | null; season: string; sizes: string[]; colorways: Colorway[]; parameters?: Profile;
};

export function plainText(value: unknown): string {
  if (typeof value !== "string") return "";
  const stripped = value
    .replace(/<!--[\s\S]*?(?:-->|$)/g, "")
    .replace(/<\s*(script|style|template)\b[^>]*>[\s\S]*?(?:<\/\s*\1\s*>|$)/gi, "")
    .replace(/<\/?[a-z][\w:-]*(?:\s+(?:"[^"]*"|'[^']*'|[^'"<>])*)?\s*\/?>/gi, " ");
  return decode(stripped).replace(/[\s\u00a0]+/g, " ").trim();
}

export function productFamily(name: string) {
  const prefix = name.trim().match(/^[a-z]+(?=$|[\s-])/i)?.[0];
  return (prefix && families.get(prefix.toLowerCase())) || null;
}

export function productGender(value: unknown, isUnisex?: unknown): Gender | null {
  if (isUnisex === true) return "unisex";
  const normalized = plainText(value).toLowerCase().replace(/['’]s$/, "");
  if (["men", "man", "male", "mens"].includes(normalized)) return "men";
  if (["women", "woman", "female", "womens"].includes(normalized)) return "women";
  return normalized === "unisex" ? normalized : null;
}

export const genderLabel = (gender: Gender | null) =>
  gender === "men" ? "Men’s" : gender === "women" ? "Women’s" : gender === "unisex" ? "Unisex" : unpublished;

export const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
export const entries = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
export const textList = (value: unknown): string[] => entries(value).map(plainText).filter(Boolean);

export function safeImage(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.origin === "https://images.arcteryx.com" && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

export function featuresOf(value: unknown) {
  return entries(value).map(record).flatMap((group) => {
    const label = plainText(group.label);
    const values = textList(group.value);
    return label && values.length ? [{ label, values }] : [];
  });
}

export function swatchesOf(value: unknown): ColorSwatch[] {
  return entries(value).map(record).flatMap((item) => {
    const label = plainText(item.label);
    const hex = typeof item.hexCode === "string" && /^#?[\da-f]{6}$/i.test(item.hexCode)
      ? "#" + item.hexCode.replace(/^#/, "") : null;
    return label ? [{ label, hex }] : [];
  });
}

export function colorwaysOf(value: unknown): Colorway[] {
  return entries(value).map(record).flatMap((color) => {
    const [swatch] = swatchesOf([color]);
    if (!swatch) return [];
    const photos: Photo[] = [];
    const add = (img: unknown, label: string, talent?: unknown, wearing?: unknown) => {
      const image = record(img);
      const url = safeImage(image.url);
      if (!url || photos.some((photo) => photo.url === url)) return;
      photos.push({ url, label: plainText(image.alt ?? image.label) || label,
        height: plainText(record(talent).height), size: plainText(record(wearing).size) });
    };
    add(color.image, swatch.label);
    for (const asset of entries(color.imageAssets).map(record)) add(asset.image, swatch.label, asset.talent, asset.wearingSize);
    add(record(color.heroImage).image, swatch.label);
    return [{ ...swatch, photos }];
  });
}

const derivedSpec = (value: Scalar, unit: string | null, date: string | null): CatalogSpec =>
  ({ value, unit, source: "brand", date });

export function categorySpecs(
  category: string | null, materials: string[], features: ReturnType<typeof featuresOf>,
  date: string | null, shellText: string,
) {
  const specs: CatalogCard["specs"] = {};
  if (category === "Footwear") {
    const geometry = features.filter(({ label }) => /geometry/i.test(label)).flatMap(({ values }) => values);
    const outsole = features.filter(({ label }) => /outsole/i.test(label)).flatMap(({ values }) => values);
    const lines = geometry.join(" ");
    const drop = lines.match(/\bdrop(?:\s*\(stack\))?\s*[:–-]?\s*(\d+(?:\.\d+)?)\s*mm\b/i);
    const stack = lines.match(/\bstack(?:\s+height)?\s*[:–-]?\s*(\d+(?:\.\d+)?)\s*mm(?:\s*[:/×-]\s*(\d+(?:\.\d+)?)\s*mm)?\b/i)
      ?? lines.match(/\bdrop\s*\(stack\)\s*:\s*\d+(?:\.\d+)?\s*mm\s*\(\s*(\d+(?:\.\d+)?)\s*mm\s*[:/]\s*(\d+(?:\.\d+)?)\s*mm/i);
    const lugs = lines.match(/\b(\d+(?:\.\d+)?)\s*mm\s*(?:deep\s+)?lugs?\b/i)
      ?? lines.match(/\blug depth\s*[:–-]?\s*(\d+(?:\.\d+)?)\s*mm\b/i);
    const branded = outsole.join(" ").match(/\bVibram(?:[®™])?(?:\s+([\w -]+?))?(?=\s+outsole\b|[.,;]|$)/i);
    if (drop) specs.drop = derivedSpec(Number(drop[1]), "mm", date);
    if (stack) specs.stack = derivedSpec(stack[2] ? `${stack[1]} / ${stack[2]}` : Number(stack[1]), "mm", date);
    if (lugs) specs.lugs = derivedSpec(Number(lugs[1]), "mm", date);
    if (branded) specs.outsole = derivedSpec(branded[1] ? `Vibram ${branded[1].trim()}` : "Vibram", null, date);
    else if (outsole[0]) specs.outsole = derivedSpec(outsole[0], null, date);
    if (/\b(?:GTX|GORE[ -]TEX)\b/i.test(shellText)) specs.shoe_waterproof = derivedSpec("GORE-TEX", null, date);
    else if (/\bwaterproof\b/i.test(shellText) && !/\b(?:non[ -]|not\s+)waterproof\b/i.test(shellText)) {
      specs.shoe_waterproof = derivedSpec("Waterproof", null, date);
    }
  }
  if (category === "Insulated Jackets") {
    const lines = [...materials, ...features.filter(({ label }) => /insulation|construction/i.test(label)).flatMap(({ values }) => values)];
    const insulation = new Set<string>();
    for (const line of lines) {
      const fill = line.match(/\b(\d{3,4})\s*(?:fill(?:\s+power)?|FP)\b/i);
      if (/\bdown\b/i.test(line) && (fill || /\bdown insulation\b|\b(?:goose|duck) down\b/i.test(line))) {
        insulation.add(fill ? `Down · ${fill[1]} fill` : "Down");
      }
      const synthetic = line.match(/\b(Coreloft|PrimaLoft|Octa|Climashield|POLARTEC\s+Alpha)\b/i)?.[0];
      if (synthetic) insulation.add(synthetic);
      else if (/\bsynthetic insulation\b/i.test(line)) insulation.add("Synthetic");
    }
    if ([...insulation].some((entry) => entry.startsWith("Down ·"))) insulation.delete("Down");
    if (insulation.size > 1 && [...insulation].some((entry) => !/^(?:Down|Synthetic)/.test(entry))) insulation.delete("Synthetic");
    if (insulation.size) specs.insulation = derivedSpec([...insulation].join(" + "), null, date);
  }
  return specs;
}

const numberFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
export const formatPrice = (value: number | null, currency: string | null = "USD") => value === null ? unpublished : formatMoney(value, currency);
export function formatMetric(spec?: CatalogSpec) {
  if (!spec) return unpublished;
  const value = typeof spec.value === "number" ? numberFormat.format(spec.value)
    : typeof spec.value === "boolean" ? (spec.value ? "Yes" : "No") : spec.value;
  return spec.unit === "layers" ? `${value}L` : spec.unit ? `${value} ${spec.unit}` : value;
}

export const metricLabels: Record<string, string> = {
  weight_g: "Weight", membrane: "Membrane", layers: "Layers", face_denier: "Face denier",
  fabric_gsm: "Fabric weight", fit: "Fit", helmet_hood: "Helmet-compatible hood", pit_zips: "Pit zips",
  recco: "RECCO", centre_back_length_cm: "Centre back length", inseam: "Inseam",
  drop: "Drop", stack: "Stack", lugs: "Lug depth", outsole: "Outsole", shoe_waterproof: "Waterproof",
  insulation: "Insulation", waterproof_mm: "Hydrostatic head", breathability: "Breathability",
  weight_size: "Weight reference size",
};

export function keyMetrics(product: CatalogCard, detail = false): string[] {
  switch (product.category) {
    case "Shell Jackets":
    case "Professional Use":
      return detail ? ["weight_g", "membrane", "layers", "face_denier", "fit"] : ["weight_g", "membrane", "layers", "face_denier"];
    case "Insulated Jackets":
      return detail ? ["weight_g", "insulation", "membrane", "fit"] : ["weight_g", product.specs.insulation ? "insulation" : "membrane", "fit"];
    case "Pants":
    case "Shorts":
      return detail ? ["weight_g", "inseam", "fit", "fabric_gsm"] : ["weight_g", "inseam", "fit"];
    case "Footwear":
      return detail ? ["weight_g", "shoe_waterproof", "drop", "stack", "lugs", "outsole"]
        : ["weight_g", "shoe_waterproof", product.specs.drop ? "drop" : "lugs"];
    default:
      return detail ? ["weight_g", "fabric_gsm", "fit", "centre_back_length_cm"] : ["weight_g", "fabric_gsm", "fit"];
  }
}

export function applicableMetric(key: string, category: string | null) {
  if (["drop", "stack", "lugs", "outsole", "shoe_waterproof"].includes(key)) return category === "Footwear";
  if (key === "inseam") return category === "Pants" || category === "Shorts";
  if (key === "insulation") return category === "Insulated Jackets";
  if (key === "centre_back_length_cm") return Boolean(category && !["Footwear", "Pants", "Shorts"].includes(category));
  if (["helmet_hood", "pit_zips"].includes(key)) return ["Shell Jackets", "Insulated Jackets", "Fleece", "Professional Use"].includes(category ?? "");
  if (["layers", "face_denier", "fabric_gsm", "recco", "fit"].includes(key)) return category !== "Footwear";
  return true;
}

export function categoryCounts(products: { category: string | null }[]) {
  const counts = new Map<string, number>();
  for (const { category } of products) if (category) counts.set(category, (counts.get(category) ?? 0) + 1);
  return [...categoryOrder, ...[...counts.keys()].filter((label) => !categoryOrder.includes(label)).sort()]
    .flatMap((label) => counts.has(label) ? [{ label, count: counts.get(label)! }] : []);
}

export function matchesProduct(product: Pick<CatalogCard, "name" | "family" | "subTags" | "specs" | "gender">, query: string) {
  const text = [product.name, product.family, product.gender, ...product.subTags, product.specs.membrane?.value].join(" ").toLowerCase();
  return query.trim().toLowerCase().split(/\s+/).every((token) => text.includes(token));
}

export function normalizedValue(value: Scalar | readonly string[] | null): string {
  const normalize = (text: string) => text.normalize("NFKC").toLowerCase().replace(/[®™]/g, "").replace(/\s+/g, " ").trim();
  if (Array.isArray(value)) return JSON.stringify([...new Set(value.map(normalize))].sort());
  if (typeof value === "string") return JSON.stringify(normalize(value));
  return JSON.stringify(value);
}
