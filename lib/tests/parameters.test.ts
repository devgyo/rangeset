import assert from "node:assert/strict";
import { test } from "node:test";
import type { ProductDetail } from "../arcteryx-view";
import { fabricLocation } from "../parameters/fabric";
import { selectCardParameters } from "../parameters/card";
import { convert, normalizeArcProduct, parseDenier } from "../parameters/arcteryx";
import { type Fiber, compareValues, formatValue, getParameter, known, missing, parameterGroups, parameterStatus, visibleInComparison, weightPresentation, type Part } from "../parameters/model";
import { fieldsByKey, parameterVersion, registry } from "../parameters/registry";

function product(props: Partial<ProductDetail> = {}): ProductDetail {
  return {
    slug: "test", name: "Example Jacket", brand: "Example", category: "Shell Jackets", gender: "men",
    family: null, subTags: [], veilance: false, isHardshell: false, status: "active", image: null, hero: null,
    swatches: [], activities: [], summary: "", msrp: null, specs: {},
    url: "https://example.com/product", verifiedAt: "2026-11-20", description: "", materials: [],
    features: [], facility: "", year: null, season: "", sizes: [], colorways: [], ...props,
  };
}
const field = (key: string) => fieldsByKey.get(key)!;
const feature = (label: string, ...value: string[]) => ({ label, value });
const rawSample = { fetchedAt: "2026-11-20T10:00:00Z" };
const partsOf = (profile: ReturnType<typeof normalizeArcProduct>, key = "materials") => profile.values[key]?.value as Part[];

test("field registry has stable unique keys, version, explainers, formats and comparison rules", () => {
  assert.match(parameterVersion, /^\d+\.\d+\.\d+$/);
  assert.equal(new Set(registry.map(({ key }) => key)).size, registry.length);
  for (const field of registry) {
    assert.ok(field.label && field.description && field.format && field.compare && field.applies);
    if (field.type === "enum") assert.ok(Object.keys(field.options ?? {}).length);
  }
});

test("groups fabrics by explicit labels, preserves repeated parts and separates backing, origin and regulation", () => {
  const raw = { materials: [
    "Body: 40×70D nylon ripstop, 125gsm - 100% Nylon with ePE and PU Membrane 100% Polyester Backing",
    "Body: Plain weave - 90% Nylon, 10% Elastane",
    "Contrast: 20d fleece, 180gsm - 95% Polyester, 5% Elastane",
    "Origin of fabric: TAIWAN, CHINA",
    "May release plastic microfibres into the environment when washing",
    "Unlabeled technical material statement.",
  ] };
  const profile = normalizeArcProduct(product(), { raw, ...rawSample });
  const parts = partsOf(profile);
  assert.deepEqual(parts.map(({ part, label }) => [part, label]), [
    ["body", "Body"], ["body", "Body"], ["panel", "Contrast"],
  ]);
  assert.deepEqual(parts[0].fields.denier.value, [40, 70]);
  assert.equal(parts[0].fields.fabric_weight.value, 125);
  assert.deepEqual(parts[0].fields.weave.value, ["Ripstop"]);
  assert.deepEqual(parts[0].fields.fiber_content.value, [{ fiber: "Nylon", pct: 100, recycled: null }]);
  assert.deepEqual(parts[0].backers?.[0].fields.fiber_content.value, [{ fiber: "Polyester", pct: 100, recycled: null }]);
  assert.deepEqual(profile.values.fabric_origin.value, ["TAIWAN, CHINA"]);
  assert.deepEqual(profile.values.source_notes.value, ["Unlabeled technical material statement."]);
  assert.equal(profile.values.microfibers.state, "known");
  assert.equal(parts[0].fields.denier.evidence[0].path, "product.materials[0]");
  assert.equal(parts[0].fields.denier.evidence[0].updatedAt, rawSample.fetchedAt);
  assert.equal(formatValue(field("denier"), parts[0].fields.denier), "40D × 70D");
  assert.deepEqual(parseDenier("20dx20d nylon"), [20, 20]);
});

