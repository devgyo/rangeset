export const catalogPageSize = 24;

export function parseCatalogPage(value: unknown) {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) ? page : 1;
}

export function catalogPageSlice<T>(items: readonly T[], page = 1, count = catalogPageSize) {
  const start = (page - 1) * catalogPageSize;
  return items.slice(start, start + count);
}
