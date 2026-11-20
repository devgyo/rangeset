import { compositionValue, constructions, fabricLayer, fabricLocation, fabricPart, fabricWeight, garmentRecycledContent, parseDenier } from "./fabric";
import { classifyArcProduct } from "./classification";
import { mergeListValues } from "./merge";
import { plainText, record, type ProductDetail } from "../arcteryx-view";
import { fieldsByKey, type Context, type FabricPart, type Field, type ProductType, type ProtectionType, productTypes } from "./registry";
import { known, missing, type Evidence, type Fiber, type Parameter, type Part, type Profile, type Reference, type Value } from "./model";

export type IndexedSpec = { key: string; value: unknown; unit: string | null; source: string; fetchedAt: string; sourceUrl?: string; rawText?: string | null };
type Input = { raw?: Record<string, unknown>; fetchedAt?: string | null; indexed?: IndexedSpec[]; overrides?: Map<string, unknown> };
type Line = { text: string; evidence: Evidence; group?: string };
const scalarKeys: Record<string, string> = {
  weight_g: "weight", weight_size: "weight_size", fit: "fit", centre_back_length_cm: "back_length", inseam: "inseam",
  membrane: "membrane", layers: "laminate", recco: "recco", pit_zips: "pit_zips", helmet_hood: "helmet_hood",
  waterproof_mm: "hydrostatic_head", breathability: "breathability",
};
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
const rounded = (value: number) => Math.round(value * 100) / 100;
const clean = (value: string) => value.replace(/\s+/g, " ").trim();
const comparisonText = (value: unknown) => String(value).replace(/[®™]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

export function convert(value: number, from: string, to: string) {
  const unit = from.toLowerCase().replace(/\s/g, "");
  if (unit === to.toLowerCase()) return rounded(value);
  const units: Record<string, Record<string, number>> = {
    g: { kg: 1000, lb: 453.59237, lbs: 453.59237, oz: 28.349523125, gram: 1, grams: 1 },
    cm: { mm: 0.1, m: 100, in: 2.54, inch: 2.54, '"': 2.54, "″": 2.54 },
    mm: { cm: 10, m: 1000, in: 25.4, '"': 25.4, "″": 25.4 },
    "g/m²": { gsm: 1, "g/m2": 1, "g/m^2": 1, "oz/yd²": 33.905747, "oz/yd2": 33.905747 },
  };
  const factor = units[to]?.[unit];
  return factor === undefined ? null : rounded(value * factor);
}

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

function compatible(key: string, value: unknown): value is Value {
  const field = fieldsByKey.get(key);
  switch (field?.type) {
    case "text": return typeof value === "string" && Boolean(value.trim());
    case "enum": return typeof value === "string" && Object.hasOwn(field.options ?? {}, value);
    case "boolean": return typeof value === "boolean";
    case "number": return typeof value === "number" && Number.isFinite(value) && value >= 0;
    case "list": return Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === "string" && Boolean(item.trim()));
    case "denier": return Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === "number" && Number.isFinite(item) && item > 0);
    case "composition": return Array.isArray(value) && value.length > 0 && value.every((item) => typeof record(item).fiber === "string" &&
      typeof record(item).pct === "number" && Number.isFinite(record(item).pct) && Number(record(item).pct) >= 0 &&
      [true, false, null].includes(record(item).recycled as boolean | null));
    case "recycled": return Array.isArray(value) && value.length > 0 && value.every((item) => {
      const { pct, scope } = record(item);
      return ["fabric", "face", "garment", "claim_only"].includes(String(scope)) &&
        (pct === null ? scope === "claim_only" : typeof pct === "number" && Number.isFinite(pct) && pct >= 0 && pct <= 100);
    });
    default: return false;
  }
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

function parseManual(field: Field, original: unknown, previous: Parameter | undefined): { value: unknown; reference?: Reference } {
  const entry = record(original);
  let value = Object.hasOwn(entry, "value") ? entry.value : original;
  let reference = previous?.reference;
  const ref = record(entry.reference);
  reference = { ...reference, ...Object.fromEntries(Object.entries(ref).filter(([key, value]) =>
    ["size", "gender", "method", "unit", "kind"].includes(key) && typeof value === "string")) };
  if (field.type === "enum" && typeof value === "number") value = String(value);
  if (field.type === "denier" && typeof value === "number") value = [value];
  if (field.type === "denier" && typeof value === "string") value = parseDenier(value);
  if (field.type === "composition" && Array.isArray(value)) value = value.map((item) => {
    const fiber = record(item);
    return { fiber: fiber.fiber ?? fiber.name, pct: fiber.pct ?? fiber.percent, recycled: fiber.recycled ?? null };
  });
  if (field.key === "weave") value = (Array.isArray(value) ? value : [value]).flatMap((word) => {
    const canonical = constructions.find((option) => comparisonText(option) === comparisonText(word));
    return canonical ? [canonical] : [];
  });
  if (typeof value === "number" && typeof entry.unit === "string" && field.unit && field.key !== "fabric_weight") value = convert(value, entry.unit, field.unit);
  if (typeof entry.unit === "string" && !field.unit) reference.unit = entry.unit;
  return { value, reference };
}

function manualFabricValue(field: Field, raw: unknown, evidence: Evidence, previous?: Parameter): Parameter {
  if (raw === null) return { state: "unpublished", evidence: [evidence] };
  const parsed = parseManual(field, raw, previous);
  if (field.key === "fabric_weight" && typeof parsed.value === "number") {
    const unit = record(raw).unit;
    return fabricWeight(parsed.value, typeof unit === "string" ? unit : "g/m²", [evidence]);
  }
  if (!compatible(field.key, parsed.value)) return {
    state: "review", reviewCode: "needs_review", evidence: [evidence], note: "Manual value does not match the field definition.",
  };
  return field.type === "composition" ? compositionValue(parsed.value as Fiber[], [evidence]) : known(parsed.value, [evidence], parsed.reference);
}