test("normalizes units before comparing and keeps original values and reference contexts", () => {
  assert.equal(convert(0.46, "kg", "g"), 460);
  assert.equal(convert(2, "oz/yd²", "g/m²"), 67.81);
  assert.equal(convert(1, "oz", "g"), 28.35);
  assert.equal(convert(1, "oz", "g/m²"), null);
  assert.equal(convert(700, "mm", "cm"), 70);
  const a = normalizeArcProduct(product(), { raw: {
    weight: { value: "0.46 kg (size M)" },
    features: [feature("Design & Fit", 'Garment Centre Back Length: Size M is 30"/77cm')],
  } });
  const b = normalizeArcProduct(product(), { raw: {
    weight: { value: "460 g, size M" },
    features: [feature("Design & Fit", "Garment Centre Back Length: Size M is 770 mm")],
  } });
  const c = normalizeArcProduct(product({ gender: "women" }), { raw: {
    weight: { value: "460 g, size S" },
    features: [feature("Design & Fit", 'Garment Centre Back Length: Size S is 26"/66cm')],
  } });
  assert.equal(a.values.weight.value, 460);
  assert.equal(a.values.back_length.reference?.size, "M");
  assert.equal(a.values.back_length.evidence[0].raw.includes('30"/77cm'), true);
  assert.equal(compareValues(field("weight"), [a.values.weight, b.values.weight]).differs, false);
  assert.equal(compareValues(field("back_length"), [a.values.back_length, b.values.back_length]).note, undefined);
  assert.match(compareValues(field("back_length"), [a.values.back_length, c.values.back_length]).note!, /references/i);
  assert.equal(compareValues(field("back_length"), [a.values.back_length, c.values.back_length]).differs, false);
});

test("handles mixed fill and separates each thermal metric from fabric and product mass", () => {
  const result = normalizeArcProduct(product({ category: "Insulated Jackets" }), { raw: { weight: { value: "1.2 kg" }, materials: [
    "Down Insulation: 750 fill European grey goose down (minimum 90% down); fill weight: 150 g",
    "Synthetic Insulation (hood): Coreloft (60 g/m²) - 100% Polyester",
    "Synthetic Insulation (sleeves): Octa Loft, 98gsm - 100% Polyester",
    "Body: 80D Nylon ripstop, 126 gsm - 100% Nylon",
  ] } });
  assert.equal(result.values.insulation_type.value, "mixed");
  const [down, hood, sleeves] = partsOf(result, "insulation");
  assert.deepEqual([down.part, hood.part, sleeves.part], ["down", "hood_synthetic", "sleeves_synthetic"]);
  assert.equal(down.fields.fill_power.value, 750);
  assert.equal(formatValue(field("fill_power"), down.fields.fill_power), "750");
  assert.equal(down.fields.down_ratio.reference?.method, "Minimum");
  assert.equal(down.fields.down_mass.value, 150);
  assert.equal(hood.fields.synthetic_density.value, 60);
  assert.equal(sleeves.fields.synthetic_fill.value, "Octa Loft");
  assert.equal(partsOf(result)[0].fields.fabric_weight.value, 126);
  assert.equal(result.values.weight.value, 1200);
});

test("distinguishes omitted booleans, not applicable, explicit negatives, conflict and review", () => {
  const soft = normalizeArcProduct(product({ subTags: ["Softshell"] }), { raw: {
    weight: { value: "200g / 20 oz" },
    materials: ["Body: 90% Nylon, 20% Polyester"],
    features: [feature("Hood configuration", "No hood"), feature("Zippers", "Pit zips", "No pit zips")],
  } });
  assert.equal(soft.context.kind, "soft_shell");
  assert.equal(soft.values.hood.value, false);
  assert.equal(getParameter(soft, field("helmet_hood")).state, "inapplicable");
  assert.equal(getParameter(soft, field("recco")).state, "unpublished");
  assert.equal(fieldsByKey.has("drop"), false);
  assert.equal(soft.values.pit_zips.state, "conflict");
  assert.equal(soft.values.weight.state, "conflict");
  assert.equal(partsOf(soft)[0].fields.fiber_content.state, "review");
  assert.equal(getParameter(soft, field("hydrostatic_head")).state, "unpublished");
  const hard = normalizeArcProduct(product({ isHardshell: true }), { indexed: [
    { key: "weight_g", value: 500, unit: "g", source: "brand", fetchedAt: "2026-11-19", rawText: "500 g" },
  ], raw: { weight: { value: "460 g" }, features: [feature("Construction", "Waterproof rating: 20,000 mm · ISO 811", "PFAS Compliant")] } });
  assert.equal(hard.values.weight.state, "conflict");
  assert.equal(hard.values.weight.evidence.length, 2);
  assert.equal(hard.values.hydrostatic_head.value, 20000);
  assert.equal(hard.values.hydrostatic_head.reference?.method, "ISO 811");
  assert.deepEqual(hard.values.pfas.value, ["PFAS Compliant"]);
});

