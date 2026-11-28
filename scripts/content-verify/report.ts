import {mkdir, writeFile} from "node:fs/promises";
import type {Brand} from "./data";
import {fields, snippet, type Result} from "./compare";

export type ProductAudit = {
  brand: Brand; sku: string; name: string; url: string | null; results: Result[];
};
export type Issue = {rule: string; brand?: Brand; sku?: string; detail: unknown};
export type Totals = {match: number; mismatch: number; unverifiable: number};

function totals(results: Result[]) {
  const counts: Totals = {match: 0, mismatch: 0, unverifiable: 0};
  for (const {status} of results) counts[status]++;
  return {...counts, accuracy: counts.match + counts.mismatch ? counts.match / (counts.match + counts.mismatch) : null};
}

export function summarize(products: ProductAudit[]) {
  const results = products.flatMap(({results}) => results);
  const byField = (items: Result[]) => Object.fromEntries(fields.map((field) => [field, totals(items.filter((r) => r.field === field))]));
  const byBrand = [...Map.groupBy(products, ({brand}) => brand)].map(([brand, items]) => {
    const values = items.flatMap(({results}) => results);
    return [brand, {products: items.length, total: totals(values), fields: byField(values)}] as const;
  });
  const reasons = Map.groupBy(results.filter(({status}) => status === "unverifiable"), ({reason}) => {
    if (reason?.startsWith("Not requested after crawl stop:")) return "Not requested after crawl stop";
    const http = reason?.match(/HTTP \d{3}/)?.[0];
    return http ?? reason ?? "Unknown";
  });
  return {total: totals(results), fields: byField(results), brands: Object.fromEntries(byBrand),
    unverifiableReasons: Object.fromEntries([...reasons].map(([reason, rows]) => [reason, rows.length]))};
}

export function failing(summary: ReturnType<typeof summarize>, stopped: string | null) {
  const {accuracy} = summary.total;
  return stopped !== null || accuracy === null || accuracy < 0.98 ||
    Object.values(summary.fields).some(({mismatch}) => mismatch > 3);
}

function markdown(report: {
  date: string; full: boolean; catalogSize: number; products: ProductAudit[]; issues: Issue[];
  stopped: string | null; summary: ReturnType<typeof summarize>;
}) {
  const {date, catalogSize, products, issues, summary, stopped} = report;
  const cell = (value: unknown) => (snippet(value) ?? "—").replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll("|", "&#124;").replace(/\r?\n/g, " ");
  const table = (values: Record<string, ReturnType<typeof totals>>) => [
    "| Field | Match | Mismatch | Unverifiable | Accuracy |", "| --- | ---: | ---: | ---: | ---: |",
    ...Object.entries(values).map(([field, row]) => `| ${field} | ${row.match} | ${row.mismatch} | ${row.unverifiable} | ${row.accuracy === null ? "—" : (100 * row.accuracy).toFixed(2) + "%"} |`),
  ].join("\n");
  const mismatches = fields.flatMap((field) => {
    const rows = products.flatMap((product) => product.results.filter((row) => row.field === field && row.status === "mismatch")
      .map((result) => ({product, result}))).slice(0, 10);
    return rows.length ? [`### ${field}`, ...rows.map(({product, result}) =>
      `- ${cell(product.name)} (${product.sku}) · Stored: ${cell(result.stored)} · Official: ${cell(result.official)} · Evidence: ${cell(result.evidence)} · ${cell(result.url)}`), ""] : [];
  });
  const rules = Map.groupBy(issues, ({rule}) => rule);
  return [
    `# Content verification · ${date}`, "",
    `${report.full ? "Full" : "Sampled"} verification: ${products.length} selected / ${catalogSize} catalog products.`,
    stopped ? `Crawl stopped: ${cell(stopped)}` : "Crawl completed.", "",
    table({Overall: summary.total, ...summary.fields}), "",
    ...Object.entries(summary.brands).flatMap(([brand, stats]) => [`## ${brand} · ${stats.products} selected`, "", table({Overall: stats.total, ...stats.fields}), ""]),
    "## Unverifiable checks", "",
    ...Object.entries(summary.unverifiableReasons).map(([reason, count]) => `- ${cell(reason)}: ${count}`), "",
    "## First 10 mismatches per field", "", ...(mismatches.length ? mismatches : ["None.", ""]),
    `## Offline rule findings · ${issues.length}`, "",
    ...[...rules].map(([rule, rows]) => `- ${rule}: ${rows.length}`), "",
    "See the JSON report for all individual results and offline findings.", "",
  ].join("\n");
}

export async function writeReport(input: Omit<Parameters<typeof markdown>[0], "summary">) {
  const summary = summarize(input.products);
  const report = {...input, summary, failed: failing(summary, input.stopped)};
  await mkdir("reports", {recursive: true});
  const path = `reports/content-verify-${input.date}`;
  await Promise.all([
    writeFile(path + ".json", JSON.stringify(report, null, 2) + "\n"),
    writeFile(path + ".md", markdown(report)),
  ]);
  return report;
}
