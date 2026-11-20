import {readFileSync, writeFileSync} from "node:fs";
import {parse} from "csv-parse/sync";
import {arcTaxonomy} from "../lib/brands/arcteryx-taxonomy";
import {record} from "../lib/product-view";
import {classifyTaxonomy, consistentTaxonomy} from "../lib/taxonomy";
import {catalogSource} from "../lib/catalog/product";
import type {FixtureRow} from "../lib/catalog/fixture";

type Reference = {brand_category: string; name: string; gender: string; leaf: string; status: string};
const reference = (parse(readFileSync("docs/taxonomy-arcteryx-mapping.csv"), {columns: true}) as Reference[])
  .filter(({brand_category}) => brand_category !== "Footwear");
const rows = JSON.parse(readFileSync("data/arcteryx-local.json", "utf8")) as FixtureRow[];
const products = consistentTaxonomy(rows.map((entry) => {
  const row = catalogSource(entry);
  const taxonomy = classifyTaxonomy(arcTaxonomy(row, record(row.payload), row.overrides), row.overrides.get("parameters.taxonomy"));
  return {...row, taxonomy};
})).filter(({category, taxonomy}) => category !== "Footwear" && !(taxonomy.state === "hidden" && taxonomy.reason === "Footwear"));

const comparisonKey = (name: string, gender: string | null, category: string | null) =>
  [name.normalize("NFKC").trim().replace(/\s+/g, " "), ({men: "m", women: "w", unisex: "u"} as Record<string, string>)[gender ?? ""] ?? gender, category].join("|");
const code = (taxonomy: typeof products[number]["taxonomy"]) => taxonomy.state === "classified" ? taxonomy.leaf : taxonomy.state;
const grouped = new Map<string, Reference[]>();
for (const item of reference) {
  const key = comparisonKey(item.name, item.gender, item.brand_category);
  if (!grouped.has(key)) grouped.set(key, []);
  grouped.get(key)!.push(item);
}

const diffs: string[] = [];
const unmatched: typeof products = [];
const matches = new Set<string>();
const available = new Map<string, typeof products>();
for (const product of products) {
  const key = comparisonKey(product.name, product.gender, product.category);
  if (!available.has(key)) available.set(key, []);
  available.get(key)!.push(product);
}
for (const [key, expected] of grouped) {
  const items = [...(available.get(key) ?? [])];
  const remaining = expected.filter((entry) => {
    const index = items.findIndex(({taxonomy}) => code(taxonomy) === entry.leaf ||
      (taxonomy.state === "needs_review" && entry.status === "review"));
    if (index < 0) return true;
    matches.add(items[index].slug);
    items.splice(index, 1);
    return false;
  });
  for (const entry of remaining) {
    const product = items.shift();
    if (product) matches.add(product.slug);
    diffs.push(`| ${entry.name} | ${entry.gender} | ${entry.leaf || entry.status} | ${product ? code(product.taxonomy) : "missing from snapshot"} | ${product?.slug ?? "—"} |`);
  }
  unmatched.push(...items);
  available.delete(key);
}
unmatched.push(...[...available.values()].flat());
for (const product of unmatched) diffs.push(`| ${product.name} | ${product.gender ?? "—"} | missing from reference | ${code(product.taxonomy)} | ${product.slug} |`);
const eligible = products.filter(({taxonomy}) => taxonomy.state !== "hidden");
const classified = eligible.filter(({taxonomy}) => taxonomy.state === "classified" && !taxonomy.manual).length;
const needsReview = eligible.filter(({taxonomy}) => taxonomy.state === "needs_review");
const counts = new Map<string, number>();
for (const {taxonomy} of products) {
  const value = code(taxonomy);
  counts.set(value, (counts.get(value) ?? 0) + 1);
}
const rate = (100 * classified / eligible.length).toFixed(2);
const document = [
  "# Arc’teryx taxonomy audit · v1.7.0",
  "",
  "Source: locally saved Arc’teryx catalog snapshot from the v1.3.0 parameter audit. The runtime rules use the saved official materials and construction statements; the reference mapping primarily used tags.",
  "",
  `- Stored rows: ${rows.length}. Non-footwear reference rows: ${reference.length}. Matched across snapshots: ${matches.size}.`,
  `- Eligible: ${eligible.length}. Automatically classified: ${classified} / ${eligible.length} (${rate}%). Review: ${needsReview.length}. Hidden from this reference scope: ${products.length - eligible.length}.`,
  `- Reference differences: ${diffs.length}. The reference includes the hidden pack lid, so automatic classification across all ${reference.length} reference rows is ${(100 * classified / reference.length).toFixed(2)}%.`,
  "",
  "- The body material identifies GORE-TEX on Altus, Decca, Fissile, Ifora, Sabre and Spere. Those models resolve to insulated shells when fixed fill is present.",
  "- The published material tables identify Coreloft on Demlo, Diode and Mutton. Both Beta Insulated Jacket pages identify waterproof GORE-TEX in their body material and feature text.",
  "- The pack lid is retained in the archived input and excluded from public category and product routes.",
  "",
  "## Category counts",
  "",
  "| Leaf or state | Products |", "| --- | ---: |",
  ...[...counts].sort().map(([key, count]) => `| ${key} | ${count} |`),
  "",
  "## Reference differences",
  "",
  "| Model | Gender | CSV | Runtime | Slug |", "| --- | --- | --- | --- | --- |",
  ...diffs,
  "",
  "## Review queue",
  "",
  "| Model | Gender | Reason | Slug |", "| --- | --- | --- | --- |",
  ...needsReview.flatMap(({taxonomy, name, gender, slug}) =>
    taxonomy.state === "needs_review" ? [`| ${name} | ${gender ?? "—"} | ${taxonomy.reason} | ${slug} |`] : []),
  "",
];
writeFileSync("docs/arcteryx-taxonomy-v1.7.0.md", document.join("\n"));
console.log(JSON.stringify({reference: reference.length, matched: matches.size, eligible: eligible.length, classified, rate, differences: diffs.length, review: needsReview.length}));
