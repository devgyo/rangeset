import assert from "node:assert/strict";
import {test} from "node:test";
import {productJsonLd, serializeJsonLd} from "../product-jsonld";

const url = "https://rangeset.com/ja/products/beta-ar";
const base = {name: "Beta AR Jacket", brand: "Arc’teryx", image: null, hero: null, msrp: null, inStock: null};

test("Product JSON-LD emits the known Brand, SKU, image, currency, and Offer subset", () => {
  const image = "https://images.arcteryx.com/beta.jpg";
  const json = productJsonLd({...base, image, modelNumbers: ["1062", "X000011062"],
    msrp: 650, currency: "USD", inStock: false}, url);
  assert.deepEqual(JSON.parse(serializeJsonLd(json)), {
    "@context": "https://schema.org", "@type": "Product", name: "Beta AR Jacket",
    brand: {"@type": "Brand", name: "Arc’teryx"}, image, sku: "X000011062", url,
    offers: {"@type": "Offer", url, price: 650, priceCurrency: "USD", availability: "https://schema.org/OutOfStock"},
  });
});

test("Product JSON-LD omits unknown facts and safely serializes product names for HTML", () => {
  const json = serializeJsonLd(productJsonLd({...base, name: "Sample </script>"}, url));
  assert.doesNotMatch(json, /<\/script>|"sku"|"image"|"offers"|null/);
  assert.equal(JSON.parse(json).name, "Sample </script>");
  assert.deepEqual(productJsonLd({...base, msrp: 249, currency: "USD"}, url).offers,
    {"@type": "Offer", url, price: 249, priceCurrency: "USD"});
});

test("multiple priced variants produce AggregateOffer and image must be absolute", () => {
  const ld = productJsonLd({...base, image: "/missing.jpg", hero: "https://images.arcteryx.com/beta.jpg",
    currency: "USD", msrp: 650, offerRange: {lowPrice: 550, highPrice: 650, offerCount: 3}}, url);
  assert.equal(ld.image, "https://images.arcteryx.com/beta.jpg");
  assert.deepEqual(ld.offers, {"@type": "AggregateOffer", lowPrice: 550, highPrice: 650, offerCount: 3, priceCurrency: "USD", url});
  assert.equal(productJsonLd({...base, image: "/missing.jpg"}, url).image, undefined);
});
