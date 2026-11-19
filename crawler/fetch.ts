import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { gzip } from "node:zlib";
import { createHash } from "node:crypto";
import { CrawlStop, type Page, type PoliteClient } from "./http";

const compress = promisify(gzip);

export async function fetchProduct(client: PoliteClient, url: string) {
  let page: Page;
  try {
    page = await client.request(url, "product");
  } catch (error) {
    if (error instanceof CrawlStop) throw error;
    throw new Error(`GET ${url}: ${error instanceof Error ? error.message : error}`);
  }

  const { body, ...metadata } = page;
  const directory = join(".crawl", "raw", "arcteryx", page.fetchedAt.slice(0, 10));
  const slug = new URL(url).pathname.split("/").at(-1)!;
  const variant = createHash("sha256").update(url).digest("hex").slice(0, 10);
  let file = join(directory, `${slug}.html.gz`);
  await mkdir(directory, { recursive: true });
  const sidecar = await readFile(file + ".json", "utf8").catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") throw error;
    return undefined;
  });
  if (sidecar && JSON.parse(sidecar).url !== url) file = join(directory, `${slug}-${variant}.html.gz`);
  await writeFile(file, await compress(body));
  await writeFile(file + ".json", JSON.stringify(metadata) + "\n");
  return { page, file };
}
