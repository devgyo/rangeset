import { decode } from "html-entities";
import type {TaxonomyResult} from "./taxonomy";
import { formatMoney, type Profile } from "./parameters/model";

export const unpublished = "Not published";
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
  taxonomy?: TaxonomyResult; modelNumbers?: string[]; series?: string[]; brandSlug?: string; salePrice?: number | null;
  productType?: string; protectionType?: string; currency?: string | null;
};
export type Photo = { url: string; label: string; height: string; size: string };
export type Colorway = ColorSwatch & { photos: Photo[] };
export type ProductDetail = CatalogCard & {
  url: string | null; verifiedAt: string | null; description: string; materials: string[];
  features: { label: string; values: string[] }[];
  facility: string; year: number | null; season: string; sizes: string[]; colorways: Colorway[]; parameters?: Profile;
  offerRange?: {lowPrice: number; highPrice: number; offerCount: number};
};

export function plainText(value: unknown): string {
  if (typeof value !== "string") return "";
  const stripped = value
    .replace(/<!--[\s\S]*?(?:-->|$)/g, "")
    .replace(/<\s*(script|style|template)\b[^>]*>[\s\S]*?(?:<\/\s*\1\s*>|$)/gi, "")
    .replace(/<\/?[a-z][\w:-]*(?:\s+(?:"[^"]*"|'[^']*'|[^'"<>])*)?\s*\/?>/gi, " ");
  return decode(stripped).replace(/[\s\u00a0]+/g, " ").trim();
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
    return ["https://images.arcteryx.com", "https://static.mammut.com"].includes(url.origin) && !url.username && !url.password ? url.href : null;
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

export const formatPrice = (value: number | null, currency: string | null = "USD") => value === null ? unpublished : formatMoney(value, currency);

export function normalizedValue(value: Scalar | readonly string[] | null): string {
  const normalize = (text: string) => text.normalize("NFKC").toLowerCase().replace(/[®™]/g, "").replace(/\s+/g, " ").trim();
  if (Array.isArray(value)) return JSON.stringify([...new Set(value.map(normalize))].sort());
  if (typeof value === "string") return JSON.stringify(normalize(value));
  return JSON.stringify(value);
}