function applyOverrides(values: Profile["values"], product: ProductDetail, overrides: Map<string, unknown>) {
  const metadataKeys: Record<string, string> = { name: "model", category: "category", price: "msrp", gender: "gender" };
  const keys = [...overrides].filter(([key]) => !key.startsWith("parameters."))
    .concat([...overrides].filter(([key]) => key.startsWith("parameters.")));
  for (const [path, original] of keys) {
    if (path === "parameters.product_type" || path === "parameters.protection_type") continue;
    const key = path.startsWith("parameters.") ? path.slice(11) : path.startsWith("spec.") ? scalarKeys[path.slice(5)] : metadataKeys[path];
    const field = fieldsByKey.get(key);
    const entry = record(original);
    const evidence: Evidence = { url: product.url, path: `manual_overrides.${path}`, raw: JSON.stringify(original) ?? "",
      method: "manual", updatedAt: typeof entry.updatedAt === "string" && /^\d{4}-\d{2}-\d{2}/.test(entry.updatedAt) ? entry.updatedAt : null };
    const legacyFabric = path === "spec.face_denier" ? "denier" : path === "spec.fabric_gsm" ? "fabric_weight" : null;
    if (legacyFabric) {
      const parts = values.materials?.state === "known" ? values.materials.value as Part[] : [];
      const primary = parts.filter(({ part }) => part === "body");
      if (primary.length > 1) {
        values.materials = { state: "review", evidence: [...(values.materials?.evidence ?? []), evidence],
          note: "A product-level override cannot be assigned to one of multiple main fabrics." };
        continue;
      }
      const definition = fieldsByKey.get(legacyFabric)!;
      const detail = manualFabricValue(definition, original, evidence, primary[0]?.fields[legacyFabric]);
      const part = primary[0] ?? { part: "body", label: "Body", fields: {}, evidence: [] };
      part.fields[legacyFabric] = detail;
      part.evidence.unshift(evidence);
      values.materials = known(primary.length ? parts : [...parts, part], [evidence, ...(values.materials?.evidence ?? [])]);
      continue;
    }
    if (!field) continue;
    if (original === null) {
      values[key] = { state: "unpublished", evidence: [evidence] };
      continue;
    }
    if (field.type === "parts" && Array.isArray(original)) {
      const fabric = field.group === "fabric";
      function readPart(input: unknown, nested?: "face" | "backer"): Part | undefined {
        const item = record(input);
        if (typeof item.part !== "string" || !/^[a-z0-9_]+$/.test(item.part) || typeof item.label !== "string") return undefined;
        const detachedLayer = /(?:^|_)(?:backer|face)$/.test(item.part);
        const part = nested ?? (fabric && !detachedLayer ? fabricLocation(item.part) ?? fabricLocation(item.label) : item.part);
        if (!part) return undefined;
        const attributes: Part["fields"] = {};
        for (const [componentKey, raw] of Object.entries(record(item.fields))) {
          const component = fieldsByKey.get(componentKey);
          if (component?.component !== (fabric ? "fabric" : "warmth")) continue;
          attributes[componentKey] = manualFabricValue(component, raw, evidence);
        }
        const result: Part = { part, label: item.label, fields: attributes, evidence: [evidence] };
        for (const layer of ["faces", "backers"] as const) {
          if (item[layer] === undefined) continue;
          if (nested || !fabric || !Array.isArray(item[layer])) return undefined;
          const layers = item[layer].map((entry) => readPart(entry, layer === "faces" ? "face" : "backer"));
          if (layers.some((entry) => entry === undefined)) return undefined;
          result[layer] = layers as Part[];
        }
        return result;
      }
      const records = original.map((input) => readPart(input));
      const parts = records.every((part) => part !== undefined) ? records : [];
      const layers = fabric ? parts.filter(({ part }) => /(?:^|_)(?:backer|face)$/.test(part)) : [];
      const parents = parts.filter((part) => !layers.includes(part));
      const assigned = layers.every((part) => {
        const legacy = part.part.match(/^(?:(.+)_)?(backer|face)$/)!;
        const label = part.label.match(/^(.+?)\s*(?:·|[-–])\s*(?:backer|face)$/i)?.[1];
        const namedOwner = legacy[1] ?? label;
        const owner = namedOwner ? fabricLocation(namedOwner) : undefined;
        const candidates = owner ? parents.filter(({ part }) => part === owner) : namedOwner ? [] : parents;
        if (candidates.length !== 1) return false;
        const parent = candidates[0];
        const key = legacy[2] === "face" ? "faces" : "backers";
        parent[key] = [...(parent[key] ?? []), { ...part, part: legacy[2] }];
        return true;
      });
      values[key] = parents.length && assigned ? known(parents, [evidence])
        : { state: "review", reviewCode: "needs_review", evidence: [evidence], note: "Manual parts are invalid or a backer has no unambiguous parent." };
      continue;
    }
    const parsed = parseManual(field, original, values[key]);
    values[key] = compatible(key, parsed.value) ? known(parsed.value, [evidence], parsed.reference)
      : { state: "review", evidence: [evidence], note: "Manual value does not match the field definition." };
  }
}

export function parametersOf(product: ProductDetail): Profile {
  return product.parameters ?? normalizeArcProduct(product);
}
