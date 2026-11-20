import type {CatalogCard, ProductDetail} from "../product-view";
import type {TaxonomyEvidence} from "../taxonomy";
import type {Profile} from "../parameters/model";

export type IndexedSpec = {key: string; value: unknown; unit: string | null; source: string; fetchedAt: string; sourceUrl?: string; rawText?: string | null};
export type BrandInput = {raw?: Record<string, unknown>; fetchedAt?: string | null; indexed?: IndexedSpec[]; overrides?: Map<string, unknown>};

export type BrandFields = Pick<ProductDetail, "family" | "veilance" | "image" | "hero" | "swatches" |
  "summary" | "description" | "materials" | "features" | "facility" | "year" | "season" | "sizes" |
  "colorways" | "activities" | "modelNumbers" | "series" | "salePrice"> & {specs: CatalogCard["specs"]; publishedPrice?: unknown; publishedCurrency?: unknown; unisex?: unknown; styleFamily?: string | null};

export type BrandAdapter = {
  accepts: (product: Pick<ProductDetail, "name" | "category" | "subTags">, input: BrandInput) => boolean;
  fields: (product: Pick<ProductDetail, "name" | "slug" | "category" | "verifiedAt">, raw: Record<string, unknown>, detail: boolean) => BrandFields;
  parameters: (product: ProductDetail, input?: BrandInput) => Profile;
  taxonomy: (product: Pick<ProductDetail, "name" | "category" | "subTags">, raw: Record<string, unknown>, overrides?: Map<string, unknown>) => TaxonomyEvidence;
};
