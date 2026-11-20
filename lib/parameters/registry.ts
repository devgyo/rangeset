export const parameterVersion = "1.0.0";
export const groups = {
  identity: "General", sizing: "Dimensions & fit", fabric: "Fabrics", protection: "Protection",
  warmth: "Insulation", features: "Features", footwear: "Footwear", origin: "Origin",
  environment: "Environment & certifications", supplemental: "Supplementary source text",
} as const;
export const terms = {
  denier: { label: "Denier", text: "A unit of yarn linear density. One denier is one gram per 9,000 metres of yarn. It does not measure fabric thickness or abrasion resistance." },
  "3L": { label: "3L", text: "A three-layer laminate bonds the outer fabric, membrane and inner backer into one fabric." },
  "2L": { label: "2L", text: "A two-layer laminate bonds a face fabric to a membrane. A separate liner may be used." },
  "2.5L": { label: "2.5L", text: "A laminate with a face fabric, membrane and a thin protective print or coating on the inside." },
  fill: { label: "Fill power", text: "The volume occupied by a specified mass of down under a test method. It does not rate the warmth of the finished garment." },
  gsm: { label: "Grams per square metre", text: "Mass per unit area of a particular fabric or fill. It is separate from the weight of the finished item." },
  membrane: { label: "Waterproof membrane", text: "The material layer used as a water barrier in the construction. The membrane name does not supply a waterproof test result." },
  dwr: { label: "DWR", text: "Durable water repellent is a surface treatment designed to shed water. It is separate from a waterproof membrane." },
  upf: { label: "UPF", text: "Ultraviolet Protection Factor rates how much ultraviolet radiation passes through a textile in a specified test." },
  hydrostatic: { label: "Hydrostatic head", text: "Water pressure expressed as the height of a column of water. Test methods and conditions matter when comparing results." },
  breathability: { label: "Breathability", text: "Published water-vapour transfer or resistance. Compare results only when the method and units match." },
  recco: { label: "RECCO", text: "A passive reflector that compatible search equipment can detect." },
  drop: { label: "Heel-to-toe drop", text: "The difference in published stack height between the heel and forefoot." },
  stack: { label: "Stack height", text: "Published sole height at the stated point of the shoe." },
  pfas: { label: "PFAS", text: "A family of fluorinated substances. A compliance claim and a claim about intentionally added PFAS have different scopes." },
} as const;
export type Term = keyof typeof terms;
export type ProductKind = "hard_shell" | "soft_shell" | "wind_shell" | "coat" | "insulated" | "pants" | "top" | "footwear" | "other";
type Scope = "all" | "apparel" | "upper" | "bottom" | "shoe" | "shell" | "technical" | "warm" | "snow";
export type Context = { kind: ProductKind; insulated: boolean; snow: boolean; hooded: boolean; membrane: boolean };
type ValueType = "text" | "number" | "boolean" | "enum" | "list" | "parts" | "denier" | "composition";
type CompareRule = "exact" | "set" | "parts" | "measurement" | "method" | "reference";
type Format = "text" | "number" | "boolean" | "enum" | "list" | "parts" | "denier" | "composition" | "money" | "layers";
type Group = keyof typeof groups;

type FieldOptions = {
  unit?: string; options?: Record<string, string>; compare?: CompareRule; format?: Format; help?: Term;
  highlight?: Scope[]; optional?: boolean; component?: "fabric" | "warmth";
};

function field(key: string, label: string, group: Group, order: number, type: ValueType, applies: Scope, description: string, extra: FieldOptions = {}) {
  return { key, label, group, order, type, applies, description, unit: extra.unit ?? null,
    compare: extra.compare ?? (type === "list" || type === "composition" ? "set" : type === "parts" ? "parts" : "exact"),
    format: extra.format ?? type, ...extra };
}
export type Field = ReturnType<typeof field>;

