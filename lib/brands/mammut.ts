import type {MammutPayload} from "../../crawler/adapters/mammut";
import productLines from "../../data/mammut-product-lines.json";
import {entries, plainText, safeImage, type ProductDetail} from "../product-view";
import {known, missing, type Evidence, type Part, type Profile, type Reference, type Value} from "../parameters/model";
import {applyOverrides} from "../parameters/overrides";
import {convert} from "../parameters/normalization";
import {compositionValue, fabricLayer, parseDenier} from "../parameters/fabric";
import {cardFit} from "../parameters/card";
import {cardFitAliases, productTypes, type FabricPart, type ProductType, type ProtectionType} from "../parameters/registry";
import {garmentStyle} from "../parameters/classification";
import type {TaxonomyEvidence} from "../taxonomy";
import type {BrandAdapter, BrandInput} from "./types";

export function mammutPayload(raw: Record<string, unknown>): MammutPayload | undefined {
  return typeof raw.modelNumber === "string" && Array.isArray(raw.fields) && Array.isArray(raw.variants) ? raw as unknown as MammutPayload : undefined;
}

const fabricTechnology = /\b(?:GORE[- ]TEX(?:[®™]?\s+(?:PRO|PACLITE(?: PLUS)?|ACTIVE|INFINIUM|WINDSTOPPER))?(?:\s+ePE)?[®™]?|Pertex[®™]?\s+(?:Quantum(?:\s+Pro|\s+Air)?|Shield(?:\s+Air)?)|WINDSTOPPER[®™]?|Mammut(?:[®™])?\s+DRY(?:technology)?[®™]?(?:\s+(?:Pro|Performance|Tour))?|Polartec[®™]?\s+(?:Power Grid|Power Stretch(?: Pro)?|Alpha|Thermal Pro)|Schoeller[®™]?(?:\s+WB-400)?)(?![\w-])/i;
const membraneTechnology = /\b(?:GORE[- ]TEX(?![®™]?\s+(?:INFINIUM|WINDSTOPPER|LABS))|Pertex[®™]?\s+Shield|Mammut[®™]?\s+DRY(?:technology)?[®™]?(?:\s+(?:Pro|Performance|Tour))?)(?!\w)/i;
const bodyDesignation = /\b(?:main (?:material|fabric)|body (?:material|fabric)|(?:outer|shell|face|exterior) (?:material|fabric|layer)|(?:main |outer )?laminate|(?:made|constructed|crafted|built|cut) (?:from|of|with)|features? a)\b/i;
const otherArea = /\b(?:lining|liner|backer|insert|panel|pocket|sleeve|hem|knee|shoulder|reinforce\w*|insulation|trim)\b/i;

function namedBody(raw: MammutPayload) {
  const explicit = raw.fields.find(({label}) => /^(?:main|body|outer|shell) (?:fabric|material)(?: name)?$/i.test(label));
  const spec = explicit?.value.match(fabricTechnology)?.[0];
  if (spec) return {name: spec, raw: explicit!.value, path: explicit!.label};
  for (const line of [raw.description, ...raw.sellingPoints]) {
    for (const clause of line.split(/[.;!](?=\s|$)/)) {
      const found = clause.match(fabricTechnology);
      if (!found) continue;
      const before = clause.slice(0, found.index);
      const after = clause.slice(found.index! + found[0].length);
      const body = bodyDesignation.test(before) || /^\s*(?:[\w-]+\s+){0,2}(?:(?:outer|shell|body|face|exterior|main)\s+(?:fabric|material|layer)|shell|laminate)\b/i.test(after);
      if (body && !otherArea.test(before) && !/^.{0,24}\b(?:panels?|inserts?|lining|backer|reinforcements?)\b/i.test(after)) {
        return {name: found[0], raw: clause.trim(), path: line === raw.description ? "description" : "features"};
      }
    }
  }
}

// The Mammut importer requires modelNumber to equal products.external_id.
const verifiedProductLines = new Map(productLines.map((line) => [line.external_id, line]));

function productSeries(raw: MammutPayload) {
  return verifiedProductLines.get(raw.modelNumber)?.product_line ??
    (raw.collection === "Eiger Extreme" ? raw.collection : null);
}

