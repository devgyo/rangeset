import { fabricLayer, fabricLocation, fabricPart, fabricWeight, garmentRecycledContent, parseDenier } from "./fabric";
import { classifyArcProduct } from "./classification";
import { mergeListValues } from "./merge";
import { plainText, record, type ProductDetail } from "../product-view";
import { fieldsByKey, type Context, type FabricPart, type ProductType, type ProtectionType, productTypes } from "./registry";
import { known, missing, type Evidence, type Parameter, type Part, type Profile, type Reference, type Value } from "./model";

import {comparisonText, compatible, convert, rounded, scalarKeys} from "./normalization";
import {applyOverrides} from "./overrides";
export {convert} from "./normalization";

import type {BrandInput as Input, IndexedSpec} from "../brands/types";
export type {IndexedSpec} from "../brands/types";
type Line = { text: string; evidence: Evidence; group?: string };
const numberPattern = "(\\d+(?:[.,]\\d+)?)";
const sizePattern = /\bsize\s+([a-z\d]+(?:[-/]\w+)*)(?=\s|[),:]|$)/i;
const indexedFeatures: Record<string, [RegExp, RegExp]> = Object.fromEntries(Object.entries({
  pit_zips: "pit[- ]zip\\w*|underarm (?:vent\\w*|zip\\w*)",
  helmet_hood: "helmet[- ]compatible|hood compatible with (?:a )?helmet",
  recco: "RECCO",
}).map(([key, pattern]) => [key, [
  new RegExp(`\\b(?:${pattern})\\b`, "i"),
  new RegExp(`\\b(?:no|without|lacks?|not|non)[ -]+(?:(?:a|an|any|built-in|integrated) +)?(?:${pattern})\\b|\\b(?:${pattern})\\s*[:–-]\\s*(?:no|false|none)\\b` +
    (key === "helmet_hood" ? "|hood not compatible with (?:a )?helmet" : ""), "i"),
]]));
const weightSize = (text: string) => text.match(/\bsize\s*[:=]?\s+((?:US|UK|EU)\s+\d+(?:\.\d+)?|[a-z\d]+(?:[-/.]\w+)*)(?=\s|[),;:]|$)/i)?.[1] ??
  text.match(/\((XX?S|S|M|L|XL|XXL|XXXL|[2-5]XL)\)/i)?.[1];
const decimal = (value: string) => Number(value.replace(",", "."));
const clean = (value: string) => value.replace(/\s+/g, " ").trim();
export { parseDenier } from "./fabric";

function reading(text: string, to: "g" | "cm" | "mm") {
  const units = to === "g" ? "kg|grams?|g|lbs?|oz" : 'mm|cm|inches|inch|in|"|″|m';
  const matches = [...text.matchAll(new RegExp(`${numberPattern}\\s*(${units})(?!\\w|\\s*/\\s*m(?:²|2|\\^2))`, "gi"))];
  if (!matches.length) return { value: null, conflicting: false };
  const metric = matches.filter((match) => /^(kg|g|grams?|mm|cm|m)$/i.test(match[2]));
  const first = (metric[0] ?? matches[0]);
  const values = matches.map((match) => convert(decimal(match[1]), match[2], to));
  const lbs = matches.findIndex((match) => /^lbs?$/i.test(match[2]));
  const oz = matches.findIndex((match) => /^oz$/i.test(match[2]));
  if (to === "g" && lbs >= 0 && oz > lbs && !text.slice(matches[lbs].index! + matches[lbs][0].length, matches[oz].index).includes("/")) {
    values[lbs] = rounded(values[lbs]! + values[oz]!);
    values[oz] = null;
  }
  const value = values[matches.indexOf(first)];
  const tolerance = to === "g" ? Math.max(4, (value ?? 0) * 0.015) : to === "cm" ? 1.4 : 0.2;
  return { value, conflicting: value !== null && values.some((item) => item !== null && Math.abs(item - value) > tolerance) };
}

