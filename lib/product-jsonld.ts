import {publishedSku} from "./outbound";
import type {ProductDetail} from "./product-view";

type ProductMetadata = Pick<ProductDetail, "name" | "brand" | "image" | "hero" | "modelNumbers" | "msrp" | "currency" | "inStock" | "offerRange">;

function absoluteImage(value: string | null) {
  try {
    const parsed = value && new URL(value);
    return parsed && (parsed.protocol === "https:" || parsed.protocol === "http:") ? parsed.href : undefined;
  } catch {
    return undefined;
  }
}

export function productJsonLd(product: ProductMetadata, url: string) {
  const sku = publishedSku(product.modelNumbers);
  const image = absoluteImage(product.image) ?? absoluteImage(product.hero);
  const priceCurrency = product.currency && /^[A-Z]{3}$/.test(product.currency) ? product.currency : undefined;
  const price = product.msrp !== null && Number.isFinite(product.msrp) && product.msrp > 0 ? product.msrp : undefined;
  const availability = typeof product.inStock === "boolean" ? `https://schema.org/${product.inStock ? "InStock" : "OutOfStock"}` : undefined;
  const offerFields = {url, ...(priceCurrency && {priceCurrency}), ...(availability && {availability})};
  const offers = product.offerRange
    ? {"@type": "AggregateOffer", ...product.offerRange, ...offerFields}
    : price !== undefined || availability ? {"@type": "Offer", ...(price !== undefined && {price}), ...offerFields} : undefined;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    ...(product.brand && {brand: {"@type": "Brand", name: product.brand}}),
    ...(image && {image}),
    ...(sku && {sku}),
    url,
    ...(offers && {offers}),
  };
}

export function serializeJsonLd(value: ReturnType<typeof productJsonLd>) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
