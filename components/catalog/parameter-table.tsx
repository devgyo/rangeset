import {cn} from "@/lib/utils";
import {displayParameter, displayReference, listItem, localNote, partDisplay, useCopy, type Translator} from "@/i18n/copy";
import {keyedItems} from "./list-keys";
import { ParameterHelp } from "./parameter-help";
import { fieldsByKey, groups as groupLabels, terms, type Field, type Term } from "@/lib/parameters/registry";
import { parameterStatus, visibleOnDetail, weightPresentation, type Parameter, type ParameterGroup, type Part } from "@/lib/parameters/model";

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

const groupNameKeys = Object.fromEntries(Object.entries(groupLabels).map(([key, label]) => [label, key]));
export const localGroup = (t: Translator, title: string) => t("group." + groupNameKeys[title]);

function PartFields({ fields, comparison }: { fields: Part["fields"]; comparison: boolean }) {
  return <dl className="grid gap-1.5">
    {Object.entries(fields).sort(([a], [b]) => fieldsByKey.get(a)!.order - fieldsByKey.get(b)!.order).map(([key, value]) => {
      const definition = fieldsByKey.get(key)!;
      if (!comparison && !visibleOnDetail(definition, value)) return null;
      return <div key={key} data-parameter-row>
        <dt className="text-xs text-muted-foreground"><ParameterLabel field={definition} /></dt>
        <dd><ParameterValue field={definition} value={value} /></dd>
      </div>;
    })}
  </dl>;
}

function displayIdentity(value: Part | Parameter) {
  return JSON.stringify(value, (key, item) => key === "evidence" ? undefined : item);
}

function Parts({ parts, field, comparison }: { parts: Part[]; field: Field; comparison: boolean }) {
  const {t, locale} = useCopy();
  return <div className="parameter-parts">
    {keyedItems(parts, displayIdentity).map(([key, part]) => <div key={key} className="parameter-part">
      <p className="mb-1 font-medium">{locale === "en" ? part.label : partDisplay(t, part.label)}</p>
      <PartFields fields={part.fields} comparison={comparison} />
    </div>)}
    {!parts.length && <span>{displayParameter(t, locale, field, {state: "unpublished", evidence: []})}</span>}
  </div>;
}

export function ParameterValue({ field, value, comparison = false }: { field: Field; value: Parameter; comparison?: boolean }) {
  const {t, locale} = useCopy();
  if (value.entries) return <div className="grid gap-2">{keyedItems(value.entries, displayIdentity).map(([key, entry]) =>
    <ParameterValue key={key} field={field} value={entry} comparison={comparison} />
  )}</div>;
  if (field.type === "parts" && value.state === "known") return <Parts parts={value.value as Part[]} field={field} comparison={comparison} />;
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
      ? <ul className="grid gap-1" data-parameter-value>{keyedItems(value.value as string[], (item) => item).map(([key, item]) => <li key={key}>
        {field.key === "weave" && item === "Ripstop" ? <span data-parameter-inline><span data-parameter-value>{listItem(t, field, item)}</span> <Help term="ripstop" /></span> : listItem(t, field, item)}
      </li>)}</ul>
      : <span data-parameter-inline={tech || weightHelp ? "" : undefined} className={value.state === "known" ? numeric ? "font-mono tabular-nums" : undefined : value.state === "review" || value.state === "conflict" ? "text-[#f3cf92]" : "text-muted-foreground"}>
        <span data-parameter-value>{text}</span>{tech && <Help term={tech} />}
        {weightHelp && <ParameterHelp label={t("ui.weight_reference")} text={weightHelp} />}
      </span>}
    {reference && <p className="text-xs text-muted-foreground">{reference}</p>}
    {value.note && <p className="text-xs text-muted-foreground">{localNote(t, value.note)}</p>}
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
      <section key={title} aria-label={localGroup(t, title)} className={cn("min-w-0 border bg-card px-3.5 py-4 sm:px-5", rows.some(({field}) => field.type === "parts") && "lg:col-span-2")}>
        <h3 className="mb-3 font-semibold">{localGroup(t, title)}</h3>
        <SectionRows rows={rows} />
      </section>
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
