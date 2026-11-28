import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import {gunzipSync} from "node:zlib";
import {arcSnapshotVariants} from "../adapters/arcteryx";
import {CrawlBlocked, CrawlPolicyDenied, CrawlStop, fixtureUrl, PoliteClient, userAgent} from "../http";
import {captureRun, emptyIssueCounts, snapshotRunId, type Observation, type Target} from "../snapshot-run";
import {snapshotVariantKey} from "../snapshot-observation";
import {snapshotVariants} from "../snapshot-variants";

const fetchedAt = "2026-11-19T18:00:00Z";
function page(file: string, url: string) {
  const saved = readFileSync(new URL("./fixtures/" + file, import.meta.url));
  return {url, finalUrl: url, status: 200, fetchedAt, body: (file.endsWith(".gz") ? gunzipSync(saved) : saved).toString("utf8")};
}

test("Arc’teryx snapshot retains separate list and sale prices per variant", () => {
  const variants = snapshotVariants("arcteryx", "X000011062", page("beta-ar-jacket.html", fixtureUrl));
  assert.deepEqual(variants[0], {variantKey: "X000011062012", color: "17216", size: "6035", priceCents: 65000, salePriceCents: null, currency: "USD"});
  assert.equal(variants.length, new Set(variants.map(({variantKey}) => variantKey)).size);
  assert.throws(() => snapshotVariants("arcteryx", "X000099999", page("beta-ar-jacket.html", fixtureUrl)), /different SKU/);
  assert.deepEqual(arcSnapshotVariants({currencyCode: "USD", variants: [
    {id: "sample-one", price: 650, discountPrice: 499, stockStatus: "outOfStock"},
    {colourLabel: "Slate", sizeLabel: "M", price: 0},
  ]}), [
    {variantKey: "sample-one", color: null, size: null, priceCents: 65000, salePriceCents: 49900, currency: "USD"},
    {variantKey: "Slate|M", color: "Slate", size: "M", priceCents: null, salePriceCents: null, currency: "USD"},
  ]);
});

test("Mammut snapshot keeps the published variant prices", () => {
  const url = "https://www.mammut.com/us/en/products/1013-02962/broad-peak-in-hooded-jacket-men";
  const variants = snapshotVariants("mammut", "1013-02962", page("mammut-broad-peak.html.gz", url));
  assert.ok(variants.length > 1);
  assert.ok(variants.every(({variantKey, currency}) => variantKey.startsWith("1013-02962-") && currency === "USD"));
  assert.ok(variants.some(({priceCents}) => priceCents === 39900));
});

test("snapshot HTTP client stops on 403/429 and uses a URL-free User-Agent", async (t) => {
  assert.doesNotMatch(userAgent, /rangeset|https?:|www\./i);
  let status = 403;
  const fetch = t.mock.method(globalThis, "fetch", async () => new Response(null, {status}));
  for (status of [403, 429]) {
    await assert.rejects(new PoliteClient().loadRobots(), CrawlStop);
  }
  assert.equal(fetch.mock.callCount(), 2);
});

test("snapshot keys prefer manufacturer SKU and workflow reruns use the same UUID", () => {
  assert.equal(snapshotVariantKey("1013-04080-0001", "Black", "S"), "1013-04080-0001");
  assert.equal(snapshotVariantKey(null, " Black ", "S"), "Black|S");
  assert.equal(snapshotRunId(undefined, "42"), snapshotRunId(undefined, "42"));
  assert.notEqual(snapshotRunId(undefined, "42"), snapshotRunId(undefined, "43"));
});

test("snapshot capture resumes completed pages, records a 404, and stops on 403 with earlier rows intact", async () => {
  const targets: Target[] = Array.from({length:5}, (_, i) => ({
    id: i + 1, brand: "arcteryx", sku: "X000011062", url: fixtureUrl,
  }));
  const observations: Observation[] = [];
  const requested: number[] = [];
  const read = page("beta-ar-jacket.html", fixtureUrl);
  let savedPages = 0;
  await assert.rejects(captureRun(targets, new Set([1]), async ({id}) => {
    requested.push(id);
    if (id === 3) return {...read, status: 404, body: ""};
    if (id === 4) throw new CrawlBlocked("HTTP 403", fixtureUrl, fetchedAt);
    return read;
  }, {
    async save(rows, count) {
      observations.push(...rows);
      savedPages = count;
    },
    async finish(progress, blocked) {
      assert.deepEqual(progress, {pagesDone: 3, stoppedAtPage: 4, stoppedReason: "HTTP 403", issues: emptyIssueCounts()});
      assert.ok(blocked);
      observations.push(blocked);
    },
  }), /HTTP 403/);
  assert.deepEqual(requested, [2,3,4]);
  assert.equal(savedPages, 3);
  assert.ok(observations.some((row) => row.productId === 2 && row.status === "ok"));
  assert.deepEqual(observations.filter((row) => row.status !== "ok").map(({productId, status, priceCents}) =>
    [productId, status, priceCents]), [[3,"missing_404",null],[4,"blocked",null]]);
});

test("snapshot summary counts URL, policy, timeout and parse failures separately and continues", async (t) => {
  const warn = t.mock.method(console, "warn", () => {});
  const targets: Target[] = Array.from({length: 6}, (_, i) => ({
    id: i + 1, brand: "arcteryx", sku: "X000011062", url: i === 0 ? " " : fixtureUrl,
  }));
  const requested: number[] = [];
  const observations: Observation[] = [];
  const read = page("beta-ar-jacket.html", fixtureUrl);
  await captureRun(targets, new Set(), async ({id}) => {
    requested.push(id);
    if (id === 2) throw new CrawlPolicyDenied("robots.txt");
    if (id === 3) throw new DOMException("Timed out", "TimeoutError");
    if (id === 4) return {...read, body: "<p>No product payload</p>"};
    if (id === 5) return {...read, status: 302, policyDenied: true};
    return read;
  }, {
    async save(rows) { observations.push(...rows); },
    async finish(progress, blocked) {
      assert.deepEqual(progress, {pagesDone: 1, stoppedAtPage: null, stoppedReason: null,
        issues: {missingUrl: 1, policyDenied: 2, timeout: 1, parseFailed: 1}});
      assert.equal(blocked, undefined);
    },
  });
  assert.deepEqual(requested, [2, 3, 4, 5, 6]);
  assert.equal(warn.mock.callCount(), 5);
  assert.ok(observations.length > 0 && observations.every(({status}) => status === "ok"));
});

test("the snapshot HTTP client emits blocked only for 403 and 429", async (t) => {
  const target: Target = {id: 1, brand: "arcteryx", sku: "X000011062", url: fixtureUrl};
  for (const status of [403, 429, 200]) {
    const client = new PoliteClient();
    t.mock.method(globalThis, "fetch", async (url: string) => url.endsWith("/robots.txt")
      ? new Response("User-agent: *\nAllow: /")
      : new Response(status === 200 ? "<title>Just a moment...</title>" : null, {status}));
    await client.loadRobots();
    let observation: Observation | undefined;
    await assert.rejects(captureRun([target], new Set(), () => client.request(fixtureUrl, "product"), {
      async save() { assert.fail("A challenge should stop capture"); },
      async finish(_progress, blocked) { observation = blocked; },
    }), (error) => error instanceof CrawlStop && (error instanceof CrawlBlocked) === (status !== 200));
    assert.equal(observation?.status, status === 200 ? undefined : "blocked");
    t.mock.restoreAll();
  }
});
