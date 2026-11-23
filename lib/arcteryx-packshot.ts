const origin = "https://images.arcteryx.com";

export function arcPackshotSource(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 512) return null;
  try {
    const url = new URL(value);
    if (url.origin !== origin || url.username || url.password || url.search || url.hash) return null;
    if (/^\/details\//i.test(url.pathname) || !/\.(?:jpe?g|png|webp)$/i.test(url.pathname)) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function arcCatalogImage(source: string) {
  return `/api/catalog/packshot?v=1&src=${encodeURIComponent(source)}`;
}
