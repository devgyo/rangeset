import "server-only";

import { cache } from "react";
import { catalogEnabled, databaseJackets } from "@/lib/catalog";

export async function listJackets() {
  return catalogEnabled ? databaseJackets() : [];
}

export async function getJackets(slugs: string[]) {
  const rows = catalogEnabled ? await databaseJackets(slugs) : [];
  const lookup = new Map(rows.map((row) => [row.slug, row]));
  return slugs.map((slug) => lookup.get(slug));
}

export const getJacket = cache(async (slug: string) => (await getJackets([slug]))[0]);
