import {taxonomyLabelKey, taxonomySlugs} from "@/lib/taxonomy";
import parameterLookup from "@/messages/parameter-lookup.json";
import {formatParameterNumber, formatReference, formatValue, known, parameterStatus, type Fiber, type Parameter} from "@/lib/parameters/model";
import {cardFields, fieldsByKey, type Field} from "@/lib/parameters/registry";
import type {CardParameters} from "@/lib/parameters/card";
import {formatPrice} from "@/lib/product-view";
import {activityLabel, type Translator} from "./ui-copy";
export {activityCode, activityLabel, genderDisplay, useCopy, type Translator} from "./ui-copy";

const categoryKeys: Record<string, string> = {
  "Shell Jackets": "shell_jackets", "Insulated Jackets": "insulated_jackets", Pants: "pants",
  "Shirts and Tops": "shirts_tops", Fleece: "fleece", "Base Layer": "base_layer",
  "Professional Use": "professional", Shorts: "shorts", "Dresses and Skirts": "dresses_skirts",
};
const options: Record<string, string> = {
  product_type: "type", protection_type: "protection", gender: "gender", wind: "wind",
  insulation_type: "insulation", laminate: "laminate",
};
const constructionKeys: Record<string, string> = {
  Ripstop: "ripstop", "Plain weave": "plain", "Double weave": "double", Jersey: "jersey",
  "Grid fleece": "grid_fleece", Twill: "twill", Knit: "knit",
};
const stretchKeys: Record<string, string> = {
  Mechanical: "mechanical", "2-way": "2way", "4-way": "4way", "Contains elastane": "elastane",
};
const partByEnglish: Record<string, string> = parameterLookup.parts;
const noteByEnglish: Record<string, string> = parameterLookup.notes;

export const categoryLabel = (t: Translator, data: string | null) => data && categoryKeys[data] ? t("cat." + categoryKeys[data]) : data;
export const displayPrice = (t: Translator, amount: number | null, currency?: string | null) =>
  amount === null ? t("status.missing") : formatPrice(amount, currency);
export function localNote(t: Translator, data: string) {
  return data.split(/\. (?=[A-Z])/).map((part, index, parts) => {
    const period = index < parts.length - 1 ? "." : "";
    const key = noteByEnglish[part] ?? noteByEnglish[part + period];
    return key ? t(key) : part + period;
  }).join(" ");
}

export function optionLabel(t: Translator, field: Field, value: string, fallback?: string) {
  const namespace = options[field.key];
  const key = namespace + "." + value.replace(".", "_");
  return namespace && t.has(key) ? t(key) : fallback ?? value;
}

export function listItem(t: Translator, field: Field, value: string) {
  const suffix = field.key === "weave" ? constructionKeys[value] : field.key === "fabric_stretch" ? stretchKeys[value] : undefined;
  if (suffix) return t((field.key === "weave" ? "construction." : "stretch.") + suffix);
  if (field.key === "activities") return activityLabel(t, value);
  if (field.key === "protection") {
    const key = value === "Waterproof" ? "value.waterproof" : value === "Water resistant" ? "value.water_resistant" :
      value === "Windproof" ? "wind.windproof" : value === "Wind resistant" ? "wind.wind_resistant" : undefined;
    if (key) return t(key);
  }
  return value;
}

export function partDisplay(t: Translator, label?: string) {
  if (!label) return undefined;
  if (label === "Whole garment") return t("subgroup.whole_garment");
  return label.split(" / ").map((item) => {
    if (partByEnglish[item]) return t("part." + partByEnglish[item]);
    const fillKey = /^Down\b/i.test(item) ? "part.down" : /^Synthetic\b/i.test(item) ? "part.synthetic" : undefined;
    return fillKey ? item.replace(/^(?:Down|Synthetic) (?:Insulation|Fill)/i, t(fillKey)) : item;
  }).join(" / ");
}

export function formatSeason(t: Translator, value: string) {
  const year = value.match(/\b(?:19|20)\d{2}\b/)?.[0];
  if (!year) return "—";
  const season = value.replace(year, "").replace(/·|\s/g, "").replace(/[–-]/g, "/").toLowerCase();
  const code = season === "spring/summer" || season === "ss" ? "ss"
    : /^(?:fall|autumn)\/winter$|^fw$|^aw$/.test(season) ? "fw"
    : season === "autumn" ? "fall" : ["spring", "summer", "fall", "winter"].includes(season) ? season : "year";
  return t("season." + code).replace("2026", year);
}

