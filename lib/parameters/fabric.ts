import { known, type Evidence, type Fiber, type Parameter, type Part, type RecycledContent } from "./model";

import type { FabricPart } from "./registry";

export function fabricLocation(label: string): FabricPart | undefined {
  const text = label.trim().toLowerCase().replace(/_/g, " ");
  const location = text.match(/^(?:secondary(?: fabric)?|inserts?)\s*\(([^()]+)\)$/)?.[1];
  if (location) return fabricLocation(location);
  if (/^(?:body|main(?: fabric| material)?|shell(?: fabric)?|self|upper)$/.test(text)) return "body";
  if (/^(?:lining|liner|inner lining|interior lining)$/.test(text)) return "lining";
  if (/\breinforcement\b|\breinforced (?:areas?|panels?|inserts?)\b/.test(text)) return "reinforcement";
  if (/^(?:contrast(?: fabric)?|(?:(?:contrast|side|stretch) )?panels?|(?:stretch |side )?inserts?)$/.test(text)) return "panel";
}

const denierPair = /\b(\d{1,4})\s*(?:d(?:enier)?\s*)?[×x]\s*(\d{1,4})\s*d(?:enier)?\b/i;
const denierSuffix = /\b(\d{1,4})\s*(?:-\s*)?d(?:enier)?\b(?![- ](?:print|knit|mesh|mold|mould|construct|design))/i;
const denierPrefix = /\bdenier\s*[:=]?\s*(\d{1,4})\b/i;

export function parseDenier(text: string): number[] | null {
  const pair = text.match(denierPair);
  if (pair) return pair.slice(1, 3).map(Number);
  const single = text.match(denierSuffix) ?? text.match(denierPrefix);
  return single && Number(single[1]) > 0 ? [Number(single[1])] : null;
}

const areaUnit = /^(?:gsm|gm(?:²|2)|g\/?m(?:²|2|\^2))$/i;
const ounceUnit = /^oz\/?yd(?:²|2|\^2)$/i;
const density = /\b(\d+(?:[.,]\d+)?)\s*(gsm|gm[²2]|g\s*\/?\s*m(?:²|\^?2)|oz\s*\/?\s*yd(?:²|\^?2))(?![\w/])/gi;
const uncertainDensity = /\b(?:\d+(?:[.,]\d+)?\s*(?:g\s*\/\s*m|oz\s*\/\s*yd)(?![²2\w])|(?:fabric weight|fabric mass)\s*[:=]?\s*\d+(?:[.,]\d+)?)\b/i;
const insulation = /\b(?:insulation\s+(?:weight|density)|(?:synthetic|down)\s+(?:insulation|fill)|(?:coreloft|primaloft|octa)(?:[®™])?[^,;]{0,24}$|\bfill\s*(?:weight|density)\s*[:=]?\s*)/i;

export function fabricWeight(value: number, unit: string, evidence: Evidence[]): Parameter {
  const normalized = unit.replace(/\s+/g, "");
  if (value >= 0 && Number.isFinite(value) && areaUnit.test(normalized)) return known(Math.round(value), evidence);
  if (value >= 0 && Number.isFinite(value) && ounceUnit.test(normalized)) {
    return { ...known(Math.round(value * 33.906), evidence), original: { value, unit: "oz/yd²" } };
  }
  return { state: "review", reviewCode: "unverified", evidence, note: "The source does not specify a usable weight per area." };
}

export const constructions = ["Ripstop", "Plain weave", "Double weave", "Jersey", "Grid fleece", "Twill", "Knit"] as const;
const publishedConstruction = /\b(?:ripstop|plain[- ]weave|double[- ]weave|jersey|grid[- ]fleece|twill|(?:circular |warp |weft )?knit)\b/gi;

const compositionPattern = /\b(\d+(?:[.,]\d+)?)\s*%\s*((?:(?:certified |post-consumer |pre-consumer )?recycled |virgin )?)(nylon(?:\s+\d+(?:[.,]\d+)?)?|polyamide|polyester|elastane|spandex|lycra|cotton|(?:merino )?wool|elastomultiester|polypropylene|polyethylene|polyurethane|viscose|lyocell|acrylic|linen|hemp|silk|rayon|modal|aramid|PTFE)\b/gi;