test("manual values outrank parsed and indexed facts, preserve provenance, and accept explicit unknowns", () => {
  const raw = { weight: { value: "460 g (size M)" }, materials: ["Body: 40D nylon ripstop, 120 gsm"] };
  const overrides = new Map<string, unknown>([
    ["spec.weight_g", 450], ["parameters.weight", { value: 0.455, unit: "kg", updatedAt: "2026-11-20" }],
    ["spec.weight_size", "S"], ["spec.face_denier", "40×70D"], ["parameters.pit_zips", false], ["parameters.fit", null],
  ]);
  const profile = normalizeArcProduct(product(), { raw, overrides });
  assert.equal(profile.values.weight.value, 455);
  assert.equal(profile.values.weight.reference?.size, "S");
  assert.equal(profile.values.weight.evidence[0].method, "manual");
  assert.equal(profile.values.weight.evidence[0].updatedAt, "2026-11-20");
  assert.deepEqual(partsOf(profile)[0].fields.denier.value, [40, 70]);
  assert.equal(profile.values.pit_zips.value, false);
  assert.equal(profile.values.fit.state, "unpublished");
  const invalid = normalizeArcProduct(product(), { raw, overrides: new Map([["parameters.weight", "heavy"]]) });
  assert.equal(invalid.values.weight.state, "review");
  assert.equal(invalid.values.weight.evidence[0].method, "manual");
});

test("comparison aligns materials by part and multiset order, normalizes claims and requires test methods", () => {
  const source = [
    "Body: 40×70D nylon - 90% Nylon, 10% Elastane", "Lining: Polyamide", "Body: Ripstop",
  ];
  const a = normalizeArcProduct(product(), { raw: { materials: source } });
  const b = normalizeArcProduct(product(), { raw: { materials: [
    "Body: Ripstop", "Shell: 40x70D nylon - 10% Elastane, 90% Nylon", "Liner: Polyamide",
  ] } });
  const rows = parameterGroups([a, b]).flatMap(({ rows }) => rows);
  assert.equal(rows.find(({ key }) => key === "materials.body.denier")?.differs, false);
  assert.equal(rows.find(({ key }) => key === "materials.lining.fabric_name")?.differs, false);
  assert.equal(rows.find(({ key }) => key === "materials.body.denier")?.cells[0].entries?.length, 2);
  assert.match(compareValues(field("breathability"), [
    known(10000, [], { unit: "g/m²/24h", method: "JIS L 1099" }), known(8, [], { unit: "m²·Pa/W", method: "ISO 11092" }),
  ]).note!, /test methods/i);
  assert.equal(compareValues(field("laminate"), [known("3", []), known("2.5", [])]).differs, true);
});

test("qualified protection and treatment terms supersede generic equivalents without losing evidence", () => {
  const specific = normalizeArcProduct(product(), { raw: {
    materials: ["Body: Nylon, FC0 DWR"],
    features: [feature("Construction", "Windproof shell", "Wind resistant face", "DWR")],
  } });
  assert.deepEqual(specific.values.protection.value, ["Windproof"]);
  assert.deepEqual(specific.values.dwr.value, ["FC0 DWR"]);
  assert.equal(specific.values.protection.evidence.length, 2);
  assert.equal(specific.values.dwr.evidence.length, 2);
  const generic = normalizeArcProduct(product(), {
    overrides: new Map([["parameters.dwr", ["FC0 DWR", "dwr", "Durable water repellent"]]]),
  });
  assert.deepEqual(generic.values.dwr.value, ["FC0 DWR"]);
  assert.equal(compareValues(field("dwr"), [specific.values.dwr, generic.values.dwr]).differs, false);
  const distinct = normalizeArcProduct(product(), { raw: { materials: ["Body: FC0 DWR", "Contrast: C0 DWR", "Lining: DWR"] } });
  assert.deepEqual(distinct.values.dwr.value, ["FC0 DWR", "C0 DWR"]);
});

test("places inline and labelled backers under the unique owning fabric and keeps ambiguous lines", () => {
  const a = normalizeArcProduct(product(), { raw: { materials: [
    "Body: 100D Nylon - 100% Nylon with membrane 100% Nylon Backing",
    "Contrast: 80D Nylon", "Backer (Contrast): 100% Polyester", "Backer: Polyester mesh",
  ] } });
  const [body, contrast] = partsOf(a);
  assert.equal(partsOf(a).length, 2);
  assert.equal((body.backers?.[0].fields.fiber_content.value as Fiber[])[0].fiber, "Nylon");
  assert.equal((contrast.backers?.[0].fields.fiber_content.value as Fiber[])[0].fiber, "Polyester");
  assert.deepEqual(a.values.source_notes.value, ["Backer: Polyester mesh"]);
  const b = normalizeArcProduct(product(), { raw: { materials: [
    "Body: 100D Nylon - 100% Nylon with membrane 100% Polyester Backing",
    "Contrast: 80D Nylon", "Backer (Contrast): 100% Polyester",
  ] } });
  const rows = parameterGroups([a, b]).flatMap(({ rows }) => rows);
  assert.equal(rows.find(({ key }) => key === "materials.body.backer.fiber_content")?.differs, true);
  assert.equal(rows.find(({ key }) => key === "materials.panel.backer.fiber_content")?.differs, false);
  assert.ok(!rows.some(({ key }) => key === "materials.backer"));
});

