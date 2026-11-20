export const fabricParts = { body: "Body", reinforcement: "Reinforcement", panel: "Panel", lining: "Lining" } as const;
export type FabricPart = keyof typeof fabricParts;

export const parameterVersion = "1.3.0";
export const groups = {
  identity: "General", sizing: "Dimensions & fit", fabric: "Main fabric", protection: "Protection",
  warmth: "Insulation", features: "Features", footwear: "Footwear", origin: "Origin",
  environment: "Environment & certifications", supplemental: "Supplementary source text",
} as const;
export const terms = {
  ripstop: { label: "Ripstop", text: "A woven fabric with a grid of stronger threads that helps stop small tears from spreading." },
  stretch: { label: "Stretch", text: "2-way stretch runs along one axis. 4-way stretch runs along both axes. Mechanical stretch comes from the fabric structure." },
  denier: { label: "Denier", text: "How much a length of yarn weighs. It does not tell you how thick the fabric is or how well it resists wear." },
  "3L": { label: "3L", text: "The outer fabric, waterproof layer, and inner backing are bonded together." },
  "2L": { label: "2L", text: "The outer fabric and waterproof layer are bonded together. The garment may have a separate lining." },
  "2.5L": { label: "2.5L", text: "The outer fabric and waterproof layer are bonded together. A thin print or coating protects the inside." },
  fill: { label: "Fill power", text: "How much space a set weight of down takes up in a test. Garment warmth also depends on how much down is used and how the garment is made." },
  gsm: { label: "Grams per square metre", text: "How much one square metre of this fabric or insulation weighs." },
  membrane: { label: "Waterproof membrane", text: "A thin layer that blocks liquid water. Its name alone gives no waterproof rating." },
  dwr: { label: "DWR", text: "A finish that helps water bead up and roll off the outer fabric." },
  upf: { label: "UPF", text: "A rating for how much ultraviolet light the fabric blocks. A higher number means less UV gets through in the test." },
  hydrostatic: { label: "Hydrostatic head", text: "The height of a column of water the fabric can hold back in a test. Compare numbers from the same test method." },
  breathability: { label: "Breathability", text: "How readily moisture vapour passes through the fabric in a test. Compare numbers with the same test method and units." },
  recco: { label: "RECCO", text: "A small built-in reflector that helps rescue teams locate you with RECCO detectors. No battery needed. It does not replace an avalanche transceiver." },
  drop: { label: "Heel-to-toe drop", text: "How much higher your heel sits than the front of your foot in the shoe." },
  stack: { label: "Stack height", text: "How much material sits between your foot and the ground at the heel or forefoot." },
  pfas: { label: "PFAS", text: "A large group of chemicals. A product can meet a PFAS rule and still contain some of these chemicals." },
} as const;
export type Term = keyof typeof terms;
export const productTypes = {
  jacket: "Jacket", vest: "Vest", coat: "Coat", parka: "Parka", hoodie: "Hoodie", anorak: "Anorak",
  pants: "Pants", bib_pants: "Bib pants", shorts: "Shorts", tights: "Tights",
  t_shirt: "T-shirt", shirt: "Shirt", overshirt: "Overshirt", polo: "Polo shirt", tank_top: "Tank top",
  sweatshirt: "Sweatshirt", sweater: "Sweater", pullover: "Pullover", cardigan: "Cardigan",
  zip_top: "Zip-neck top", halter_top: "Halter top", crewneck: "Crewneck", bomber: "Bomber jacket", blazer: "Blazer",
  base_layer_top: "Base layer top", base_layer_bottom: "Base layer bottom",
  dress: "Dress", skirt: "Skirt", skort: "Skort", suit: "Suit",
  shoe: "Shoe", boot: "Boot", sandal: "Sandal", mule: "Mule",
  backpack: "Backpack", mitten: "Mitten", glove: "Glove", hat: "Hat", cap: "Cap", beanie: "Beanie",
} as const;
export const protectionTypes = {
  hard_shell: "Hardshell", soft_shell: "Softshell", wind_shell: "Windshell", insulated_shell: "Insulated shell",
} as const;
export type ProductKind = "hard_shell" | "soft_shell" | "wind_shell" | "coat" | "insulated" | "pants" | "top" | "footwear" | "other";
export type ProductType = keyof typeof productTypes;
export type ProtectionType = keyof typeof protectionTypes;
type Scope = "all" | "apparel" | "upper" | "bottom" | "shoe" | "shell" | "technical" | "warm" | "snow" | "hooded_style" | "outerwear" | "outerwear_or_pants";
export type Context = { kind: ProductKind; productType?: ProductType; protectionType?: ProtectionType; insulated: boolean; snow: boolean; membrane: boolean };
type ValueType = "text" | "number" | "boolean" | "enum" | "list" | "parts" | "denier" | "composition" | "recycled";
type CompareRule = "exact" | "set" | "parts" | "measurement" | "method" | "reference";
type Format = "text" | "number" | "boolean" | "enum" | "list" | "parts" | "denier" | "composition" | "recycled" | "money" | "layers";
type Group = keyof typeof groups;

