import {type CatalogCard, type CatalogSpec, type featuresOf} from "./product-view";
export * from "./product-view";

type Scalar = CatalogSpec["value"];
export const categoryOrder = [
  "Shell Jackets", "Insulated Jackets", "Pants", "Fleece", "Shirts and Tops",
  "Base Layer", "Professional Use", "Shorts", "Dresses and Skirts",
];
export const featuredFamilies = ["Beta", "Alpha", "Atom", "Gamma", "Norvan"];
const families = new Map([
  ...featuredFamilies, "Cerium", "Proton", "Kragg", "Konseal", "Rho", "Kyanite", "Delta",
  "Covert", "Sentinel", "Sabre", "Vertex", "Cormac", "Satoro", "Squamish", "Nuclei",
  "Thorium", "Rush", "Aerios", "Incendo", "Sylan", "Motus", "Essent", "Lana",
].map((name) => [name.toLowerCase(), name]));

export function productFamily(name: string) {
  const prefix = name.trim().match(/^[a-z]+(?=$|[\s-])/i)?.[0];
  return (prefix && families.get(prefix.toLowerCase())) || null;
}


const derivedSpec = (value: Scalar, unit: string | null, date: string | null): CatalogSpec =>
  ({ value, unit, source: "brand", date });

export function categorySpecs(
  category: string | null, materials: string[], features: ReturnType<typeof featuresOf>,
  date: string | null,
) {
  const specs: CatalogCard["specs"] = {};
  if (category === "Insulated Jackets") {
    const lines = [...materials, ...features.filter(({ label }) => /insulation|construction/i.test(label)).flatMap(({ values }) => values)];
    const insulation = new Set<string>();
    for (const line of lines) {
      const fill = line.match(/\b(\d{3,4})\s*(?:fill(?:\s+power)?|FP)\b/i);
      if (/\bdown\b/i.test(line) && (fill || /\bdown insulation\b|\b(?:goose|duck) down\b/i.test(line))) {
        insulation.add(fill ? `Down · ${fill[1]} fill` : "Down");
      }
      const synthetic = line.match(/\b(Coreloft|PrimaLoft|Octa|Climashield|POLARTEC\s+Alpha)\b/i)?.[0];
      if (synthetic) insulation.add(synthetic);
      else if (/\bsynthetic insulation\b/i.test(line)) insulation.add("Synthetic");
    }
    if ([...insulation].some((entry) => entry.startsWith("Down ·"))) insulation.delete("Down");
    if (insulation.size > 1 && [...insulation].some((entry) => !/^(?:Down|Synthetic)/.test(entry))) insulation.delete("Synthetic");
    if (insulation.size) specs.insulation = derivedSpec([...insulation].join(" + "), null, date);
  }
  return specs;
}

export function categoryCounts(products: { category: string | null }[]) {
  const counts = new Map<string, number>();
  for (const { category } of products) if (category) counts.set(category, (counts.get(category) ?? 0) + 1);
  return [...categoryOrder, ...[...counts.keys()].filter((label) => !categoryOrder.includes(label)).sort()]
    .flatMap((label) => counts.has(label) ? [{ label, count: counts.get(label)! }] : []);
}
