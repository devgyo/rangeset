import {createHash} from "node:crypto";
import {arcSnapshotVariants} from "../../crawler/adapters/arcteryx";
import {priceCents} from "../../crawler/snapshot-observation";
import {mammutPayload} from "../../lib/brands/mammut";
import {cardOnly, toView} from "../../lib/catalog/product";
import {entries, plainText, record} from "../../lib/product-view";
import type {Part} from "../../lib/parameters/model";
import type {AuditProduct, Snapshot} from "./data";

export const fields = ["name", "sku", "productLine", "colors", "sizes", "variantStock",
  "price", "salePrice", "currency", "variantPrices", "mainFabric", "materials", "composition", "weight", "fit"] as const;
export type Field = typeof fields[number];
export type Fact = {value: unknown; evidence?: string; variantEvidence?: Map<string, string>; reason?: string; confirmedAbsence?: boolean};
export type Facts = Record<Exclude<Field, "variantStock">, Fact>;
export type Result = {field: Field; status: "match" | "mismatch" | "unverifiable"; stored?: unknown; official?: unknown;
  evidence?: string; url?: string | null; reason?: string;
  stockVariants?: {comparable: number; mismatch: number};
  stockWindow?: {officialFetchedAt: string; snapshotCapturedAt: string[]};
};

const day = new Intl.DateTimeFormat("sv-SE", {timeZone: "Asia/Shanghai"});
const sixHours = 6 * 60 * 60 * 1000;

export function sample(products: AuditProduct[], date: string, full: boolean) {
  if (full) return products;
  const desired = Math.max(40, Math.ceil(products.length * 0.05));
  const groups = [...Map.groupBy(products, ({brandSlug}) => brandSlug).entries()].map(([brand, items]) => {
    const exact = desired * items.length / products.length;
    return {brand, items, quota: Math.floor(exact), remainder: exact % 1};
  }).sort((a, b) => b.remainder - a.remainder || a.brand.localeCompare(b.brand));
  const spare = desired - groups.reduce((total, group) => total + group.quota, 0);
  const hash = (id: number | string) => createHash("sha256").update(`${date}/${id}`).digest("hex");
  return groups.flatMap(({items, quota}, index) => {
    const recent = items.filter(({recent}) => recent);
    const ranked = items.filter(({recent}) => !recent).map((item) => ({item, rank: hash(item.id ?? item.sku)}))
      .sort((a, b) => a.rank.localeCompare(b.rank));
    return [...recent, ...ranked.slice(0, Math.max(0, quota + Number(index < spare) - recent.length)).map(({item}) => item)];
  });
}

export function variantsOf(product: AuditProduct) {
  const raw = product.payload ?? {};
  if (product.brandSlug === "arcteryx") return arcSnapshotVariants(raw, product.url);
  return (mammutPayload(raw)?.variants ?? []).map(({id, color, size, inStock, price, originalPrice, currency}) => ({
    variantKey: id, color, size, inStock: inStock ?? null, currency: currency ?? null, priceCents: priceCents(originalPrice ?? price),
    salePriceCents: price !== null && originalPrice !== null && price < originalPrice ? priceCents(price) : null,
  }));
}

export const snippet = (value: unknown) => typeof value === "string" ? value.slice(0, 1200) : JSON.stringify(value)?.slice(0, 1200);
const fact = (value: unknown, raw?: unknown): Fact => ({value, evidence: snippet(raw)});