test("accepts manual nested and legacy separately labelled backer overrides", () => {
  const base = { part: "main", label: "Body", fields: { fabric_name: "Nylon" } };
  const backer = { part: "backer", label: "Body · Backer", fields: { fiber_content: [{ name: "Polyester", percent: 100 }] } };
  const from = (materials: unknown) => normalizeArcProduct(product(), { overrides: new Map([["parameters.materials", materials]]) });
  const nested = from([{ ...base, backers: [backer] }]);
  const legacy = from([base, backer]);
  assert.equal(partsOf(legacy).length, 1);
  assert.deepEqual(partsOf(nested)[0].backers?.[0].fields.fiber_content.value, partsOf(legacy)[0].backers?.[0].fields.fiber_content.value);
  assert.equal(partsOf(legacy)[0].backers?.[0].fields.fiber_content.evidence[0].method, "manual");
  assert.equal(compareValues(field("materials"), [nested.values.materials, legacy.values.materials]).differs, false);
});

test("classifies garment style independently from protective construction", () => {
  const cases = [
    [product({ name: "Beta AR Jacket", subTags: ["Hardshell"] }), "jacket", "hard_shell"],
    [product({ name: "Gamma Jacket", subTags: ["Softshell"] }), "jacket", "soft_shell"],
    [product({ name: "Squamish Hoody", subTags: ["Windshell"] }), "hoodie", "wind_shell"],
    [product({ name: "Fissile SV Down Jacket", category: "Insulated Jackets", subTags: ["Insulated Shell"] }), "jacket", "insulated_shell"],
    [product({ name: "Cormac Crew Neck Shirt SS", category: "Shirts and Tops" }), "t_shirt", null],
    [product({ name: "Cila SL Dress", category: "Dresses and Skirts" }), "dress", null],
    [product({ name: "Rho Hoody", category: "Base Layer" }), "base_layer_top", null],
    [product({ name: "Rho Bottom", category: "Base Layer" }), "base_layer_bottom", null],
  ] as const;
  for (const [item, style, shell] of cases) {
    const { values } = normalizeArcProduct(item);
    assert.equal(values.product_type.value, style, item.name);
    if (shell) assert.equal(values.protection_type.value, shell, item.name);
    else assert.equal(values.protection_type.state, "inapplicable", item.name);
  }
  const unknown = normalizeArcProduct(product({ name: "Collection 123", category: "Shirts and Tops" }));
  assert.equal(formatValue(field("product_type"), unknown.values.product_type), "Needs review");
  assert.equal(unknown.values.protection_type.state, "inapplicable");
  assert.ok(!parameterGroups([unknown]).some(({ rows }) => rows.some(({ key }) => key === "protection_type")));
  assert.ok(parameterGroups([unknown]).some(({ rows }) => rows.some(({ key }) => key === "product_type")));
  const declared = normalizeArcProduct(product({ name: "Collection 123", category: "Dresses and Skirts" }), { raw: { productType: "Dress" } });
  assert.equal(declared.values.product_type.value, "dress");
  const legacy = normalizeArcProduct(product({ name: "Beta AR Jacket" }), { overrides: new Map([["parameters.product_type", "hard_shell"]]) });
  assert.equal(legacy.values.product_type.value, "jacket");
  assert.equal(legacy.values.protection_type.value, "hard_shell");
});

test("renders ISO currency with price and compares style and currency codes", () => {
  const beta = normalizeArcProduct(product({ name: "Beta AR Jacket", subTags: ["Hardshell"] }), { raw: { price: 650, currencyCode: "USD" } });
  const shirt = normalizeArcProduct(product({ name: "Cormac T-shirt", category: "Shirts and Tops" }), { raw: { price: 50, currencyCode: "EUR" } });
  assert.equal(formatValue(field("msrp"), beta.values.msrp), "$650 USD");
  assert.equal(formatValue(field("msrp"), shirt.values.msrp), "€50 EUR");
  assert.equal(beta.values.msrp.reference?.unit, "USD");
  assert.equal(beta.values.currency, undefined);
  const rows = parameterGroups([beta, shirt]).flatMap(({ rows }) => rows);
  assert.ok(!rows.some(({ key }) => key === "currency"));
  assert.equal(rows.find(({ key }) => key === "product_type")?.differs, true);
  assert.equal(rows.find(({ key }) => key === "protection_type")?.cells[1].state, "inapplicable");
  assert.equal(rows.find(({ key }) => key === "msrp")?.differs, false);
  assert.match(rows.find(({ key }) => key === "msrp")?.note ?? "", /currencies/);
});

