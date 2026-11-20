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
  if (!appliesTo(field.applies, profile.context)) return missing("inapplicable");
  return profile.values[field.key] ?? missing();
}

export const featureStatuses = {
  yes: { text: "●", label: "Yes", description: "The brand explicitly lists this feature." },
  no: { text: "○", label: "No", description: "The brand explicitly says this feature is absent." },
  unpublished: { text: "—", label: "Not published", description: "The brand has not published enough information to confirm this value." },
  inapplicable: { text: "N/A", label: "Not applicable", description: "This parameter does not apply to this product." },
} as const;

export function parameterStatus(field: Field, parameter: Parameter) {
  if (parameter.state === "inapplicable" || parameter.state === "unpublished") return featureStatuses[parameter.state];
  if (field.type === "boolean" && parameter.state === "known") {
    if (parameter.value === true) return featureStatuses.yes;
    if (parameter.value === false) return featureStatuses.no;
  }
}

export const weightReferenceNote = "Reference size not published";
const shoeBasisNote = "The brand does not say whether the weight is for one shoe or a pair.";
export function weightPresentation(parameter: Parameter) {
  const ref = parameter.reference;
  if (parameter.state !== "known") return { suffix: "", detailHelp: "", referenceMissing: parameter.state !== "inapplicable" && !ref?.size?.trim(), basisMissing: false };
  const size = ref?.size?.trim();
  const basis = ref?.basis === "single" ? "per shoe" : ref?.basis === "pair" ? "pair" : "";
  const basisMissing = ref?.kind === "footwear" && !basis;
  return {
    suffix: [size, basis].filter(Boolean).join(", "),
    detailHelp: [
      !size && "The brand does not state which size was weighed; treat as approximate.",
      basisMissing && shoeBasisNote,
    ].filter(Boolean).join(" "),
    referenceMissing: !size,
    basisMissing,
  };
}

const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
export function formatMoney(value: number, currency: string | null | undefined) {
  if (!currency) return number.format(value);
  const amount = /^[A-Z]{3}$/.test(currency)
    ? new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2, minimumFractionDigits: 0 }).format(value)
    : number.format(value);
  return `${amount} ${currency}`;
}
export function formatValue(field: Field, parameter: Parameter): string {
  const { value, reference } = parameter;
  const status = parameterStatus(field, parameter);
  if (status) return status.text;
  if (parameter.state !== "known" || value === undefined) return parameter.state === "review" && field.reviewLabel ? field.reviewLabel : statusLabels[parameter.state];
  if (field.format === "denier") return (value as number[]).join(" × ") + " D";
  if (field.format === "composition") return (value as Fiber[]).map(({ percent, name }) => `${number.format(percent)}% ${name}`).join(" · ");
  if (field.format === "money") return formatMoney(Number(value), reference?.unit);
  if (field.options) return field.options[String(value)] ?? String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") {
    const amount = [number.format(value), (reference?.unit === null ? null : reference?.unit ?? field.unit)].filter(Boolean).join(" ");
    const suffix = field.key === "weight" ? weightPresentation(parameter).suffix : "";
    return suffix ? `${amount} (${suffix})` : amount;
  }
  return Array.isArray(value) ? value.join(" · ") : value;
}

