import {categoryOrder, categorySpecs, productFamily} from "../arcteryx-view";
import {colorwaysOf, entries, featuresOf, plainText, record, safeImage, swatchesOf, textList} from "../product-view";
import {normalizeArcProduct} from "../parameters/arcteryx";
import {arcTaxonomy} from "./arcteryx-taxonomy";
import type {BrandAdapter} from "./types";

const allowedCategories = new Set(categoryOrder);

export const arcAdapter: BrandAdapter = {
  accepts(product, {raw = {}, overrides}) {
    return allowedCategories.has(product.category ?? "") && !arcTaxonomy(product, raw, overrides).hidden;
  },
  fields(product, raw, detail) {
    const colors = entries(raw.colourOptions);
    const materials = textList(raw.materials);
    const features = featuresOf(raw.features);
    const veilance = raw.veilance === true || entries(raw.breadcrumbs).map(record).some(({label, url}) =>
      plainText(label).toLowerCase() === "veilance" || (typeof url === "string" && /(?:^|\/)veilance(?:\/|$)/i.test(url)));
    return {
      family: productFamily(product.name), veilance, publishedPrice: raw.price, publishedCurrency: raw.currencyCode, unisex: raw.isUnisex,
      series: [...(veilance ? ["Veilance"] : []), ...(product.category === "Professional Use" || raw.isPro === true ? ["PRO"] : []),
        ...(/\bwalk gently\b/i.test(product.name) ? ["Walk Gently"] : []), ...(/\bsystem[_ ]a\b/i.test(product.name) ? ["System_A"] : [])],
      modelNumbers: product.slug.match(/-(\d{4})-(x\d+)$/i)?.slice(1) ?? [],
      image: safeImage(raw.image ?? record(record(colors[0]).image).url),
      hero: safeImage(record(raw.mainImage).url), swatches: swatchesOf(colors),
      summary: plainText(raw.shortDescription), description: detail ? plainText(raw.description) : "",
      materials: detail ? materials : [], features: detail ? features : [],
      facility: plainText(record(raw.manufacturingFacility).label),
      year: /^\d{4}$/.test(String(raw.origYear)) ? Number(raw.origYear) : null, season: plainText(raw.origSeason),
      sizes: entries(record(raw.sizeOptions).options).map((option) => plainText(record(option).label)).filter(Boolean),
      colorways: detail ? colorwaysOf(colors) : [], activities: textList(raw.activities),
      specs: categorySpecs(product.category, materials, features, product.verifiedAt),
    };
  },
  parameters: normalizeArcProduct,
  taxonomy: arcTaxonomy,
};