test("feature symbols require explicit brand evidence for No", () => {
  const jacket = product({ isHardshell: true });
  const observation = { key: "pit_zips", value: false, unit: null, source: "brand", fetchedAt: "2026-11-20" };
  const yes = normalizeArcProduct(jacket, { raw: { features: [feature("Zippers", "Pit zips")] } });
  const no = normalizeArcProduct(jacket, { raw: { features: [feature("Zippers", "No pit zips")] } });
  const omitted = normalizeArcProduct(jacket, { indexed: [observation] });
  const indexedNo = normalizeArcProduct(jacket, { indexed: [{ ...observation, rawText: "Zippers: No pit zips" }] });
  const shirt = normalizeArcProduct(product({ name: "Training T-shirt", category: "Shirts and Tops" }));
  const vents = field("pit_zips");
  for (const [profile, symbol, label] of [
    [yes, "●", "Yes"], [no, "○", "No"], [omitted, "—", "Not published"],
    [indexedNo, "○", "No"], [shirt, "N/A", "Not applicable"],
  ] as const) {
    const value = getParameter(profile, vents);
    assert.equal(formatValue(vents, value), symbol);
    assert.equal(parameterStatus(vents, value)?.label, label);
  }
  assert.equal(parameterStatus(vents, missing("conflict")), undefined);
});

test("detail hides unresolved features and inapplicable rows while keeping unpublished core values", () => {
  const jacket = normalizeArcProduct(product({ isHardshell: true, activities: ["Skiing"] }), { raw: {
    features: [feature("Zippers", "No pit zips"), feature("Snow", "Powder skirt"), feature("Safety", "RECCO", "No RECCO")],
  } });
  const shirt = normalizeArcProduct(product({ name: "Training T-shirt", category: "Shirts and Tops", activities: ["Skiing"] }), { raw: {
    features: [feature("Other", "Powder skirt", "Pit zips")],
  } });
  const rows = (profile: typeof jacket) => parameterGroups([profile], "detail").flatMap(({ rows }) => rows);
  const detail = rows(jacket);
  assert.equal(detail.find(({ key }) => key === "pit_zips")?.cells[0].value, false);
  assert.equal(detail.find(({ key }) => key === "powder_skirt")?.cells[0].value, true);
  for (const key of ["weight", "msrp", "fit", "back_length"]) {
    assert.equal(detail.find((row) => row.key === key)?.cells[0].state, "unpublished", key);
  }
  for (const key of ["hood", "recco", "hydrostatic_head"]) assert.ok(!detail.some((row) => row.key === key), key);
  for (const key of ["pit_zips", "powder_skirt", "protection_type"]) {
    assert.equal(getParameter(shirt, field(key)).state, "inapplicable", key);
    assert.ok(!rows(shirt).some((row) => row.key === key), key);
  }
});

test("comparison keeps rows with known values and treats unpublished cells as weak differences", () => {
  const jacket = product({ isHardshell: true });
  const yes = normalizeArcProduct(jacket, { raw: { features: [feature("Zippers", "Pit zips")] } });
  const no = normalizeArcProduct(jacket, { raw: { features: [feature("Zippers", "No pit zips")] } });
  const unknown = normalizeArcProduct(jacket);
  const shirt = normalizeArcProduct(product({ name: "Training T-shirt", category: "Shirts and Tops" }));
  const rows = parameterGroups([yes, no, unknown, shirt]).flatMap(({ rows }) => rows);
  const row = rows.find(({ key }) => key === "pit_zips")!;
  assert.deepEqual(row.cells.map((cell) => formatValue(row.field, cell)), ["●", "○", "—", "N/A"]);
  assert.equal(row.differs, true);
  assert.equal(row.weakDifference, true);
  assert.ok(!rows.some(({ key }) => ["recco", "weight", "msrp", "sizes"].includes(key)));
  const weak = parameterGroups([yes, unknown]).flatMap(({ rows }) => rows).find(({ key }) => key === "pit_zips")!;
  assert.equal(weak.differs, false);
  assert.equal(weak.weakDifference, true);
  assert.match(weak.note!, /cannot compare/i);
  assert.ok(visibleInComparison(weak, true));
  const negativeOnly = parameterGroups([no, shirt]).flatMap(({ rows }) => rows).find(({ key }) => key === "pit_zips")!;
  assert.equal(negativeOnly.cells[0].value, false);
  assert.ok(!visibleInComparison(negativeOnly, true));
});

