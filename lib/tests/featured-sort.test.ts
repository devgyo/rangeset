import assert from "node:assert/strict";
import {test} from "node:test";
import {catalogSort, rankFeatured, releaseSeasonRank, type FeaturedProduct} from "../catalog/featured-sort";
import {countCardValues, selectCardParameters} from "../parameters/card";
import {known, missing, type Profile} from "../parameters/model";

const spring = releaseSeasonRank(2028, "S")!;
const fall = releaseSeasonRank(2028, "Fall / Winter")!;
const prior = releaseSeasonRank(2027, "FW")!;

function product(slug: string, overrides: Partial<FeaturedProduct> = {}): FeaturedProduct {
  return {
    slug, name: slug, brandSlug: "a", styleFamily: null, releaseSeason: fall,
    cardValueCount: 4, status: "active", ...overrides,
  };
}

test("Featured prioritizes complete active products and keeps discontinued products in the lower tier", () => {
  const items = [
    product("incomplete", {cardValueCount: 2}),
    product("old", {releaseSeason: prior}),
    product("discontinued", {status: "discontinued"}),
    product("unpublished", {releaseSeason: null}),
    product("spring", {releaseSeason: spring, cardValueCount: 3}),
    product("newest"),
  ];
  assert.deepEqual(rankFeatured(items).map(({tier, product}) => [tier, product.slug]), [
    ["A", "newest"], ["A", "spring"], ["A", "old"], ["A", "unpublished"],
    ["C", "discontinued"], ["C", "incomplete"],
  ]);
  assert.equal(releaseSeasonRank(2028, "Unspecified"), null);
  assert.equal(releaseSeasonRank(null, "SS"), null);
});

test("Card coverage counts an explicit N/A and the composition fallback, and excludes review", () => {
  const profile: Profile = {
    context: {kind: "hard_shell", productType: "jacket", insulated: false, snow: false, membrane: false},
    values: {
      weight: missing("review"),
      fit: missing("inapplicable"),
      materials: known([{part: "body", label: "Body", evidence: [], fields: {
        fiber_content: known([{fiber: "Nylon", pct: 100, recycled: null}], []),
      }}], []),
    },
  };
  const card = selectCardParameters(profile);
  assert.equal(card.mainFabric, null);
  assert.ok(card.composition);
  const cardValueCount = countCardValues(card, profile);
  assert.equal(cardValueCount, 3);
  assert.equal(rankFeatured([product("three fields", {cardValueCount})])[0].tier, "A");
  profile.values.fit = missing();
  assert.equal(countCardValues(card, profile), 2);
});

test("Featured interleaves a 10:2 brand split deterministically without mutating the input", () => {
  const items = [
    ...Array.from({length: 10}, (_, i) => product("a" + i)),
    ...Array.from({length: 2}, (_, i) => product("b" + i, {brandSlug: "b"})),
  ];
  const reverse = [...items].reverse();
  const expected = ["a0", "a1", "a2", "b0", "a3", "a4", "a5", "a6", "a7", "b1", "a8", "a9"];
  for (const input of [reverse, reverse, items]) {
    assert.deepEqual(rankFeatured(input).map(({product}) => product.slug), expected);
  }
  assert.deepEqual(reverse, [...items].reverse());
});

test("One brand sorts by season, groups styles within that season and breaks name ties by slug", () => {
  const items = [
    product("c", {name: "Coat", styleFamily: "coat"}),
    product("p", {name: "Alpine Coat", styleFamily: "coat", releaseSeason: spring}),
    product("w", {name: "Alpine Coat", styleFamily: "coat"}),
    product("m", {name: "Alpine Coat", styleFamily: "coat"}),
    product("b", {name: "Beta Jacket"}),
  ];
  assert.deepEqual(rankFeatured(items).map(({product}) => product.slug), ["m", "w", "c", "b", "p"]);
});

test("Featured is the default catalog sort and existing URL sorts still resolve", () => {
  assert.equal(catalogSort(null), "featured");
  assert.equal(catalogSort("unknown"), "featured");
  for (const sort of ["name", "price-asc", "price-desc", "weight"]) assert.equal(catalogSort(sort), sort);
});
