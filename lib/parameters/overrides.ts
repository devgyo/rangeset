import {record, type ProductDetail} from "../product-view";
import {compositionValue, constructions, fabricLocation, fabricWeight, parseDenier} from "./fabric";
import {known, type Evidence, type Fiber, type Parameter, type Part, type Profile, type Reference} from "./model";
import {fieldsByKey, type Field} from "./registry";
import {comparisonText, compatible, convert, scalarKeys} from "./normalization";

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

export function applyOverrides(values: Profile["values"], product: ProductDetail, overrides: Map<string, unknown>) {
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