test("weight uses inline sizes with one comparison reference note", () => {
  const unspecified = normalizeArcProduct(product(), { raw: { weight: { value: "460 g" } } });
  const sized = normalizeArcProduct(product(), { raw: { weight: { value: "500 g (M)" } } });
  const separateSize = normalizeArcProduct(product(), {
    raw: { weight: { value: "460 g" } },
    indexed: [{ key: "weight_size", value: "L", unit: null, source: "brand", fetchedAt: "2026-11-20" }],
  });
  const weight = field("weight");
  assert.equal(formatValue(weight, unspecified.values.weight), "460 g");
  assert.equal(formatValue(weight, sized.values.weight), "500 g (M)");
  assert.equal(formatValue(weight, separateSize.values.weight), "460 g (L)");
  assert.equal(sized.values.weight_size.value, "M");
  assert.match(weightPresentation(unspecified.values.weight).detailHelp, /treat as approximate/);
  assert.equal(weightPresentation(sized.values.weight).detailHelp, "");
  const detail = parameterGroups([sized]).flatMap(({ rows }) => rows);
  assert.ok(!detail.some(({ key }) => key === "weight_size"));
  const compare = parameterGroups([unspecified, sized]).flatMap(({ rows }) => rows);
  const row = compare.find(({ key }) => key === "weight")!;
  assert.equal(row.referenceNote, "Reference size not published");
  assert.equal(row.differs, true);
  assert.equal(row.weakDifference, false);
});

test("normalizes fabric GSM, gm2 and ounces per square yard and keeps the imperial reading", () => {
  const read = (text: string) => partsOf(normalizeArcProduct(product(), { raw: { materials: ["Body: " + text] } }))[0].fields.fabric_weight;
  const weight = field("fabric_weight");
  const ounces = read("Plain weave, 3.5 oz/yd²");
  assert.equal(ounces.value, 119);
  assert.deepEqual(ounces.original, { value: 3.5, unit: "oz/yd²" });
  assert.equal(formatValue(weight, ounces), "119 g/m² (3.5 oz/yd²)");
  assert.equal(read("119 gsm").value, 119);
  assert.equal(read("118.8 gm2").value, 119);
  for (const text of ["119 g/m", "Fabric weight: 119", "119 oz/yd"]) {
    const value = read(text);
    assert.equal(value.reviewCode, "unverified");
    assert.equal(value.value, undefined);
    assert.equal(formatValue(weight, value), "Unverified");
  }
  assert.equal(read("100 gsm, 3.5 oz/yd²").reviewCode, "needs_review");
});

test("preserves yarn order and recognizes prefix and explicit paired deniers", () => {
  assert.deepEqual(parseDenier("denier 90 nylon"), [90]);
  assert.deepEqual(parseDenier("70 Denier × 40D Nylon"), [70, 40]);
  assert.deepEqual(parseDenier("Nylon 40 x 70d"), [40, 70]);
  assert.equal(parseDenier("3D knit, 110 gsm and 20 days"), null);
  assert.deepEqual(parseDenier("90-denier nylon"), [90]);
  assert.equal(parseDenier("110 gsm and 20 days"), null);
});

test("marks overfull composition and keeps recycled scope separate from fiber status", () => {
  const result = normalizeArcProduct(product(), { raw: {
    materials: [
      "Body: Nylon - 95% recycled Nylon, 5% virgin Elastane",
      "Panel: 100% recycled Polyester, 5% Nylon",
      "Lining: recycled polyester",
      "Face (Body): 80% recycled Nylon, 20% Polyester",
    ],
    features: [feature("Sustainability", "This garment contains 72% recycled material")],
  } });
  const [body, panel, lining] = partsOf(result);
  assert.deepEqual(body.fields.fiber_content.value, [{ fiber: "Nylon", pct: 95, recycled: true }, { fiber: "Elastane", pct: 5, recycled: false }]);
  assert.deepEqual(body.fields.fabric_recycled_content.value, [{ pct: 95, scope: "fabric" }]);
  assert.deepEqual(body.faces?.[0].fields.fabric_recycled_content.value, [{ pct: 80, scope: "face" }]);
  assert.deepEqual(lining.fields.fabric_recycled_content.value, [{ pct: null, scope: "claim_only" }]);
  assert.deepEqual(result.values.garment_recycled_content.value, [{ pct: 72, scope: "garment" }]);
  assert.equal(panel.fields.fiber_content.reviewCode, "needs_review");
  assert.match(panel.fields.fiber_content.evidence[0].raw, /100% recycled Polyester, 5% Nylon/);
  assert.equal(panel.fields.fabric_recycled_content, undefined);
});

test("requires explicit construction and never uses insulation density as fabric weight", () => {
  const item = normalizeArcProduct(product(), { raw: { materials: [
    "Body: Fortius DW 1.0, brushed fleece, Coreloft 60 (60 g/m²)",
    "Lining: recycled nylon jersey, 100 gsm",
    "Synthetic Insulation: Octa Loft, 98gsm - 100% Polyester",
  ] } });
  const [body, lining] = partsOf(item);
  assert.equal(body.fields.fabric_name.value, "Fortius DW 1.0");
  assert.equal(body.fields.weave, undefined);
  assert.equal(body.fields.fabric_weight, undefined);
  assert.deepEqual(lining.fields.weave.value, ["Jersey"]);
  assert.equal(lining.fields.fabric_weight.value, 100);
  assert.equal(partsOf(item, "insulation")[0].fields.synthetic_density.value, 98);
});

