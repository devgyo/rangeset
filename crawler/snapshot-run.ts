import {createHash, randomUUID} from "node:crypto";
import {CrawlBlocked, CrawlPolicyDenied, CrawlStop, type Page} from "./http";
import type {priceSnapshots} from "../lib/db/schema";
import {snapshotVariants, type SnapshotBrand} from "./snapshot-variants";

export type Target = {id: number; sku: string; url: string | null; brand: SnapshotBrand};
export type Observation = Omit<typeof priceSnapshots.$inferInsert, "runId">;

export function snapshotRunId(explicit?: string, workflowRun?: string) {
  if (explicit) {
    if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(explicit)) throw new Error("SNAPSHOT_RUN_ID must be a UUID");
    return explicit.toLowerCase();
  }
  if (!workflowRun) return randomUUID();
  const hash = createHash("sha256").update("rangeset-price-snapshot:" + workflowRun).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

function pageObservation(target: Target, status: "missing_404" | "blocked", sourceUrl: string, capturedAt: string): Observation {
  return {productId: target.id, variantKey: "__page__", color: null, size: null, priceCents: null, salePriceCents: null,
    currency: null, status, sourceUrl, capturedAt};
}

export function emptyIssueCounts() {
  return {missingUrl: 0, policyDenied: 0, timeout: 0, parseFailed: 0};
}

type IssueCounts = ReturnType<typeof emptyIssueCounts>;
type RunStore = {
  save: (observations: Observation[], pagesDone: number) => Promise<void>;
  finish: (progress: {pagesDone: number; stoppedAtPage: number | null; stoppedReason: string | null; issues: IssueCounts}, blocked?: Observation) => Promise<void>;
};

export function isSnapshotTimeout(error: unknown) {
  if (!(error instanceof Error)) return false;
  const cause = error.cause;
  const code = typeof cause === "object" && cause !== null && "code" in cause ? cause.code : undefined;
  return error.name === "TimeoutError" ||
    (typeof code === "string" && /^(?:ETIMEDOUT|UND_ERR_(?:CONNECT|HEADERS|BODY)_TIMEOUT)$/.test(code));
}

export async function captureRun(targets: Target[], completed: ReadonlySet<number>,
  fetchPage: (target: Target & {url: string}) => Promise<Page>, store: RunStore) {
  let pagesDone = completed.size;
  const issues = emptyIssueCounts();
  const report = (target: Target, issue: keyof IssueCounts, detail: string) => {
    issues[issue]++;
    console.warn({sku: target.sku, brand: target.brand, issue, detail});
  };
  for (const [index, target] of targets.entries()) {
    if (completed.has(target.id)) continue;
    const url = target.url?.trim();
    if (!url) {
      report(target, "missingUrl", "No product URL");
      continue;
    }
    try {
      const page = await fetchPage({...target, url});
      if (page.offShop || page.policyDenied) throw new CrawlPolicyDenied("Redirect outside the public product scope");
      if (page.status === 404) {
        await store.save([pageObservation(target, "missing_404", page.finalUrl, page.fetchedAt)], pagesDone + 1);
        pagesDone++;
        continue;
      }
      if (page.status !== 200) throw new CrawlStop(`No product page (HTTP ${page.status}) at ${url}`);
      let variants;
      try {
        variants = snapshotVariants(target.brand, target.sku, page);
      } catch (error) {
        report(target, "parseFailed", error instanceof Error ? error.message : "Unable to parse variants");
        continue;
      }
      const rows: Observation[] = variants.map((row) => ({
        ...row, productId: target.id, status: "ok", sourceUrl: page.finalUrl, capturedAt: page.fetchedAt,
      }));
      await store.save(rows, pagesDone + 1);
      pagesDone++;
    } catch (error) {
      if (error instanceof CrawlPolicyDenied) {
        report(target, "policyDenied", error.message);
        continue;
      }
      if (isSnapshotTimeout(error)) {
        report(target, "timeout", "Product or robots.txt request timed out");
        continue;
      }
      const blocked = error instanceof CrawlBlocked ? pageObservation(target, "blocked", error.url, error.fetchedAt) : undefined;
      await store.finish({pagesDone, stoppedAtPage: index + 1, issues,
        stoppedReason: error instanceof CrawlStop ? error.message : "Snapshot capture failed at " + url}, blocked);
      throw error;
    }
  }
  await store.finish({pagesDone, stoppedAtPage: null, stoppedReason: null, issues});
}
