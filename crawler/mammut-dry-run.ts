import {mkdir, readFile, rename, writeFile} from "node:fs/promises";
import {gunzipSync} from "node:zlib";
import {parseMammut, type MammutProduct} from "./adapters/mammut";
import {fetchMammut, manifestPath, saveMammutManifest, type MammutManifest} from "./mammut-source";
import {fieldsByKey} from "../lib/parameters/registry";
import {formatValue} from "../lib/parameters/model";
import {cardOnly} from "../lib/catalog/product";
import {fixtureProducts, mammutSource} from "../lib/catalog/fixture";
import {consistentTaxonomy, taxonomy, type TaxonomyLeaf} from "../lib/taxonomy";

export const mammutDryRunPath = "data/mammut-dry-run.json";
const cellKeys = ["weight", "fit", "mainFabric", "composition"] as const;

function percent(n: number, total: number) {
  return total ? (n / total * 100).toFixed(1) + "%" : "—";
}

const inline = (value: string) => value.replaceAll("|", "\\|").replace(/\s+/g, " ");
const text = (value: unknown) => value == null || value === "" ? "—" : String(value);

async function createDryRun(manifest: MammutManifest) {
  const products = new Map<string, MammutProduct>();
  const filtered = [...manifest.filtered.map((url) => ({url, reason: "Outside target apparel/backpack article groups or product names"}))];
  const errors: {url: string; reason: string}[] = [];
  for (const entry of manifest.pages) {
    if (!entry.file) {
      errors.push({url: entry.url, reason: entry.reason ?? "No archived page"});
      continue;
    }
    try {
      const metadata = JSON.parse(await readFile(entry.file + ".json", "utf8"));
      const html = gunzipSync(await readFile(entry.file)).toString("utf8");
      const product = parseMammut(html, metadata.finalUrl, metadata.fetchedAt);
      if (product.raw.scope === "apparel" || product.raw.scope === "backpack") {
        if (products.has(product.externalId)) filtered.push({url: entry.url, reason: "Duplicate article number"});
        else products.set(product.externalId, product);
      } else filtered.push({url: entry.url, reason: product.raw.scope});
    } catch (error) {
      errors.push({url: entry.url, reason: error instanceof Error ? error.message : String(error)});
    }
  }
  const saved = [...products.values()];
  const views = consistentTaxonomy(fixtureProducts(saved.map(mammutSource), false));
  const cards = views.map(cardOnly);
  const parsed = new Map(views.map((view, index) => [view.slug, {taxonomy: view.taxonomy, card: cards[index].card, parameters: view.parameters}]));
  const output = saved.map((product) => ({...product, parsed: parsed.get(product.slug)}));
  const categories: Record<string, number> = Object.fromEntries(taxonomy.flatMap(({leaves}) =>
    (leaves as readonly TaxonomyLeaf[]).map(({key}) => [key, 0])));
  const count = {weight: 0, fit: 0, mainFabric: 0, composition: 0, namedFabric: 0};
  const needsReview = cards.flatMap(({taxonomy, name, modelNumbers}) => taxonomy?.state === "needs_review"
    ? [{name, model: modelNumbers?.[0], reason: taxonomy.reason}] : []);
  for (const {taxonomy, card} of cards) {
    const category = taxonomy?.state === "classified" ? taxonomy.leaf : "needs_review";
    categories[category] = (categories[category] ?? 0) + 1;
    for (const key of cellKeys) if (card[key] !== null || key === "mainFabric" && card.composition !== null) count[key]++;
    if (card.mainFabric !== null) count.namedFabric++;
  }
  const summary = {
    discovered: manifest.discovered, candidates: manifest.candidates, processed: manifest.pages.length,
    fetched: manifest.pages.filter(({file}) => file).length, kept: saved.length, filtered: filtered.length,
    errors: errors.length, pending: manifest.candidates - manifest.pages.length, stopped: manifest.stopped ?? null,
    reviewPercent: percent(needsReview.length, saved.length), categories, cardCoverage: count, needsReview,
  };
  await mkdir("data", {recursive: true});
  const temporaryFile = mammutDryRunPath + "." + process.pid + ".tmp";
  await writeFile(temporaryFile, JSON.stringify({summary, products: output, filtered, errors}, null, 2) + "\n");
  await rename(temporaryFile, mammutDryRunPath);

  const samples = ["1010-33030", "1010-31690", "1013-02962", "1014-07270", "2510-04191"].flatMap((id) => {
    const product = products.get(id);
    const view = product && cards.find(({slug}) => slug === product.slug);
    if (!product || !view) return [];
    const {raw} = product;
    const normalized = parsed.get(product.slug)?.parameters;
    const reading = (key: string) => {
      const field = fieldsByKey.get(key);
      const value = normalized?.values[key];
      return field && value ? formatValue(field, value) : "—";
    };
    return [
      `### ${raw.name}`, "",
      `[Official US product page](${product.url})`, "",
      "| Official field | Published text |",
      "| --- | --- |",
      ...raw.fields.map(({label, value}) => `| ${inline(label)} | ${inline(value)} |`),
      `| Description excerpt | ${inline(raw.description.split(/(?<=\.)\s+/).slice(0, 2).join(" "))} |`,
      `| Price evidence by variant (first 3) | ${raw.variants.slice(0, 3).map(({id, price, originalPrice, inStock}) =>
        `${id}: price ${text(price)}, originalPrice ${text(originalPrice)}, inStock ${text(inStock)}`).join("; ")} |`,
      "",
      `Parsed: ${view.taxonomy?.state === "classified" ? view.taxonomy.leaf : view.taxonomy?.state}. Weight ${text(view.card.weight)} g. Fit ${text(view.card.fit)}. Published body fabric name ${text(view.card.mainFabric)}. Body composition ${view.card.composition?.fibers.map(({fiber, pct}) => pct + "% " + fiber).join(", ") ?? "—"}. MSRP ${text(raw.msrp)} USD. Sale ${text(raw.salePrice)} USD. ${raw.variants.length} published variant combinations.`,
      `Normalized ratings and fill: hydrostatic head ${reading("hydrostatic_head")}, breathability ${reading("breathability")}, insulation type ${reading("insulation_type")}. Weight reference size ${reading("weight_size")}.`,
      "",
    ];
  });

  const report = [
    "# Mammut US dry run · v1.7.0", "",
    "Source: Mammut US regional sitemap and public product HTML. Requests used the shared robots-aware sequential client with at least 1.5 seconds between starts.", "",
    `- Discovered ${summary.discovered} product URLs. Selected ${summary.candidates} candidates; collected ${summary.fetched} HTML pages.`,
    `- Retained ${summary.kept} products. Filtered ${summary.filtered} URLs, including ${manifest.filtered.length} sitemap exclusions and ${filtered.length - manifest.filtered.length} page-scope exclusions or duplicates.`,
    `- Errors ${summary.errors}; pending ${summary.pending}. Stop reason: ${summary.stopped ?? "none"}.`,
    `- Needs review: ${needsReview.length} of ${saved.length} (${summary.reviewPercent}).`,
    `- List prices ${saved.filter(({raw}) => raw.msrp !== null).length}; sale prices ${saved.filter(({raw}) => raw.salePrice !== null).length}; dated releases ${saved.filter(({raw}) => raw.year !== null && raw.season).length}; published variant stock ${cards.filter(({stockRatio}) => stockRatio !== null).length}.`,
    "", "## Category counts", "", "| Leaf or state | Products |", "| --- | ---: |",
    ...Object.entries(categories).sort().map(([category, total]) => `| ${category} | ${total} |`),
    "", "## Catalog card coverage", "", "| Cell | Values | Coverage |", "| --- | ---: | ---: |",
    ...cellKeys.map((key) => `| ${key} | ${count[key]} | ${percent(count[key], saved.length)} |`),
    `| Explicit Body fabric name | ${count.namedFabric} | ${percent(count.namedFabric, saved.length)} |`,
    "", "The Main fabric cell includes the existing Body composition fallback. Weight reference size remains unpublished where the page omits it.",
    "", "## Review queue", "", "| Article | Product | Reason |", "| --- | --- | --- |",
    ...needsReview.map(({model, name, reason}) => `| ${model} | ${inline(name)} | ${inline(reason)} |`),
    ...(needsReview.length ? [] : ["| — | None | — |"]),
    "", "## Fetch and parse exceptions", "",
    ...(errors.length ? errors.map(({url, reason}) => `- ${url} — ${reason}`) : ["None."]),
    "", "## Published fields and parsed examples", "", ...samples,
  ].join("\n");
  await writeFile("docs/mammut-import-v1.7.0.md", report + "\n");
  console.log(JSON.stringify({...summary, needsReview: needsReview.length}));
  if (manifest.stopped || summary.pending || summary.errors) process.exitCode = 1;
}

async function main() {
  const mode = process.argv[2];
  if (process.argv.length > 3 || mode && mode !== "--from-cache" && mode !== "--resume") throw new Error("Use --from-cache or --resume, or omit flags to start a new crawl");
  await mkdir(".crawl", {recursive: true});
  const previous = mode ? JSON.parse(await readFile(manifestPath, "utf8")) as MammutManifest : undefined;
  const manifest = mode === "--from-cache" ? previous! : await fetchMammut(saveMammutManifest, previous);
  await createDryRun(manifest);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