test("shows only four fabric locations and flags ambiguous secondary materials", () => {
  assert.equal(fabricLocation("Secondary (Body)"), "body");
  const item = normalizeArcProduct(product(), { raw: { materials: [
    "Contrast: Nylon", "Insert: Stretch woven cloth", "Secondary: Polyester", "Lining: Leather",
    "Self: Fortius DW 1.0", "Reinforcement: 70D Nylon", "Body Backer: 100% Polyester",
    "Secondary (lining): Cotton", "Backer (unknown owner): Wool",
  ] } });
  assert.deepEqual(partsOf(item).map(({ part }) => part), ["panel", "panel", "lining", "body", "reinforcement", "lining"]);
  assert.equal(item.values.fabric_issues.reviewCode, "needs_review");
  assert.deepEqual(item.values.fabric_issues.value, ["Secondary: Polyester", "Backer (unknown owner): Wool"]);
  const rows = parameterGroups([item]).find(({ title }) => title === "Main fabric")!.rows;
  const headers = [...new Set(rows.map(({ subgroup }) => subgroup))];
  assert.deepEqual(headers, ["Body", "Body / Backer", "Reinforcement", "Panel", "Lining"]);
});

test("renders core gaps on details and aligns only known fabric rows in comparison", () => {
  const body = normalizeArcProduct(product(), { raw: { materials: ["Body: GORE-TEX PRO ePE"] } });
  const shirt = normalizeArcProduct(product(), { raw: { materials: ["Body: 70D Ripstop, 3.5 oz/yd²"] } });
  const detail = parameterGroups([body]).find(({ title }) => title === "Main fabric")!.rows;
  assert.deepEqual(detail.map(({ field }) => field.key), ["fabric_name", "fiber_content", "fabric_weight"]);
  assert.equal(detail[0].subgroup, undefined);
  assert.deepEqual(detail.map(({ cells }) => cells[0].state), ["known", "unpublished", "unpublished"]);
  const compare = parameterGroups([body, shirt]).find(({ title }) => title === "Main fabric")!.rows;
  assert.ok(!compare.some(({ field }) => field.key === "fiber_content"));
  assert.equal(compare.find(({ field }) => field.key === "fabric_weight")?.cells[0].state, "unpublished");
  assert.equal(compare.find(({ field }) => field.key === "fabric_weight")?.cells[1].value, 119);
});

const currentShell = "Body: 3L GORE-TEX®, 80d, 165gsm, FC0 DWR - 100% Nylon with ePE and PU Membrane, 100% Polyester Backing";
const currentLining = "Lining: 100d SD Cordura nylon 6,6 Dobby, DWR FC0, 120gsm - 100% Nylon";
const reviewedMaterials = [
  {sku: "X000008928", name: "Sabre Pant", materials: [currentShell], fabric: "GORE-TEX® ePE", denier: [80], weight: 165},
  {sku: "X000009106", name: "Sentinel Bib Pant", materials: [currentShell], fabric: "GORE-TEX® ePE", denier: [80], weight: 165},
  {sku: "X000008896", name: "Sentinel Pant", materials: [currentLining, currentShell], fabric: "GORE-TEX® ePE", denier: [80], weight: 165},
  {sku: "X000008467", name: "Gamma MX Pant",
    materials: ["Body: 60d Fortius™ 2.0 with Fleece Backer, 233gsm, FC0 DWR - 84% Nylon, 16% Elastane 100% Polyester Backing"],
    fabric: "Fortius™ 2.0 with Fleece Backer", denier: [60], weight: 233},
  {sku: "X000008472", name: "Rho Crew Neck LS",
    materials: ["Body: Torrent™ - Jersey knit, 185gsm - 84% Polyester, 16% Elastane"],
    fabric: "Torrent™", denier: undefined, weight: 185},
];

