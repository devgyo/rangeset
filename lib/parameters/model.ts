import { mergeListValues } from "./merge";
import { appliesTo, fieldsByKey, groups, registry, type Context, type Field } from "./registry";

export type Evidence = {
  url: string | null; path: string; raw: string; method: "published" | "parsed" | "indexed" | "manual" | "example";
  updatedAt: string | null;
};
export type Reference = { size?: string; gender?: string; basis?: "single" | "pair" | "item" | "unspecified"; method?: string; unit?: string | null; kind?: string };
export type Fiber = { name: string; percent: number };
export type Part = { part: string; label: string; fields: Record<string, Parameter>; evidence: Evidence[]; backers?: Part[] };
export type Value = string | number | boolean | string[] | number[] | Fiber[] | Part[];
export type State = "known" | "unpublished" | "inapplicable" | "conflict" | "review";
export type Parameter = { state: State; value?: Value; evidence: Evidence[]; reference?: Reference; note?: string };
export type Profile = { context: Context; values: Record<string, Parameter> };
export const statusLabels: Record<State, string> = {
  known: "Published", unpublished: "Not published", inapplicable: "Not applicable",
  conflict: "Conflicting sources", review: "Needs verification",
};

export const known = (value: Value, evidence: Evidence[], reference?: Reference): Parameter => ({ state: "known", value, evidence, reference });
export const missing = (state: State = "unpublished"): Parameter => ({ state, evidence: [] });
export function getParameter(profile: Profile, field: Field): Parameter {
  return profile.values[field.key] ?? missing(appliesTo(field.applies, profile.context) ? "unpublished" : "inapplicable");
}

const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
export function formatValue(field: Field, parameter: Parameter): string {
  const { value, reference } = parameter;
  if (parameter.state !== "known" || value === undefined) return statusLabels[parameter.state];
  if (field.format === "denier") return (value as number[]).join(" × ") + " D";
  if (field.format === "composition") return (value as Fiber[]).map(({ percent, name }) => `${number.format(percent)}% ${name}`).join(" · ");
  if (field.format === "money") {
    if (!reference?.unit) return number.format(Number(value));
    if (!/^[A-Z]{3}$/.test(reference.unit)) return `${number.format(Number(value))} ${reference.unit}`;
    return new Intl.NumberFormat("en-US", { style: "currency", currency: reference.unit, maximumFractionDigits: 2, minimumFractionDigits: 0 }).format(Number(value));
  }
  if (field.options) return field.options[String(value)] ?? String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return [number.format(value), (reference?.unit === null ? null : reference?.unit ?? field.unit)].filter(Boolean).join(" ");
  return Array.isArray(value) ? value.join(" · ") : value;
}

export function formatReference(field: Field, { reference }: Parameter) {
  if (!reference) return "";
  const basis = reference.basis === "single" ? "One shoe" : reference.basis === "pair" ? "Pair"
    : field.key === "weight" && reference.kind === "footwear" ? "Weight basis not published" : "";
  const size = reference.size ? `Size ${reference.size}` : "";
  return [size, basis, reference.method].filter(Boolean).join(" · ");
}

const normalize = (text: string) => text.replace(/[®™]/g, "").normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();

function canonical(parameter: Parameter, field: Field): unknown {
  if (parameter.state !== "known") return parameter.state;
  const value = parameter.value;
  if (field.type === "parts" && Array.isArray(value)) return canonicalParts(value as Part[]);
  if (field.type === "composition" && Array.isArray(value)) {
    return (value as Fiber[]).map(({ name, percent }) => JSON.stringify([normalize(name), percent])).sort();
  }
  if (field.type === "list" && Array.isArray(value)) return [...new Set(mergeListValues(field.key, value as string[]).map(normalize))].sort();
  return typeof value === "string" ? normalize(value) : value;
}

function canonicalParts(parts: Part[]): string[] {
  return parts.map((part) => JSON.stringify([part.part, Object.entries(part.fields).sort(([a], [b]) => a.localeCompare(b))
    .map(([key, detail]) => [key, canonical(detail, fieldsByKey.get(key)!)]), canonicalParts(part.backers ?? [])])).sort();
}

function unresolvedPart(part: Part): boolean {
  return Object.entries(part.fields).some(([key, value]) => unresolved(value, fieldsByKey.get(key)!)) ||
    Boolean(part.backers?.some(unresolvedPart));
}

function unresolved(parameter: Parameter, field: Field): boolean {
  if (parameter.state === "conflict" || parameter.state === "review") return true;
  return field.type === "parts" && parameter.state === "known" &&
    (parameter.value as Part[]).some(unresolvedPart);
}

