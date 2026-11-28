import assert from "node:assert/strict";
import {test} from "node:test";
import {createTranslator} from "next-intl";
import en from "../../messages/en.json";
import zh from "../../messages/zh.json";
import ja from "../../messages/ja.json";
import {displayCardCell} from "../../i18n/copy";
import {searchCatalog} from "../catalog-search";
import {cardFit, selectCardParameters} from "../parameters/card";
import {cardFields, cardFitAliases} from "../parameters/registry";
import {known, missing, type Fiber, type Parameter, type Part, type Profile} from "../parameters/model";

const translators = {
  en: createTranslator({locale: "en", messages: en}),
  zh: createTranslator({locale: "zh", messages: zh}),
  ja: createTranslator({locale: "ja", messages: ja}),
};
function profile(values: Record<string, Parameter>): Profile {
  return {context: {kind: "hard_shell", insulated: false, snow: false, membrane: false}, values};
}
const part = (name: string, fields: Part["fields"]): Part => ({part: name, label: name, fields, evidence: []});
const fiber = (name: string, pct: number): Fiber => ({fiber: name, pct, recycled: null});
const nylon = fiber("Nylon", 100);

test("the card registry always renders four ordered cells, including missing values", () => {
  assert.deepEqual(cardFields.map(({key}) => key), ["weight", "fit", "mainFabric", "composition"]);
  const card = selectCardParameters(profile({membrane: known("GORE-TEX", []), denier: known([80], [])}));
  for (const t of Object.values(translators)) {
    assert.deepEqual(cardFields.map(({key}) => displayCardCell(t, card, key).text), ["—", "—", "—", "—"]);
  }
});

test("main fabric prefers the Body name and falls back only to published Body composition", () => {
  const panel = part("panel", {fabric_name: known("Panel name", []), fiber_content: known([fiber("Wool", 100)], [])});
  const liningOnly = selectCardParameters(profile({materials: known([panel], [])}));
  assert.equal(displayCardCell(translators.en, liningOnly, "mainFabric").text, "—");
  const body = part("body", {fiber_content: known([nylon], [])});
  const fallback = selectCardParameters(profile({materials: known([panel, body], [])}));
  assert.equal(displayCardCell(translators.en, fallback, "mainFabric").text, "Nylon 100%");
  body.fields.fabric_name = known("GORE-TEX ePE", []);
  const named = selectCardParameters(profile({materials: known([body, panel], [])}));
  assert.equal(displayCardCell(translators.en, named, "mainFabric").text, "GORE-TEX ePE");
  body.fields.fiber_content = {...missing("review"), value: [nylon]};
  assert.equal(selectCardParameters(profile({materials: known([body], [])})).composition, null);
});

test("composition shows the largest Body share, with full Body composition in the title", () => {
  const body = part("body", {
    fiber_content: known([fiber("Elastane", 5), fiber("Nylon", 95)], []),
    fabric_recycled_content: known([{scope: "fabric", pct: 70}, {scope: "face", pct: 88}], []),
  });
  const card = selectCardParameters(profile({weight: known(505, [], {size: "L"}), materials: known([body], [])}));
  assert.deepEqual(displayCardCell(translators.en, card, "composition"), {
    text: "Nylon 95% · 70% recycled", title: "Elastane 5% · Nylon 95% · 70% recycled",
  });
  assert.equal(displayCardCell(translators.zh, card, "composition").text, "尼龙 95% · 再生 70%");
  assert.equal(displayCardCell(translators.ja, card, "composition").text, "ナイロン95% · リサイクル素材70%");
  assert.equal(displayCardCell(translators.en, card, "weight").text, "505 g");
  body.fields.fabric_recycled_content = known([{scope: "claim_only", pct: null}, {scope: "garment", pct: 50}], []);
  assert.equal(selectCardParameters(profile({materials: known([body], [])})).composition?.recycled, null);
});

test("fit mapping translates known brand labels without rewriting source evidence", () => {
  for (const [code, aliases] of Object.entries(cardFitAliases)) {
    for (const alias of aliases) assert.equal(cardFit(alias), code);
  }
  assert.equal(cardFit("  NEXT-to-skin  "), "next_to_skin");
  assert.equal(cardFit("Unknown Fit"), null);
  const value = known("Regular Fit", [{url: null, path: "product.fit", raw: "Regular Fit", method: "published", updatedAt: null}]);
  const card = selectCardParameters(profile({fit: value}));
  assert.equal(displayCardCell(translators.en, card, "fit").text, "Regular");
  assert.equal(displayCardCell(translators.zh, card, "fit").text, "常规版型");
  assert.equal(displayCardCell(translators.ja, card, "fit").text, "レギュラーフィット");
  assert.equal(value.value, "Regular Fit");
  assert.equal(value.evidence[0].raw, "Regular Fit");
});

test("search matches exact model numbers and retries only supported qualifiers when needed", () => {
  const searchProduct = (name: string, slug: string) => ({name, slug, family: null, subTags: [], specs: {}, gender: null});
  const ifora = searchProduct("Ifora Jacket", "arcteryx-womens-ifora-jacket-9524-x000009524");
  const insulated = searchProduct("Beta Insulated Jacket", "arcteryx-mens-beta-insulated-jacket-0866-x000010866");
  const down = searchProduct("Ifora Down Jacket", "arcteryx-womens-ifora-down-jacket-9874-x000009874");
  const hooded = searchProduct("Ifora Hooded Jacket", "arcteryx-womens-ifora-hooded-jacket-9525-x000009525");
  for (const query of ["9524", "X000009524", "x000009524", "Ifora Hooded Jacket", "Ifora jacket’s"]) {
    assert.deepEqual(searchCatalog([ifora, insulated, down], query), [ifora]);
  }
  assert.deepEqual(searchCatalog([ifora, hooded], "Ifora Hooded Jacket"), [hooded]);
  assert.deepEqual(searchCatalog([ifora, insulated], "Iffora Hooded Jacket"), []);
  assert.deepEqual(searchCatalog([ifora, insulated], "9525"), []);
  assert.deepEqual(searchCatalog([ifora, insulated], "hoodie"), []);
});

test("shared catalog search matches localized families and taxonomy while keeping exact style numbers", () => {
  const beta = {
    slug: "arcteryx-mens-beta-ar-jacket-1062-x000011062", name: "Beta AR Jacket", family: "Beta",
    brand: "Arc’teryx", gender: "men" as const, subTags: [], taxonomy: {state: "classified", leaf: "outer.hardshell"} as const,
  };
  const gamma = {...beta, slug: "arcteryx-womens-gamma-1234-x000010000", name: "Gamma Jacket", family: "Gamma", gender: "women" as const};
  const products = [beta, gamma];
  const japanese = (key: string) => translators.ja(key as Parameters<typeof translators.ja>[0]);
  for (const query of ["Beta", "贝塔 AR", "ベータ", "始祖鸟 Beta", "アークテリクス ベータ", "メンズ ベータ", "ベータ ハードシェル", "Ｘ００００１１０６２", "1062"]) {
    assert.deepEqual(searchCatalog(products, query, japanese), [beta], query);
  }
  assert.deepEqual(searchCatalog(products, "11062", japanese), []);
  assert.deepEqual(searchCatalog(products, "1062 women"), []);
  assert.deepEqual(searchCatalog(products, "ハードシェル", japanese), products);
});
