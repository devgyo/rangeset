import {readFileSync} from "node:fs";
import {test} from "node:test";
import assert from "node:assert/strict";
import {gunzipSync} from "node:zlib";
import {parseMammut} from "../adapters/mammut";
import {fixtureProducts, mammutSource} from "../../lib/catalog/fixture";
import {cardOnly} from "../../lib/catalog/product";
import {formatValue, type Part} from "../../lib/parameters/model";
import {fieldsByKey} from "../../lib/parameters/registry";
import {searchCatalog} from "../../lib/catalog-search";

const published = (file: string) => gunzipSync(readFileSync(new URL(`./fixtures/mammut-${file}.html.gz`, import.meta.url))).toString("utf8");
const get = (file: string, product: string) => parseMammut(published(file), "https://www.mammut.com/us/en/products/" + product, "2026-11-20T20:00:00Z");

test("Mammut hardshell keeps localized fit inputs, qualified RET and Body, Panel and Lining evidence", () => {
  const record = get("eiger-free-pro", "1010-33030/eiger-free-pro-hs-hooded-jacket-men");
  const [product] = fixtureProducts([mammutSource(record)], true);
  const {values} = product.parameters!;
  assert.equal(record.raw.scope, "apparel");
  assert.equal(product.taxonomy?.state === "classified" && product.taxonomy.leaf, "outer.hardshell");
  assert.equal(values.fit.evidence[0].raw, "Snow Sports Regular");
  assert.equal(cardOnly(product).card.fit, "regular");
  assert.equal(values.weight.value, 785);
  assert.equal(values.weight_size.state, "unpublished");
  assert.equal(values.weight.reference?.size, undefined);
  assert.equal(values.hydrostatic_head.value, 28000);
  assert.equal(values.breathability.reference?.method, "RET");
  assert.equal(formatValue(fieldsByKey.get("breathability")!, values.breathability), "<13 m²·Pa/W");
  const parts = values.materials.value as Part[];
  assert.deepEqual(parts[0].fields.denier.value, [80, 80]);
  assert.equal(parts[0].fields.fabric_name.value, "GORE-TEX PRO");
  assert.ok(parts[0].backers?.length);
  assert.ok(parts.some(({part}) => part === "panel"));
  assert.ok(parts.some(({part}) => part === "lining"));
  assert.equal(record.raw.msrp, 999);
  assert.equal(record.raw.salePrice, null);
  assert.ok(record.raw.variants.some(({color, size, inStock}) => color && size && typeof inStock === "boolean"));
});

test("Mammut down product parses Body fabric and fill, and is searchable by exact model number", () => {
  const record = get("broad-peak", "1013-02962/broad-peak-in-hooded-jacket-men");
  const [product] = fixtureProducts([mammutSource(record)], true);
  const {values} = product.parameters!;
  assert.equal(product.taxonomy?.state === "classified" && product.taxonomy.leaf, "outer.down");
  const card = cardOnly(product);
  assert.match(card.card.mainFabric ?? "", /^Pertex® Quantum$/);
  assert.deepEqual(card.card.composition?.primary, {fiber: "Polyamide", pct: 100, recycled: true});
  const fill = (values.insulation.value as Part[])[0].fields;
  assert.equal(fill.fill_power.value, 800);
  assert.equal(fill.down_mass.value, 115);
  assert.equal(fill.down_ratio.value, 90);
  assert.deepEqual(searchCatalog([card], "Mammut 1013-02962"), [card]);
  assert.deepEqual(searchCatalog([card], "1013-0296"), []);
});

test("Mammut retains the official original price and the sale price as distinct values", () => {
  const page = published("broad-peak")
    .replaceAll('\\"price\\":399,\\"originalPrice\\":0', '\\"price\\":299,\\"originalPrice\\":399')
    .replaceAll('\\"discounted\\":false', '\\"discounted\\":true');
  const record = parseMammut(page, "https://www.mammut.com/us/en/products/1013-02962/broad-peak-in-hooded-jacket-men", "2026-11-20");
  const [product] = fixtureProducts([mammutSource(record)], false);
  assert.equal(record.raw.salePrice, 299);
  assert.equal(product.msrp, 399);
  assert.equal(product.parameters?.values.msrp.value, 399);
});

test("Mammut hybrid softshell keeps its category when the published water column applies to inserts", () => {
  const record = get("hybrid", "1011-03100/aenergy-pro-so-hybrid-hooded-jacket-men");
  const [product] = fixtureProducts([mammutSource(record)], false);
  assert.equal(record.raw.fields.find(({label}) => label === "Water column")?.value, "20000 mm");
  assert.deepEqual(product.taxonomy, {state: "classified", leaf: "outer.softshell"});
});

test("Mammut series uses verified article matches before the raw Eiger Extreme fallback", () => {
  const record = get("hybrid", "1011-03100/aenergy-pro-so-hybrid-hooded-jacket-men");
  const view = (modelNumber: string, collection: string) =>
    fixtureProducts([mammutSource({...record, raw: {...record.raw, modelNumber, collection}})], true)[0];

  const mapped = view("1013-04830", "Eiger Extreme");
  assert.deepEqual(cardOnly(mapped).series, ["Aenergy"]);
  const productLine = mapped.parameters?.values.product_line;
  assert.equal(productLine?.value, "Aenergy");
  assert.equal(productLine?.evidence[0].url, "https://au.mammut.com/collections/aenergy");
  assert.match(productLine?.evidence[0].raw ?? "", /1013-04830/);

  const fallback = view("1011-03100", "Eiger Extreme");
  assert.deepEqual(cardOnly(fallback).series, ["Eiger Extreme"]);
  assert.equal(fallback.parameters?.values.product_line?.value, "Eiger Extreme");

  const unverified = view("1011-03100", "New Colors Added");
  assert.deepEqual(cardOnly(unverified).series, []);
  assert.equal(unverified.parameters?.values.product_line?.value, undefined);
});
