export const arcOrigin = "https://arcteryx.com";
export const arcLeafOrigin = "https://leaf.arcteryx.com";
export const mammutOrigin = "https://www.mammut.com";

function arcShopUrl(value: string, origin: string) {
  try {
    const url = new URL(value);
    const path = decodeURIComponent(url.pathname);
    return url.origin === origin && !url.username && !url.password && !url.search && !url.hash &&
      !path.includes(",") && /^\/us\/en\/shop\/(?:[a-z0-9-]+\/)*[a-z0-9-]+\/?$/i.test(path)
      ? url.href.replace(/\/$/, "") : undefined;
  } catch {
    return undefined;
  }
}

export const arcProductUrl = (value: string) => arcShopUrl(value, arcOrigin);
export const arcLeafProductUrl = (value: string) => arcShopUrl(value, arcLeafOrigin);

export function mammutProductUrl(value: string) {
  return /^https:\/\/www\.mammut\.com\/us\/en\/products\/\d{4}-\d{5}\/[a-z0-9-]+$/.test(value) ? value : undefined;
}
