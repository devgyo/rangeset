import assert from "node:assert/strict";
import { test } from "node:test";
import type { ProductDetail } from "../arcteryx-view";
import { convert, normalizeArcProduct, parseDenier } from "../parameters/arcteryx";
import { type Fiber, compareValues, formatValue, getParameter, known, missing, parameterGroups, parameterStatus, visibleInComparison, weightPresentation, type Part } from "../parameters/model";
import { fieldsByKey, parameterVersion, registry } from "../parameters/registry";

function product(props: Partial<ProductDetail> = {}): ProductDetail {
  return {
    slug: "test", name: "Example Jacket", brand: "Example", category: "Shell Jackets", gender: "men",
    family: null, subTags: [], veilance: false, isHardshell: false, status: "active", image: null, hero: null,
    swatches: [], activities: [], summary: "", msrp: null, inStock: null, specs: {},
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
    ["main", "Body"], ["main", "Body"], ["contrast", "Contrast"],
  ]);
  assert.deepEqual(parts[0].fields.denier.value, [40, 70]);
  assert.equal(parts[0].fields.fabric_weight.value, 125);
  assert.equal(parts[0].fields.weave.value, "ripstop");
  assert.deepEqual(parts[0].fields.fiber_content.value, [{ name: "Nylon", percent: 100 }]);
  assert.deepEqual(parts[0].backers?.[0].fields.fiber_content.value, [{ name: "Polyester", percent: 100 }]);
  assert.deepEqual(profile.values.fabric_origin.value, ["TAIWAN, CHINA"]);
  assert.deepEqual(profile.values.source_notes.value, ["Unlabeled technical material statement."]);
  assert.equal(profile.values.microfibers.state, "known");
  assert.equal(parts[0].fields.denier.evidence[0].path, "product.materials[0]");
  assert.equal(parts[0].fields.denier.evidence[0].updatedAt, rawSample.fetchedAt);
  assert.equal(formatValue(field("denier"), parts[0].fields.denier), "40 × 70 D");
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
  assert.equal(getParameter(soft, field("drop")).state, "inapplicable");
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

