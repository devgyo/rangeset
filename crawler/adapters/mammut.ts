import {entries, plainText, record, safeImage, textList} from "../../lib/product-view";

export type MammutVariant = {
  id: string; color: string | null; size: string | null; price: number | null; originalPrice: number | null;
  inStock: boolean | null; image: string | null;
};

export type MammutPayload = {
  name: string; category: string | null; categories: string[]; scope: "apparel" | "backpack" | "footwear" | "excluded";
  shortDescription: string; description: string; fields: {label: string; value: string}[];
  activities: string[]; gender: string | null; collection: string | null;
  image: string | null; variants: MammutVariant[]; msrp: number | null; salePrice: number | null;
  year: number | null; season: string; modelNumber: string; currency: "USD";
  sellingPoints: string[];
};

export type MammutProduct = {slug: string; externalId: string; url: string; fetchedAt: string; raw: MammutPayload};

function jsonAt(source: string, start: number) {
  let depth = 0;
  let quoted = false;
  for (let i = start; i < source.length; i++) {
    const char = source[i];
    if (quoted) {
      if (char === "\\") i++;
      else if (char === '"') quoted = false;
    } else if (char === '"') quoted = true;
    else if (char === "{" || char === "[") depth++;
    else if (char === "}" || char === "]") {
      if (--depth === 0) return JSON.parse(source.slice(start, i + 1)) as unknown;
    }
  }
  return undefined;
}

const money = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;

