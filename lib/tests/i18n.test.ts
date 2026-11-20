import assert from "node:assert/strict";
import {test} from "node:test";
import {createTranslator} from "next-intl";
import {categoryLabel, displayParameter, englishMessage, formatSeason, partDisplay} from "../../i18n/copy";
import {languageAlternates, languageTags, localizedPath, pageAlternates} from "../../i18n/routing";
import en from "../../messages/en.json";
import zh from "../../messages/zh.json";
import ja from "../../messages/ja.json";
import {categoryOrder} from "../arcteryx-view";
import {known, missing} from "../parameters/model";
import {fieldsByKey, groups, productTypes, protectionTypes} from "../parameters/registry";

const messages = {en, zh, ja};
const translators = {
  en: createTranslator({locale: "en", messages: en}),
  zh: createTranslator({locale: "zh", messages: zh}),
  ja: createTranslator({locale: "ja", messages: ja}),
};
const field = (key: string) => fieldsByKey.get(key)!;

test("unchanged English paths and self-canonicals use one locale map", () => {
  for (const path of ["/", "/products", "/products/beta", "/compare", "/jackets", "/jackets/beta"]) {
    assert.equal(localizedPath(path, "en"), path);
    assert.equal(localizedPath(path, "zh"), "/zh" + (path === "/" ? "" : path));
    assert.equal(localizedPath(path, "ja"), "/ja" + (path === "/" ? "" : path));
    for (const locale of ["en", "zh", "ja"] as const) {
      const alternates = pageAlternates(path, locale);
      assert.equal(alternates.canonical, localizedPath(path, locale));
      assert.equal(alternates.languages[languageTags[locale]], alternates.canonical);
      assert.equal(alternates.languages["x-default"], path);
    }
  }
  assert.deepEqual(Object.keys(languageAlternates("/")), ["en", "zh-Hans", "ja", "x-default"]);
});

test("generated messages cover the registry and only the five approved help translations", () => {
  for (const [locale, catalogue] of Object.entries(messages)) {
    for (const key of fieldsByKey.keys()) assert.ok(Object.hasOwn(catalogue.field, key), locale + " " + key);
    for (const key of Object.keys(groups)) assert.ok(Object.hasOwn(catalogue.group, key), locale + " " + key);
    for (const key of Object.keys(productTypes)) assert.ok(Object.hasOwn(catalogue.type, key), locale + " " + key);
    for (const key of Object.keys(protectionTypes)) assert.ok(Object.hasOwn(catalogue.protection, key), locale + " " + key);
  }
  for (const locale of ["zh", "ja"] as const) {
    assert.deepEqual(Object.keys(messages[locale].help).sort(), ["3l", "denier", "dwr", "fill", "recco"]);
  }
});

test("Japanese symbols keep text and numeric or technical values keep their original format", () => {
  const t = translators.ja;
  const spec = (key: string, value: ReturnType<typeof known>) => displayParameter(t, "ja", field(key), value);
  assert.equal(spec("pit_zips", known(true, [])), "● あり");
  assert.equal(spec("pit_zips", known(false, [])), "○ なし");
  assert.equal(spec("pit_zips", missing()), "— 未公表");
  assert.equal(spec("pit_zips", missing("inapplicable")), "対象外");
  assert.equal(spec("fabric_weight", known(136, [])), "136 g/m²");
  assert.equal(spec("denier", known([100], [])), "100D");
  assert.equal(spec("msrp", known(650, [], {unit: "USD"})), "$650 USD");
  assert.equal(spec("fabric_name", known("GORE-TEX® PRO ePE", [])), "GORE-TEX® PRO ePE");
  assert.equal(displayParameter(translators.zh, "zh", field("pit_zips"), known(false, [])), "○ 无");
  assert.equal(displayParameter(translators.en, "en", field("pit_zips"), known(false, [])), "○");
});

test("seasons, part labels and categories use the glossary without modifying source strings", () => {
  assert.equal(formatSeason(translators.zh, "2027 · Spring / Summer"), "2027 春夏");
  assert.equal(formatSeason(translators.ja, "2026 · Fall / Winter"), "2026年秋冬");
  assert.equal(formatSeason(translators.zh, "2026 · Fall"), "2026 秋季");
  assert.equal(formatSeason(translators.ja, "2025"), "2025年");
  assert.equal(formatSeason(translators.zh, "Unknown"), "—");
  assert.equal(partDisplay(translators.ja, "Body / Backer"), ja.part.body + " / " + ja.part.backer);
  for (const category of categoryOrder) assert.equal(categoryLabel(translators.en, category), category);
  assert.equal(categoryLabel(translators.zh, "Shell Jackets"), zh.cat.shell_jackets);
  const evidence = "Body: 100D GORE-TEX® PRO ePE, 136 gsm, FC0 DWR";
  assert.equal(englishMessage("ui.parsed_brand_text"), "Parsed brand text");
  const raw = known([evidence], []);
  assert.equal(displayParameter(translators.ja, "ja", field("source_notes"), raw), evidence);
});

test("localizes clothing fibers, proportions and activity values while keeping trademarks unchanged", () => {
  const composition = known([
    {fiber: "Nylon", pct: 95, recycled: true},
    {fiber: "Elastane", pct: 5, recycled: null},
  ], []);
  assert.equal(displayParameter(translators.zh, "zh", field("fiber_content"), composition), "95% 再生尼龙 · 5% 氨纶");
  assert.equal(displayParameter(translators.ja, "ja", field("fiber_content"), composition), "95%リサイクルナイロン · 5%ポリウレタン");
  assert.equal(displayParameter(translators.en, "en", field("fiber_content"), composition), "95% recycled Nylon · 5% Elastane");
  assert.equal(displayParameter(translators.zh, "zh", field("fabric_name"), known("Lycra", [])), "Lycra");
  assert.equal(displayParameter(translators.ja, "ja", field("fabric_name"), known("TerraTex™", [])), "TerraTex™");
  assert.equal(displayParameter(translators.zh, "zh", field("activities"), known(["Hike"], [])), "徒步");
  assert.equal(displayParameter(translators.ja, "ja", field("fit"), known("Regular", [])), "レギュラーフィット");
});
