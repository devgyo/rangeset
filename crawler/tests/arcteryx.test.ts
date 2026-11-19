import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { deriveSpecs, nameFamily, parseArcteryx } from "../adapters/arcteryx";
import { fixtureUrl } from "../http";

const fetchedAt = "2026-11-19T18:00:00.000Z";
const fixture = readFileSync(new URL("./fixtures/beta-ar-jacket.html", import.meta.url), "utf8");

test("reads the saved PDP and preserves its brand provenance", () => {
  const product = parseArcteryx(fixture, fixtureUrl, fetchedAt);
  assert.equal(product.externalId, "X000011062");
  assert.equal(product.category, "Shell Jackets");
  assert.equal(product.isHardshell, true);
  assert.deepEqual(product.specs.weight_g, {
    value: 460, unit: "g", source: "brand", sourceUrl: fixtureUrl, fetchedAt, rawText: "460g / 1 lb 0.2 oz",
  });
  assert.equal(product.specs.layers.value, 3);
  assert.equal(product.specs.membrane.value, "GORE-TEX PRO ePE");
  assert.equal(product.specs.face_denier.value, 100);
  assert.equal(product.specs.fabric_gsm.value, 136);
  assert.equal(product.specs.centre_back_length_cm.value, 77);
  assert.equal(product.specs.helmet_hood.value, true);
  assert.equal(product.specs.pit_zips.value, true);
  assert.equal(product.specs.recco.value, true);
  for (const key of ["waterproof_mm", "breathability", "weight_size"] as const) {
    assert.equal(product.specs[key].source, "not_published");
    assert.equal(product.specs[key].value, null);
  }
  assert.deepEqual(product.prices[1], { variant: "X000011062012", price: 650, currency: "USD", inStock: true });
  assert.deepEqual(product.crossCheck, []);
});

test("uses JSON-LD solely to flag a discrepancy", () => {
  const updated = fixture.replace(/("offers":\s*\{\s*"price":\s*)"?650"?/, (_, prefix: string) => prefix + '"999"');
  assert.notEqual(updated, fixture);
  const product = parseArcteryx(updated, fixtureUrl, fetchedAt);
  assert.equal(product.prices[1].price, 650);
  assert.deepEqual(product.crossCheck, ["X000011062012: price differs from JSON-LD"]);
});

test("handles mixed units, explicit weight size, pack capacity, and quantified fabric", () => {
  const specs = deriveSpecs({
    materials: ["Main fabric: 2.5-layer Pertex Shield Air, 40-denier, 120 g/m²"],
    weight: { value: "0.85 kg / 30 L (size M)" },
    features: [{ label: "Sizing", value: ["Inseam length: 32 in / 81.3 cm"] }],
  }, fixtureUrl, fetchedAt);
  assert.deepEqual([specs.weight_g.value, specs.pack_volume_l.value, specs.weight_size.value], [850, 30, "M"]);
  assert.deepEqual([specs.layers.value, specs.face_denier.value, specs.membrane.value, specs.fabric_gsm.value], [2.5, 40, "Pertex Shield Air", 120]);
  assert.equal(specs.inseam.value, 81.3);
});

test("separates clothing dimensions from the reference size and leaves ambiguity unpublished", () => {
  const specs = deriveSpecs({
    materials: ["3L GORE-TEX PRO 80D", "3L GORE-TEX PRO 100D"],
    weight: { value: "300 g" },
    features: [{ label: "Fit", value: ["Garment Centre Back Length: Size M is 30 in / 76 cm", "Waterproof fabric"] }],
  }, fixtureUrl, fetchedAt);
  assert.equal(specs.centre_back_length_cm.value, 76);
  assert.equal(specs.weight_size.value, null);
  assert.equal(specs.face_denier.value, null);
  assert.equal(specs.waterproof_mm.value, null);
  assert.equal(specs.breathability.value, null);
});

test("recognizes explicit negatives without treating omitted features as false", () => {
  const specs = deriveSpecs({
    features: [{ label: "Features", value: ["No pit zips", "Without RECCO"] }],
  }, fixtureUrl, fetchedAt);
  assert.equal(specs.pit_zips.value, false);
  assert.equal(specs.recco.value, false);
  assert.equal(specs.helmet_hood.value, null);
  assert.equal(nameFamily("Beta AR Jacket (2025)"), "beta ar jacket");
});

test("rejects non-PDP HTML and non-string product envelopes", () => {
  assert.throws(() => parseArcteryx("<html></html>", fixtureUrl, fetchedAt), /Missing __NEXT_DATA__/);
  assert.throws(() => parseArcteryx(
    '<script id="__NEXT_DATA__">{"props":{"pageProps":{"product":{}}}}</script>', fixtureUrl, fetchedAt,
  ), /JSON-string/);
});
