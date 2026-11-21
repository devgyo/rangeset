import {spawnSync} from "node:child_process";
import {readFileSync} from "node:fs";
import {parse} from "csv-parse/sync";
import {mammutPayload} from "../../lib/brands/mammut";
import {countCardValues, selectCardParameters} from "../../lib/parameters/card";
import type {Fiber, Part} from "../../lib/parameters/model";
import {priceCents} from "../../crawler/snapshot-observation";
import {entries, record} from "../../lib/product-view";
import {productFacts, snippet} from "./compare";
import type {AuditProduct, Brand} from "./data";
import type {Issue} from "./report";
import {apparelSize} from "../../lib/brand-sizes";

const sizeOrder = {
  arcteryx: {
    male: [28, 29, 30, 31, 32, 33, 34, 36, 38, 40, 42],
    female: [0, 2, 4, 6, 8, 10, 12, 14, 16],
  },
  mammut: {
    male: [28, 29, 30, 31, 32, 33, 34, 36, 38, 40, 42, 44, 46, 48, 50, 52, 54, 56, 58, 60],
    female: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 32, 34, 36, 38, 40, 42, 44, 46, 48],
  },
};

function sizeRank(value: string, brand: Brand, gender: string | null, pack: boolean) {
  const size = value.trim().toUpperCase();
  if (size === "ONE SIZE" || size === "OS") return 0;
  if (pack && /^\d{1,2}\s*L$/.test(size)) return parseInt(size, 10);
  if (brand === "arcteryx" && /^(?:SHO?RT|SRT|REG(?:ULAR)?|TALL|LONG)$/.test(size)) {
    return /^(?:SH|SRT)/.test(size) ? 0 : size.startsWith("REG") ? 1 : 2;
  }
  const parsed = apparelSize(size);
  if (parsed?.type === "alpha") return brand === "mammut" || !parsed.compound && parsed.base !== "XXXXL" || pack ? parsed.rank : null;
  if (!parsed || pack) return null;
  const ranks = sizeOrder[brand];
  const allowed = gender === "women" ? ranks.female : gender === "men" ? ranks.male : [...ranks.male, ...ranks.female];
  return allowed.includes(parsed.rank) ? parsed.rank : null;
}

const weightRanges: Record<string, [number, number]> = {
  "outer.hardshell": [150, 1200], "outer.softshell": [100, 1300], "outer.windshell": [40, 800],
  "outer.down": [80, 2500], "outer.synthetic": [90, 2500], "outer.insulated_shell": [200, 2500],
  "bottoms.hardshell": [100, 1500], "bottoms.insulated": [120, 2000], "bottoms.softshell": [100, 1200],
  "bottoms.pants": [80, 1200], "bottoms.shorts": [35, 700], tops: [30, 700],
  fleece: [70, 1300], "base.top": [30, 700], "base.bottom": [30, 700],
};
type Buckets = Map<string, {brand: Brand; sku: string}[]>;
function add(bucket: Buckets, value: string, product: AuditProduct) {
  const items = bucket.get(value) ?? [];
  items.push({brand: product.brandSlug, sku: product.sku});
  bucket.set(value, items);
}