function fitFields(raw: MammutPayload) {
  return raw.fields.find(({label}) => /^cut$/i.test(label));
}

function filling(raw: MammutPayload) {
  const fields = raw.fields.filter(({label}) => /^filling(?:\s+\d+|\s*[-–:]\s*.+)?$/i.test(label));
  const primary = fields.find(({label}) => /\b(?:body|torso)\b/i.test(label)) ?? fields.find(({label}) => /^filling$/i.test(label));
  const type = (value: string): "down" | "synthetic" | undefined => /\b(?:down|feather)\b/i.test(value) ? "down" : /\b(?:polyester|synthetic|primaloft|ecoloft|ajungilak|teijin)\b/i.test(value) ? "synthetic" : undefined;
  const types = new Set(fields.map(({value}) => type(value)).filter(Boolean));
  const description = [raw.description, ...raw.sellingPoints].join(" · ");
  const declaredSynthetic = description.match(/\b(?:Polartec[®™]?\s+Alpha(?:[®™]?\s+Direct)?(?:[®™]?\s+Polypropylene)?|PrimaLoft[®™]?(?:\s+[\w-]+){0,3}|Ajungilak[®™]?|Ecoloft[®™]?|(?:polyester|synthetic|polypropylene))\s+(?:active )?(?:fill|insulation)\b/i)?.[0];
  const declaredDown = description.match(/\b(?:filled with|insulated with)\s+[^.,;]{0,55}\b(?:goose |duck )?down\b/i)?.[0];
  const main = primary ? type(primary.value) : types.size === 1 ? [...types][0]
    : types.size === 0 && Boolean(declaredDown) !== Boolean(declaredSynthetic) ? declaredDown ? "down" : "synthetic" : undefined;
  return {main, fields, types, declaredDown, declaredSynthetic};
}

function taxonomyFacts(raw: MammutPayload): TaxonomyEvidence {
  const {name, categories, scope, description, shortDescription} = raw;
  if (scope !== "apparel" && scope !== "backpack") return {hidden: scope === "footwear" ? "Footwear" : "Outside catalog scope"};
  if (scope === "backpack") return {backpack: true};
  const has = (pattern: RegExp) => categories.some((label) => pattern.test(label));
  const claims = [shortDescription, description, ...raw.sellingPoints].join(" · ");
  const fill = filling(raw);
  const nameMembrane = namedBody(raw)?.name;
  const explicitMembrane = raw.fields.some(({label, value}) => /^membrane$/i.test(label) && Boolean(value) && !/^(?:none|no|n\/a)$/i.test(value));
  const waterColumn = raw.fields.some(({label, value}) => /^water column$/i.test(label) && /\b[1-9][\d., ]*\s*mm\b/i.test(value));
  const denies = /\b(?:not (?:a )?(?:(?:fully|completely) )?|non[- ])waterproof\b/i.test(claims);
  const zoned = /\b(?:waterproof|hardshell|[23][- ]layer)\b[^.!]{0,100}\b(?:inserts?|panels?|exposed areas|high-exposure areas)\b|\bexposed areas\b[^.!]{0,125}\bwaterproof\b/i.test(claims);
  const wholeGarment = has(/^Waterproof (?:Jackets|Pants|Clothing)$/i) ||
    /\b(?:fully waterproof|waterproof (?:shell|jacket|pants|anorak|outer fabric))\b/i.test(claims.replace(/\bnot (?:a )?(?:fully )?waterproof\b/gi, ""));
  const namedWaterproofMembrane = Boolean(nameMembrane && membraneTechnology.test(nameMembrane));
  const waterproof = wholeGarment || !zoned && (waterColumn || namedWaterproofMembrane ||
    /\b(?:waterproof protection|(?:is|and) waterproof)\b/i.test(claims));
  const membrane = waterproof && !zoned && (namedWaterproofMembrane || explicitMembrane ||
    waterColumn && /\b(?:membrane|laminate|[23][- ]layer)\b/i.test(claims));
  const lower = /\b(?:pants?|bottoms?|tights?|leggings?|boxers?|briefs?|shorts)\b/i.test(name);
  const base = has(/^Base Layers?(?:\b|$)|^Underwear$/i) || /\bbase[- ]layer\b/i.test(name + " " + shortDescription) || /\bFL\b/.test(name) && has(/^First Layers$/i)
    ? lower ? "bottom" : "top" : undefined;
  const shape = /\b(?:one[- ]piece|coverall|romper|bodysuit)\b/i.test(name) ? "suit"
    : /\bdress\b/i.test(name) ? "dress"
    : /\b(?:shorts|skort)\b/i.test(name) ? "shorts"
    : /\bskirt\b/i.test(name) ? "skirt"
    : /\b(?:tights?|leggings?)\b/i.test(name) ? "tight"
    : /\b(?:pants?|bib|trousers)\b/i.test(name) ? "pants"
    : /\bvest\b/i.test(name) ? "vest"
    : /\b(?:coat|blazer|trench)\b/i.test(name) ? "tailoring"
    : /\b(?:t[- ]?shirt|shirt|overshirt|tank|polo|longsleeve|long sleeve|sweatshirt|singlet)\b/i.test(name) ||
      has(/^(?:Longsleeve )?T-Shirts(?: & .*)?$|^Shirts(?: & .*)?$/i) ? "top" : undefined;

  const supportedFill = fill.main ?? (fill.fields.length ? "unknown" : undefined);
  const midlayer = /\bML\b|\bfleece\b/i.test(name) || has(/^Fleece(?: & Midlayers)?$|^Mid Layers$|^Midlayers$/i);
  const fixedFill = supportedFill ?? (/\b(?:IN|Thermo|Down Jacket|Insulated)\b/.test(name) || !midlayer && has(/^Down & Insulated Jackets$/i) ? "unknown" : undefined);
  return {
    shape, base, waterproof: waterproof && !denies,
    membrane,
    conflict: (wholeGarment && zoned || waterproof && denies) ? "Published body waterproofing statements disagree" : undefined,
    fill: fixedFill,
    fleece: midlayer,
    softshell: /\bSO\b|\bsoftshell\b/i.test(name) || has(/^Softshell(?: Jackets| Pants)?$/i) || /\bsoftshell (?:fabric|jacket|pants)\b/i.test(claims),
    windshell: /\b(?:windshell|windbreaker|wind jacket|wind[- ]resistant jacket)\b/i.test(name + " " + shortDescription) || /\b(?:windbreaker|windshell)\b/i.test(description),
    threeInOne: /\b3[- ]in[- ]1\b/i.test(name + " " + claims),
  };
}

