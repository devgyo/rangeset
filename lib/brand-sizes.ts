const alphaSizes = ["XXXS", "XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL"];
const lengthRank: Record<string, number> = {
  S: 0, SHORT: 0, R: 1, REGULAR: 1, L: 2, LONG: 2, T: 2, TALL: 2,
};

export function apparelSize(label: string, arcInseam = false) {
  const size = label.trim().toUpperCase().replace(/^([234])XL?(?=$|[-\s])/, (_, count: string) => "X".repeat(Number(count)) + "L");
  const letter = size.match(/^([X]{0,3}S|M|[X]{0,4}L)(?:[-/]([X]{0,2}S|M|[X]{0,3}L))?(?:(?:\s+|-)(SHORT|REGULAR|TALL|LONG|[SLRT]))?$/);
  if (letter) {
    const inseam = arcInseam && !letter[3] && /^[SL]$/.test(letter[2] ?? "") && size.endsWith(`-${letter[2]}`) ? letter[2] : undefined;
    return {type: "alpha" as const, rank: alphaSizes.indexOf(letter[1]), base: letter[1],
      compound: Boolean(letter[2] && !inseam), length: lengthRank[letter[3] ?? inseam] ?? 1};
  }
  const numeric = size.match(/^(?:(?:US|EU)\s+)?(\d{1,2})(?:\s*-?\s*(SHORT|REGULAR|TALL|LONG|[SLRT]))?$/);
  return numeric ? {type: "numeric" as const, rank: Number(numeric[1]), length: lengthRank[numeric[2]] ?? 1} : undefined;
}

export function orderMammutSizes(labels: string[]) {
  return labels.map((label) => ({label, parsed: apparelSize(label)})).sort((a, b) => {
    if (!a.parsed || !b.parsed) return Number(!a.parsed) - Number(!b.parsed);
    return a.parsed.type.localeCompare(b.parsed.type) || a.parsed.rank - b.parsed.rank || a.parsed.length - b.parsed.length;
  }).map(({label}) => label);
}
