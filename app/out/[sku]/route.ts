import {and, eq} from "drizzle-orm";
import {catalogBrand} from "@/lib/catalog-scope";
import {catalogDb} from "@/lib/db/read";
import {brands, outboundClicks, products} from "@/lib/db/schema";
import {outboundResponse} from "@/lib/outbound";

export async function GET(request: Request, {params}: RouteContext<"/out/[sku]">) {
  return outboundResponse(request, (await params).sku, {
    async find(sku) {
      const matches = await catalogDb().select({brand: brands.slug, url: products.url})
        .from(products).innerJoin(brands, eq(brands.id, products.brandId))
        .where(and(eq(brands.slug, catalogBrand), eq(products.externalId, sku))).limit(2);
      return matches.length === 1 ? matches[0] : undefined;
    },
    record: async (click) => catalogDb().insert(outboundClicks).values(click),
  });
}

export const HEAD = GET;