function partOf(label: string): FabricPart | undefined {
  if (/^(?:main|outer|shell|body) (?:fabric|material)(?:\s*[-–]\s*(?:backing|backer|face))?$/i.test(label)) return "body";
  if (/^linings?(?:\s+\d+)?$/i.test(label)) return "lining";
  if (/\breinforcement\b/i.test(label)) return "reinforcement";
  if (/^(?:insert|panel)s?(?:\s+\d+)?(?:\s*[-–]\s*(?:backing|backer|face))?$/i.test(label)) return "panel";
}

function insulationParts(raw: MammutPayload, evidence: (path: string, text: string) => Evidence): Part[] {
  const {fields, main, declaredSynthetic} = filling(raw);
  const source = fields.map(({label, value}) => evidence(label, value));
  const parts: Part[] = [];
  for (const {label, value} of fields) {
    const proof = evidence(label, value);
    const down = value.match(/(\d+(?:\.\d+)?)%\s+([^,;]+?\bdown)\b/i);
    const location = label.match(/\b(?:sleeves?|hood|body|torso)\b/i)?.[0].toLowerCase() ?? (down ? "down" : "synthetic");
    const fallback = /\b(?:polyester|synthetic|PrimaLoft|Ajungilak|Ecoloft)\b/i.test(value);
    if (!down && !fallback) continue;
    const fields: Part["fields"] = down ? {down_ratio: known(Number(down[1]), [proof])} : {synthetic_fill: known(value, [proof])};
    const species = down?.[2].match(/\b(goose|duck)\b/i)?.[0];
    if (species) fields.down_species = known(species, [proof]);
    parts.push({part: location === "torso" ? "body" : location, label, fields, evidence: [proof]});
  }
  for (const item of raw.fields) {
    const progress = item.value.match(/\b(\d{3,4})\s*(?:cuin|cu\s*in)\b/i);
    const downMass = item.value.match(/^([\d.]+)\s*g$/i);
    const proof = evidence(item.label, item.value);
    if (/^fill power$/i.test(item.label) && progress) {
      const part = parts.find(({fields}) => fields.down_ratio) ?? {part: "down", label: "Down fill", fields: {}, evidence: source};
      part.fields.fill_power = known(Number(progress[1]), [proof], {unit: "cu in/oz"});
      if (!parts.includes(part)) parts.push(part);
    }
    if (/^fill weight \(down\)$/i.test(item.label) && downMass) {
      const part = parts.find(({fields}) => fields.down_ratio || fields.fill_power) ?? {part: "down", label: "Down fill", fields: {}, evidence: source};
      part.fields.down_mass = known(Number(downMass[1]), [proof], {unit: "g"});
      if (!parts.includes(part)) parts.push(part);
    }
    if (/^fill weight \(synthetic\)$/i.test(item.label)) {
      for (const reading of item.value.matchAll(/(\d+(?:\.\d+)?)\s*g\s*\/\s*m[²2]\s*([^,;]*)/gi)) {
        const locations = [...reading[2].matchAll(/\b(body|sleeves?|hood)\b/gi)].map((match) => match[0].toLowerCase().replace(/^sleeve$/, "sleeves"));
        for (const part of locations.length ? locations : [main === "synthetic" ? "synthetic" : "body"]) {
          const existing = parts.find((entry) => entry.part === part && entry.fields.synthetic_density === undefined);
          if (existing) existing.fields.synthetic_density = known(Number(reading[1]), [proof]);
          else parts.push({part, label: item.label, fields: {synthetic_density: known(Number(reading[1]), [proof])}, evidence: [proof]});
        }
      }
    }
  }
  if (main === "synthetic" && declaredSynthetic && !parts.some(({fields}) => fields.synthetic_fill)) {
    const source = evidence("description / features", declaredSynthetic);
    parts.push({part: "synthetic", label: "Synthetic fill", fields: {synthetic_fill: known(declaredSynthetic, [source])}, evidence: [source]});
  }
  return parts;
}

