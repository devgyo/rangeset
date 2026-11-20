"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { ParameterHelp } from "./parameter-help";
import { fieldsByKey, terms, type Field, type Term } from "@/lib/parameters/registry";
import { formatReference, formatValue, type Evidence, type Parameter, type ParameterGroup, type Part } from "@/lib/parameters/model";

const SourcesContext = createContext({ visible: false, toggle: () => {} });

export function ParameterGroupSources({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  return <SourcesContext.Provider value={{ visible, toggle: () => setVisible((current) => !current) }}>
    {children}
  </SourcesContext.Provider>;
}

export function SourcesSwitch() {
  const { visible, toggle } = useContext(SourcesContext);
  return <button type="button" role="switch" aria-checked={visible} className="parameter-sources-switch" onClick={toggle}>
    Show sources
  </button>;
}

function Help({ term }: { term: Term }) {
  return <ParameterHelp label={terms[term].label} text={terms[term].text} />;
}

export function ParameterLabel({ field, label = field.label }: { field: Field; label?: string }) {
  return <span className="parameter-label"><span>{label}</span>{field.help && <Help term={field.help} />}</span>;
}

const methods: Record<Evidence["method"], string> = {
  published: "Brand source", parsed: "Parsed brand text", indexed: "Indexed brand value", manual: "Manual override", example: "Example data",
};

function SourceNotes({ evidence }: { evidence: Evidence[] }) {
  const { visible } = useContext(SourcesContext);
  if (!visible || !evidence.length) return null;
  const entries = [...new Map(evidence.map((source) => [JSON.stringify(source), source])).values()];
  return <ul className="parameter-sources space-y-2">{entries.map((source, index) => <li key={index}>
    <span>{methods[source.method]} · {source.updatedAt ? <time dateTime={source.updatedAt}>{source.updatedAt.slice(0, 10)}</time> : "Date not published"}</span>
    {source.url && /^https?:\/\//i.test(source.url) && <a className="spec-link block wrap-anywhere" href={source.url}>{source.url}</a>}
    <code className="block wrap-anywhere">{source.path}</code>
    <span className="block wrap-anywhere">{source.raw}</span>
  </li>)}</ul>;
}

function PartFields({ fields, withEvidence }: { fields: Part["fields"]; withEvidence: boolean }) {
  return <dl className="grid gap-1.5">
    {Object.entries(fields).sort(([a], [b]) => fieldsByKey.get(a)!.order - fieldsByKey.get(b)!.order).map(([key, value]) => {
      const definition = fieldsByKey.get(key)!;
      return <div key={key} data-parameter-row>
        <dt className="text-xs text-muted-foreground"><ParameterLabel field={definition} /></dt>
        <dd><ParameterValue field={definition} value={value} withEvidence={withEvidence} /></dd>
      </div>;
    })}
  </dl>;
}

function Parts({ parts, field, withEvidence }: { parts: Part[]; field: Field; withEvidence: boolean }) {
  return <div className="parameter-parts">
    {parts.map((part, index) => <div key={index} className="parameter-part">
      <p className="mb-1 font-medium">{part.label}</p>
      <PartFields fields={part.fields} withEvidence={withEvidence} />
      {part.backers && part.backers.length > 0 && <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-2 border-t pt-2">
        <dt className="font-medium">Backer</dt>
        <dd className="min-w-0 space-y-2">
          {part.backers.map((backer, index) => <div key={index}>
            {backer.label !== "Backer" && <p className="text-xs text-muted-foreground">{backer.label}</p>}
            <PartFields fields={backer.fields} withEvidence={withEvidence} />
            {withEvidence && !Object.keys(backer.fields).length && <SourceNotes evidence={backer.evidence} />}
          </div>)}
        </dd>
      </dl>}
      {withEvidence && !Object.keys(part.fields).length && <SourceNotes evidence={part.evidence} />}
    </div>)}
    {!parts.length && <span>{formatValue(field, { state: "unpublished", evidence: [] })}</span>}
  </div>;
}

export function ParameterValue({ field, value, withEvidence = true }: { field: Field; value: Parameter; withEvidence?: boolean }) {
  if (field.type === "parts" && value.state === "known") return <Parts parts={value.value as Part[]} field={field} withEvidence={withEvidence} />;
  const text = formatValue(field, value);
  const reference = formatReference(field, value);
  const tech = field.format === "layers" && value.state === "known" && Object.hasOwn(terms, text) ? text as Term : undefined;
  const numeric = ["number", "denier", "money", "layers"].includes(field.format);
  return <div className="min-w-0">
    {field.type === "list" && value.state === "known"
      ? <ul className="grid gap-1" data-parameter-value>{(value.value as string[]).map((item, index) => <li key={index}>{item}</li>)}</ul>
      : <span data-parameter-inline={tech ? "" : undefined} className={value.state === "known" ? numeric ? "font-mono tabular-nums" : undefined : value.state === "review" || value.state === "conflict" ? "text-[#f3cf92]" : "text-muted-foreground"}>
        <span data-parameter-value>{text}</span>{tech && <Help term={tech} />}
      </span>}
    {reference && <p className="text-xs text-muted-foreground">{reference}</p>}
    {value.note && <p className="text-xs text-muted-foreground">{value.note}</p>}
    {withEvidence && <SourceNotes evidence={value.evidence} />}
  </div>;
}

export function ParameterSections({ groups }: { groups: ParameterGroup[] }) {
  return <div className="parameter-sections grid gap-5 lg:grid-cols-2 lg:items-start">
    {groups.map(({ title, rows }) => (
      <ParameterGroupSources key={title}>
        <section aria-label={title} className={`min-w-0 border bg-card px-3.5 py-4 sm:px-5 ${title === "Supplementary source text" || rows.some(({ field }) => field.type === "parts") ? "lg:col-span-2" : ""}`}>
          <div className="parameter-group-heading mb-3">
            <h3 className="font-semibold">{title}</h3>
            <SourcesSwitch />
          </div>
          {title === "Supplementary source text" ? <details>
            <summary className="cursor-pointer text-sm text-muted-foreground">Read original text</summary>
            <SectionRows rows={rows} />
          </details> : <SectionRows rows={rows} />}
        </section>
      </ParameterGroupSources>
    ))}
  </div>;
}

function SectionRows({ rows }: { rows: ParameterGroup["rows"] }) {
  return <dl>{rows.map(({ key, field, label, cells }) => <div key={key} data-parameter-row className={field.type === "parts" ? "border-t py-3 text-sm" : "detail-row"}>
    <dt className="text-muted-foreground"><ParameterLabel field={field} label={label} /></dt>
    <dd className={field.type === "parts" ? "mt-2" : "min-w-0"}><ParameterValue field={field} value={cells[0]} /></dd>
  </div>)}</dl>;
}