function composition(text: string, evidence: Evidence[]): Parameter | undefined {
  const content: Fiber[] = [...text.matchAll(compositionPattern)].map(([, pct, qualifier, name]) => ({
    fiber: name.charAt(0).toUpperCase() + name.slice(1), pct: Number(pct.replace(",", ".")),
    recycled: /recycled/i.test(qualifier) ? true : /virgin/i.test(qualifier) ? false : null,
  }));
  if (!content.length) return;
  return compositionValue(content, evidence);
}

export function compositionValue(content: Fiber[], evidence: Evidence[]): Parameter {
  if (Math.round(content.reduce((sum, fiber) => sum + fiber.pct, 0) * 1e8) > 100e8) {
    return { state: "review", reviewCode: "needs_review", value: content, evidence, note: "Published fiber percentages exceed 100%." };
  }
  return known(content, evidence);
}

function recycledContent(text: string, scope: "fabric" | "face", fibers: Parameter | undefined): RecycledContent[] {
  const direct = /\b(\d+(?:[.,]\d+)?)\s*%\s*(?:certified )?recycled content\b/i.exec(text);
  const percentage = direct ? Number(direct[1].replace(",", ".")) : fibers?.state === "known"
    ? (fibers.value as Fiber[]).filter(({ recycled }) => recycled).reduce((sum, { pct }) => sum + pct, 0) : 0;
  if ((direct || percentage > 0) && percentage >= 0 && percentage <= 100) return [{ pct: percentage, scope }];
  return /\brecycled\b/i.test(text) ? [{ pct: null, scope: "claim_only" }] : [];
}

const treatments = /\bUPF\s*\d+\+?|\b(?:antimicrobial|anti[- ]odo[u]?r) (?:finish|treatment)\b/gi;
const certified = /\b(?:bluesign(?:®|™)?(?: approved| certified)?|OEKO-TEX(?:®)?(?: STANDARD 100)?|GRS|Global Recycled Standard)\b/gi;
const garmentClaim = /\b(?:this (?:garment|product)|the (?:garment|product) as a whole|total garment|overall garment|of (?:the |this )?(?:garment|product))\b/i;

export function garmentRecycledContent(text: string): RecycledContent | undefined {
  if (!garmentClaim.test(text) || !/\brecycled\b/i.test(text)) return;
  const amount = text.match(/\b(\d+(?:[.,]\d+)?)\s*%\s*(?:of (?:the |this )?(?:garment|product)(?: is)?\s+)?recycled\b/i);
  const pct = amount ? Number(amount[1].replace(",", ".")) : null;
  return pct !== null && pct >= 0 && pct <= 100 ? { pct, scope: "garment" } : { pct: null, scope: "claim_only" };
}

function nameOf(text: string) {
  const named = text.match(/\b(?:GORE[ -]TEX[®™]?(?:\s+(?:PRO|PACLITE(?: PLUS)?|ACTIVE)[®™]?)?(?:\s+e(?:PE|PTFE))?|Fortius(?:™|®)?\s+DW\s+\d+(?:\.\d+)?|TerraTex[™®]?|Tyono[™®]?\s+\d+)/i)?.[0];
  if (named) return named;
  const segment = text.split(/\s+[-–]\s+(?=\d+(?:[.,]\d+)?\s*%)|,\s*(?!\d)/)[0]
    .replace(denierPair, "").replace(denierSuffix, "").replace(denierPrefix, "").replace(density, "")
    .replace(/\b(?:2\.5|[23])\s*L\b|\b(?:FC0 |C0 |FC-free |PFC-free )?DWR\b|\bdurable water repellent\b/gi, "")
    .replace(treatments, "").replace(publishedConstruction, "").replace(uncertainDensity, "")
    .replace(/\s+(?:with|w\s*\/)\s*$/i, "").replace(/^[\s,;–-]+|[\s,;–-]+$/g, "").replace(/\s+/g, " ");
  return /\d+(?:[.,]\d+)?\s*%|\b(?:PFAS|recycled content|waterproof rating)\b/i.test(segment) ? "" : segment;
}