type FieldOptions = {
  unit?: string; options?: Record<string, string>; compare?: CompareRule; format?: Format; help?: Term;
  highlight?: Scope[]; core?: boolean; dataOnly?: boolean; component?: "fabric" | "warmth"; reviewLabel?: string;
};

function field(key: string, label: string, group: Group, order: number, type: ValueType, applies: Scope, description: string, extra: FieldOptions = {}) {
  return { key, label, group, order, type, applies, description, unit: extra.unit ?? null,
    compare: extra.compare ?? (type === "list" || type === "composition" || type === "recycled" ? "set" : type === "parts" ? "parts" : "exact"),
    format: extra.format ?? type, ...extra };
}
export type Field = ReturnType<typeof field>;

export const registry: Field[] = [
  field("brand", "Brand", "identity", 10, "text", "all", "Brand responsible for the product."),
  field("model", "Model", "identity", 20, "text", "all", "Published model name."),
  field("product_line", "Product line", "identity", 30, "text", "all", "Collection within the brand."),
  field("family", "Model family", "identity", 40, "text", "all", "Related models identified by their shared name."),
  field("category", "Category", "identity", 50, "text", "all", "Catalog category."),
  field("product_type", "Product type", "identity", 60, "enum", "all", "The specific garment, footwear or gear style.", {
    options: productTypes, reviewLabel: "Needs review",
  }),
  field("gender", "Gender", "identity", 70, "enum", "all", "Brand’s intended fit range.", { options: { men: "Men’s", women: "Women’s", unisex: "Unisex" } }),
  field("msrp", "Official list price", "identity", 80, "number", "all", "Published list price before temporary discounts.", { format: "money", compare: "method", core: true }),
  field("activities", "Activities", "identity", 100, "list", "all", "Activities listed by the brand."),
  field("release", "Release year / season", "identity", 110, "text", "all", "Release year or season reported by the brand."),
  field("weight", "Weight", "sizing", 10, "number", "all", "Mass of the item as measured by the brand.", { unit: "g", compare: "measurement", core: true, highlight: ["all"] }),
  field("weight_size", "Weight reference size", "sizing", 20, "text", "all", "Size used for the reported weight.", { compare: "reference", dataOnly: true }),
  field("weight_basis", "Weight basis", "sizing", 30, "enum", "shoe", "Whether the weight is for one shoe or a pair.", { options: { single: "One shoe", pair: "Pair" }, dataOnly: true }),
  field("fit", "Fit", "sizing", 40, "text", "apparel", "Published description of the cut.", { highlight: ["apparel"], core: true }),
  field("back_length", "Centre back length", "sizing", 50, "number", "upper", "Length measured at the centre back in the published reference size.", { unit: "cm", compare: "measurement", core: true, highlight: ["upper"] }),
  field("inseam", "Inseam", "sizing", 60, "number", "bottom", "Length along the inside leg in the published reference size.", { unit: "cm", compare: "measurement", core: true, highlight: ["bottom"] }),
  field("sizes", "Available sizes", "sizing", 70, "list", "all", "Sizes offered by the brand. Availability can vary."),
  field("colors", "Colorways", "sizing", 80, "number", "all", "Number of colorways listed by the brand."),
  field("materials", "Main fabric", "fabric", 10, "parts", "all", "Published fabrics grouped by their location on the product."),
  field("fabric_name", "Fabric name", "fabric", 20, "text", "all", "The fabric or technology name as published.", { component: "fabric", core: true }),
  field("fiber_content", "Composition", "fabric", 30, "composition", "all", "The percentage and published recycled status of each fiber.", { unit: "%", component: "fabric", core: true }),
  field("fabric_weight", "Fabric weight", "fabric", 40, "number", "all", "Weight per square metre of the fabric.", { unit: "g/m²", help: "gsm", component: "fabric", core: true }),
  field("denier", "Yarn denier", "fabric", 50, "denier", "all", terms.denier.text, { unit: "D", help: "denier", component: "fabric" }),
  field("fabric_recycled_content", "Recycled content", "fabric", 60, "recycled", "all", "The published recycled percentage and what it measures.", { component: "fabric" }),
  field("weave", "Construction", "fabric", 70, "list", "all", "The weave or knit named by the brand.", { component: "fabric" }),
  field("fabric_stretch", "Stretch", "fabric", 80, "list", "all", "Published stretch directions, mechanical stretch, or elastane content.", { help: "stretch", component: "fabric" }),
  field("fabric_certifications", "Certifications", "fabric", 90, "list", "all", "Certifications named for this fabric.", { component: "fabric" }),
  field("fabric_treatment", "Fabric treatment", "fabric", 100, "list", "all", "Published finishes and UV ratings. Water-repellent finishes are recorded under Protection.", { component: "fabric" }),
  field("garment_recycled_content", "Garment recycled content", "fabric", 110, "recycled", "all", "A recycled-content claim for the whole product."),
  field("fabric_issues", "Unassigned material", "supplemental", 15, "list", "all", "A published material whose location could not be mapped.", { reviewLabel: "Needs review" }),
  field("protection_type", "Protection type", "protection", 5, "enum", "all", "The published shell construction for protective gear.", { options: protectionTypes }),
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
  field("hood", "Hood", "features", 10, "boolean", "hooded_style", "Whether a hood is explicitly listed."),
  field("helmet_hood", "Helmet-compatible hood", "features", 20, "boolean", "outerwear", "Whether the hood is stated to fit over a helmet.", { highlight: ["shell"] }),
  field("pit_zips", "Underarm vents", "features", 30, "boolean", "outerwear", "Whether vent openings under the arms are explicitly listed."),
  field("two_way_zip", "Two-way zipper", "features", 40, "boolean", "outerwear_or_pants", "Whether the published zipper can open from both ends."),
  field("powder_skirt", "Powder skirt", "features", 50, "boolean", "snow", "An inner waist barrier designed to keep snow out."),
  field("leg_zips", "Leg side zippers", "features", 60, "boolean", "bottom", "Zippers along the side of a pant leg."),
  field("recco", "Search-and-rescue reflector", "features", 70, "boolean", "outerwear_or_pants", terms.recco.text, { help: "recco" }),
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
  field("source_notes", "Supplemental material text", "supplemental", 10, "list", "all", "Published material lines that cannot be safely structured."),
  field("feature_notes", "Other published features", "supplemental", 20, "list", "all", "Published feature text kept for reference."),
];

