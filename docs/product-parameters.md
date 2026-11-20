# Rangeset product parameter standard v1.0.0

The registry in `lib/parameters/registry.ts` owns field keys, labels, ordering, types, units, enum values, applicability, formatters, comparison policies, and glossary entries. The table below is the v1 field inventory. Product adapters emit a `Profile` from `lib/parameters/model.ts`. Add brand-specific extraction in an adapter and map its values to the same keys.

## Evidence and review

Each fact carries the source URL, original field path and text, extraction method, and source update time when available. Parsed and indexed evidence remains attached when the values conflict. Each group in both tables has a **Show sources** switch. Sources start hidden. When claims are merged, their original evidence is retained. Existing raw payloads and indexed specs stay in their original storage.

- **Not published** means there is no usable published observation for an applicable field.
- **Not applicable** means the field does not apply to the product's construction or type.
- **Conflicting sources** means two published or recorded observations disagree.
- **Needs verification** means the text or value cannot be resolved reliably. Examples include multiple unpaired measurements and percentages over 100 within one fabric component.
- An explicit negative is displayed as **No**. A missing boolean stays unknown.

## Manual overrides

Existing `manual_overrides` entries apply after source extraction. A `parameters.<key>` entry takes precedence over legacy field aliases and survives refreshes because the adapter reads these entries without writing to them. A legacy product-level denier or fabric-weight override attaches to the sole main fabric when identifiable. With multiple main fabrics it is flagged for review until an explicit structured override assigns the correct part.

Example value for `parameters.weight`:

```json
{"value":0.455,"unit":"kg","reference":{"size":"M","gender":"men","basis":"item"},"updatedAt":"2026-11-20"}
```

Use a JSON null to explicitly keep a field unpublished. A structured override such as `parameters.materials` accepts an array of records with `part`, `label`, and `fields`. Use an optional `backers` array on the owning fabric record for backing details. Older standalone backing records are assigned only when their parent is unambiguous. For example:

```json
[{"part":"main","label":"Body","fields":{"fabric_name":"Nylon ripstop","denier":[40,70],"fabric_weight":{"value":125,"unit":"g/m²"},"fiber_content":[{"name":"Nylon","percent":100}]}}]
```

## Comparison policy

Values are normalized before comparison. Lists are compared without source order. Fabric and fill records align by normalized part, and repeated records within a part are compared as a multiset. Prices require the same currency. Length measurements require matching published size and fit range. Shoe weights require a published single-shoe or pair basis. Known differences, unavailable values, inapplicable rows, and incompatible measurement references have separate treatments. An unknown or conflicting value by itself does not count as a confirmed difference.

## Coverage limits

Weight reference sizes, shoe weight basis, down fill mass, waterproof and breathability measurements, and test conditions are often absent. Fill-power values keep their published number with units and methods withheld when the source does not identify them. Broad construction claims and treatment labels do not establish a waterproof rating, a temperature rating, or absence of PFAS. Brand-labelled fabric, dyeing, and assembly locations remain distinct. Unclear material text and otherwise unmapped feature statements are available under Supplementary source text.