export function fabricLayer(part: FabricPart | "face" | "backer", label: string, text: string, evidence: Evidence): Part {
  const source = [evidence];
  const fields: Part["fields"] = {};
  const content = composition(text, source);
  if (content) fields.fiber_content = content;
  const denier = parseDenier(text);
  if (denier?.every((value) => value > 0)) fields.denier = known(denier, source);
  const weights = [...text.matchAll(density)].filter((match) => !insulation.test(text.slice(0, match.index).split(/[;,]/).at(-1) ?? ""));
  const readings = weights.map((match) => fabricWeight(Number(match[1].replace(",", ".")), match[2], source));
  if (readings.length) fields.fabric_weight = new Set(readings.map(({ value }) => value)).size > 1
    ? { state: "review", reviewCode: "needs_review", evidence: source, note: "Published weights per area disagree." }
    : readings.find(({ original }) => original) ?? readings[0];
  else if (uncertainDensity.test(text)) fields.fabric_weight = fabricWeight(0, "", source);
  const name = nameOf(text);
  if (name) fields.fabric_name = known(name, source);
  const weave = [...new Set([...text.matchAll(publishedConstruction)]
    .filter((match) => !/\b(?:no|not|without|non)[ -]+$/i.test(text.slice(0, match.index)))
    .map(([word]) => {
      const standard = word.toLowerCase().replace("-", " ");
      return /\bknit$/.test(standard) ? "Knit" : constructions.find((entry) => entry.toLowerCase() === standard)!;
    }))];
  if (weave.length) fields.weave = known(weave, source);
  const stretch = [
    /\bmechanical stretch\b/i.test(text) && "Mechanical",
    /\b(?:2|two)[ -]way stretch\b/i.test(text) && "2-way",
    /\b(?:4|four)[ -]way stretch\b/i.test(text) && "4-way",
    /\b(?:elastane|spandex|lycra)\b/i.test(text) && "Contains elastane",
  ].filter((item): item is string => Boolean(item));
  if (stretch.length) fields.fabric_stretch = known(stretch, source);
  const certifications = text.match(certified);
  if (certifications) fields.fabric_certifications = known(certifications, source);
  const finishes = text.match(treatments);
  if (finishes) fields.fabric_treatment = known(finishes, source);
  const recycled = !garmentClaim.test(text) && content?.state !== "review" ? recycledContent(text, part === "face" ? "face" : "fabric", content) : [];
  if (recycled.length) fields.fabric_recycled_content = known(recycled, source);
  return { part, label, fields, evidence: source };
}

export function fabricPart(part: FabricPart, label: string, text: string, evidence: Evidence): Part {
  const backing = text.match(/\b(\d+(?:[.,]\d+)?\s*%\s*[a-z -]+?)\s+(?:backer|backing)\b/i);
  const namedBacking = backing ? null : text.match(/\b(?:with\s+)?((?:C-KNIT[®™]?|Micro Grid|Brush(?:ed)?)\s+(?:backer|backing))\b/i);
  const marked = backing || namedBacking;
  const body = marked?.index !== undefined ? text.slice(0, marked.index) + text.slice(marked.index + marked[0].length) : text;
  const face = body.match(/(?:\bface(?: fabric)?\s*:\s*([^;]+)|([^;,]+?)\s+face fabric\b)/i);
  const parent = fabricLayer(part, label, face?.index === undefined ? body : body.slice(0, face.index) + body.slice(face.index + face[0].length), evidence);
  if (face) parent.faces = [fabricLayer("face", "Face", (face[1] ?? face[2]).trim(), evidence)];
  if (marked) parent.backers = [fabricLayer("backer", "Backer", marked[1], evidence)];
  return parent;
}
