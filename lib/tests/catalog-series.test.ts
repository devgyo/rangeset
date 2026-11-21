import assert from "node:assert/strict";
import {test} from "node:test";
import {filterCatalog} from "../../components/catalog/catalog-filter-results";
import type {CatalogListing} from "../catalog";
import {pruneSeries, seriesGroups, visibleSeries} from "../catalog/series";

function listing(slug: string, brandSlug: string, series: string[], gender: CatalogListing["gender"] = "men"): CatalogListing {
  return {
    slug, name: slug, brandSlug, brand: brandSlug === "mammut" ? "Mammut" : "Arc’teryx", series, gender,
    category: null, family: null, subTags: [], veilance: false, image: null, swatches: [], swatchCount: 0, activities: [],
    msrp: null, inStock: null, styleFamily: null, stockRatio: null, releaseSeason: null, cardValueCount: 0,
    status: "active", card: {weight: null, fit: null, mainFabric: null, composition: null},
  };
}

const products = [
  listing("m-jacket", "mammut", ["Shared", "Eiger"]),
  listing("m-shirt", "mammut", ["Eiger", "Eiger"], "women"),
  listing("a-jacket", "arcteryx", ["Shared", "Veilance"]),
];
const inventory = seriesGroups(products);

test("product lines are grouped by brand or merged for the selected brands", () => {
  assert.deepEqual(visibleSeries(inventory, []).map(({name}) => name), ["Arc’teryx", "Mammut"]);
  assert.deepEqual(visibleSeries(inventory, ["mammut"])[0].options, [["Eiger", 2], ["Shared", 1]]);
  assert.deepEqual(visibleSeries(inventory, ["mammut", "arcteryx"])[0].options, [["Eiger", 2], ["Shared", 2], ["Veilance", 1]]);
});

test("changing brands prunes incompatible lines and preserves other URL filters", () => {
  const params = new URLSearchParams("brand=mammut&series=arcteryx%3AShared&series=Shared&series=Veilance&line=veilance&gender=women");
  pruneSeries(params, inventory);
  assert.equal(params.toString(), "brand=mammut&gender=women&series=Shared");
});

test("line counts use other filters without counting the selected line as a constraint", () => {
  const result = filterCatalog(products, {
    category: "", gender: "men", family: "", brand: ["mammut"], series: ["Shared"],
    legacyLine: null, activity: [], productType: "", protectionType: "", query: "jacket", sort: "featured",
  });
  assert.deepEqual(result.results.map(({slug}) => slug), ["m-jacket"]);
  assert.deepEqual(visibleSeries(inventory, ["mammut"], result.counts)[0].options, [["Eiger", 1], ["Shared", 1]]);
  const unique = filterCatalog(products, {
    category: "", gender: "", family: "", brand: [], series: ["arcteryx:Shared"],
    legacyLine: null, activity: [], productType: "", protectionType: "", query: "", sort: "featured",
  });
  assert.deepEqual(unique.results.map(({slug}) => slug), ["a-jacket"]);
});

test("all catalog sorts keep equal-valued products in stable ID order across page boundaries", async () => {
  const {catalogPageSlice, catalogPageSize} = await import("../catalog/pagination");
  const {catalogSorts} = await import("../catalog/featured-sort");
  const items = Array.from({length: 53}, (_, index) => ({
    ...listing("item-" + (53 - index), "mammut", ["Eiger"]), name: "Same name", id: index + 1, currency: "USD",
    msrp: 200, card: {weight: 400, fit: null, mainFabric: null, composition: null},
  }));
  for (const sort of catalogSorts) {
    for (const priced of [items, items.map((item) => ({...item, msrp: null, card: {...item.card, weight: null}}))]) {
      const {results} = filterCatalog([...priced].reverse(), {
        category: "", gender: "", family: "", brand: [], series: [], legacyLine: null,
        activity: [], productType: "", protectionType: "", query: "", sort,
      });
      const pages = [1, 2, 3].flatMap((page) => catalogPageSlice(results, page));
      assert.equal(new Set(pages.map(({slug}) => slug)).size, priced.length);
      assert.deepEqual(pages.map(({id}) => id), items.map(({id}) => id));
      assert.equal(catalogPageSlice(results, 1, catalogPageSize * 2).length, 48);
    }
  }
});