export function compareValues(field: Field, values: Parameter[]): { differs: boolean; note?: string } {
  const present = values.filter((item) => item.state === "known");
  if (values.some((item) => item.state === "inapplicable") && values.some((item) => item.state !== "inapplicable"))
    return { differs: false, note: "Applies to different product types" };
  if (values.some((item) => unresolved(item, field))) return { differs: false, note: "Verify the source values before comparing" };
  if (present.length < 2) return { differs: false };
  if (field.type === "parts") {
    const components = present.map((item) => item.value as Part[]);
    for (const definition of registry.filter(({ component, compare }) => component && compare === "method")) {
      const entries = components.flatMap((parts) => parts.flatMap(({ fields }) => fields[definition.key] ?? []));
      // A published method is required before a difference in a test result can be interpreted.
      if (new Set(entries.map(({ value }) => value)).size > 1 && compareValues(definition, entries).note)
        return { differs: false, note: "Different or unpublished test methods for component measurements" };
    }
  }
  if (field.compare === "measurement") {
    const contexts = present.map((item) => item.reference ?? {});
    const first = contexts[0];
    const same = contexts.every((ref) => normalize(ref.size ?? "") === normalize(first.size ?? "") &&
      (ref.size ? ref.gender === first.gender : true) && ref.basis === first.basis &&
      (field.key !== "weight" || (ref.kind === "footwear") === (first.kind === "footwear")));
    if (!same || (field.key !== "weight" && !first.size) || (first.kind === "footwear" && !["single", "pair"].includes(first.basis ?? "")))
      return { differs: false, note: "Different or unpublished measurement references" };
  }
  if (field.compare === "method") {
    const first = present[0].reference;
    const defined = field.key === "msrp" ? first?.unit : first?.method && (field.key !== "fill_power" || first.unit);
    if (!defined || present.some((item) => item.reference?.unit !== first?.unit || item.reference?.method !== first?.method))
      return { differs: false, note: field.key === "msrp" ? "Different or unpublished currencies" : "Different or unpublished test methods" };
  }
  if (field.key === "down_ratio" && new Set(present.map(({ reference }) => reference?.method ?? "")).size > 1)
    return { differs: false, note: "Different down-content reporting bases" };
  if (field.compare === "reference" && new Set(present.map(({ reference }) => reference?.gender ?? "")).size > 1)
    return { differs: false, note: "Sizes refer to different fit ranges" };
  return { differs: new Set(present.map((item) => JSON.stringify(canonical(item, field)))).size > 1 };
}

export type ParameterRow = { key: string; field: Field; label: string; cells: Parameter[]; differs: boolean; note?: string };
export type ParameterGroup = { title: string; rows: ParameterRow[] };
const partLabels: Record<string, string> = {
  main: "Main fabric", contrast: "Contrast fabric", lining: "Lining", reinforcement: "Reinforcement",
  backer: "Backer", upper: "Upper", outsole: "Outsole", midsole: "Midsole",
  down: "Down fill", synthetic: "Synthetic fill", body: "Body", sleeves: "Sleeves", hood: "Hood",
};

export function parameterGroups(profiles: Profile[]): ParameterGroup[] {
  if (!profiles.length) return [];
  return Object.entries(groups).flatMap(([key, title]) => {
    const rows = registry.filter((field) => field.group === key && !field.component).sort((a, b) => a.order - b.order)
      .flatMap((field): ParameterRow[] => {
        const cells = profiles.map((profile) => getParameter(profile, field));
        if (cells.every((item) => item.state === "inapplicable")) return [];
        if (field.optional && cells.every((item) => item.state === "unpublished")) return [];
        const parts = field.type === "parts" ? cells.flatMap((item) => item.state === "known" ? item.value as Part[] : []) : [];
        if (!parts.length || profiles.length === 1) return [{ key: field.key, field, label: field.label, cells, ...compareValues(field, cells) }];
        return [...new Set(parts.map(({ part }) => part))].sort().map((part) => {
          const aligned = cells.map((item) => {
            if (item.state !== "known") return item;
            const matches = (item.value as Part[]).filter((entry) => entry.part === part);
            return matches.length ? known(matches, matches.flatMap((record) => record.evidence)) : missing();
          });
          return { key: field.key + "." + part, field, label: partLabels[part] ?? parts.find((entry) => entry.part === part)!.label, cells: aligned, ...compareValues(field, aligned) };
        });
      });
    return rows.length ? [{ title, rows }] : [];
  });
}

export function keyParameters(profile: Profile) {
  return registry.filter((field) => field.highlight?.some((scope) => appliesTo(scope, profile.context)) && appliesTo(field.applies, profile.context))
    .sort((a, b) => Number(getParameter(profile, b).state === "known") - Number(getParameter(profile, a).state === "known"))
    .slice(0, 6);
}
