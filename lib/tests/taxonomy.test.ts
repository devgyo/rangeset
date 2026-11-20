import {test} from "node:test";
import assert from "node:assert/strict";
import {existsSync, readFileSync} from "node:fs";
import {arcTaxonomy} from "../brands/arcteryx-taxonomy";
import {catalogSource, cardOnly} from "../catalog/product";
import {fixtureProducts, mammutSource, type FixtureRow} from "../catalog/fixture";
import {rankFeatured} from "../catalog/featured-sort";
import {record} from "../product-view";
import {classifyTaxonomy, consistentTaxonomy, matchesTaxonomy, taxonomy, taxonomyLabelKey, type TaxonomyEvidence} from "../taxonomy";
import en from "../../messages/en.json";
import zh from "../../messages/zh.json";
import ja from "../../messages/ja.json";
import type {MammutProduct} from "../../crawler/adapters/mammut";
import {parse} from "csv-parse/sync";

test("first-match taxonomy resolves form before construction and honors the body evidence", () => {
  const cases: [TaxonomyEvidence, string][] = [
    [{backpack: true, shape: "vest"}, "packs.backpack"],
    [{base: "bottom", shape: "tight"}, "base.bottom"],
    [{base: "top", shape: "vest"}, "base.top"],
    [{shape: "suit", waterproof: true}, "onepiece.suit"],
    [{shape: "dress"}, "onepiece.dress"],
    [{shape: "skirt"}, "bottoms.skirt"],
    [{shape: "shorts", waterproof: true}, "bottoms.shorts"],
    [{shape: "tight", fill: "synthetic"}, "bottoms.tights"],
    [{shape: "pants", fill: "down", waterproof: true}, "bottoms.insulated"],
    [{shape: "pants", waterproof: true}, "bottoms.hardshell"],
    [{shape: "pants", softshell: true}, "bottoms.softshell"],
    [{shape: "pants"}, "bottoms.pants"],
    [{shape: "vest", fleece: true, fill: "down"}, "outer.vest"],
    [{fleece: true}, "fleece"],
    [{shape: "top"}, "tops"],
    [{shape: "top", softshell: true}, "outer.softshell"],
    [{shape: "top", fill: "synthetic"}, "outer.synthetic"],
    [{waterproof: true, membrane: true, fill: "down"}, "outer.insulated_shell"],
    [{waterproof: true, fill: "down"}, "outer.down"],
    [{fleece: true, fill: "synthetic"}, "outer.synthetic"],
    [{waterproof: true, membrane: true, fill: "synthetic", threeInOne: true}, "outer.hardshell"],
    [{shape: "tailoring", waterproof: true}, "outer.hardshell"],
    [{shape: "tailoring"}, "outer.tailoring"],
    [{windshell: true}, "outer.windshell"],
  ];
  for (const [facts, leaf] of cases) assert.deepEqual(classifyTaxonomy(facts), {state: "classified", leaf});
  assert.equal(classifyTaxonomy({fill: "unknown"}).state, "needs_review");
  assert.equal(classifyTaxonomy({waterproof: true, conflict: "Panel only"}).state, "needs_review");
  assert.equal(classifyTaxonomy({shape: "pants", waterproof: true, conflict: "Not fully waterproof"}).state, "needs_review");
  assert.deepEqual(classifyTaxonomy({fill: "unknown"}, {value: "outer.synthetic"}), {state: "classified", leaf: "outer.synthetic", manual: true});
  assert.equal(classifyTaxonomy({hidden: "Backpack accessory"}, "packs.backpack").state, "hidden");
});

test("Arc taxonomy ignores the old hard-shell flag, panel-only claims, DWR, and wind membranes", () => {
  const subject = {name: "Shell Jacket", category: "Shell Jackets", subTags: [], isHardshell: true};
  for (const materials of [["Body: GORE-TEX INFINIUM with DWR"], ["Body: WINDSTOPPER"], ["Body: Water resistant"], ["Panel: GORE-TEX PRO"]]) {
    assert.notEqual(classifyTaxonomy(arcTaxonomy(subject, {materials})).state, "classified", materials[0]);
  }
  assert.deepEqual(classifyTaxonomy(arcTaxonomy(subject, {
    materials: ["Body: GORE-TEX PRO", "Down Insulation - Body: 850 fill", "Synthetic Insulation - Sleeves: Coreloft"],
    features: [{label: "Pocket configuration", value: ["Zippers are not waterproof"]}],
  })), {state: "classified", leaf: "outer.insulated_shell"});
  assert.deepEqual(classifyTaxonomy(arcTaxonomy(subject, {
    materials: ["Down Insulation - Body: 850 fill", "Synthetic Insulation - Sleeves: Coreloft"],
  })), {state: "classified", leaf: "outer.down"});
  assert.equal(classifyTaxonomy(arcTaxonomy(subject, {
    description: "The jacket is not fully waterproof.", materials: ["Body: GORE-TEX PRO"],
  })).state, "needs_review");
});