export function formatReference(field: Field, { reference }: Parameter) {
  if (!reference || field.key === "weight") return "";
  const size = reference.size ? `Size ${reference.size}` : "";
  return [size, reference.method].filter(Boolean).join(" · ");
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

type Comparison = { differs: boolean; weakDifference?: boolean; note?: string };

export function compareValues(field: Field, values: Parameter[]): Comparison {
  const applicable = values.filter(({ state }) => state !== "inapplicable");
  const present = applicable.filter(({ state }) => state === "known");
  const weakDifference = present.length > 0 && applicable.some(({ state }) => state === "unpublished");
  const result = applicable.some((item) => unresolved(item, field))
    ? { differs: false, note: "Verify the source values before comparing" }
    : compareKnownValues(field, present);
  return {
    ...result,
    weakDifference,
    note: [weakDifference && "Cannot compare unpublished values", result.note,
      applicable.length < values.length && applicable.length > 0 && "Applies to different product types"].filter(Boolean).join(". ") || undefined,
  };
}

function compareKnownValues(field: Field, present: Parameter[]): Comparison {
  if (present.length < 2) return { differs: false };
  if (field.type === "parts") {
    const components = present.map((item) => item.value as Part[]);
    for (const definition of registry.filter(({ component, compare }) => component && compare === "method")) {
      const entries = components.flatMap((parts) => parts.flatMap(({ fields }) => fields[definition.key] ?? []));
      // A published method is required before a difference in a test result can be interpreted.
      if (new Set(entries.map(({ value }) => value)).size > 1 && compareKnownValues(definition, entries.filter(({ state }) => state === "known")).note)
        return { differs: false, note: "Different or unpublished test methods for component measurements" };
    }
  }
  if (field.compare === "measurement") {
    const contexts = present.map((item) => item.reference ?? {});
    const first = contexts[0];
    const sized = contexts.filter((ref) => ref.size?.trim());
    const firstSized = sized[0];
    const sameSize = sized.every((ref) => normalize(ref.size!) === normalize(firstSized.size!) && ref.gender === firstSized.gender);
    const sameBasis = contexts.every((ref) => ref.basis === first.basis && (ref.kind === "footwear") === (first.kind === "footwear"));
    if (!sameSize || !sameBasis || (field.key !== "weight" && sized.length !== contexts.length) ||
        (first.kind === "footwear" && !["single", "pair"].includes(first.basis ?? "")))
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

export type ParameterRow = Comparison & { key: string; field: Field; label: string; cells: Parameter[]; referenceNote?: string };
export type ParameterGroup = { title: string; rows: ParameterRow[] };
const partLabels: Record<string, string> = {
  main: "Main fabric", contrast: "Contrast fabric", lining: "Lining", reinforcement: "Reinforcement",
  backer: "Backer", upper: "Upper", outsole: "Outsole", midsole: "Midsole",
  down: "Down fill", synthetic: "Synthetic fill", body: "Body", sleeves: "Sleeves", hood: "Hood",
};

export function visibleOnDetail(field: Field, value: Parameter) {
  return !field.dataOnly && (value.state === "known" || (field.core && value.state === "unpublished") ||
    (field.key === "product_type" && value.state === "review"));
}

export function visibleInComparison(row: ParameterRow, differencesOnly: boolean) {
  return !differencesOnly || row.differs || Boolean(row.weakDifference);
}

export function parameterGroups(profiles: Profile[], mode: "detail" | "compare" = profiles.length === 1 ? "detail" : "compare"): ParameterGroup[] {
  if (!profiles.length) return [];
  return Object.entries(groups).flatMap(([key, title]) => {
    const rows = registry.filter((field) => field.group === key && !field.component && !field.dataOnly).sort((a, b) => a.order - b.order)
      .flatMap((field): ParameterRow[] => {
        const cells = profiles.map((profile) => getParameter(profile, field));
        if (mode === "detail" ? !visibleOnDetail(field, cells[0]) : !cells.some(({ state }) => state === "known")) return [];
        const parts = field.type === "parts" ? cells.flatMap((item) => item.state === "known" ? item.value as Part[] : []) : [];
        if (mode === "detail") return [{ key: field.key, field, label: field.label, cells, differs: false }];
        if (!parts.length) {
          const weights = field.key === "weight" ? cells.map(weightPresentation) : [];
          const referenceNote = [
            weights.some(({ referenceMissing }) => referenceMissing) && weightReferenceNote,
            weights.some(({ basisMissing }) => basisMissing) && "Shoe weight basis not published (per shoe or pair)",
          ].filter(Boolean).join(" · ");
          return [{ key: field.key, field, label: field.label, cells, referenceNote, ...compareValues(field, cells) }];
        }
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
  return registry.filter((field) => field.highlight?.some((scope) => appliesTo(scope, profile.context)) && visibleOnDetail(field, getParameter(profile, field)))
    .sort((a, b) => Number(getParameter(profile, b).state === "known") - Number(getParameter(profile, a).state === "known"))
    .slice(0, 6);
}
