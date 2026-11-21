export const arcOrigin = "https://arcteryx.com";
export const mammutOrigin = "https://www.mammut.com";

export function arcProductUrl(value: string) {
  try {
    const url = new URL(value);
    const path = decodeURIComponent(url.pathname);
    return url.origin === arcOrigin && !url.username && !url.password && !url.search && !url.hash &&
      !path.includes(",") && /^\/us\/en\/shop\/(?:[a-z0-9-]+\/)*[a-z0-9-]+\/?$/i.test(path)
      ? url.href.replace(/\/$/, "") : undefined;
  } catch {
    return undefined;
  }
}

export function mammutProductUrl(value: string) {
  return /^https:\/\/www\.mammut\.com\/us\/en\/products\/\d{4}-\d{5}\/[a-z0-9-]+$/.test(value) ? value : undefined;
}
