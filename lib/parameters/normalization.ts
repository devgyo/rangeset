import {record} from "../product-view";
import type {Value} from "./model";
import {fieldsByKey} from "./registry";

export const scalarKeys: Record<string, string> = {
  weight_g: "weight", weight_size: "weight_size", fit: "fit", centre_back_length_cm: "back_length", inseam: "inseam",
  membrane: "membrane", layers: "laminate", recco: "recco", pit_zips: "pit_zips", helmet_hood: "helmet_hood",
  waterproof_mm: "hydrostatic_head", breathability: "breathability",
};

export const rounded = (value: number) => Math.round(value * 100) / 100;
export const comparisonText = (value: unknown) => String(value).replace(/[®™]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

export function convert(value: number, from: string, to: string) {
  const unit = from.toLowerCase().replace(/\s/g, "");
  if (unit === to.toLowerCase()) return rounded(value);
  const units: Record<string, Record<string, number>> = {
    g: { kg: 1000, lb: 453.59237, lbs: 453.59237, oz: 28.349523125, gram: 1, grams: 1 },
    cm: { mm: 0.1, m: 100, in: 2.54, inch: 2.54, '"': 2.54, "″": 2.54 },
    mm: { cm: 10, m: 1000, in: 25.4, '"': 25.4, "″": 25.4 },
    "g/m²": { gsm: 1, "g/m2": 1, "g/m^2": 1, "oz/yd²": 33.905747, "oz/yd2": 33.905747 },
  };
  const factor = units[to]?.[unit];
  return factor === undefined ? null : rounded(value * factor);
}

export function compatible(key: string, value: unknown): value is Value {
  const field = fieldsByKey.get(key);
  switch (field?.type) {
    case "text": return typeof value === "string" && Boolean(value.trim());
    case "enum": return typeof value === "string" && Object.hasOwn(field.options ?? {}, value);
    case "boolean": return typeof value === "boolean";
    case "number": return typeof value === "number" && Number.isFinite(value) && value >= 0;
    case "list": return Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === "string" && Boolean(item.trim()));
    case "denier": return Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === "number" && Number.isFinite(item) && item > 0);
    case "composition": return Array.isArray(value) && value.length > 0 && value.every((item) => typeof record(item).fiber === "string" &&
      typeof record(item).pct === "number" && Number.isFinite(record(item).pct) && Number(record(item).pct) >= 0 &&
      [true, false, null].includes(record(item).recycled as boolean | null));
    case "recycled": return Array.isArray(value) && value.length > 0 && value.every((item) => {
      const { pct, scope } = record(item);
      return ["fabric", "face", "garment", "claim_only"].includes(String(scope)) &&
        (pct === null ? scope === "claim_only" : typeof pct === "number" && Number.isFinite(pct) && pct >= 0 && pct <= 100);
    });
    default: return false;
  }
}
