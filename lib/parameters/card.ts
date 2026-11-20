import {cardFields, cardFitAliases, fieldsByKey, type CardFit} from "./registry";
import {getParameter, type Fiber, type Parameter, type Part, type Profile, type RecycledContent} from "./model";

export type CardParameters = {
  weight: number | null;
  fit: CardFit | null;
  mainFabric: string | null;
  composition: {primary: Fiber; fibers: Fiber[]; recycled: number | null} | null;
};

function normalizeFit(value: string) {
  return value.toLowerCase().trim().replace(/[-\s]+/g, " ");
}

const canonicalFits = new Map(
  Object.entries(cardFitAliases).flatMap(([fit, names]) => names.map((name) => [normalizeFit(name), fit as CardFit] as const)),
);

export function cardFit(value: string): CardFit | null {
  return canonicalFits.get(normalizeFit(value)) ?? null;
}

function published(parameter: Parameter | undefined) {
  return parameter?.state === "known" ? parameter.value : undefined;
}

export function selectCardParameters(profile: Profile): CardParameters {
  const weight = published(profile.values.weight);
  const fit = published(profile.values.fit);
  const body = ((published(profile.values.materials) ?? []) as Part[]).filter(({part}) => part === "body");
  const named = body.find(({fields}) => published(fields.fabric_name));
  const composed = named && published(named.fields.fiber_content) ? named : body.find(({fields}) => published(fields.fiber_content));
  const fibers = (published(composed?.fields.fiber_content) ?? []) as Fiber[];
  const primary = fibers.reduce<Fiber | null>((largest, fiber) => !largest || fiber.pct > largest.pct ? fiber : largest, null);
  const recycled = new Set(((published(composed?.fields.fabric_recycled_content) ?? []) as RecycledContent[])
    .flatMap(({pct, scope}) => scope === "fabric" && pct !== null ? [pct] : []));

  return {
    weight: typeof weight === "number" && weight > 0 ? weight : null,
    fit: typeof fit === "string" ? cardFit(fit) : null,
    mainFabric: (published(named?.fields.fabric_name) as string | undefined) ?? null,
    composition: primary ? {primary, fibers, recycled: recycled.size === 1 ? [...recycled][0] : null} : null,
  };
}

export function countCardValues(card: CardParameters, profile: Profile): number {
  const materials = getParameter(profile, fieldsByKey.get("materials")!);
  const body = materials.state === "known" ? (materials.value as Part[]).filter(({part}) => part === "body") : [];
  const noBodyComposition = materials.state === "inapplicable" ||
    (body.length > 0 && body.every(({fields}) => fields.fiber_content?.state === "inapplicable"));

  const present = {
    weight: card.weight !== null || getParameter(profile, fieldsByKey.get("weight")!).state === "inapplicable",
    fit: card.fit !== null || getParameter(profile, fieldsByKey.get("fit")!).state === "inapplicable",
    mainFabric: card.mainFabric !== null || card.composition !== null || materials.state === "inapplicable" ||
      (noBodyComposition && body.every(({fields}) => fields.fabric_name?.state === "inapplicable")),
    composition: card.composition !== null || noBodyComposition,
  };
  return cardFields.filter(({key}) => present[key]).length;
}