export const fieldsByKey = new Map(registry.map((item) => [item.key, item]));
export function appliesTo(scope: Scope, context: Context) {
  const { kind, productType, protectionType } = context;
  const shoe = productType ? ["shoe", "boot", "sandal", "mule"].includes(productType) : kind === "footwear";
  const outerwear = productType
    ? ["jacket", "vest", "coat", "parka", "anorak", "bomber", "blazer", "suit"].includes(productType) ||
      (productType === "hoodie" && (Boolean(protectionType) || context.insulated))
    : ["hard_shell", "soft_shell", "wind_shell", "coat", "insulated"].includes(kind);
  const pants = productType ? ["pants", "bib_pants"].includes(productType) : kind === "pants";
  const shell = Boolean(protectionType);
  const apparel = !shoe && kind !== "other";
  switch (scope) {
    case "all": return true;
    case "apparel": return apparel;
    case "upper": return apparel && kind !== "pants" && productType !== "skirt" && productType !== "skort";
    case "bottom": return kind === "pants";
    case "shoe": return shoe;
    case "shell": return shell;
    case "technical": return !shoe && (context.membrane || shell || pants);
    case "warm": return context.insulated;
    case "hooded_style": return outerwear || productType === "hoodie" || productType === "base_layer_top";
    case "outerwear": return outerwear && productType !== "vest";
    case "outerwear_or_pants": return outerwear || pants;
    case "snow": return context.snow && outerwear && productType !== "vest";
  }
}
