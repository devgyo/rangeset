import {featuresOf, plainText, textList, type ProductDetail} from "../product-view";
import type {TaxonomyEvidence} from "../taxonomy";
import {isFootwearProduct} from "../parameters/classification";

export function arcTaxonomy(product: Pick<ProductDetail, "name" | "category" | "subTags">, raw: Record<string, unknown>, overrides?: Map<string, unknown>): TaxonomyEvidence {
  const {name, category, subTags: tags} = product;
  const tag = (pattern: RegExp) => tags.some((entry) => pattern.test(entry));
  if (isFootwearProduct(product, {raw, overrides})) return {hidden: "Footwear"};
  if (category === "Accessories" || tag(/^Pack Accessories$/i) || /\b(?:backpack|pack) lid\b/i.test(name)) {
    return {accessory: true};
  }
  const backpack = /\b(?:backpack|assault pack)\b/i.test(name) || category === "Packs";
  const lower = /\b(?:bottoms?|pants?|tights?|leggings?|boxers?|briefs?)\b/i.test(name);
  const base = category === "Base Layer" || tag(/^Base Layer (?:Tops|Bottoms)$/i)
    ? tag(/^Base Layer Bottoms$/i) || lower ? "bottom" : "top" : undefined;
  const materials = textList(raw.materials);
  const body = materials.filter((line) => /^(?:body|main(?: fabric| material)?|shell(?: fabric)?|self)\s*:/i.test(line)).join(" · ");
  const features = featuresOf(raw.features);
  const claims = [plainText(raw.shortDescription), plainText(raw.description), ...features
    .filter(({label}) => !/pocket|zipper|hood|cuff/i.test(label)).flatMap(({values}) => values)];
  const bodyClaims = claims.filter((line) => !/\b(?:zippers?|pockets?)\s+(?:are|is)\b/i.test(line)).join(" · ");
  const nonWaterproof = /\b(?:not (?:a )?(?:(?:fully|completely) )?|non[- ])waterproof\b|\bwaterproof(?:ing| protection)? (?:only |in [^.]{0,45} (?:areas|panels))\b/i;
  const windMembrane = /\b(?:INFINIUM|WINDSTOPPER)\b/i;
  const gore = /\bGORE[-–— ]TEX\b(?![®™ ]*\s*(?:INFINIUM|WINDSTOPPER))/i;
  const windBody = windMembrane.test(body) || claims.some((line) => /\b(?:WINDSTOPPER|INFINIUM)\b.{0,120}\b(?:body|outer (?:fabric|shell))\b/i.test(line));
  const membrane = !windBody && (
    gore.test(body) || /\b(?:ePE|ePTFE)\b[^.]{0,36}\b(?:membrane|hardshell)\b/i.test(body) ||
    tag(/^(?:GORE[-–— ]TEX(?:[®™ ]+(?:PRO(?: ePE)?))?[®™ ]*\s*\(Waterproof\)|GORE[-–— ]TEX[®™ ]+PRO)$/i));
  const waterproofTag = tag(/^Waterproof$|\(Waterproof\)$/i);
  const hard = tag(/^Hardshell$/i);
  const onlyResistant = tag(/^Water Resistant$/i) && !waterproofTag;
  const explicitlyWaterproof = claims.some((line) => !nonWaterproof.test(line) &&
    !/\b(?:panels?|inserts?)\b/i.test(line) && /^waterproof$|\b(?:waterproof[, ]+(?:breathable |windproof, )?(?:protection|shell|jacket|coat|parka|pants|fabric|outer|anorak)|(?:is|are|and|fully) waterproof)\b/i.test(line));
  const waterproof = Boolean(waterproofTag || membrane || explicitlyWaterproof || (hard && !onlyResistant && !windBody));

  const fills = materials.filter((line) => /^(?:down|synthetic)\s+(?:insulation|fill)\b/i.test(line));
  const fillLocation = (line: string) => line.match(/^(?:down|synthetic)\s+(?:insulation|fill)\s*(?:[-–]|\()\s*([^:)]+)/i)?.[1].trim();
  const isBody = (line: string) => /^(?:body|torso)$/i.test(fillLocation(line) ?? "");
  const primary = fills.filter((line) => !fillLocation(line) || isBody(line));
  const down = primary.some((line) => /^down/i.test(line)) || tag(/^Down Fill$/i);
  const synthetic = primary.some((line) => /^synthetic/i.test(line)) || tag(/^Synthetic Fill$/i);
  const bodyFill = primary.find(isBody);
  const filled = category === "Insulated Jackets" || fills.length > 0 || tag(/^(?:Insulated|Insulated Shell)$/i) || /\bInsulated\b/i.test(name);
  const taggedDown = tag(/^Down Fill$/i);
  const taggedSynthetic = tag(/^Synthetic Fill$/i);
  const fill = bodyFill ? /^down/i.test(bodyFill) ? "down" : "synthetic"
    : taggedDown !== taggedSynthetic ? taggedDown ? "down" : "synthetic"
    : down && synthetic ? "unknown" : down ? "down" : synthetic ? "synthetic" : filled ? "unknown" : undefined;

  const shape = /\b(?:one[- ]piece|coverall)\b/i.test(name) ? "suit"
    : /\bdress\b/i.test(name) || tag(/^Dresses$/i) ? "dress"
    : /\bskort\b/i.test(name) || tag(/^Skorts$/i) ? "shorts"
    : /\bskirt\b/i.test(name) || tag(/^Skirts$/i) ? "skirt"
    : category === "Shorts" || /\bshorts\b/i.test(name) ? "shorts"
    : /\b(?:tights?|leggings?)\b/i.test(name) || tag(/^Tights$/i) ? "tight"
    : category === "Pants" || /\b(?:pants?|bib|trousers?)\b/i.test(name) ? "pants"
    : /\bvest\b/i.test(name) || tag(/^Vests$/i) ? "vest"
    : /\b(?:coat|blazer|trench)\b/i.test(name) ? "tailoring"
    : category === "Shirts and Tops" || /\b(?:shirt|overshirt|tank|polo|tunic)\b/i.test(name) ? "top" : undefined;
  const conflict = (waterproof || hard || windBody && onlyResistant) && (nonWaterproof.test(bodyClaims) || ((hard || windBody) && onlyResistant && !explicitlyWaterproof) ||
    (windBody && waterproofTag))
    ? "Published waterproof and water-resistant construction statements disagree" : undefined;
  return {
    backpack, base, shape, conflict, waterproof: waterproof && !nonWaterproof.test(bodyClaims), membrane, fill,
    fleece: category === "Fleece" || tag(/^(?:Fleece|Hardfleece|Mid Layer)$/i),
    softshell: tag(/^Softshell$/i) || /\bsoftshell\b/i.test(name), windshell: tag(/^Windshell$/i) || /\bwindshell\b/i.test(name),
    threeInOne: /\b3[- ]in[- ]1\b/i.test(name + " " + bodyClaims),
  };
}