Terminology references include the [denier definition in the US Code of Federal Regulations](https://www.govinfo.gov/content/pkg/CFR-2025-title21-vol8/xhtml/CFR-2025-title21-vol8-chapI-subchapK.html), [GORE-TEX laminate construction](https://www.gore-tex.com/en_uk/blog/the-gore-tex-membrane-what-it-is-how-it-works-and-why-you-need-it), and [IDFB fill-power terminology](https://idfb.net/consumer-resources/down-better-insulation-better-for-your-health).

## Field inventory

The component fields appear within each fabric or fill record.

### General

| Key | Field | Type | Standard unit | Applies to | Compare |
| --- | --- | --- | --- | --- | --- |
| `brand` | Brand | text | — | all | exact |
| `model` | Model | text | — | all | exact |
| `product_line` | Product line | text | — | all | exact |
| `family` | Model family | text | — | all | exact |
| `category` | Category | text | — | all | exact |
| `product_type` | Product type | enum | — | all | exact |
| `gender` | Gender | enum | — | all | exact |
| `msrp` | Official list price | number | — | all | method |
| `currency` | Currency | text | — | all | exact |
| `activities` | Activities | list | — | all | set |
| `release` | Release year / season | text | — | all | exact |

### Dimensions & fit

| Key | Field | Type | Standard unit | Applies to | Compare |
| --- | --- | --- | --- | --- | --- |
| `weight` | Weight | number | g | all | measurement |
| `weight_size` | Weight reference size | text | — | all | reference |
| `weight_basis` | Weight basis | enum | — | shoe | exact |
| `fit` | Fit | text | — | apparel | exact |
| `back_length` | Centre back length | number | cm | upper | measurement |
| `inseam` | Inseam | number | cm | bottom | measurement |
| `sizes` | Available sizes | list | — | all | set |
| `colors` | Colorways | number | — | all | exact |

### Fabrics

| Key | Field | Type | Standard unit | Applies to | Compare |
| --- | --- | --- | --- | --- | --- |
| `materials` | Fabric by part | parts | — | all | parts |
| `fabric_name` | Fabric name | text | — | fabric | exact |
| `fiber_content` | Fiber composition | composition | % | fabric | set |
| `denier` | Yarn denier | denier | D | fabric | exact |
| `fabric_weight` | Fabric weight | number | g/m² | fabric | exact |
| `weave` | Fabric construction | text | — | fabric | exact |

### Protection

| Key | Field | Type | Standard unit | Applies to | Compare |
| --- | --- | --- | --- | --- | --- |
| `protection` | Protection claims | list | — | all | set |
| `membrane` | Waterproof membrane | text | — | technical | exact |
| `laminate` | Laminate layers | enum | — | technical | exact |
| `dwr` | Water-repellent treatment | list | — | technical | set |
| `wind` | Wind protection | enum | — | apparel | exact |
| `upf` | Sun protection | text | — | apparel | exact |
| `hydrostatic_head` | Hydrostatic head | number | mm | technical | method |
| `breathability` | Breathability | number | — | technical | method |

### Insulation

| Key | Field | Type | Standard unit | Applies to | Compare |
| --- | --- | --- | --- | --- | --- |
| `insulation_type` | Insulation type | enum | — | warm | exact |
| `insulation` | Fill by part | parts | — | warm | parts |
| `fill_power` | Down fill power | number | cu in/oz | warmth | method |
| `down_ratio` | Down content | number | % | warmth | exact |
| `down_species` | Down species | text | — | warmth | exact |
| `down_mass` | Down fill weight | number | g | warmth | exact |
| `synthetic_fill` | Synthetic insulation | text | — | warmth | exact |
| `synthetic_density` | Synthetic fill weight per area | number | g/m² | warmth | exact |

### Features

| Key | Field | Type | Standard unit | Applies to | Compare |
| --- | --- | --- | --- | --- | --- |
| `hood` | Hood | boolean | — | upper | exact |
| `helmet_hood` | Helmet-compatible hood | boolean | — | upper | exact |
| `pit_zips` | Underarm vents | boolean | — | upper | exact |
| `two_way_zip` | Two-way zipper | boolean | — | apparel | exact |
| `powder_skirt` | Powder skirt | boolean | — | snow | exact |
| `leg_zips` | Leg side zippers | boolean | — | bottom | exact |
| `recco` | Search-and-rescue reflector | boolean | — | apparel | exact |
| `pockets` | Pockets | list | — | apparel | set |

### Footwear

| Key | Field | Type | Standard unit | Applies to | Compare |
| --- | --- | --- | --- | --- | --- |
| `drop` | Heel-to-toe drop | number | mm | shoe | exact |
| `forefoot_stack` | Forefoot stack height | number | mm | shoe | exact |
| `heel_stack` | Heel stack height | number | mm | shoe | exact |
| `lugs` | Lug depth | number | mm | shoe | exact |
| `outsole` | Outsole rubber | text | — | shoe | exact |
| `midsole` | Midsole | list | — | shoe | set |
| `upper` | Upper | list | — | shoe | set |
| `waterproof_lining` | Waterproof lining | text | — | shoe | exact |

### Origin

| Key | Field | Type | Standard unit | Applies to | Compare |
| --- | --- | --- | --- | --- | --- |
| `fabric_origin` | Fabric origin | list | — | all | set |
| `dye_origin` | Dyeing origin | list | — | all | set |
| `assembly_origin` | Manufacturing origin | list | — | all | set |
| `facility` | Manufacturing facility | text | — | all | exact |

### Environment & certifications

| Key | Field | Type | Standard unit | Applies to | Compare |
| --- | --- | --- | --- | --- | --- |
| `recycled` | Recycled material claims | list | — | all | set |
| `certifications` | Certifications & standards | list | — | all | set |
| `pfas` | PFAS statements | list | — | all | set |
| `microfibers` | Microfiber statements | list | — | all | set |
| `regulatory` | Other regulatory statements | list | — | all | set |

### Supplementary source text

| Key | Field | Type | Standard unit | Applies to | Compare |
| --- | --- | --- | --- | --- | --- |
| `source_notes` | Supplemental material text | list | — | all | set |
| `feature_notes` | Other published features | list | — | all | set |