export function productFacts(product: AuditProduct) {
  const view = toView(product, product.specs, product.prices, true);
  const card = cardOnly(view).card;
  const raw = product.payload ?? {};
  const mammut = mammutPayload(raw);
  const variants = variantsOf(product);
  const arcIds = new Map(entries(raw.variants).map(record).map(({id, colourId, sizeId}) =>
    [id, [plainText(colourId), plainText(sizeId)]] as const));
  const byId = new Map(product.prices.map((row) => [row.variant, row]));
  const key = ({variantKey, color, size}: typeof variants[number]) => {
    const ids = product.brandSlug === "arcteryx" ? arcIds.get(variantKey) : undefined;
    return JSON.stringify(ids?.every(Boolean) ? ids : [color, size]);
  };
  const variantPrices = variants.filter((row) => row.color && row.size)
    .map((row) => {
      const indexed = byId.get(row.variantKey);
      return [key(row), indexed ? indexed.currency : row.currency, row.priceCents, row.salePriceCents,
        indexed ? priceCents(indexed.price) : row.salePriceCents ?? row.priceCents] as const;
    });
  const profile = view.parameters?.values ?? {};
  const parts = profile.materials?.state === "known" ? profile.materials.value as Part[] : [];
  const body = parts.filter(({part}) => part === "body");
  const layers = parts.flatMap((part) => [
    {part, area: part.part, layer: "fabric"},
    ...(part.faces ?? []).map((face) => ({part: face, area: part.part, layer: "face"})),
    ...(part.backers ?? []).map((backer) => ({part: backer, area: part.part, layer: "backer"})),
  ]);
  const materials = layers.flatMap(({part, area, layer}) => {
    const values = Object.fromEntries(Object.entries(part.fields)
      .filter(([key, field]) => key !== "fiber_content" && field.state === "known")
      .map(([key, field]) => [key, field.value]));
    return Object.keys(values).length ? [{area, layer, values}] : [];
  });
  const composition = layers.flatMap(({part, area, layer}) => {
    const fibers = part.fields.fiber_content;
    return fibers?.state === "known" ? [{area, layer, fibers: fibers.value}] : [];
  });
  const parameterEvidence = (parameter: string) => profile[parameter]?.evidence.map(({raw}) => raw).join(" · ");
  const bodyEvidence = (parameter: string) => body.flatMap(({fields}) => fields[parameter]?.evidence.map(({raw}) => raw) ?? []).join(" · ");
  const arcColors = entries(raw.colourOptions).map((entry) => plainText(record(entry).label));
  const arcSizes = entries(record(raw.sizeOptions).options).map((entry) => plainText(record(entry).label));
  const rawVariants = mammut
    ? mammut.variants.map(({id, color, size, price, originalPrice, currency, inStock}) => ({id, color, size, price, originalPrice, currency, inStock}))
    : entries(raw.variants).map((entry) => {
      const {id, colourId, sizeId, stockStatus, price, discountPrice, currencyCode} = record(entry);
      return {id, colourId, sizeId, stockStatus, price, discountPrice, currencyCode};
    });
  const evidenceById = new Map(rawVariants.map((row) => [row.id, row]));
  const variantEvidence = new Map(variants.flatMap((row) => {
    const original = evidenceById.get(row.variantKey);
    return original ? [[key(row), JSON.stringify(original)] as const] : [];
  }));
  const money = mammut ? {msrp: mammut.msrp, salePrice: mammut.salePrice, currency: mammut.currency}
    : {price: raw.price, discountPrice: raw.discountPrice, currencyCode: raw.currencyCode};
  const quotedVariants = mammut?.variants.filter(({price}) => typeof price === "number" && price > 0) ?? [];
  const sale = mammut ? mammut.salePrice ?? (quotedVariants.length &&
    quotedVariants.every(({price, originalPrice}) => price === originalPrice) ? "No discount" : null)
    : typeof raw.discountPrice === "number" && typeof raw.price === "number" && raw.discountPrice > 0 && raw.discountPrice <= raw.price
      ? raw.discountPrice === raw.price ? "No discount" : raw.discountPrice : null;
  const facts: Facts = {
    name: fact(view.name, mammut?.name ?? raw.name ?? raw.marketingName),
    sku: fact(product.sku, mammut?.modelNumber ?? raw.id),
    productLine: fact(view.series, mammut?.collection ?? {breadcrumbs: raw.breadcrumbs, isPro: raw.isPro, name: raw.name, url: product.url}),
    colors: fact(view.swatches.map(({label}) => label), mammut ? view.swatches.map(({label}) => label) : arcColors),
    sizes: fact(view.sizes, mammut ? view.sizes : arcSizes),
    price: fact(view.msrp, money), salePrice: fact(sale, money), currency: fact(view.currency, money),
    variantPrices: {...fact(variantPrices, rawVariants), variantEvidence},
    mainFabric: fact(card.mainFabric, bodyEvidence("fabric_name")),
    materials: fact(materials, layers.flatMap(({part}) => part.evidence.map(({raw}) => raw))),
    composition: fact(composition, layers.flatMap(({part}) => part.fields.fiber_content?.evidence.map(({raw}) => raw) ?? [])),
    weight: fact(card.weight, parameterEvidence("weight")), fit: fact(card.fit, parameterEvidence("fit")),
  };
  return {facts, view, variants, arcColors, arcSizes};
}

function normalized(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(normalized).sort().join(",") + "]";
  if (value !== null && typeof value === "object") return "{" + Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
    .map(([key, entry]) => JSON.stringify(key) + ":" + (key === "denier" ? JSON.stringify(entry) : normalized(entry))).join(",") + "}";
  return typeof value === "string" ? JSON.stringify(value.normalize("NFC").trim().replace(/\s+/g, " ")) : JSON.stringify(value);
}

function missing(value: unknown) {
  return value == null || value === "" || (Array.isArray(value) && value.length === 0);
}