export function checkCatalog(products: AuditProduct[]): Issue[] {
  const issues: Issue[] = [];
  const sku = new Map() as Buckets;
  const images = new Map() as Buckets;
  for (const product of products) {
    const issue = (rule: string, detail: unknown) => issues.push({rule, brand: product.brandSlug, sku: product.sku, detail});
    try {
      const {view, facts, variants, arcColors, arcSizes} = productFacts(product);
      const profile = view.parameters!;
      const raw = mammutPayload(product.payload ?? {});
      const pack = raw?.scope === "backpack" || view.productType === "backpack";
      const sizes = product.brandSlug === "arcteryx" ? arcSizes : view.sizes;
      // Arc'teryx variant sizeId is an opaque selector ID, not a chart label.
      const allSizes = new Set(sizes);
      const invalid = [...allSizes].filter((size) => sizeRank(size, product.brandSlug, view.gender, pack) === null);
      if (invalid.length) issue("size_chart", invalid);
      const ranks = sizes.map((size) => sizeRank(size, product.brandSlug, view.gender, pack));
      if (ranks.some((rank, index) => rank !== null && index > 0 && ranks[index - 1] !== null && rank < ranks[index - 1]!)) issue("size_order", sizes);
      const colors = product.brandSlug === "arcteryx" ? arcColors : view.swatches.map(({label}) => label);
      if (!colors.length || colors.some((color) => !color.trim()) || variants.some(({color}) => !color?.trim())) issue("color_empty", colors);
      if (new Set(colors.map((color) => color.trim().toLowerCase())).size !== colors.length) issue("color_duplicate", colors);

      const price = facts.price.value;
      const sale = facts.salePrice.value;
      if (typeof price !== "number" || !Number.isFinite(price) || price <= 0 ||
        product.prices.some(({price}) => price !== null && price <= 0)) issue("nonpositive_price", price);
      const currency = facts.currency.value;
      if (currency !== "USD" || product.prices.some((row) => row.currency !== null && row.currency !== "USD") ||
        variants.some((row) => row.currency !== null && row.currency !== "USD")) issue("region_currency", currency);
      const arc = product.brandSlug === "arcteryx" ? product.payload : null;
      const invalidSales = raw?.variants.filter((v) => v.price !== null && v.originalPrice !== null && v.price > v.originalPrice);
      const invalidArcSales = [arc, ...entries(arc?.variants)].map(record).filter(({price, discountPrice}) =>
        Number(price) > 0 && Number(discountPrice) > Number(price)).map(({id, price, discountPrice}) => ({id, price, discountPrice}));
      if (typeof price === "number" && typeof sale === "number" && sale > price ||
        invalidSales?.length || invalidArcSales.length) issue("sale_above_list", {price, sale, invalidSales, invalidArcSales});
      const snapshots = new Map(product.snapshots.map((row) => [row.variantKey, row]));
      const indexed = new Map(product.prices.map((row) => [row.variant, row]));
      const deltas = variants.flatMap((variant) => {
        const recent = snapshots.get(variant.variantKey);
        const logged = indexed.get(variant.variantKey);
        const currency = logged ? logged.currency : variant.currency;
        if (!recent || recent.currency !== currency || !currency) return [];
        const effective = logged ? priceCents(logged.price) : variant.salePriceCents ?? variant.priceCents;
        const previous = recent.salePriceCents ?? recent.priceCents;
        return effective && previous && Math.abs(effective - previous) / previous > 0.5
          ? [{variant: variant.variantKey, storedCents: effective, snapshotCents: previous, currency}] : [];
      });
      if (deltas.length) issue("price_delta_above_50_percent", deltas);

      const weight = profile.values.weight;
      const leaf = view.taxonomy?.state === "classified" ? view.taxonomy.leaf : "";
      const removableLiner = leaf === "outer.hardshell" &&
        /\b(?:removable|detachable|zip[- ]out)\s+(?:(?:insulated|inner|down|fleece)\s+){0,2}(?:liner|lining|inner jacket)\b/i.test(view.description);
      const [low, high] = removableLiner ? [150, 1800] : weightRanges[leaf] ?? (pack ? [50, 6000] : [25, 3000]);
      if (weight?.state === "known" &&
        (typeof weight.value !== "number" || weight.value < low || weight.value > high || weight.reference?.unit && weight.reference.unit !== "g")) {
        issue("weight_range_or_unit", {value: weight.value, reference: weight.reference, allowedGrams: [low, high]});
      }
      const indexedWeight = product.specs.find(({key}) => key === "weight_g");
      if (indexedWeight?.source === "brand" && indexedWeight.unit !== "g") issue("weight_storage_unit", indexedWeight.unit);
      const materials = profile.values.materials;
      if (materials?.state === "known") {
        const parts = (materials.value as Part[]).flatMap((part) => [part, ...(part.faces ?? []), ...(part.backers ?? [])]);
        for (const part of parts) {
          const composition = part.fields.fiber_content;
          const sum = composition?.state === "known" ? (composition.value as Fiber[]).reduce((total, fiber) => total + fiber.pct, 0) : null;
          if (sum !== null && Math.abs(sum - 100) > 0.00001 || composition?.state === "review") {
            issue("composition_total", {part: part.label, sum, evidence: composition?.evidence.map(({raw}) => raw)});
          }
        }
      }
      const card = selectCardParameters(profile);
      const available = countCardValues(card, profile);
      if (available < 4) issue("missing_card_parameters", {available, card});
      for (const url of new Set([view.image, view.hero, ...view.colorways.flatMap(({photos}) => photos.map(({url}) => url))])) {
        if (url) add(images, url, product);
      }
      add(sku, product.brandSlug + "/" + product.sku, product);
    } catch (error) {
      issue("catalog_normalization", error instanceof Error ? error.message : String(error));
    }
  }
  for (const [rule, bucket] of [["duplicate_sku", sku], ["identical_image_url", images]] as const) {
    for (const [value, products] of bucket) if (products.length > 1) issues.push({rule, detail: {value, products}});
  }
  return issues;
}

export function checkTranslations(): Issue[] {
  const issues: Issue[] = [];
  const checked = spawnSync(process.execPath, ["scripts/i18n-check"], {encoding: "utf8"});
  if (checked.status !== 0) issues.push({rule: "glossary_mismatch", detail: snippet(checked.stderr || checked.error?.message)});
  const glossary = parse(readFileSync("docs/i18n/glossary.csv", "utf8"), {
    columns: true, bom: true, skip_empty_lines: true,
  }) as Array<Record<string, string>>;
  for (const row of glossary) {
    // Proper names and protected terms intentionally stay as authored. The pre-existing
    // Japanese help fallback is tracked by i18n-check, outside translated catalog labels.
    const autonym = row.key === "language.en";
    const abbreviation = row.key.startsWith("help_label.") && /^[A-Z]{2,}$/.test(row.en);
    if (row["不翻标记"] || row.key.startsWith("help.") || autonym || abbreviation) continue;
    for (const locale of ["zh", "ja"]) {
      if (/^[a-z][a-z -]+$/i.test(row.en) && row[locale]?.trim() === row.en.trim()) {
        issues.push({rule: "english_translation_residue", detail: {locale, key: row.key, value: row[locale]}});
      }
    }
  }
  return issues;
}