function flightData(html: string) {
  return [...html.matchAll(/self\.__next_f\.push\((\[1,"(?:[^"\\]|\\.)*"\])\)<\/script>/g)]
    .map((match) => (JSON.parse(match[1]) as [number, string])[1]).join("");
}

function variantImage(item: Record<string, unknown>) {
  const image = plainText(item.image) || plainText(item.mainImage) || plainText(item.mainAsset);
  return image ? safeImage("https://static.mammut.com/512/" + encodeURIComponent(image)) : null;
}

function scopeOf(page: Record<string, unknown>, categories: string[], name: string): MammutPayload["scope"] {
  const labels = categories.join(" | ");
  if (page.topLevelCategory === "footwear" || /\b(?:footwear|shoes|boots)\b/i.test(labels) && /\b(?:shoe|boot)s?\b/i.test(name)) return "footwear";
  const clearApparel = /\b(?:jacket|vest|hoody|hoodie|shirt|pants?|shorts|tights?|skirt|dress|parka|pullover|sweater|tank|polo|singlet)\b/i.test(name);
  if (page.topLevelCategory === "clothing" || /^1[01]\d\d-/.test(String(page.itemNumber)) && clearApparel && categories.includes("Clothing")) {
    return /\b(?:gaiters?|gloves?|mittens?|socks?|caps?|hats?|beanies?|headbands?|belts?|balaclavas?|masks?)\b/i.test(name)
      || /\b(?:clothing accessories|headwear|gloves|socks)\b/i.test(labels) ? "excluded" : "apparel";
  }
  return /\bbackpacks?\b/i.test(labels + " " + name) && !/\b(?:pack accessories|backpack accessories|accessories for backpacks|equipment accessories)\b/i.test(labels) &&
    !/\b(?:rain\s*cover|lid|quiver|dry\s*bag|chalk\s*bag|packing cube|cartridge|replacement|lithium add-on|spare)\b/i.test(name)
    && (!/\b(?:day bags|duffel bags|travel bags|shoulder bags)\b/i.test(categories[0] ?? "") || /\bbackpacks?\b/i.test(name))
    ? "backpack" : "excluded";
}

export function parseMammut(html: string, url: string, fetchedAt: string): MammutProduct {
  const article = new URL(url).pathname.match(/\/products\/(\d{4}-\d{5})\//)?.[1];
  if (!article) throw new Error("Mammut article number missing from URL");
  const flight = flightData(html);
  const parent = [...flight.matchAll(/"mainProduct":(?=\{)/g)]
    .map((match) => record(jsonAt(flight, match.index! + match[0].length)))
    .find(({itemNumber}) => itemNumber === article);
  if (!parent) throw new Error("Published Mammut product payload missing");
  const structured = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)]
    .flatMap((item) => {
      try { return entriesOrOne(JSON.parse(item[1])); } catch { return []; }
    }).map(record).find((item) => item["@type"] === "Product") ?? {};
  const name = plainText(parent.productName) || plainText(structured.name);
  if (!name) throw new Error("Published Mammut product name missing");
  const categories = entries(parent.categories).map((item) => plainText(record(item).name)).filter(Boolean);
  const category = plainText(record(parent.category).description) || null;
  const scope = scopeOf(parent, categories, name);
  const fields: MammutPayload["fields"] = [];
  for (const row of html.matchAll(/<li\b[^>]*data-theme="row"[^>]*>([\s\S]*?)<\/li>/gi)) {
    const cells = [...row[1].matchAll(/<span(?:\s[^>]*)?>([^<>]+)<\/span>/gi)].map((item) => plainText(item[1])).filter(Boolean);
    if (cells.length === 2) fields.push({label: cells[0], value: cells[1]});
  }
  // The same fixed fields are available in the server-rendered bootstrap when a section is collapsed.
  for (const item of [...entries(parent.attributes), ...entries(parent.dimensions), ...entries(parent.material)]) {
    const label = plainText(record(item).label);
    const value = plainText(record(item).value);
    if (label && value && !fields.some((field) => field.label.toLowerCase() === label.toLowerCase() && field.value === value)) fields.push({label, value});
  }

  const variants = new Map<string, MammutVariant>();
  for (const match of flight.matchAll(/"variants":(?=\[\{"objectID":)/g)) {
    for (const item of entries(jsonAt(flight, match.index! + match[0].length)).map(record)) {
      const id = plainText(item.itemNumber);
      if (!id.startsWith(article + "-") || typeof item.inStock !== "boolean" && item.currency !== "USD") continue;
      variants.set(id, {
        id, color: textList(item.colors)[0] ?? null, size: textList(item.sizes)[0] ?? null,
        price: item.currency === "USD" ? money(item.price) : null,
        originalPrice: item.currency === "USD" && item.discounted === true ? money(item.originalPrice) : null,
        inStock: typeof item.inStock === "boolean" ? item.inStock : null,
        image: variantImage(item),
      });
    }
  }
  const offered = [...variants.values()];
  const representative = offered.filter(({id}) => id.startsWith(String(parent.defaultVariantId) + "-") || id === parent.defaultVariantId);
  const list = representative.some(({price, originalPrice}) => price || originalPrice) ? representative : offered;
  const msrpValues = list.flatMap(({price, originalPrice}) => originalPrice ?? price ?? []);
  const saleValues = list.flatMap(({price, originalPrice}) => price && originalPrice && price < originalPrice ? [price] : []);
  const release = fields.find(({label}) => /^(?:release |launch )?(?:season|year\/season)$/i.test(label))?.value ?? "";
  const year = release.match(/\b20\d{2}\b/)?.[0];
  const season = release.match(/\b(?:spring(?:\/summer)?|summer|fall(?:\/winter)?|autumn(?:\/winter)?|winter|ss|fw|aw)\b/i)?.[0] ?? "";
  return {
    externalId: article, slug: "mammut-" + article, url, fetchedAt,
    raw: {
      modelNumber: article, name, category, categories, scope, fields, variants: offered,
      shortDescription: plainText(parent.shortDescription), description: plainText(structured.description) || plainText(parent.description),
      activities: textList(parent.activities), gender: plainText(parent.gender) || (scope === "backpack" && categories.includes("Unisex") ? "unisex" : null), collection: plainText(parent.collection) || null,
      sellingPoints: textList(parent.sellingPoints),
      image: safeImage(structured.image), currency: "USD",
      msrp: msrpValues.length ? Math.min(...msrpValues) : null,
      salePrice: saleValues.length ? Math.min(...saleValues) : null,
      year: year ? Number(year) : null, season,
    },
  };
}

function entriesOrOne(value: unknown) {
  return Array.isArray(value) ? value : [value];
}
