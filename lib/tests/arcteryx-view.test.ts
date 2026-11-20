import assert from "node:assert/strict";
import { test } from "node:test";
import { categorySpecs, colorwaysOf, featuresOf, genderLabel, keyMetrics, plainText, productFamily, productGender, type ProductDetail } from "../arcteryx-view";
import { buildComparison, comparisonIds } from "../comparison";

test("converts descriptions to React-safe plain text with spacing and entity decoding", () => {
  assert.equal(plainText('<p>GORE-TEX&reg; &amp; ePE</p><p>A&nbsp;second line.<br/>No tags.</p>'), "GORE-TEX® & ePE A second line. No tags.");
  assert.equal(plainText('<style>hidden</style><script>ignored</script><template>unused</template>Before<!-- comment --><a title="x > y">link</a> 2 < 3'), "Before link 2 < 3");
  assert.equal(plainText("4 &lt; 5 &gt; 3"), "4 < 5 > 3");
  assert.equal(plainText(null), "");
});

test("uses whole product-family prefixes and the published unisex flag", () => {
  assert.equal(productFamily("  beta AR Jacket"), "Beta");
  assert.equal(productFamily("Konseal-GTX Shoe"), "Konseal");
  assert.equal(productFamily("Sabre SV Jacket"), "Sabre");
  assert.equal(productFamily("Betamax Jacket"), null);
  assert.equal(productFamily("Alar Wool Coat"), null);
  assert.equal(productFamily("Women's Beta AR Jacket"), null);
  assert.equal(productGender("Women's"), "women");
  assert.equal(productGender("men", true), "unisex");
  assert.equal(genderLabel(null), "Not published");
});

test("parses the published footwear geometry format and distinguishes missing waterproofing", () => {
  const features = featuresOf([
    { label: "Footwear geometry", value: ["4mm lugs", "Drop (Stack):  11mm (24mm : 13mm)"] },
    { label: "Footwear outsole construction", value: ["Vibram® XS Flash 2 outsole delivers outstanding grip"] },
  ]);
  const specs = categorySpecs("Footwear", [], features, "2026-11-20", "Konseal GTX Shoe");
  assert.deepEqual(["drop", "stack", "lugs", "outsole", "shoe_waterproof"].map((key) => specs[key]?.value),
    [11, "24 / 13", 4, "Vibram XS Flash 2", "GORE-TEX"]);
  assert.equal(specs.drop?.unit, "mm");
  assert.equal(specs.outsole?.source, "brand");
  assert.equal(categorySpecs("Footwear", [], [], null, "Water resistant trail shoe").shoe_waterproof, undefined);
  assert.equal(categorySpecs("Footwear", [], [], null, "Non-waterproof shoe").shoe_waterproof, undefined);
  assert.equal(categorySpecs("Shell Jackets", [], features, null, "GTX jacket").drop, undefined);
});

test("identifies documented insulation with fill power and leaves unsupported text blank", () => {
  const specs = categorySpecs("Insulated Jackets", [
    "Down Insulation: 750 fill European grey goose down", "Synthetic Insulation: Coreloft™ Continuous, 102gsm",
  ], [], null, "");
  assert.equal(specs.insulation?.value, "Down · 750 fill + Coreloft");
  assert.equal(categorySpecs("Insulated Jackets", ["Nylon exterior"], [], null, "").insulation, undefined);
});

test("validates image hosts, swatches, and gallery metadata", () => {
  const url = "https://images.arcteryx.com/white.jpg";
  const [color] = colorwaysOf([{
    label: "Stone", hexCode: "afafaf", image: { url }, imageAssets: [
      { image: { url: "https://images.arcteryx.com/front.jpg", alt: "Front" }, talent: { height: "183cm", fullName: "Not used" }, wearingSize: { size: "M" } },
      { image: { url: "https://images.arcteryx.com.example.com/other.jpg" } },
      { image: { url } },
    ],
  }]);
  assert.equal(color.hex, "#afafaf");
  assert.equal(color.photos.length, 2);
  assert.deepEqual(color.photos[1], {
    url: "https://images.arcteryx.com/front.jpg", label: "Front", height: "183cm", size: "M",
  });
});

function product(fields: Partial<ProductDetail>): ProductDetail {
  return {
    name: "Test", slug: "test", brand: "Arc’teryx", family: null, status: "active", category: "Shell Jackets", gender: "men",
    subTags: [], veilance: false, isHardshell: false, image: null, hero: null, swatches: [], activities: [], summary: "",
    msrp: null, inStock: null, specs: {}, url: null, verifiedAt: null, description: "", materials: [], features: [],
    facility: "", year: null, season: "", sizes: [], colorways: [], ...fields,
  };
}

test("compares normalized values and marks category-specific metrics as inapplicable for mixed products", () => {
  const spec = (value: string | number | boolean, unit: string | null = null) => ({ value, unit, source: "brand" as const, date: null });
  const shell = product({
    name: "Test Jacket", activities: ["Hike", "Climb"], specs: { weight_g: spec(250, "g"), membrane: spec(" GORE-TEX® ") },
    features: [{ label: "Zippers", values: ["No pit zips"] }],
  });
  const other = product({
    name: "Other Jacket", activities: ["climb", "hike"], gender: "women", specs: { membrane: spec("gore-tex"), weight_g: spec(300, "g") },
  });
  const rows = buildComparison([shell, other]).flatMap(({ rows }) => rows);
  assert.equal(rows.find(({ key }) => key === "activities")?.differs, false);
  assert.equal(rows.find(({ key }) => key === "membrane")?.differs, false);
  assert.equal(rows.find(({ key }) => key === "weight")?.differs, true);
  assert.equal(rows.find(({ key }) => key === "pit_zips")?.differs, false);
  assert.equal(rows.find(({ key }) => key === "pit_zips")?.weakDifference, true);
  assert.equal(rows.find(({ key }) => key === "pit_zips")?.cells[0].value, false);
  const shoe = product({ category: "Footwear", specs: { drop: spec(8, "mm") } });
  const mixed = buildComparison([shell, shoe]).flatMap(({ rows }) => rows);
  assert.equal(mixed.find(({ key }) => key === "drop")?.cells[0].state, "inapplicable");
  assert.equal(mixed.find(({ key }) => key === "pit_zips")?.cells[1].state, "inapplicable");
  assert.ok(!keyMetrics(shoe, true).includes("inseam"));
  assert.deepEqual(comparisonIds(" one,one,two,https://bad,three,four,five"), ["one", "two", "three", "four"]);
});