function combinationResult(field: Field, stored: unknown[], official: unknown[]) {
  const rows = (value: unknown[]) => Map.groupBy(value as unknown[][], ([key]) => key);
  const left = rows(stored);
  const right = rows(official);
  if ([...left.values(), ...right.values()].some((group) => new Set(group.map(row => JSON.stringify(row))).size > 1)) return "unverifiable";
  if (left.size !== right.size || [...left.keys()].some((key) => !right.has(key))) return "mismatch";
  let unknown = false;
  for (const [key, [a]] of left) {
    const [b] = right.get(key)!;
    if (a[1] == null || b[1] == null || field === "variantPrices" && (a[2] == null || b[2] == null || a[4] == null || b[4] == null)) unknown = true;
    else if (JSON.stringify(a) !== JSON.stringify(b)) return "mismatch";
  }
  return unknown ? "unverifiable" : "match";
}

export function compare(field: Field, stored: Fact, official: Fact, url: string | null): Result {
  const result = {field, url};
  if (official.reason || missing(stored.value) || missing(official.value) && !official.confirmedAbsence) {
    return {...result, status: "unverifiable", reason: official.reason ?? "Field missing in stored data or on the official page"};
  }
  if (field === "variantStock" || field === "variantPrices") {
    const status = combinationResult(field, stored.value as unknown[], official.value as unknown[]);
    if (status === "unverifiable") return {...result, status, reason: "Incomplete or conflicting variant observations"};
    if (status === "match") return {field, status};
    const left = new Map((stored.value as [string, ...unknown[]][]).map((row) => [row[0], row]));
    const changed = (official.value as [string, ...unknown[]][]).filter((row) => JSON.stringify(left.get(row[0])) !== JSON.stringify(row));
    const evidence = snippet(changed.flatMap(([key]) => official.variantEvidence?.get(key) ?? []).join(" · ")) || official.evidence;
    return {...result, status, stored: stored.value, official: official.value, evidence};
  }
  if (normalized(stored.value) === normalized(official.value)) return {field, status: "match"};
  return {...result, status: "mismatch", stored: stored.value, official: official.value, evidence: official.evidence};
}

function stockBySku(rows: {variantKey: string; inStock: boolean | null}[]) {
  const states = new Map<string, boolean | null>();
  for (const {variantKey, inStock} of rows) {
    const state = typeof inStock === "boolean" ? inStock : null;
    states.set(variantKey, !states.has(variantKey) || states.get(variantKey) === state ? state : null);
  }
  return states;
}

export function compareSnapshotStock(snapshots: Snapshot[], fresh: AuditProduct, fetchedAt: string, url: string): Result {
  const unavailable = (reason: string): Result => ({field: "variantStock", status: "unverifiable", url, reason});
  const observed = Date.parse(fetchedAt);
  if (!Number.isFinite(observed)) return unavailable("Official stock observation time is missing or invalid");
  const today = snapshots.filter(({capturedAt}) => {
    const captured = Date.parse(capturedAt);
    return Number.isFinite(captured) && day.format(captured) === day.format(observed);
  });
  if (!today.length) return unavailable("No successful price snapshot on the official observation day (Asia/Shanghai)");
  const timely = today.filter(({capturedAt}) => {
    const age = observed - Date.parse(capturedAt);
    return age >= 0 && age <= sixHours;
  });
  if (!timely.length) return unavailable("Stock snapshot is outside the 6-hour comparison window");
  const official = variantsOf(fresh);
  const storedBySku = stockBySku(timely);
  const officialBySku = stockBySku(official);
  const shared = [...officialBySku].filter(([sku]) => storedBySku.has(sku));
  if (!shared.length) return unavailable("No matching stock variant SKUs in the same-day snapshot");
  const known = shared.flatMap(([sku, current]) => {
    const previous = storedBySku.get(sku);
    return typeof previous === "boolean" && typeof current === "boolean" ? [{sku, previous, current}] : [];
  });
  if (!known.length) return unavailable("Incomplete or conflicting variant observations");
  const stockVariants = {comparable: known.length, mismatch: known.filter(({previous, current}) => previous !== current).length};
  const complete = known.length === officialBySku.size && known.length === new Set(today.map(({variantKey}) => variantKey)).size;
  if (!stockVariants.mismatch) return complete
    ? {field: "variantStock", status: "match", stockVariants}
    : {...unavailable("Stock variants missing, unknown, or outside the 6-hour window"), stockVariants};
  const evidence = new Map(official.map(({variantKey, color, size, inStock}) =>
    [variantKey, JSON.stringify({variantKey, color, size, inStock})]));
  const result = compare("variantStock", {value: known.map(({sku, previous}) => [sku, previous])},
    {value: known.map(({sku, current}) => [sku, current]), variantEvidence: evidence}, url);
  const comparableSkus = new Set(known.map(({sku}) => sku));
  return {...result, stockVariants, stockWindow: {
    officialFetchedAt: fetchedAt,
    snapshotCapturedAt: [...new Set(timely.filter(({variantKey}) => comparableSkus.has(variantKey)).map(({capturedAt}) => capturedAt))],
  }};
}