function measure(line: Line, to: "g" | "cm" | "mm", reference: Reference): Parameter {
  const result = reading(line.text.replace(/inches\b/gi, "inch"), to);
  if (result.conflicting) return { state: "conflict", evidence: [line.evidence], reference, note: "The published measurements do not agree after unit conversion." };
  if (result.value === null) return { state: "review", evidence: [line.evidence], reference, note: "The published measurement or unit could not be read." };
  return known(result.value, [line.evidence], reference);
}

function put(fields: Part["fields"], key: string, value: Value | null | undefined, evidence: Evidence[], reference?: Reference) {
  if (value !== null && value !== undefined && value !== "") fields[key] = known(value, evidence, reference);
}

const density = /\b(\d+(?:\.\d+)?)\s*(gsm|g\s*\/\s*m(?:²|\^?2)|oz\s*\/\s*yd(?:²|2))(?!\w)/i;
const membrane = /\bGORE[ -]TEX(?:[®™])?(?:\s+(?:PRO|PACLITE(?: PLUS)?|ACTIVE)(?:[®™])?)?(?:\s+(?:ePE|ePTFE))?\b|\bPertex Shield(?: Air)?\b|\bDermizax\b/i;
const treatment = /\b(?:(?:FC0|C0|FC-free|PFC-free)\s+)?DWR\b/ig;

