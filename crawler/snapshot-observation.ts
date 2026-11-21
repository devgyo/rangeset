export function snapshotVariantKey(sku: string | null, color: string | null, size: string | null) {
  return sku?.trim() || `${color?.trim() ?? ""}|${size?.trim() ?? ""}`;
}

export function priceCents(value: number | null) {
  if (value === null || !Number.isFinite(value) || value <= 0) return null;
  const cents = Math.round(value * 100);
  return cents > 0 && cents <= 2147483647 ? cents : null;
}
