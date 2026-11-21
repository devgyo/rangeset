import assert from "node:assert/strict";
import {test} from "node:test";
import {randomUUID} from "node:crypto";
import pg from "pg";
import {brandLink, outboundResponse} from "../outbound";

const sku = "X000011062";
const official = "https://arcteryx.com/us/en/shop/mens/beta-ar-jacket-1062?color=black";
const request = (params: string) => new Request("https://rangeset.com/out/" + sku + "?" + params, {
  headers: {referer: "https://rangeset.com/zh/products/beta?token=never-store#secret"},
});

test("outbound uses the stored branded destination and records locale and referer", async () => {
  const clicks: unknown[] = [];
  const response = await outboundResponse(request("to=brand&url=https://bad.test&affiliate_id=abc&locale=zh"), sku, {
    find: async (id) => id === sku ? {brand: "arcteryx", url: official} : undefined,
    record: async (click) => clicks.push(click),
  });
  assert.equal(response.status, 302);
  assert.equal(response.headers.get("X-Robots-Tag"), "noindex, nofollow");
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(response.headers.get("Location"), official + "&utm_source=rangeset&utm_medium=referral&utm_campaign=product");
  assert.deepEqual(clicks, [{sku, locale: "zh", referer: "https://rangeset.com/zh/products/beta",
    target: response.headers.get("Location"), isBot: false}]);
  assert.equal(brandLink({brandSlug: "arcteryx", url: official, modelNumbers: ["1062", sku]}, "ja"), "/out/" + sku + "?to=brand&locale=ja");
});

test("outbound rejects unknown products, targets, spoofed hosts and non-product paths", async () => {
  for (const target of [undefined, "https://arcteryx.com.bad.test/us/en/shop/product", "https://arcteryx.com@bad.test/us/en/shop/product",
    "http://arcteryx.com/us/en/shop/product", "https://arcteryx.com/api/redirect", "https://www.mammut.com/us/en/products/1010-33030/other"]) {
    const response = await outboundResponse(request("to=brand"), sku, {
      find: async () => target ? {brand: "arcteryx", url: target} : undefined,
      record: async () => assert.fail("Rejected target should not generate a click"),
    });
    assert.equal(response.status, 404, target);
    assert.equal(response.headers.get("Location"), null);
  }
  const invalid = await outboundResponse(request("to=https://bad.test"), sku, {
    find: async () => assert.fail("Always require to=brand"),
    record: async () => assert.fail("Rejected target should not generate a click"),
  });
  assert.equal(invalid.status, 404);
});

test("outbound still redirects when click tracking cannot write", async (t) => {
  t.mock.method(console, "warn", () => {});
  const response = await outboundResponse(request("to=brand"), sku, {
    find: async () => ({brand: "arcteryx", url: official}),
    record: async () => { throw new Error("database write failed"); },
  });
  assert.equal(response.status, 302);
  assert.ok(response.headers.get("Location")?.startsWith(official));
});

test("HEAD does not write and common bots are excluded from human clicks", async () => {
  const rows: {isBot: boolean}[] = [];
  const store = {
    find: async () => ({brand: "arcteryx", url: official}),
    record: async (click: {isBot: boolean}) => rows.push(click),
  };
  const url = request("to=brand").url;
  assert.equal((await outboundResponse(new Request(url, {method: "HEAD"}), sku, store)).status, 302);
  assert.equal(rows.length, 0);
  assert.equal((await outboundResponse(new Request(url, {headers: {"user-agent": "Googlebot/2.1"}}), sku, store)).status, 302);
  assert.equal(rows.length, 1);
  assert.equal(rows.filter(({isBot}) => !isBot).length, 0);
});

const site = process.env.TEST_SITE_URL;
const testDatabase = process.env.TEST_DATABASE_URL;

test("outbound resolves non-X external IDs using the database brand, including an unapproved third brand", {
  skip: !site || !testDatabase,
}, async () => {
  const database = new URL(testDatabase!);
  assert.ok(["localhost", "127.0.0.1"].includes(database.hostname) && database.pathname.endsWith("_test"));
  const origin = new URL(site!);
  assert.ok(["localhost", "127.0.0.1"].includes(origin.hostname));
  const pool = new pg.Pool({connectionString: testDatabase});
  const key = randomUUID();
  const thirdSku = "z-" + key;
  const arcSku = "opaque-" + key;
  let thirdBrand: number | undefined;
  let createdArc: number | undefined;
  try {
    const third = await pool.query("INSERT INTO brands (slug, name, website) VALUES ($1, 'Third brand', 'https://example.com') RETURNING id", [key]);
    thirdBrand = third.rows[0].id;
    const inserted = await pool.query("INSERT INTO brands (slug, name, website) VALUES ('arcteryx', 'Arc’teryx', 'https://arcteryx.com') ON CONFLICT (slug) DO NOTHING RETURNING id");
    createdArc = inserted.rows[0]?.id;
    const arc = await pool.query("SELECT id FROM brands WHERE slug = 'arcteryx'");
    await pool.query(`INSERT INTO products (brand_id, external_id, slug, url, name, first_seen, last_seen) VALUES
      ($1, $2, $2, $3, 'Third brand product', now(), now()), ($4, $5, $5, $6, 'Arc product', now(), now())`, [
      thirdBrand, thirdSku, "https://www.mammut.com/us/en/products/1010-33030/eiger", arc.rows[0].id, arcSku, official,
    ]);
    const fetchSku = (value: string) => fetch(new URL("/out/" + value + "?to=brand", origin), {method: "HEAD", redirect: "manual"});
    assert.equal((await fetchSku(thirdSku)).status, 404);
    const response = await fetchSku(arcSku);
    assert.equal(response.status, 302);
    assert.equal(new URL(response.headers.get("location")!).hostname, "arcteryx.com");
  } finally {
    try {
      await pool.query("DELETE FROM products WHERE external_id IN ($1, $2)", [thirdSku, arcSku]);
      await pool.query("DELETE FROM brands WHERE id IN ($1, $2)", [thirdBrand ?? null, createdArc ?? null]);
    } finally {
      await pool.end();
    }
  }
});