export function mammutParameters(product: ProductDetail, input: BrandInput = {}): Profile {
  const raw = mammutPayload(input.raw ?? {});
  const values: Profile["values"] = {};
  const proof = (path: string, text: string): Evidence => ({
    path: "product." + path, raw: text, method: "published", url: product.url, updatedAt: input.fetchedAt ?? product.verifiedAt,
  });
  const set = (key: string, value: Value | null | undefined, path: string, original?: string, reference?: Reference) => {
    if (value !== null && value !== undefined && value !== "") values[key] = known(value, [proof(path, original ?? String(value))], reference);
  };
  set("brand", product.brand, "brand");
  set("model", product.name, "name");
  set("family", product.family, "family");
  if (!raw) return {values, context: {kind: "other", insulated: false, snow: false, membrane: false}};
  const facts = taxonomyFacts(raw);
  const style = facts.backpack ? "backpack" : facts.base ? facts.base === "top" ? "base_layer_top" : "base_layer_bottom" :
    facts.shape === "suit" ? "suit" : garmentStyle(product, {}, raw.categories) ??
      (/\b(?:hoody|hooded)\b/i.test(product.name) ? "hoodie" : facts.shape === "top" ? "shirt" : undefined);
  const productType = style && Object.hasOwn(productTypes, style) ? style as ProductType : undefined;
  const protection: ProtectionType | undefined = facts.waterproof && !facts.conflict
    ? facts.fill && facts.membrane && !facts.threeInOne ? "insulated_shell" : "hard_shell"
    : facts.softshell ? "soft_shell" : facts.windshell ? "wind_shell" : undefined;
  set("product_type", productType, "name / categories", [product.name, ...raw.categories].join(" · "));
  values.product_type ??= facts.hidden ? missing("inapplicable") : missing("review");
  set("protection_type", protection, "description / categories", raw.shortDescription);
  values.protection_type ??= missing("inapplicable");
  set("category", product.category, "category");
  const series = productSeries(raw);
  const verifiedLine = verifiedProductLines.get(raw.modelNumber);
  if (series && verifiedLine) {
    values.product_line = known(series, [{
      path: "collection.product", url: verifiedLine.source_url, raw: verifiedLine.evidence_text,
      method: "published", updatedAt: verifiedLine.verified_at,
    }]);
  } else {
    set("product_line", series, "collection");
  }
  set("gender", product.gender, "gender");
  set("msrp", product.msrp, "variants.originalPrice / variants.price", JSON.stringify(raw.variants.map(({id, price, originalPrice}) => ({id, price, originalPrice}))), {unit: "USD"});
  if (product.activities.length) set("activities", product.activities, "activities");
  if (product.sizes.length) set("sizes", product.sizes, "variants.sizes");
  if (product.swatches.length) set("colors", product.swatches.length, "variants.colors");
  const release = [product.year, product.season].filter(Boolean).join(" · ");
  set("release", release, "release", release);

  const cut = fitFields(raw);
  const fit = cut && cardFit(cut.value);
  if (fit) set("fit", cardFitAliases[fit][0], cut.label, cut.value);
  else if (cut) values.fit = {...missing(), evidence: [proof(cut.label, cut.value)]};
  values.weight_size = missing();
  const parts: Part[] = [];
  const materialNote = namedBody(raw);
  const body: Part = {part: "body", label: "Main material", fields: {}, evidence: []};
  if (materialNote) {
    const evidence = proof(materialNote.path, materialNote.raw);
    body.fields.fabric_name = known(materialNote.name, [evidence]);
    body.evidence.push(evidence);
    if (facts.membrane && membraneTechnology.test(materialNote.name)) set("membrane", materialNote.name, materialNote.path, materialNote.raw);
  }
  for (const {label, value} of raw.fields) {
    const evidence = proof(label, value);
    const weight = value.match(/^([\d.,]+)\s*(g|kg|oz)$/i);
    if (/^weight$/i.test(label) && weight) set("weight", convert(Number(weight[1].replaceAll(",", "")), weight[2], "g"), label, value, {unit: "g"});
    if (/^water column$/i.test(label) && /^\s*[\d,. ]+\s*mm$/i.test(value)) set("hydrostatic_head", Number(value.replace(/[^\d]/g, "")), label, value, {unit: "mm"});
    if (/^breathability$/i.test(label)) {
      const ret = value.match(/^RET\s*([<>≤≥])?\s*(\d+(?:[.,]\d+)?)/i);
      const mvtr = value.match(/^([\d.,]+)\s*g\s*\/\s*m[²2]\s*\/\s*24h$/i);
      if (ret) set("breathability", Number(ret[2].replace(",", ".")), label, value, {unit: "m²·Pa/W", method: "RET", qualifier: ret[1] as Reference["qualifier"]});
      else if (mvtr) set("breathability", Number(mvtr[1].replace(/[.,](?=\d{3}\b)/g, "").replace(",", ".")), label, value, {unit: "g/m²/24h", method: "MVTR"});
    }
    if (/^membrane$/i.test(label) && facts.membrane && !values.membrane) set("membrane", value, label, value);
    if (/^main material \(denier\)$/i.test(label)) {
      const denier = parseDenier(value);
      if (denier) {
        body.fields.denier = known(denier, [evidence]);
        body.evidence.push(evidence);
      }
    }
    const location = partOf(label);
    if (!location) continue;
    const layer = /\bback(?:ing|er)\b/i.test(label) ? "backer" : /\bface\b/i.test(label) ? "face" : undefined;
    const parsed = fabricLayer(layer ?? location, label, value, evidence);
    // Mammut composition puts recycled status after the fiber name.
    const fibers = [...value.matchAll(/\b(\d+(?:[.,]\d+)?)%\s+([^%(),]+?)(?:\s*\(([^)]+)\))?(?=\s*,|$)/g)].map((match) => ({
      pct: Number(match[1].replace(",", ".")), fiber: match[2].trim(), recycled: /recycled|regenerated/i.test(match[3] ?? "") ? true : null,
    }));
    if (fibers.length) {
      parsed.fields.fiber_content = compositionValue(fibers, [evidence]);
      const recycled = fibers.filter((item) => item.recycled).reduce((sum, item) => sum + item.pct, 0);
      if (recycled && parsed.fields.fiber_content.state === "known") parsed.fields.fabric_recycled_content = known([{pct: recycled, scope: layer === "face" ? "face" : "fabric"}], [evidence]);
    }
    // Fiber percentages, denier and generic source labels must never become a fabric name.
    delete parsed.fields.fabric_name;
    if (location === "body" && !layer) {
      Object.assign(body.fields, parsed.fields);
      body.evidence.push(evidence);
    } else if (layer) {
      const owner = location === "body" ? body : parts.find((part) => part.part === location && part.label === label.split(/\s*[-–]\s*/)[0]);
      if (owner) (owner[layer === "backer" ? "backers" : "faces"] ??= []).push(parsed);
      else parts.push({part: location, label: label.split(/\s*[-–]\s*/)[0], fields: {}, evidence: [evidence], [layer === "backer" ? "backers" : "faces"]: [parsed]});
    } else {
      const owner = parts.find((part) => part.part === location && part.label.toLowerCase() === label.toLowerCase() && (part.backers || part.faces));
      if (owner) {
        Object.assign(owner.fields, parsed.fields);
        owner.evidence.push(evidence);
      } else parts.push(parsed);
    }
  }
  if (Object.keys(body.fields).length || body.backers?.length || body.faces?.length) parts.unshift(body);
  if (parts.length) values.materials = known(parts, parts.flatMap(({evidence}) => evidence));

  const fills = insulationParts(raw, proof);
  const fill = filling(raw);
  if (fills.length) values.insulation = known(fills, fills.flatMap(({evidence}) => evidence));
  const fillType = fill.types.size > 1 ? "mixed" : fill.main;
  if (fillType) {
    const statement = fill.main === "synthetic" ? fill.declaredSynthetic : fill.declaredDown;
    const sources = fill.fields.map(({label, value}) => proof(label, value));
    values.insulation_type = known(fillType, sources.length ? sources : statement ? [proof("description / features", statement)] : []);
  }
  if (input.overrides) applyOverrides(values, product, input.overrides);
  return {values, context: {
    kind: facts.backpack ? "other" : ["pants", "tight", "shorts"].includes(facts.shape ?? "") || facts.base === "bottom" ? "pants"
      : protection === "hard_shell" || protection === "soft_shell" || protection === "wind_shell" ? protection
      : facts.fill ? "insulated" : facts.shape === "tailoring" ? "coat" : "top",
    productType, protectionType: protection, insulated: Boolean(facts.fill), membrane: Boolean(facts.membrane),
    snow: product.activities.some((activity) => /ski|snow/i.test(activity)),
  }};
}