export const registry: Field[] = [
  field("brand", "Brand", "identity", 10, "text", "all", "Brand responsible for the product."),
  field("model", "Model", "identity", 20, "text", "all", "Published model name."),
  field("product_line", "Product line", "identity", 30, "text", "all", "Collection within the brand."),
  field("family", "Model family", "identity", 40, "text", "all", "Related models identified by their shared name."),
  field("category", "Category", "identity", 50, "text", "all", "Catalog category."),
  field("product_type", "Product type", "identity", 60, "enum", "all", "Type based on the product’s intended construction or use.", { options: {
    hard_shell: "Hardshell", soft_shell: "Softshell", wind_shell: "Windshell", coat: "Coat", insulated: "Insulated apparel",
    pants: "Pants or shorts", top: "Top or dress", footwear: "Footwear", other: "Other gear",
  } }),
  field("gender", "Gender", "identity", 70, "enum", "all", "Brand’s intended fit range.", { options: { men: "Men’s", women: "Women’s", unisex: "Unisex" } }),
  field("msrp", "Official list price", "identity", 80, "number", "all", "Published list price before temporary discounts.", { format: "money", compare: "method" }),
  field("currency", "Currency", "identity", 90, "text", "all", "Currency of the official list price."),
  field("activities", "Activities", "identity", 100, "list", "all", "Activities listed by the brand."),
  field("release", "Release year / season", "identity", 110, "text", "all", "Release year or season reported by the brand."),
  field("weight", "Weight", "sizing", 10, "number", "all", "Mass of the item as measured by the brand.", { unit: "g", compare: "measurement", highlight: ["all"] }),
  field("weight_size", "Weight reference size", "sizing", 20, "text", "all", "Size used for the reported weight.", { compare: "reference" }),
  field("weight_basis", "Weight basis", "sizing", 30, "enum", "shoe", "Whether the weight is for one shoe or a pair.", { options: { single: "One shoe", pair: "Pair" } }),
  field("fit", "Fit", "sizing", 40, "text", "apparel", "Published description of the cut.", { highlight: ["apparel"] }),
  field("back_length", "Centre back length", "sizing", 50, "number", "upper", "Length measured at the centre back in the published reference size.", { unit: "cm", compare: "measurement", highlight: ["upper"] }),
  field("inseam", "Inseam", "sizing", 60, "number", "bottom", "Length along the inside leg in the published reference size.", { unit: "cm", compare: "measurement", highlight: ["bottom"] }),
  field("sizes", "Available sizes", "sizing", 70, "list", "all", "Sizes offered by the brand. Availability can vary."),
  field("colors", "Colorways", "sizing", 80, "number", "all", "Number of colorways listed by the brand."),
  field("materials", "Fabric by part", "fabric", 10, "parts", "all", "Fabric construction listed separately for each published component."),
  field("fabric_name", "Fabric name", "fabric", 20, "text", "all", "Published fabric name or named material.", { component: "fabric" }),
  field("fiber_content", "Fiber composition", "fabric", 30, "composition", "all", "Published proportions of the fibers within this fabric.", { unit: "%", component: "fabric" }),
  field("denier", "Yarn denier", "fabric", 40, "denier", "all", terms.denier.text, { unit: "D", help: "denier", component: "fabric" }),
  field("fabric_weight", "Fabric weight", "fabric", 50, "number", "all", "Mass per unit area of this fabric.", { unit: "g/m²", help: "gsm", component: "fabric" }),
  field("weave", "Fabric construction", "fabric", 60, "text", "all", "Published weave, knit or other textile structure.", { component: "fabric" }),
  field("protection", "Protection claims", "protection", 10, "list", "all", "Explicit protection claims stated by the brand."),
  field("membrane", "Waterproof membrane", "protection", 20, "text", "technical", terms.membrane.text, { help: "membrane", highlight: ["shell"] }),
  field("laminate", "Laminate layers", "protection", 30, "enum", "technical", "Number of layers bonded in the published laminate.", { options: { "2": "2L", "2.5": "2.5L", "3": "3L" }, format: "layers", highlight: ["shell"] }),
  field("dwr", "Water-repellent treatment", "protection", 40, "list", "technical", terms.dwr.text, { help: "dwr" }),
  field("wind", "Wind protection", "protection", 50, "enum", "apparel", "Explicit claim about resistance to wind.", { options: { windproof: "Windproof", wind_resistant: "Wind resistant" } }),
  field("upf", "Sun protection", "protection", 60, "text", "apparel", terms.upf.text, { help: "upf" }),
  field("hydrostatic_head", "Hydrostatic head", "protection", 70, "number", "technical", terms.hydrostatic.text, { unit: "mm", help: "hydrostatic", compare: "method" }),
  field("breathability", "Breathability", "protection", 80, "number", "technical", terms.breathability.text, { help: "breathability", compare: "method" }),
  field("insulation_type", "Insulation type", "warmth", 10, "enum", "warm", "Published fill type.", { options: { down: "Down", synthetic: "Synthetic", mixed: "Down + synthetic" }, highlight: ["warm"] }),
  field("insulation", "Fill by part", "warmth", 20, "parts", "warm", "Published fill materials listed by the stated component."),
  field("fill_power", "Down fill power", "warmth", 30, "number", "warm", terms.fill.text, { help: "fill", unit: "cu in/oz", component: "warmth", compare: "method" }),
  field("down_ratio", "Down content", "warmth", 40, "number", "warm", "Published proportion of down in the fill mixture.", { unit: "%", component: "warmth" }),
  field("down_species", "Down species", "warmth", 50, "text", "warm", "Bird species stated for this down fill.", { component: "warmth" }),
  field("down_mass", "Down fill weight", "warmth", 60, "number", "warm", "Actual mass of down fill in the specified part.", { unit: "g", component: "warmth" }),
  field("synthetic_fill", "Synthetic insulation", "warmth", 70, "text", "warm", "Published synthetic fill material or technology.", { component: "warmth" }),
  field("synthetic_density", "Synthetic fill weight per area", "warmth", 80, "number", "warm", "Mass of synthetic fill per unit area in the specified part.", { unit: "g/m²", help: "gsm", component: "warmth" }),
  field("hood", "Hood", "features", 10, "boolean", "upper", "Whether a hood is explicitly listed."),
  field("helmet_hood", "Helmet-compatible hood", "features", 20, "boolean", "upper", "Whether the hood is stated to fit over a helmet.", { highlight: ["shell"] }),
  field("pit_zips", "Underarm vents", "features", 30, "boolean", "upper", "Whether vent openings under the arms are explicitly listed."),
  field("two_way_zip", "Two-way zipper", "features", 40, "boolean", "apparel", "Whether the published zipper can open from both ends."),
  field("powder_skirt", "Powder skirt", "features", 50, "boolean", "snow", "An inner waist barrier designed to keep snow out."),
  field("leg_zips", "Leg side zippers", "features", 60, "boolean", "bottom", "Zippers along the side of a pant leg."),
  field("recco", "Search-and-rescue reflector", "features", 70, "boolean", "apparel", terms.recco.text, { help: "recco" }),
  field("pockets", "Pockets", "features", 80, "list", "apparel", "Pocket configurations explicitly described by the brand."),
  field("drop", "Heel-to-toe drop", "footwear", 10, "number", "shoe", terms.drop.text, { unit: "mm", help: "drop", highlight: ["shoe"] }),
  field("forefoot_stack", "Forefoot stack height", "footwear", 20, "number", "shoe", terms.stack.text, { unit: "mm", help: "stack" }),
  field("heel_stack", "Heel stack height", "footwear", 30, "number", "shoe", terms.stack.text, { unit: "mm", help: "stack" }),
  field("lugs", "Lug depth", "footwear", 40, "number", "shoe", "Height of the tread projections on the sole.", { unit: "mm", highlight: ["shoe"] }),
  field("outsole", "Outsole rubber", "footwear", 50, "text", "shoe", "Published rubber or compound on the ground-contacting sole.", { highlight: ["shoe"] }),
  field("midsole", "Midsole", "footwear", 60, "list", "shoe", "Published cushioning or structure between the foot and outsole."),
  field("upper", "Upper", "footwear", 70, "list", "shoe", "Published material around the top and sides of the foot."),
  field("waterproof_lining", "Waterproof lining", "footwear", 80, "text", "shoe", "Published waterproof liner or membrane in the shoe."),
  field("fabric_origin", "Fabric origin", "origin", 10, "list", "all", "Locations where fabric was made."),
  field("dye_origin", "Dyeing origin", "origin", 20, "list", "all", "Locations where fabric was dyed."),
  field("assembly_origin", "Manufacturing origin", "origin", 30, "list", "all", "Locations where the finished item was made."),
  field("facility", "Manufacturing facility", "origin", 40, "text", "all", "Factory stated by the brand."),
  field("recycled", "Recycled material claims", "environment", 10, "list", "all", "Published recycled-content statements, with scope when provided."),
  field("certifications", "Certifications & standards", "environment", 20, "list", "all", "Published certifications, material labels and standards claims."),
  field("pfas", "PFAS statements", "environment", 30, "list", "all", terms.pfas.text, { help: "pfas" }),
  field("microfibers", "Microfiber statements", "environment", 40, "list", "all", "Published statements about fiber shedding."),
  field("regulatory", "Other regulatory statements", "environment", 50, "list", "all", "Published regulatory and treatment disclosures."),
  field("source_notes", "Supplemental material text", "supplemental", 10, "list", "all", "Published material lines that cannot be safely structured.", { optional: true }),
  field("feature_notes", "Other published features", "supplemental", 20, "list", "all", "Published feature text kept for reference.", { optional: true }),
];

export const fieldsByKey = new Map(registry.map((item) => [item.key, item]));
export function appliesTo(scope: Scope, context: Context) {
  const { kind } = context;
  switch (scope) {
    case "all": return true;
    case "apparel": return kind !== "footwear" && kind !== "other";
    case "upper": return !["footwear", "pants", "other"].includes(kind);
    case "bottom": return kind === "pants";
    case "shoe": return kind === "footwear";
    case "shell": return ["hard_shell", "soft_shell", "wind_shell"].includes(kind);
    case "technical": return context.membrane || ["hard_shell", "soft_shell", "wind_shell", "pants"].includes(kind);
    case "warm": return context.insulated;
    case "snow": return context.snow && !["footwear", "pants", "other"].includes(kind);
  }
}