for (const {sku, name, materials, fabric, denier, weight} of reviewedMaterials) {
  test(`matches the current published fabric for ${name} (${sku})`, () => {
    const profile = normalizeArcProduct(product({name, slug: sku}), {raw: {materials}, ...rawSample});
    const parts = partsOf(profile);
    const body = parts.find(({part}) => part === "body")!;
    assert.equal(selectCardParameters(profile).mainFabric, fabric);
    assert.equal(body.fields.fabric_name.value, fabric);
    assert.deepEqual(body.fields.denier?.value, denier);
    assert.equal(body.fields.fabric_weight.value, weight);
    assert.deepEqual(body.fields.weave?.value, sku === "X000008472" ? ["Jersey", "Knit"] : undefined);
    assert.deepEqual(body.fields.fabric_stretch?.value,
      sku === "X000008467" || sku === "X000008472" ? ["Contains elastane"] : undefined);
    assert.equal(body.fields.fabric_recycled_content, undefined);
    if (materials.includes(currentLining)) {
      const lining = parts.find(({part}) => part === "lining")!;
      assert.equal(lining.fields.fabric_name.value, "SD Cordura nylon 6,6 Dobby");
      assert.equal(lining.fields.fabric_weight.value, 120);
    }
  });
}

test("keeps explicitly published weave and recycling claims on archived shells and avoids inferring membrane chemistry", () => {
  const archived = "Body: 3L GORE-TEX® ePE, Beam Dyed, 80d plain weave recycled nylon, 165gsm, FC0 DWR - 100% Nylon with ePE and PU Membrane, 100% Polyester Backing";
  const profile = normalizeArcProduct(product(), {raw: {materials: [archived, "Panel: 3L GORE-TEX®, 50d, 120gsm - 100% Nylon"]}});
  const [body, panel] = partsOf(profile);
  assert.equal(body.fields.fabric_name.value, "GORE-TEX® ePE");
  assert.deepEqual(body.fields.weave.value, ["Plain weave"]);
  assert.deepEqual(body.fields.fabric_recycled_content.value, [{pct: null, scope: "claim_only"}]);
  assert.equal(panel.fields.fabric_name.value, "GORE-TEX®");
});

test("parses the published body blend of both Frame Polo shirts without absorbing the contrast fabric", () => {
  const jersey = "Merino / Nylon core spun jersey 16.5mn: 87% Wool, 13% Nylon - RWS Wool";
  for (const [name, materialLines] of [
    ["Frame Polo Shirt LS", [jersey]],
    ["Frame Polo Shirt SS", ["Contrast: Altitude Nylon - 115gsm, 78% Nylon, 22% Elastane", jersey]],
  ] as const) {
    const profile = normalizeArcProduct(product({name}), {raw: {materials: materialLines}});
    const body = partsOf(profile).find(({part}) => part === "body")!;
    assert.deepEqual(body.fields.fiber_content.value, [
      {fiber: "Wool", pct: 87, recycled: null}, {fiber: "Nylon", pct: 13, recycled: null},
    ]);
    assert.equal(body.fields.fiber_content.evidence[0].raw, jersey);
    assert.equal(selectCardParameters(profile).composition?.primary.pct, 87);
  }
  assert.equal(partsOf(normalizeArcProduct(product(), {raw: {materials: [jersey]}})), undefined);
});

test("counts published Polyarylate separately in each fabric and preserves backer percentages", () => {
  const profile = normalizeArcProduct(product(), {raw: {materials: [
    "Body: 315d Cordura nylon 6,6 w/4mm, 400d untwisted Vectran grid, 240gsm - 86% Nylon, 14% Polyarylate",
    "Contrast: 50D Hadron - 3L GORE-TEX PRO ePE, 99 gsm, FC0 DWR - 94% Nylon, 6% Polyarylate with ePE and PU Membrane 100% Nylon Backing",
  ]}});
  const [body, contrast] = partsOf(profile);
  assert.deepEqual(body.fields.fiber_content.value, [{fiber: "Nylon", pct: 86, recycled: null}, {fiber: "Polyarylate", pct: 14, recycled: null}]);
  assert.deepEqual(contrast.fields.fiber_content.value, [{fiber: "Nylon", pct: 94, recycled: null}, {fiber: "Polyarylate", pct: 6, recycled: null}]);
  assert.deepEqual(contrast.backers?.[0].fields.fiber_content.value, [{fiber: "Nylon", pct: 100, recycled: null}]);
});


test("uses explicitly published feature denier only when one fabric matches the name", () => {
  const raw = { materials: ["Body: Tyono™ 30 - Nylon, 51gsm - 100% Nylon"],
    features: [feature("Construction", "Tyono™ 30D fabric offers wind resistance", "Loose 40D fabric")] };
  const item = normalizeArcProduct(product(), { raw });
  assert.equal(partsOf(item)[0].fields.fabric_name.value, "Tyono™ 30");
  assert.deepEqual(partsOf(item)[0].fields.denier.value, [30]);
  assert.equal(partsOf(item)[0].fields.denier.evidence[0].path, "product.features[0].value[0]");
  const ambiguous = normalizeArcProduct(product(), { raw: { ...raw, materials: [...raw.materials, "Panel: Tyono™ 30"] } });
  assert.ok(partsOf(ambiguous).every(({ fields }) => !fields.denier));
});
