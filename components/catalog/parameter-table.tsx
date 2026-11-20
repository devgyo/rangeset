"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import {displayParameter, displayReference, englishMessage, listItem, localNote, partDisplay, useCopy, type Translator} from "@/i18n/copy";
import { ParameterHelp } from "./parameter-help";
import { fieldsByKey, groups as groupLabels, terms, type Field, type Term } from "@/lib/parameters/registry";
import { parameterStatus, visibleOnDetail, weightPresentation, type Evidence, type Parameter, type ParameterGroup, type Part } from "@/lib/parameters/model";

const SourcesContext = createContext({ visible: false, toggle: () => {} });

export function ParameterGroupSources({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  return <SourcesContext.Provider value={{ visible, toggle: () => setVisible((current) => !current) }}>
    {children}
  </SourcesContext.Provider>;
}

export function SourcesSwitch() {
  const {t} = useCopy();
  const { visible, toggle } = useContext(SourcesContext);
  return <button type="button" role="switch" aria-checked={visible} className="parameter-sources-switch" onClick={toggle}>
    {t("ui.show_sources")}
  </button>;
}

const localizedHelpLabels: Partial<Record<Term, string>> = {
  denier: "field.denier", ripstop: "construction.ripstop", stretch: "field.fabric_stretch", fill: "field.fill_power",
  gsm: "keep.g/m²", membrane: "field.membrane", dwr: "keep.dwr", upf: "keep.upf", hydrostatic: "field.hydrostatic_head",
  breathability: "field.breathability", recco: "keep.recco", pfas: "keep.pfas",
};

function Help({ term }: { term: Term }) {
  const {t, locale} = useCopy();
  const key = term.toLowerCase().replace(".", "_");
  const label = localizedHelpLabels[term];
  return <ParameterHelp label={locale !== "en" && label ? t(label) : t("help_label." + key)} text={t("help." + key)} />;
}

export function ParameterLabel({ field, label = field.label }: { field: Field; label?: string }) {
  const {t, locale} = useCopy();
  const text = label === field.label ? t("field." + field.key) : locale === "en" ? label : partDisplay(t, label);
  return <span className="parameter-label"><span>{text}</span>{field.help && <Help term={field.help} />}</span>;
}

const methods: Record<Evidence["method"], string> = {
  published: "ui.brand_source", parsed: "ui.parsed_brand_text", indexed: "ui.indexed_brand_value",
  manual: "ui.manual_override", example: "ui.example_data",
};
const groupNameKeys = Object.fromEntries(Object.entries(groupLabels).map(([key, label]) => [label, key]));
export const localGroup = (t: Translator, title: string) => t("group." + groupNameKeys[title]);

function SourceNotes({ evidence }: { evidence: Evidence[] }) {
  const { visible } = useContext(SourcesContext);
  if (!visible || !evidence.length) return null;
  const entries = [...new Map(evidence.map((source) => [JSON.stringify(source), source])).values()];
  return <ul lang="en" className="parameter-sources space-y-2">{entries.map((source, index) => <li key={index}>
    <span>{englishMessage(methods[source.method])} · {source.updatedAt ? <time dateTime={source.updatedAt}>{source.updatedAt.slice(0, 10)}</time> : englishMessage("ui.date_not_published")}</span>
    {source.url && /^https?:\/\//i.test(source.url) && <a className="spec-link block wrap-anywhere" href={source.url}>{source.url}</a>}
    <code className="block wrap-anywhere">{source.path}</code>
    <span className="block wrap-anywhere">{source.raw}</span>
  </li>)}</ul>;
}

function PartFields({ fields, withEvidence, comparison }: { fields: Part["fields"]; withEvidence: boolean; comparison: boolean }) {
  return <dl className="grid gap-1.5">
    {Object.entries(fields).sort(([a], [b]) => fieldsByKey.get(a)!.order - fieldsByKey.get(b)!.order).map(([key, value]) => {
      const definition = fieldsByKey.get(key)!;
      if (!comparison && !visibleOnDetail(definition, value)) return null;
      return <div key={key} data-parameter-row>
        <dt className="text-xs text-muted-foreground"><ParameterLabel field={definition} /></dt>
        <dd><ParameterValue field={definition} value={value} withEvidence={withEvidence} /></dd>
      </div>;
    })}
  </dl>;
}

function Parts({ parts, field, withEvidence, comparison }: { parts: Part[]; field: Field; withEvidence: boolean; comparison: boolean }) {
  const {t, locale} = useCopy();
  return <div className="parameter-parts">
    {parts.map((part, index) => <div key={index} className="parameter-part">
      <p className="mb-1 font-medium">{locale === "en" ? part.label : partDisplay(t, part.label)}</p>
      <PartFields fields={part.fields} withEvidence={withEvidence} comparison={comparison} />
      {withEvidence && !Object.keys(part.fields).length && <SourceNotes evidence={part.evidence} />}
    </div>)}
    {!parts.length && <span>{displayParameter(t, locale, field, {state: "unpublished", evidence: []})}</span>}
  </div>;
}

export function ParameterValue({ field, value, withEvidence = true, comparison = false }: { field: Field; value: Parameter; withEvidence?: boolean; comparison?: boolean }) {
  const {t, locale} = useCopy();
  if (value.entries) return <div className="grid gap-2">{value.entries.map((entry, index) =>
    <ParameterValue key={index} field={field} value={entry} withEvidence={withEvidence} comparison={comparison} />
  )}</div>;
  if (field.type === "parts" && value.state === "known") return <Parts parts={value.value as Part[]} field={field} withEvidence={withEvidence} comparison={comparison} />;
  const text = displayParameter(t, locale, field, value);
  const reference = displayReference(t, field, value);
  const status = parameterStatus(field, value);
  const statusKey = value.state === "unpublished" ? "unpublished" : value.value === true ? "yes" : "no";
  const weightHelp = field.key === "weight" && !comparison && value.state === "known" && weightPresentation(value).referenceMissing
    ? t("help.weight_size") : "";
  const tech = field.format === "layers" && value.state === "known" && Object.hasOwn(terms, text) ? text as Term : undefined;
  const numeric = ["number", "denier", "money", "layers"].includes(field.format);
  return <div className="min-w-0">
    {status && value.state !== "inapplicable"
      ? <span data-parameter-inline><ParameterHelp label={locale === "en" ? t("status." + (statusKey === "unpublished" ? "missing" : statusKey)) : text} text={t("status_description." + statusKey)} symbol={text} /></span>
      : field.type === "list" && value.state === "known"
      ? <ul className="grid gap-1" data-parameter-value>{(value.value as string[]).map((item, index) => <li key={index}>
        {field.key === "weave" && item === "Ripstop" ? <span data-parameter-inline><span data-parameter-value>{listItem(t, field, item)}</span> <Help term="ripstop" /></span> : listItem(t, field, item)}
      </li>)}</ul>
      : <span data-parameter-inline={tech || weightHelp ? "" : undefined} className={value.state === "known" ? numeric ? "font-mono tabular-nums" : undefined : value.state === "review" || value.state === "conflict" ? "text-[#f3cf92]" : "text-muted-foreground"}>
        <span data-parameter-value>{text}</span>{tech && <Help term={tech} />}
        {weightHelp && <ParameterHelp label={t("ui.weight_reference")} text={weightHelp} />}
      </span>}
    {reference && <p className="text-xs text-muted-foreground">{reference}</p>}
    {value.note && <p className="text-xs text-muted-foreground">{localNote(t, value.note)}</p>}
    {withEvidence && <SourceNotes evidence={value.evidence} />}
  </div>;
}

export function ParameterLegend() {
  const {t} = useCopy();
  return <ul aria-label={t("ui.legend")} className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
    {["yes", "no", "unpublished", "na"].map((key) => <li key={key}>{t("symbol." + key)}</li>)}
  </ul>;
}

export function ParameterSections({ groups }: { groups: ParameterGroup[] }) {
  const {t} = useCopy();
  return <div className="parameter-sections grid gap-5 lg:grid-cols-2 lg:items-start">
    {groups.map(({ title, rows }) => (
      <ParameterGroupSources key={title}>
        <section aria-label={localGroup(t, title)} className={`min-w-0 border bg-card px-3.5 py-4 sm:px-5 ${title === "Supplementary source text" || rows.some(({ field }) => field.type === "parts") ? "lg:col-span-2" : ""}`}>
          <div className="parameter-group-heading mb-3">
            <h3 className="font-semibold">{localGroup(t, title)}</h3>
            <SourcesSwitch />
          </div>
          {title === "Supplementary source text" ? <details>
            <summary className="cursor-pointer text-sm text-muted-foreground">{t("ui.read_original_text")}</summary>
            <SectionRows rows={rows} />
          </details> : <SectionRows rows={rows} />}
        </section>
      </ParameterGroupSources>
    ))}
  </div>;
}

function SectionRows({ rows }: { rows: ParameterGroup["rows"] }) {
  const {t} = useCopy();
  const sections: { title?: string; rows: ParameterGroup["rows"] }[] = [];
  for (const row of rows) {
    const last = sections.at(-1);
    if (last && last.title === row.subgroup) last.rows.push(row);
    else sections.push({ title: row.subgroup, rows: [row] });
  }
  return <div className="space-y-4">{sections.map(({ title, rows: sectionRows }) => <div key={sectionRows[0].key}>
    {title && <h4 className="mb-2 text-sm font-medium">{partDisplay(t, title)}</h4>}
    <dl>{sectionRows.map(({ key, field, label, cells }) => <div key={key} data-parameter-row className={field.type === "parts" ? "border-t py-3 text-sm" : "detail-row"}>
      <dt className="text-muted-foreground"><ParameterLabel field={field} label={label} /></dt>
      <dd className={field.type === "parts" ? "mt-2" : "min-w-0"}><ParameterValue field={field} value={cells[0]} /></dd>
    </div>)}</dl>
  </div>)}</div>;
}
