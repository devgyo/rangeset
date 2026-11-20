const fold = (value: string) => value.normalize("NFKC").replace(/[®™]/g, "").trim().replace(/\s+/g, " ").toLowerCase();

// Only collapse claims that share a documented meaning within this field.
const specificity: Record<string, readonly (readonly [string, string])[]> = {
  protection: [["wind resistant", "windproof"], ["water resistant", "waterproof"]],
};

export function mergeListValues(key: string, values: string[]): string[] {
  const unique = new Map<string, string>();
  for (const value of values) {
    const text = value.trim();
    let identity = fold(text);
    if (key === "dwr" && /^(?:dwr|durable water[ -]repellent(?: treatment)?)$/.test(identity)) identity = "dwr";
    if (!unique.has(identity)) unique.set(identity, key === "dwr" && identity === "dwr" ? "DWR" : text);
  }
  for (const [generic, specific] of specificity[key] ?? []) if (unique.has(specific)) unique.delete(generic);
  // Keep distinct treatments when the source names more than one.
  if (key === "dwr" && [...unique.keys()].some((value) => /^(?:fc0|c0|fc-free|pfc-free) dwr$/.test(value))) unique.delete("dwr");
  return [...unique.values()];
}