export function symbolText(t: Translator, key: "yes" | "no" | "unpublished" | "na") {
  return t("symbol." + key);
}

function fiberLabel(t: Translator, value: string) {
  const key = "fiber." + value.toLowerCase().replace(/\s+/g, "_");
  return t.has(key) ? t(key) : value;
}

const cardWeightField = fieldsByKey.get("weight")!;

export function displayCardCell(t: Translator, card: CardParameters, key: (typeof cardFields)[number]["key"]) {
  const composition = card.composition;
  const fiberShare = ({fiber, pct}: Fiber) => t("card.fiber_share", {fiber: fiberLabel(t, fiber), pct: formatParameterNumber(pct)});
  if (key === "composition" && composition) {
    const recycled = composition.recycled === null ? "" : " · " + t("card.recycled_share", {pct: formatParameterNumber(composition.recycled)});
    return {text: fiberShare(composition.primary) + recycled, title: composition.fibers.map(fiberShare).join(" · ") + recycled};
  }
  const text = key === "weight" ? card.weight === null ? "—" : formatValue(cardWeightField, known(card.weight, []))
    : key === "fit" ? card.fit ? t("value.fit_" + card.fit) : "—"
    : key === "mainFabric" ? card.mainFabric ? fiberLabel(t, card.mainFabric) : composition ? fiberShare(composition.primary) : "—"
    : "—";
  return {text, title: text};
}

function localizedFit(t: Translator, value: string) {
  const key = "value.fit_" + value.toLowerCase().replace(/\s+/g, "_");
  return t.has(key) ? t(key) : value;
}

export function displayParameter(t: Translator, locale: string, field: Field, parameter: Parameter) {
  const status = parameterStatus(field, parameter);
  if (status) {
    const key = parameter.state === "inapplicable" ? "na" : parameter.state === "unpublished" ? "unpublished" : parameter.value === true ? "yes" : "no";
    return locale === "en" ? status.text : symbolText(t, key);
  }
  if (parameter.reviewCode === "unverified") return t("status.unverified");
  if (parameter.reviewCode === "needs_review" || (parameter.state === "review" && field.reviewLabel)) return t("type.needs_review");
  if (parameter.state === "review" || parameter.state === "conflict") return t("status." + parameter.state);
  if (field.key === "release" && typeof parameter.value === "string") return formatSeason(t, parameter.value);
  if (field.key === "category" && typeof parameter.value === "string") {
    if (taxonomySlugs.includes(parameter.value)) return t(taxonomyLabelKey(parameter.value));
    if (locale !== "en") return categoryLabel(t, parameter.value) ?? parameter.value;
  }
  if (field.key === "fit" && typeof parameter.value === "string") return localizedFit(t, parameter.value);
  if (field.key === "product_line" && parameter.value === "Mainline") return t("ui.mainline");
  if (field.options) return optionLabel(t, field, String(parameter.value), formatValue(field, parameter));
  if (field.type === "list") return (parameter.value as string[]).map((item) => listItem(t, field, item)).join(" · ");
  const text = formatValue(field, parameter);
  if (locale === "en") return text;
  if (field.format === "recycled") return text.replace(parameterLookup.recycledClaim, t("ui.recycled_claim"))
    .replace(/\((fabric|face|garment|scope not published)\)/g, (_, scope) => `(${t("ui.scope_" + (scope === "scope not published" ? "unknown" : scope))})`);
  if (field.format === "composition") return (parameter.value as Fiber[]).map(({pct, fiber, recycled}) => {
    const label = fiberLabel(t, fiber);
    const material = recycled === null ? label : t(recycled ? "ui.recycled_fiber" : "ui.virgin_fiber", {fiber: label});
    return t("ui.fiber_share", {pct: formatParameterNumber(pct), fiber: material});
  }).join(" · ");
  if (field.key === "fabric_name" && typeof parameter.value === "string") return fiberLabel(t, parameter.value);
  if (field.key === "down_species" && (parameter.value === "goose" || parameter.value === "duck")) return t(`value.${parameter.value}`);

  return text;
}

export function displayReference(t: Translator, field: Field, value: Parameter) {
  if (!value.reference || field.key === "weight") return "";
  const {size, method} = value.reference;
  if (!size && method !== "Minimum") return formatReference(field, value);
  return [size && t("ui.size", {size}), method === "Minimum" ? t("value.minimum") : method].filter(Boolean).join(" · ");
}