test("different same-brand model results both enter review and a manual classification takes precedence", () => {
  const rows = [
    {brand: "Mammut", name: "Product Men", taxonomy: classifyTaxonomy({waterproof: true})},
    {brand: "Mammut", name: "Product Women", taxonomy: classifyTaxonomy({softshell: true})},
    {brand: "Arc’teryx", name: "Product Women", taxonomy: classifyTaxonomy({softshell: true})},
  ];
  const [a, b, c] = consistentTaxonomy(rows);
  assert.equal(a.taxonomy.state, "needs_review");
  assert.equal(b.taxonomy.state, "needs_review");
  assert.equal(c.taxonomy.state, "classified");
  rows[0].taxonomy = classifyTaxonomy({}, "outer.softshell");
  assert.ok(consistentTaxonomy(rows).every(({taxonomy}) => taxonomy.state === "classified"));
});

test("the archived Arc’teryx catalog meets the 97% taxonomy target with all reference records reconciled", {
  skip: !existsSync("data/arcteryx-local.json"),
}, () => {
  const sources = JSON.parse(readFileSync("data/arcteryx-local.json", "utf8")) as FixtureRow[];
  const reference = (parse(readFileSync("docs/taxonomy-arcteryx-mapping.csv"), {columns: true}) as {brand_category: string}[])
    .filter(({brand_category}) => brand_category !== "Footwear");
  const records = consistentTaxonomy(sources.map((entry) => {
    const row = catalogSource(entry);
    return {...row, taxonomy: classifyTaxonomy(arcTaxonomy(row, record(row.payload), row.overrides), row.overrides.get("parameters.taxonomy"))};
  }));
  assert.equal(records.filter(({category}) => category !== "Footwear").length, reference.length);
  const eligible = records.filter(({taxonomy}) => taxonomy.state !== "hidden");
  assert.ok(eligible.filter(({taxonomy}) => taxonomy.state === "classified" && !taxonomy.manual).length / eligible.length >= 0.97);
  assert.ok(!eligible.some(({name}) => name === "PRO Backpack Lid Replacement"));
  assert.equal(eligible.filter((item) => matchesTaxonomy(item, "hardshell-jackets")).length, 59);
});

test("all taxonomy labels exist in English, Chinese and Japanese", () => {
  const slugs = new Set(taxonomy.flatMap(({slug, leaves}) => [slug, ...leaves.map((leaf) => leaf.slug)]));
  assert.equal(taxonomy.length, 7);
  assert.equal(taxonomy.flatMap(({leaves}) => [...leaves] as unknown[]).length, 22);
  for (const slug of slugs) {
    const key = taxonomyLabelKey(slug).slice("taxonomy.".length);
    for (const language of [en, zh, ja]) assert.ok(Object.hasOwn(language.taxonomy, key), key);
  }
  assert.equal(zh.taxonomy.hardshell_jackets, "硬壳冲锋衣");
  assert.equal(ja.taxonomy.hardshell_jackets, "ハードシェル");
});

test("featured sort takes alternating brand queues for equally represented real brand profiles", {
  skip: !existsSync("data/arcteryx-local.json") || !existsSync("data/mammut-dry-run.json"),
}, () => {
  const arc = JSON.parse(readFileSync("data/arcteryx-local.json", "utf8")) as FixtureRow[];
  const {products} = JSON.parse(readFileSync("data/mammut-dry-run.json", "utf8")) as {products: MammutProduct[]};
  const byBrand = (rows: FixtureRow[]) => fixtureProducts(rows, false).map(cardOnly)
    .filter((product) => matchesTaxonomy(product, "hardshell-jackets") && product.cardValueCount >= 3 && (product.stockRatio ?? 1) >= 0.5)
    .slice(0, 3).map((product) => ({...product, releaseSeason: null, inStock: null}));
  const arcCards = byBrand(arc);
  const mammutCards = byBrand(products.map(mammutSource));
  assert.equal(arcCards.length, 3);
  assert.equal(mammutCards.length, 3);
  const ranked = rankFeatured([...arcCards, ...mammutCards]).map(({product}) => product.brandSlug);
  assert.equal(new Set(ranked).size, 2);
  assert.ok(ranked.every((brand, index) => index === 0 || brand !== ranked[index - 1]), ranked.join(", "));
});
