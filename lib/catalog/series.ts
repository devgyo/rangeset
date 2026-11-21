export type SeriesGroup = {
  brand: string;
  name: string;
  options: [value: string, count: number][];
};

export function seriesGroups(products: readonly {brandSlug: string; brand: string; series?: string[]}[]): SeriesGroup[] {
  const groups = new Map<string, {name: string; counts: Map<string, number>}>();
  for (const {brandSlug, brand, series} of products) {
    for (const line of new Set(series ?? [])) {
      let group = groups.get(brandSlug);
      if (!group) {
        group = {name: brand, counts: new Map()};
        groups.set(brandSlug, group);
      }
      group.counts.set(line, (group.counts.get(line) ?? 0) + 1);
    }
  }
  return [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([brand, {name, counts}]) => ({
    brand, name, options: [...counts].sort(([a], [b]) => a.localeCompare(b)),
  }));
}

// Qualified values distinguish identically named lines in the all-brands view.
// Unqualified values remain valid for old URLs and for the selected-brand union.
export function seriesSelection(value: string) {
  const delimiter = value.indexOf(":");
  return delimiter === -1 ? {line: value, brand: ""} :
    {line: value.slice(delimiter + 1), brand: value.slice(0, delimiter)};
}

export function seriesMatches(value: string, brand: string, line: string) {
  const selection = seriesSelection(value);
  return selection.line === line && (!selection.brand || selection.brand === brand);
}

export function visibleSeries(inventory: SeriesGroup[], brands: string[], counts = inventory): SeriesGroup[] {
  const available = inventory.filter((group) => !brands.length || brands.includes(group.brand));
  const countsByBrand = new Map(counts.map(({brand, options}) => [brand, new Map(options)]));
  const groups = available.map(({brand, name, options}) => ({
    brand, name, options: options.map(([line]) => [line, countsByBrand.get(brand)?.get(line) ?? 0] as [string, number]),
  }));
  if (!brands.length || !groups.length) return groups;
  const union = new Map<string, number>();
  for (const group of groups) for (const [line, count] of group.options) union.set(line, (union.get(line) ?? 0) + count);
  return [{brand: "", name: "", options: [...union].sort(([a], [b]) => a.localeCompare(b))}];
}

export function pruneSeries(params: URLSearchParams, inventory: SeriesGroup[]) {
  const brands = params.getAll("brand");
  const available = inventory.filter(({brand}) => !brands.length || brands.includes(brand));
  const values = params.getAll("series");
  const valid = values.filter((value) => available.some(({brand, options}) => options.some(([line]) => seriesMatches(value, brand, line))));
  if (valid.length !== values.length) {
    params.delete("series");
    for (const value of valid) params.append("series", value);
  }
  if (params.get("line") === "veilance" && !available.some(({options}) => options.some(([line]) => line === "Veilance"))) {
    params.delete("line");
  }
}
