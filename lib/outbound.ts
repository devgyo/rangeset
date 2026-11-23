import {arcLeafProductUrl, arcProductUrl, mammutProductUrl} from "./brand-urls";

export function publishedSku(numbers: readonly string[] = []) {
  return numbers.find((number) => /^(?:X\d{4,15}|\d{4}-\d{5})$/i.test(number))?.toUpperCase();
}

export function brandDestination(brand: string, stored: string | null) {
  if (!stored) return undefined;
  try {
    const destination = new URL(stored);
    const base = new URL(destination);
    base.search = "";
    base.hash = "";
    const url = base.href;
    const valid = brand === "arcteryx" ? arcProductUrl(url) || arcLeafProductUrl(url)
      : brand === "mammut" ? mammutProductUrl(url) : undefined;
    return valid ? destination : undefined;
  } catch {
    return undefined;
  }
}

export function brandLink(product: {brandSlug?: string; url: string | null; modelNumbers?: string[]; example?: boolean}, locale: string) {
  const sku = publishedSku(product.modelNumbers);
  if (!sku || product.example || !brandDestination(product.brandSlug ?? "", product.url)) return undefined;
  return `/out/${encodeURIComponent(sku)}?to=brand${locale === "en" ? "" : "&locale=" + encodeURIComponent(locale)}`;
}

type Destination = {brand: string; url: string};
type Click = {sku: string; locale: string; referer: string | null; target: string; isBot: boolean};

function refererPage(value: string | null) {
  if (!value) return null;
  try {
    const {protocol, origin, pathname} = new URL(value);
    return (protocol === "https:" || protocol === "http:") ? (origin + pathname).slice(0, 2048) : null;
  } catch {
    return null;
  }
}

const botAgent = /bot\b|crawl|spider|slurp|bingpreview|facebookexternalhit|yandeximages|ia_archiver|whatsapp|telegrambot/i;
type OutboundStore = {
  find: (sku: string) => Promise<Destination | undefined>;
  record: (click: Click) => Promise<unknown>;
};

export async function outboundResponse(request: Request, requestedSku: string, store: OutboundStore) {
  const headers = {"X-Robots-Tag": "noindex, nofollow", "Cache-Control": "no-store"};
  const {searchParams} = new URL(request.url);
  const sku = requestedSku;
  if (!sku || searchParams.get("to") !== "brand") return new Response(null, {status: 404, headers});
  let product;
  try {
    product = await store.find(sku);
  } catch {
    return new Response(null, {status: 503, headers});
  }
  const destination = product && brandDestination(product.brand, product.url);
  if (!destination) return new Response(null, {status: 404, headers});
  destination.searchParams.set("utm_source", "rangeset");
  destination.searchParams.set("utm_medium", "referral");
  destination.searchParams.set("utm_campaign", "product");
  const language = searchParams.get("locale");
  if (request.method === "GET") {
    try {
      await store.record({sku, locale: language === "zh" || language === "ja" ? language : "en",
        referer: refererPage(request.headers.get("referer")), target: destination.href,
        isBot: botAgent.test(request.headers.get("user-agent") ?? "")});
    } catch {
      // Tracking is best effort; the official destination is already known.
      console.warn("Outbound click could not be recorded");
    }
  }
  return new Response(null, {status: 302, headers: {...headers, Location: destination.href}});
}