export const mammutAdapter: BrandAdapter = {
  accepts(_product, {raw = {}}) {
    const scope = mammutPayload(raw)?.scope;
    return scope === "apparel" || scope === "backpack";
  },
  fields(_product, raw, detail) {
    const src = mammutPayload(raw);
    const variants = src?.variants ?? [];
    const colorways = [...new Map(variants.flatMap(({color, image}) => color ? [[color, {label: color, hex: null, photos: image ? [{url: image, label: color, height: "", size: ""}] : []}]] as const : [])).values()];
    const image = safeImage(src?.image);
    const family = plainText(src?.name).match(/^(.+?)\s+(?:HS|SO|IN|ML|FL|T-Shirt|Pants|Jacket|\d{2}\b)/)?.[1] ?? null;
    return {
      family, styleFamily: family, veilance: false, publishedPrice: src?.msrp, publishedCurrency: src?.currency,
      series: src ? [productSeries(src)].filter((value): value is string => Boolean(value)) : [],
      modelNumbers: src ? [src.modelNumber] : [], image, hero: image, swatches: colorways,
      summary: src?.shortDescription ?? "", description: detail ? src?.description ?? "" : "",
      materials: [], features: [], facility: "", sizes: [...new Set(variants.flatMap(({size}) => size ? [size] : []))],
      year: src?.year ?? null, season: src?.season ?? "", salePrice: src?.salePrice ?? null,
      colorways: detail ? colorways : [], activities: src ? entries(src.activities).map(plainText).filter(Boolean) : [], specs: {},
    };
  },
  taxonomy(_product, raw) {
    const src = mammutPayload(raw);
    return src ? taxonomyFacts(src) : {hidden: "Missing Mammut product data"};
  },
  parameters: mammutParameters,
};
