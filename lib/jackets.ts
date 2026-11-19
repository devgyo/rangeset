import data from "@/data/jackets.json";
import type { Jacket } from "@/lib/types";

export const jackets = data as Jacket[];

const bySlug = new Map(jackets.map((jacket) => [jacket.slug, jacket]));

export function getJacket(slug: string) {
  return bySlug.get(slug);
}
