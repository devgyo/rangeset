import "server-only";

import { cache } from "react";
import data from "@/data/jackets.json";
import { catalogEnabled, databaseJackets } from "@/lib/catalog";
import type { Jacket } from "@/lib/types";

export const exampleJackets = data as Jacket[];
const bySlug = new Map(exampleJackets.map((jacket) => [jacket.slug, jacket]));

export async function listJackets() {
  return catalogEnabled ? databaseJackets() : exampleJackets;
}

export async function getJackets(slugs: string[]) {
  const rows = catalogEnabled ? await databaseJackets(slugs) : exampleJackets;
  const lookup = catalogEnabled ? new Map(rows.map((row) => [row.slug, row])) : bySlug;
  return slugs.map((slug) => lookup.get(slug));
}

export const getJacket = cache(async (slug: string) => (await getJackets([slug]))[0]);
