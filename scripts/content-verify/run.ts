import {mammutPayload} from "../../lib/brands/mammut";
import {compare, fields, productFacts, type Result} from "./compare";
import {type AuditProduct} from "./data";
import {directMammutLine, mammutLines, mustHalt, type OfficialReader, officialProduct, seriesEvidence} from "./official";
import type {ProductAudit} from "./report";

type Reader = Pick<OfficialReader, "product" | "series">;

function unavailable(product: AuditProduct, reason: string) {
  return fields.map((field): Result => ({field, status: "unverifiable", reason, url: product.url}));
}

async function checkProduct(reader: Reader, product: AuditProduct, onStop: (reason: string) => void) {
  if (!product.url) return unavailable(product, "No official URL");
  let url: string = product.url;
  try {
    const page = await reader.product(product.brandSlug, url);
    url = page.finalUrl;
    const fresh = officialProduct(page, product.brandSlug);
    const stored = productFacts(product).facts;
    const official = productFacts(fresh).facts;
    const line = product.brandSlug === "mammut" ? mammutLines.get(product.sku) : undefined;
    let lineUrl = url;
    if (line && fresh.sku === product.sku) {
      lineUrl = line.source_url;
      try {
        const evidence = seriesEvidence(await reader.series(lineUrl), product.sku, line.product_line);
        official.productLine = evidence ? {value: evidence.found ? [line.product_line] : [], evidence: evidence.text, confirmedAbsence: !evidence.found}
          : {value: null, reason: "Official series product listings could not be read"};
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        if (mustHalt(error)) onStop(reason);
        official.productLine = {value: null, reason};
      }
    } else if (product.brandSlug === "mammut") {
      const raw = mammutPayload(fresh.payload ?? {});
      const verified = raw && directMammutLine(raw);
      official.productLine = verified ? {value: [verified], evidence: verified} : {value: null, reason: "No published series evidence"};
    }
    return fields.map((field): Result => fresh.sku !== product.sku && field !== "sku"
      ? {field, status: "unverifiable", reason: "Official page returned a different article", url}
      : compare(field, stored[field], official[field], field === "productLine" ? lineUrl : url));
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    if (mustHalt(error)) onStop(reason);
    return unavailable(product, reason);
  }
}

export async function verifyProducts(selected: AuditProduct[], reader: Reader, onProgress?: (processed: number) => void) {
  const products: ProductAudit[] = [];
  let stopped: string | null = null;
  for (const product of selected) {
    const results = stopped ? unavailable(product, `Not requested after crawl stop: ${stopped}`)
      : await checkProduct(reader, product, (reason) => { stopped = reason; });
    products.push({brand: product.brandSlug, sku: product.sku, name: product.name, url: product.url, results});
    if (!stopped) onProgress?.(products.length);
  }
  return {products, stopped};
}