function partLabel(value: string) {
  return comparisonText(value).replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function insulationPart(label: string, text: string, evidence: Evidence): { part: Part; type: "down" | "synthetic" } {
  const type = /^down\b/i.test(label) ? "down" : "synthetic";
  const location = label.match(/^(?:down|synthetic)\s+(?:insulation|fill)\s*(?:[-–]\s*|\()(.*?)(?:\))?$/i)?.[1];
  const part = location ? partLabel(location) + "_" + type : type;
  const fields: Part["fields"] = {};
  if (type === "down") {
    const fill = text.match(/\b(\d{3,4})\s*(?:fill(?:[ -]power)?|FP)\b/i);
    const ratio = text.match(/\b(?:minimum\s+)?(\d+(?:\.\d+)?)\s*%\s+down\b/i)
      ?? text.match(/\b(\d+(?:\.\d+)?)\s*%\s+(?:goose|duck)?\s*down(?=\s*(?:,|;|$))/i);
    const species = text.match(/\b(goose|duck)\s+down\b/i);
    const amount = text.match(/(?:\b(?:down )?fill weight\s*[:=]?\s*)(\d+(?:\.\d+)?)\s*(kg|g|oz)\b/i);
    const method = text.match(/\b(?:EN\s+12130|IDFB\s+\d+(?:-[A-Z])?)\b/i)?.[0];
    const powerUnit = /\b(?:cu\s*in|in³|in3)\s*\/\s*oz\b/i.test(text) ? "cu in/oz" : null;
    put(fields, "fill_power", fill && Number(fill[1]), [evidence], { method, unit: powerUnit });
    if (ratio) fields.down_ratio = Number(ratio[1]) > 100
      ? { state: "review", evidence: [evidence], note: "Published down proportion exceeds 100%." }
      : known(Number(ratio[1]), [evidence], /minimum/i.test(ratio[0]) ? { method: "Minimum" } : undefined);
    put(fields, "down_species", species?.[1].toLowerCase(), [evidence]);
    put(fields, "down_mass", amount && convert(Number(amount[1]), amount[2], "g"), [evidence]);
  } else {
    const mass = text.match(density);
    const name = text.split(/\s+[-–]\s+|,|\s*\(\s*\d/)[0].replace(density, "").trim();
    put(fields, "synthetic_fill", name, [evidence]);
    put(fields, "synthetic_density", mass && convert(Number(mass[1]), mass[2], "g/m²"), [evidence]);
  }
  return { part: { part, label, fields, evidence: [evidence] }, type };
}

export function normalizeArcProduct(product: ProductDetail, input: Input = {}): Profile {
  const raw = input.raw ?? {};
  const { kind, productType, protectionType } = classifyArcProduct(product, input);
  const values: Profile["values"] = {};
  const rawEvidence = (path: string, value: unknown, method: Evidence["method"] = "published"): Evidence => ({
    url: product.url, path, raw: typeof value === "string" ? value : JSON.stringify(value) ?? "", method: product.example ? "example" : method,
    updatedAt: input.fetchedAt ?? product.verifiedAt,
  });
  const add = (key: string, value: Value | null | undefined, path: string, original: unknown = value, reference?: Reference) =>
    put(values, key, value, [rawEvidence(path, original)], reference);
  add("brand", product.brand, "brands.name");
  add("model", product.name, "product.name", raw.name ?? product.name);
  add("product_line", product.example ? null : product.veilance ? "Veilance" : "Mainline", "product.breadcrumbs", raw.breadcrumbs ?? []);
  add("family", product.family, "product.name", raw.name ?? product.name);
  add("category", product.category, "products.category");
  values.product_type = productType;
  values.protection_type = protectionType;
  add("gender", product.gender, "products.gender", raw.gender ?? product.gender);
  const ratingLines = (key: string, candidates: Line[], pattern: RegExp, unit: string) => {
    const readings = candidates.flatMap((line) => {
      const match = line.text.match(pattern);
      if (!match) return [];
      const method = line.text.match(/\b(?:ISO\s+\d+|JIS\s+L\s+1099(?:\s+[AB]\d?)?|AATCC\s+127|ASTM\s+E96(?:\/E96M)?)\b/i)?.[0];
      return [known(Number(match[1].replaceAll(",", "")), [line.evidence], { unit, method })];
    });
    if (!readings.length) return;
    if (readings.some(({ value, reference }) => value !== readings[0].value || reference?.method !== readings[0].reference?.method)) {
      values[key] = { state: "conflict", evidence: readings.flatMap(({ evidence }) => evidence), note: "Published test results cannot be reconciled." };
    } else values[key] = { ...readings[0], evidence: readings.flatMap(({ evidence }) => evidence) };
  };
  const currency = typeof raw.currencyCode === "string" && /^[A-Z]{3}$/.test(raw.currencyCode) ? raw.currencyCode : product.currency ?? (product.example && product.msrp !== null ? "USD" : null);
  const listPrice = typeof raw.price === "number" && raw.price > 0 ? raw.price : product.msrp;
  add("msrp", listPrice, "product.price", raw.price ?? product.msrp, { unit: currency ?? undefined });
  if (product.activities.length) add("activities", product.activities, "product.activities", raw.activities ?? product.activities);
  if (product.sizes.length) add("sizes", product.sizes, "product.sizeOptions", raw.sizeOptions ?? product.sizes);
  if (product.swatches.length) add("colors", product.swatches.length, "product.colourOptions", product.swatches.map(({ label }) => label));
  add("facility", product.facility, "product.manufacturingFacility.label", record(raw.manufacturingFacility).label ?? product.facility);
  add("release", [product.year, product.season].filter(Boolean).join(" · "), "product.origYear / origSeason", [raw.origYear, raw.origSeason]);

  const materialLines: Line[] = (Array.isArray(raw.materials) ? raw.materials : product.materials).flatMap((original, index) =>
    typeof original === "string" ? [{ text: plainText(original), evidence: rawEvidence(`product.materials[${index}]`, original, "parsed") }] : []);
  const featureLines: Line[] = (Array.isArray(raw.features) ? raw.features : product.features.map(({ label, values }) => ({ label, value: values })))
    .flatMap((group, index) => {
      const entry = record(group);
      return (Array.isArray(entry.value) ? entry.value : []).flatMap((original, offset) => typeof original === "string" ? [{
        text: plainText(original), group: plainText(entry.label), evidence: rawEvidence(`product.features[${index}].value[${offset}]`, original, "parsed"),
      }] : []);
    });
  const tagLines: Line[] = product.subTags.map((text, index) => ({ text, evidence: rawEvidence(`products.sub_tags[${index}]`, text, "parsed") }));
  const materials: Part[] = [];
  const insulations: ReturnType<typeof insulationPart>[] = [];
  const notes: Line[] = [];
  const detached: { line: Line; owner?: FabricPart; labelledOwner: boolean; layer: "face" | "backer"; text: string }[] = [];
  const fabricIssues: Line[] = [];
  const shorthandLinings: { line: Line; text: string }[] = [];
  const consumed = new Set<string>();
  const collect = (key: string, lines: Line[], value: (line: Line) => string = ({ text }) => text) => {
    const match = lines.filter((line) => value(line));
    if (match.length) values[key] = known([...new Set(match.map(value))], match.map(({ evidence }) => evidence));
  };

  for (const line of materialLines) {
    const matched = line.text.match(/^([^:]{1,64}):\s*(.+)$/);
    if (!matched) {
      const labeled = line.text.match(/^(.+?)\s+lining$/i);
      if (labeled) shorthandLinings.push({ line, text: labeled[1] });
      else if (!/microfib(?:er|re)|regulation|by law|biocid/i.test(line.text)) {
        notes.push(line);
        fabricIssues.push(line);
      }
      continue;
    }
    const [, label, text] = matched;
    if (/^origin of\b|regulation/i.test(label)) continue;
    if (/^(?:down|synthetic)\s+(?:insulation|fill)\b/i.test(label)) {
      insulations.push(insulationPart(label, text, line.evidence));
      continue;
    }
    const layerLabel = label.match(/^(?:(.+?)\s+)?(backer|backing|face(?: fabric)?)(?:\s*\(([^)]+)\))?$/i);
    if (layerLabel) {
      const owner = layerLabel[1] ?? layerLabel[3];
      detached.push({ line, text, owner: owner ? fabricLocation(owner) : undefined, labelledOwner: Boolean(owner),
        layer: /^face/i.test(layerLabel[2]) ? "face" : "backer" });
      continue;
    }
    const part = fabricLocation(label);
    if (part) materials.push(fabricPart(part, label, text, line.evidence));
    else if (/^Frame Polo Shirt\b/i.test(product.name) && /^Merino\s*\/\s*Nylon core[- ]spun jersey\b/i.test(label)) {
      materials.push(fabricPart("body", "Body", `${label} - ${text}`, line.evidence));
    }
    else {
      notes.push(line);
      fabricIssues.push(line);
    }
  }
  for (const { line, text } of shorthandLinings) {
    const shorthand = fabricPart("lining", "Lining", text, line.evidence);
    const lining = materials.filter(({ part }) => part === "lining");
    const denier = shorthand.fields.denier?.value;
    const name = (value: unknown) => comparisonText(value).replace(/^recycled /, "");
    if (lining.length === 1 && denier && name(shorthand.fields.fabric_name?.value) === name(lining[0].fields.fabric_name?.value) &&
        comparisonText(lining[0].fields.denier?.value) === comparisonText(denier)) {
      lining[0].fields.denier.evidence.push(line.evidence);
      lining[0].evidence.push(line.evidence);
    } else materials.push(shorthand);
  }
  for (const { line, owner, labelledOwner, layer, text } of detached) {
    const candidates = owner ? materials.filter(({ part }) => part === owner) : labelledOwner ? [] : materials;
    if (candidates.length === 0 && owner && layer === "face") {
      materials.push({ part: owner, label: owner, evidence: [line.evidence], fields: {}, faces: [fabricLayer(layer, "Face", text, line.evidence)] });
      continue;
    }
    if (candidates.length !== 1) {
      notes.push(line);
      fabricIssues.push(line);
      continue;
    }
    const fabric = candidates[0];
    const key = layer === "face" ? "faces" : "backers";
    fabric[key] = [...(fabric[key] ?? []), fabricLayer(layer, layer === "face" ? "Face" : "Backer", text, line.evidence)];
  }
  // The name in Arc'teryx construction notes can identify a part without
  // treating a number in the fabric's technology name as an actual denier.
  for (const line of featureLines) {
    if (!/^construction$/i.test(line.group ?? "")) continue;
    const claim = line.text.match(/^(.+?)\s+(\d{1,4})D\s+fabric\b/i);
    if (!claim) continue;
    const name = comparisonText(claim[1]);
    const candidates = materials.filter(({ fields }) => {
      const published = comparisonText(fields.fabric_name?.value);
      return published === name || published === `${name} ${claim[2]}`;
    });
    if (candidates.length === 1 && !candidates[0].fields.denier) {
      const denier = parseDenier(claim[2] + "D");
      if (denier) {
        candidates[0].fields.denier = known(denier, [line.evidence]);
        candidates[0].evidence.push(line.evidence);
      }
    }
  }
  if (fabricIssues.length) values.fabric_issues = {
    state: "review", reviewCode: "needs_review", value: fabricIssues.map(({ text }) => text),
    evidence: fabricIssues.map(({ evidence }) => evidence), note: "A source did not identify a supported fabric location.",
  };
  if (materials.length) values.materials = known(materials, materials.flatMap(({ evidence }) => evidence));
  if (insulations.length) {
    const types = new Set(insulations.map(({ type }) => type));
    values.insulation_type = known(types.size > 1 ? "mixed" : insulations[0].type, insulations.flatMap(({ part }) => part.evidence));
    values.insulation = known(insulations.map(({ part }) => part), insulations.flatMap(({ part }) => part.evidence));
  }
  if (notes.length) collect("source_notes", notes);
  const all = [...materialLines, ...featureLines, ...tagLines];
  const garmentClaims = all.flatMap(({ text, evidence }) => {
    const value = garmentRecycledContent(text);
    return value ? [{ value, evidence }] : [];
  });
  if (garmentClaims.length) values.garment_recycled_content = known(
    [...new Map(garmentClaims.map(({ value }) => [JSON.stringify(value), value])).values()],
    garmentClaims.map(({ evidence }) => evidence),
  );
  function find(pattern: RegExp, lines = all) { return lines.filter(({ text }) => pattern.test(text)); }
  function explicit(key: string, positive: RegExp, negative: RegExp = /$a/, lines = [...featureLines, ...tagLines]) {
    const no = find(negative, lines);
    const yes = find(positive, lines).filter((line) => !negative.test(line.text));
    if (yes.length && no.length) values[key] = { state: "conflict", evidence: [...yes, ...no].map(({ evidence }) => evidence), note: "The brand’s statements disagree." };
    else if (yes.length || no.length) values[key] = known(yes.length > 0, [...yes, ...no].map(({ evidence }) => evidence));
  }

  const garmentSize = (key: string, pattern: RegExp) => {
    const observations = find(pattern, featureLines);
    if (!observations.length) return;
    const results = observations.map((entry) => measure(entry, "cm", { size: entry.text.match(sizePattern)?.[1], gender: product.gender ?? undefined, kind }));
    const first = results[0];
    values[key] = results.some((item) => item.state !== first.state || item.value !== first.value || item.reference?.size !== first.reference?.size)
      ? { state: "review", evidence: observations.map(({ evidence }) => evidence), note: "Multiple reference sizes or measurements are published." }
      : { ...first, evidence: observations.map(({ evidence }) => evidence) };
    observations.forEach(({ evidence }) => consumed.add(evidence.path));
  };
  const rawWeight = record(raw.weight).value;
  if (typeof rawWeight === "string" && rawWeight.trim()) {
    const size = weightSize(rawWeight) ?? plainText(record(raw.weight).size);
    const ref: Reference = { size: size || undefined, kind, gender: product.gender ?? undefined };
    values.weight = measure({ text: plainText(rawWeight), evidence: rawEvidence("product.weight.value", rawWeight, "parsed") }, "g", ref);
    if (size) add("weight_size", size, "product.weight.value", rawWeight, ref);
  }
  garmentSize("back_length", /\bcent(?:re|er) back length\b/i);
  garmentSize("inseam", /\binseam\b[^;]*\d\s*(?:cm|mm|in|")/i);
  add("fit", plainText(raw.fit) || plainText(record(raw.fit).label), "product.fit", raw.fit);

  const main = materialLines.filter(({ text }) => /^(?:body|main(?: fabric)?|shell(?: fabric)?|face fabric)\s*:/i.test(text));
  const construction = main.length ? main : materialLines;
  const membranes = find(membrane, [...construction, ...tagLines]);
  if (membranes.length) {
    const labels = membranes.map(({ text }) => clean(text.match(membrane)![0].replace(/[®™]/g, "")));
    const normalized = [...new Set(labels.map(comparisonText))];
    const specific = normalized.filter((name) => !normalized.some((other) => other.startsWith(name + " ")));
    values.membrane = specific.length === 1
      ? known(labels.find((name) => comparisonText(name) === specific[0])!, membranes.map(({ evidence }) => evidence))
      : { state: "conflict", evidence: membranes.map(({ evidence }) => evidence), note: "Sources name different primary membranes." };
  }
  const layer = find(/\b(?:2\.5|[23])\s*L\b/i, construction);
  if (layer.length) {
    const count = new Set(layer.map(({ text }) => text.match(/\b(2\.5|[23])\s*L\b/i)![1]));
    values.laminate = count.size === 1 ? known([...count][0], layer.map(({ evidence }) => evidence))
      : { state: "review", evidence: layer.map(({ evidence }) => evidence), note: "More than one laminate is listed for the primary fabric." };
  }
  const treatments = find(/\bDWR\b|durable water repellent/i);
  if (treatments.length) values.dwr = known(treatments.flatMap(({ text }) => {
    const matches = [...text.matchAll(treatment)].map((match) => match[0].toUpperCase());
    return matches.length ? matches : ["DWR"];
  }), treatments.map(({ evidence }) => evidence));
  const protection = [
    ["Waterproof", /(?<!non[ -]|not )\bwaterproof\b/i], ["Water resistant", /\bwater[ -]resistan(?:t|ce)\b/i],
    ["Windproof", /\bwindproof\b/i], ["Wind resistant", /\bwind[ -]resistan(?:t|ce)\b/i],
  ] as const;
  const claims = protection.flatMap(([label, pattern]) => find(pattern).length ? [label] : []);
  if (claims.length) values.protection = known(claims, all.filter(({ text }) => protection.some(([, pattern]) => pattern.test(text))).map(({ evidence }) => evidence));
  const wind = find(/\bwindproof\b|\bwind[- ]resistant\b/i);
  if (wind.length) values.wind = known(wind.some(({ text }) => /\bwindproof\b/i.test(text)) ? "windproof" : "wind_resistant", wind.map(({ evidence }) => evidence));
  const upf = find(/\bUPF\s*\d+\+?/i);
  if (upf.length) values.upf = known(upf[0].text.match(/\bUPF\s*(\d+\+?)/i)![1] + " UPF", upf.map(({ evidence }) => evidence));

  ratingLines("hydrostatic_head", find(/\b(?:hydrostatic head|waterproof rating)\b/i), /\b(?:hydrostatic head|waterproof rating)\b[^\d;]{0,24}([\d,]+(?:\.\d+)?)\s*mm\b/i, "mm");
  const ret = find(/\bRET\b/i);
  const mvtr = find(/\b(?:MVTR|breathability rating)\b/i);
  if (ret.length && mvtr.length) values.breathability = {
    state: "review", evidence: [...ret, ...mvtr].map(({ evidence }) => evidence), note: "Different breathability measures are published.",
  };
  else if (ret.length) ratingLines("breathability", ret, /\bRET\b[^\d;]{0,24}(\d+(?:\.\d+)?)\s*m(?:²|2)[·⋅* ]?\s*Pa\s*\/\s*W/i, "m²·Pa/W");
  else ratingLines("breathability", mvtr, /\b(?:MVTR|breathability rating)\b[^\d;]{0,24}([\d,]+(?:\.\d+)?)\s*g\s*\/\s*m(?:²|2)\s*(?:\/|per)\s*24\s*h/i, "g/m²/24h");

  const hoodLines = featureLines.filter(({ group }) => /hood configuration/i.test(group ?? ""));
  explicit("hood", /\b(?:stormhood|drophood|hood)\b/i, /\b(?:no|without) (?:a )?hood\b|\bhoodless\b/i, [...hoodLines, { text: product.name, evidence: rawEvidence("product.name", product.name) }]);
  for (const [key, patterns] of Object.entries(indexedFeatures)) explicit(key, ...patterns);
  explicit("two_way_zip", /\b(?:two|2)[- ]way\s+(?:\w+\s+){0,2}zip\w*\b/i, /\b(?:no|without) (?:two|2)[- ]way zip/i);
  explicit("powder_skirt", /\b(?:powder|snow) skirt\b/i, /\b(?:no|without) (?:a )?(?:powder|snow) skirt\b/i);
  explicit("leg_zips", /\b(?:leg side zip\w*|side zip\w* (?:on|at) (?:the )?legs?\b|side (?:leg )?zip\w* for (?:easy )?(?:on|off))/i, /\b(?:no|without) (?:leg )?side zip/i);
  collect("pockets", featureLines.filter(({ group }) => /pocket/i.test(group ?? "")));

  for (const [key, pattern] of [["fabric_origin", /^origin of fabric:/i], ["dye_origin", /^origin of dye(?:ing)?:/i], ["assembly_origin", /^origin of manufactur(?:e|ing):/i]] as const) {
    collect(key, find(pattern, materialLines), ({ text }) => text.slice(text.indexOf(":") + 1).trim());
  }
  const env = [
    ["recycled", /\brecycled\b/i],
    ["certifications", /\b(?:RDS|bluesign|bluepass|Fair Trade|responsible down standard|OEKO-TEX|certified|certification)\b/i],
    ["pfas", /\bPFAS\b|per- and polyfluoroalkyl/i],
    ["microfibers", /microfib(?:er|re)/i],
    ["regulatory", /\b(?:biocid\w*|regulat\w*|by law|anti-odour treatment)\b/i],
  ] as const;
  for (const [key, pattern] of env) {
    const matched = find(pattern);
    collect(key, matched);
    matched.forEach(({ evidence }) => consumed.add(evidence.path));
  }
  collect("feature_notes", featureLines.filter(({ evidence }) => !consumed.has(evidence.path)));

  const fallback = input.indexed ?? Object.entries(product.specs).flatMap(([key, spec]): IndexedSpec[] => spec ? [{
    key, value: spec.value, unit: spec.unit, source: spec.source, fetchedAt: spec.date ?? "",
  }] : []);
  for (const observation of fallback) {
    const key = scalarKeys[observation.key];
    if (!key || observation.source === "not_published" || observation.value == null) continue;
    const feature = indexedFeatures[key];
    if (feature && !product.example) {
      if (observation.source !== "brand" && observation.source !== "manual") continue;
      const explicitNo = feature[1].test(observation.rawText ?? "");
      if (observation.value === false && !explicitNo || observation.value === true && explicitNo) continue;
    }
    const field = fieldsByKey.get(key)!;
    let value: unknown = field.type === "enum" ? String(observation.value) : observation.value;
    if (typeof value === "number" && field.unit && observation.unit) value = convert(value, observation.unit, field.unit);
    const evidence: Evidence = {
      url: observation.sourceUrl ?? product.url, path: `product_specs.${observation.key}`,
      raw: observation.rawText ?? String(observation.value), method: product.example ? "example" : observation.source === "manual" ? "manual" : "indexed",
      updatedAt: observation.fetchedAt || null,
    };
    const existing = values[key];
    if (!compatible(key, value)) {
      if (!existing) values[key] = { state: "review", evidence: [evidence], note: "The indexed value or unit could not be normalized." };
      continue;
    }
    if (existing?.state === "known" && comparisonText(existing.value) !== comparisonText(value)) {
      // Indexed names can omit the specific technology suffix. An older summary is not an independent source.
      if (key === "membrane" && comparisonText(existing.value).startsWith(comparisonText(value) + " ")) {
        existing.evidence.push(evidence);
      } else values[key] = { state: "conflict", evidence: [...existing.evidence, evidence], note: "The indexed value differs from the parsed source text." };
    } else if (existing) existing.evidence.push(evidence);
    else {
      const size = key === "weight" ? product.specs.weight_size?.value ?? weightSize(observation.rawText ?? "") : observation.rawText?.match(sizePattern)?.[1];
      const reference = ["weight", "weight_size", "back_length", "inseam"].includes(key) ? {
        kind, size: typeof size === "string" ? size : undefined, gender: product.gender ?? undefined,
      } : key === "breathability" || key === "hydrostatic_head" ? {
        unit: key === "hydrostatic_head" ? "mm" : observation.unit ?? undefined,
        method: key === "breathability" ? String(product.specs.breathability_method?.value ?? "") || undefined : undefined,
      } : undefined;
      values[key] = known(value, [evidence], reference);
    }
  }

  if (product.example && !values.materials) {
    const fields: Part["fields"] = {};
    for (const [key, rawKey] of [["denier", "face_denier"], ["fabric_weight", "fabric_gsm"]]) {
      const spec = product.specs[rawKey];
      if (typeof spec?.value === "number") {
        const evidence = [rawEvidence(`example.${rawKey}`, spec.value, "example")];
        fields[key] = key === "denier" ? known([spec.value], evidence) : fabricWeight(spec.value, spec.unit ?? "", evidence);
      }
    }
    if (Object.keys(fields).length) values.materials = known([{ part: "body", label: "Body", fields, evidence: [] }], []);
  }

  let context: Context = {
    kind, productType: typeof productType.value === "string" && Object.hasOwn(productTypes, productType.value) ? productType.value as ProductType : undefined, protectionType: protectionType.value as ProtectionType | undefined,
    insulated: kind === "insulated" || insulations.length > 0, snow: values.powder_skirt?.value === true ||
      /\b(?:ski(?:ing)?|snowboard(?:ing)?|snowsports?)\b/i.test([product.name, ...product.activities, ...product.subTags].join(" ")),
    membrane: Boolean(values.membrane || values.laminate),
  };
  const overrides = input.overrides ?? new Map();
  applyOverrides(values, product, overrides);
  if (values.hood?.value === false && values.helmet_hood?.state !== "known") values.helmet_hood = missing("inapplicable");
  const finalWeight = values.weight;
  if (finalWeight?.state === "known") {
    finalWeight.reference = {
      kind, gender: product.gender ?? undefined, ...finalWeight.reference,
    };
    const size = values.weight_size;
    if (size?.evidence[0]?.method === "manual" || (!finalWeight.reference.size && size?.state === "known")) {
      finalWeight.reference = { ...finalWeight.reference, size: typeof size.value === "string" ? size.value : undefined };
    }
  }
  context = { ...context, insulated: context.insulated || values.insulation_type?.state === "known", membrane: context.membrane || Boolean(values.membrane) };
  for (const [key, parameter] of Object.entries(values)) {
    if (parameter.state === "known" && fieldsByKey.get(key)?.type === "list") {
      parameter.value = mergeListValues(key, parameter.value as string[]);
    }
  }
  return { context, values };
}

export function parametersOf(product: ProductDetail): Profile {
  return product.parameters ?? normalizeArcProduct(product);
}