test("does not infer shoe weight basis and separates heel, forefoot, lugs and membrane", () => {
  const shoe = product({ category: "Footwear", name: "Konseal GTX Shoe" });
  const raw = { weight: { value: "365 g" }, features: [
    feature("Footwear geometry", "4mm lugs", "Drop (Stack): 11mm (24mm : 13mm)"),
    feature("Footwear construction", "Nubuck leather upper with GTX membrane", "Compressed EVA midsole"),
    feature("Footwear outsole construction", "Vibram® XS Flash 2 outsole"),
  ] };
  const profile = normalizeArcProduct(shoe, { raw });
  assert.equal(profile.values.weight.reference?.basis, "unspecified");
  assert.equal(getParameter(profile, field("weight_basis")).state, "unpublished");
  assert.deepEqual(["heel_stack", "forefoot_stack", "drop", "lugs"].map((key) => profile.values[key].value), [24, 13, 11, 4]);
  assert.equal(profile.values.outsole.value, "Vibram XS Flash 2");
  assert.equal(profile.values.waterproof_lining.value, "GORE-TEX");
  const pair = normalizeArcProduct(shoe, { raw: { weight: { value: "730g/pair" } } });
  assert.equal(pair.values.weight.value, 730);
  assert.equal(pair.values.weight_basis.value, "pair");
  assert.match(compareValues(field("weight"), [profile.values.weight, pair.values.weight]).note!, /measurement references/i);
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
  assert.equal(rows.find(({ key }) => key === "materials.main")?.differs, false);
  assert.equal(rows.find(({ key }) => key === "materials.lining")?.differs, false);
  assert.equal((rows.find(({ key }) => key === "materials.main")?.cells[0].value as Part[]).length, 2);
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
  assert.equal((body.backers?.[0].fields.fiber_content.value as Fiber[])[0].name, "Nylon");
  assert.equal((contrast.backers?.[0].fields.fiber_content.value as Fiber[])[0].name, "Polyester");
  assert.deepEqual(a.values.source_notes.value, ["Backer: Polyester mesh"]);
  const b = normalizeArcProduct(product(), { raw: { materials: [
    "Body: 100D Nylon - 100% Nylon with membrane 100% Polyester Backing",
    "Contrast: 80D Nylon", "Backer (Contrast): 100% Polyester",
  ] } });
  const rows = parameterGroups([a, b]).flatMap(({ rows }) => rows);
  assert.equal(rows.find(({ key }) => key === "materials.main")?.differs, true);
  assert.equal(rows.find(({ key }) => key === "materials.contrast")?.differs, false);
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
    [product({ name: "Beta AR Jacket", isHardshell: true }), "jacket", "hard_shell"],
    [product({ name: "Gamma Jacket", subTags: ["Softshell"] }), "jacket", "soft_shell"],
    [product({ name: "Squamish Hoody", subTags: ["Windshell"] }), "hoodie", "wind_shell"],
    [product({ name: "Fissile SV Down Jacket", category: "Insulated Jackets", subTags: ["Insulated Shell"] }), "jacket", "insulated_shell"],
    [product({ name: "Cormac Crew Neck Shirt SS", category: "Shirts and Tops" }), "t_shirt", null],
    [product({ name: "Cila SL Dress", category: "Dresses and Skirts" }), "dress", null],
    [product({ name: "Konseal GTX Shoe", category: "Footwear", subTags: ["Waterproof"] }), "shoe", null],
    [product({ name: "Konseal Trek Boot", category: "Footwear", subTags: ["Shoes"] }), "boot", null],
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
  const beta = normalizeArcProduct(product({ name: "Beta AR Jacket", isHardshell: true }), { raw: { price: 650, currencyCode: "USD" } });
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
  for (const key of ["hood", "recco", "drop", "hydrostatic_head"]) assert.ok(!detail.some((row) => row.key === key), key);
  for (const key of ["pit_zips", "powder_skirt", "drop", "protection_type"]) {
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

test("weight uses inline sizes and shoe basis with one comparison reference note", () => {
  const shoe = product({ name: "Konseal Shoe", category: "Footwear" });
  const unspecified = normalizeArcProduct(product(), { raw: { weight: { value: "460 g" } } });
  const sized = normalizeArcProduct(product(), { raw: { weight: { value: "500 g (M)" } } });
  const single = normalizeArcProduct(shoe, { raw: { weight: { value: "365 g (per shoe)" } } });
  const pair = normalizeArcProduct(shoe, { raw: { weight: { value: "730g/pair" } } });
  const footwearSize = normalizeArcProduct(shoe, { raw: { weight: { value: "365 g (size US 9.5 per shoe)" } } });
  const separateSize = normalizeArcProduct(product(), {
    raw: { weight: { value: "460 g" } },
    indexed: [{ key: "weight_size", value: "L", unit: null, source: "brand", fetchedAt: "2026-11-20" }],
  });
  const shoeUnknown = normalizeArcProduct(shoe, { raw: { weight: { value: "360 g" } } });
  const weight = field("weight");
  assert.equal(formatValue(weight, unspecified.values.weight), "460 g");
  assert.equal(formatValue(weight, sized.values.weight), "500 g (M)");
  assert.equal(formatValue(weight, single.values.weight), "365 g (per shoe)");
  assert.equal(formatValue(weight, pair.values.weight), "730 g (pair)");
  assert.equal(formatValue(weight, footwearSize.values.weight), "365 g (US 9.5, per shoe)");
  assert.equal(formatValue(weight, separateSize.values.weight), "460 g (L)");
  assert.equal(sized.values.weight_size.value, "M");
  assert.match(weightPresentation(unspecified.values.weight).detailHelp, /treat as approximate/);
  assert.match(weightPresentation(shoeUnknown.values.weight).detailHelp, /one shoe or a pair/);
  assert.equal(weightPresentation(sized.values.weight).detailHelp, "");
  const detail = parameterGroups([sized]).flatMap(({ rows }) => rows);
  assert.ok(!detail.some(({ key }) => key === "weight_size"));
  const compare = parameterGroups([unspecified, sized]).flatMap(({ rows }) => rows);
  const row = compare.find(({ key }) => key === "weight")!;
  assert.equal(row.referenceNote, "Reference size not published");
  assert.equal(row.differs, true);
  assert.equal(row.weakDifference, false);
  const shoes = parameterGroups([shoeUnknown, single]).flatMap(({ rows }) => rows);
  assert.match(shoes.find(({ key }) => key === "weight")?.referenceNote ?? "", /Shoe weight basis not published/);
  assert.ok(!shoes.some(({ key }) => key === "weight_basis"));
});
