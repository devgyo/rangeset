import {readFile} from "node:fs/promises";
import pg from "pg";
import {eq} from "drizzle-orm";
import {drizzle} from "drizzle-orm/node-postgres";
import * as schema from "../lib/db/schema";
import {fixtureProducts, mammutSource} from "../lib/catalog/fixture";
import {known, type Parameter, type Part} from "../lib/parameters/model";
import type {MammutProduct} from "./adapters/mammut";

const keys = {weight_g: "weight", fit: "fit", membrane: "membrane", waterproof_mm: "hydrostatic_head", breathability: "breathability"};
const {brands, products, productRaw, productSpecs, prices} = schema;

async function main() {
  if (process.argv.length !== 3 || process.argv[2] !== "--apply") throw new Error("Pass --apply to insert reviewed Mammut dry-run records");
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required");
  const input = JSON.parse(await readFile("data/mammut-dry-run.json", "utf8")) as {
    summary: {kept: number; errors: number; pending: number; stopped: string | null}; products: MammutProduct[];
  };
  if (!input.products.length || input.summary.kept !== input.products.length || input.summary.errors || input.summary.pending || input.summary.stopped) {
    throw new Error("A complete Mammut dry run is required");
  }
  const unique = new Set<string>();
  for (const item of input.products) {
    if (!/^\d{4}-\d{5}$/.test(item.externalId) || item.slug !== "mammut-" + item.externalId || item.raw.modelNumber !== item.externalId ||
      !item.url.startsWith(`https://www.mammut.com/us/en/products/${item.externalId}/`) || item.raw.currency !== "USD" ||
      !["apparel", "backpack"].includes(item.raw.scope) || unique.has(item.externalId)) throw new Error("Invalid Mammut product " + item.externalId);
    unique.add(item.externalId);
  }

  const pool = new pg.Pool({connectionString, connectionTimeoutMillis: 10_000});
  try {
    const db = drizzle(pool, {schema});
    const count = await db.transaction(async (tx) => {
      await tx.insert(brands).values({slug: "mammut", name: "Mammut", website: "https://www.mammut.com/us/en/"}).onConflictDoNothing();
      const [brand] = await tx.select({id: brands.id}).from(brands).where(eq(brands.slug, "mammut"));
      let inserted = 0;
      for (const item of input.products) {
        const {raw, url, fetchedAt, slug, externalId} = item;
        const source = mammutSource(item);
        const [view] = fixtureProducts([source], true);
        const [product] = await tx.insert(products).values({
          brandId: brand.id, externalId, slug, url, name: raw.name, category: raw.category, subTags: raw.categories,
          gender: raw.gender, analyticsFamily: view.family, firstSeen: fetchedAt, lastSeen: fetchedAt,
        }).onConflictDoNothing({target: [products.brandId, products.externalId]}).returning({id: products.id});
        if (!product) continue;
        await tx.insert(productRaw).values({productId: product.id, payload: raw, fetchedAt});
        await tx.insert(prices).values(source.prices.map((row) => ({...row, productId: product.id, channel: "brand_us", fetchedAt})));
        const profile = view.parameters!;
        const scalars: [string, Parameter | undefined][] = Object.entries(keys).map(([key, field]) => [key, profile.values[field]]);
        const fabrics = profile.values.materials;
        const body = fabrics?.state === "known" ? (fabrics.value as Part[]).find(({part}) => part === "body") : undefined;
        const denier = body?.fields.denier;
        if (denier?.state === "known") {
          const readings = denier.value as number[];
          const reading = readings.length === 1 ? readings[0] : readings.map((value) => value + "D").join(" × ");
          scalars.push(["face_denier", known(reading, denier.evidence, {unit: readings.length === 1 ? "D" : undefined})]);
        }
        const insulation = profile.values.insulation;
        if (insulation?.state === "known") {
          const fill = (insulation.value as Part[]).find(({fields}) => fields.fill_power?.state === "known");
          if (fill) scalars.push(["fill_power", fill.fields.fill_power]);
        }
        const ret = profile.values.breathability;
        if (ret?.state === "known" && ret.reference?.method) scalars.push(["breathability_method", known(ret.reference.method, ret.evidence)]);
        const records = scalars.flatMap(([key, parameter]) =>
          parameter?.state === "known" && (typeof parameter.value === "string" || typeof parameter.value === "number")
            ? [{key, productId: product.id, value: parameter.value, unit: parameter.reference?.unit ?? null,
              source: "brand" as const, sourceUrl: url, rawText: parameter.evidence[0]?.raw ?? null, fetchedAt}] : []);
        if (records.length) await tx.insert(productSpecs).values(records);
        inserted++;
      }
      return inserted;
    });
    console.log(`Inserted ${count} new Mammut products. ${input.products.length - count} Mammut products already existed.`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
