import type {Parameter, ParameterGroup, Part} from "./parameters/model";
import {fieldsByKey, groups, type Field} from "./parameters/registry";

function withoutPartEvidence(part: Part): Part {
  return {
    ...part,
    evidence: [],
    fields: Object.fromEntries(Object.entries(part.fields).map(([key, value]) =>
      [key, withoutParameterEvidence(fieldsByKey.get(key)!, value)])),
    backers: part.backers?.map(withoutPartEvidence),
    faces: part.faces?.map(withoutPartEvidence),
  };
}

export function withoutParameterEvidence(field: Field, parameter: Parameter): Parameter {
  const value = parameter.state !== "known" ? undefined
    : field.type === "parts" ? (parameter.value as Part[]).map(withoutPartEvidence) : parameter.value;
  return {
    ...parameter,
    value,
    evidence: [],
    entries: parameter.entries?.map((entry) => withoutParameterEvidence(field, entry)),
  };
}

export function publicParameterGroups(sections: ParameterGroup[]): ParameterGroup[] {
  return sections.filter(({title}) => title !== groups.supplemental).map(({title, rows}) => ({
    title,
    rows: rows.map((row) => ({
      ...row,
      cells: row.cells.map((value) => withoutParameterEvidence(row.field, value)),
    })),
  }));
}
