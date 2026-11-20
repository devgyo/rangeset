# Rangeset product parameter standard v1.3.0

The registry in `lib/parameters/registry.ts` owns field keys, labels, ordering, types, units, enum values, applicability, formatters, comparison policies, and glossary entries. The table below is the v1.3.0 field inventory. Product adapters emit a `Profile` from `lib/parameters/model.ts`. Add brand-specific extraction in an adapter and map its values to the same keys.

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

Use a JSON null to explicitly keep a field unpublished. A structured override such as `parameters.materials` accepts an array of records with `part`, `label`, and `fields`. Use optional `faces` and `backers` arrays on the owning fabric record. Older location keys and standalone layers are mapped when their parent is unambiguous. For example:

```json
[{"part":"body","label":"Body","fields":{"fabric_name":"Nylon","denier":[40,70],"fabric_weight":{"value":125,"unit":"g/m²"},"fiber_content":[{"fiber":"Nylon","pct":100,"recycled":null}],"weave":["Ripstop"]}}]
```

## Style, shell construction and price

Product type is a concrete style, such as Jacket, T-shirt, Dress or Boot. Unresolved styles are marked Needs review. Protection type describes shell construction where applicable. Product type and Protection type share the same codes and labels across the catalog filters and both parameter pages. A legacy shell code in a Product type override is read as Protection type when applicable.

The official price includes its ISO currency, such as `$650 USD`. The currency remains attached to the normalized price and is used to decide whether two prices can be compared.

## Display and comparison

Details show applicable, known values, with a dash for unpublished core measurements, fit, and list price. An unresolved product type remains visible as Needs review. Comparison rows require at least one known value. Feature symbols distinguish explicit yes (●), explicit no (○), and unpublished (—). N/A means the field does not apply. A missing feature mention never establishes a negative.

Differences only includes confirmed differences and rows with a published value alongside an unpublished one. The latter are flagged as unable to compare, without confirmed-difference highlighting. Lists ignore source order, and fabrics and fills align by part. Prices require the same currency. Length measurements require matching published size and fit range.

The Weight row includes the reference size and single-shoe or pair basis when published. The data model still holds both references. Unpublished sizes are flagged once under the comparison row heading. Published sizes must agree when both are known. Comparing shoe weights also requires the same published shoe basis.

## Coverage limits

Weight reference sizes, shoe weight basis, down fill mass, and test conditions are often absent. Fill-power values keep their published number with units and methods withheld when the source does not identify them. Broad construction claims and treatment labels do not establish a temperature rating or absence of PFAS. Brand-labelled fabric, dyeing, and assembly locations remain distinct. Unclear material text and otherwise unmapped feature statements are available under Supplementary source text.

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
| `activities` | Activities | list | — | all | set |
| `release` | Release year / season | text | — | all | exact |

### Dimensions & fit

| Key | Field | Type | Standard unit | Applies to | Compare |
| --- | --- | --- | --- | --- | --- |
| `weight` | Weight | number | g | all | measurement |
| `weight_size` | Weight reference size (data only) | text | — | all | reference |
| `weight_basis` | Weight basis (data only) | enum | — | shoe | exact |
| `fit` | Fit | text | — | apparel | exact |
| `back_length` | Centre back length | number | cm | upper | measurement |
| `inseam` | Inseam | number | cm | bottom | measurement |
| `sizes` | Available sizes | list | — | all | set |
| `colors` | Colorways | number | — | all | exact |

### Main fabric

Published material records are organized as **Body**, **Reinforcement**, **Panel**, then **Lining**. The source label and original text remain in the evidence. Face and Backer are layers of an identified part. Contrast panels and explicit inserts map to Panel, reinforced inserts to Reinforcement, and a secondary layer explicitly described as a lining maps to Lining. A bare “Secondary” or a material name with no supported location is preserved as `needs_review` under Supplementary source text. A product with only Body omits the Body heading on the detail page.

| Key | Field | Definition |
| --- | --- | --- |
| `materials` | Main fabric | Published part and layer records, with repeated material records preserved. |
| `fabric_name` | Fabric name | Published fabric or technology name. |
| `fiber_content` | Composition | An array of `{ fiber, pct, recycled }`. Recycled is true for a stated recycled fiber, false for a stated virgin fiber, or null when unspecified. A total above 100% keeps the source text and receives `needs_review`. |
| `fabric_weight` | Fabric weight | Integer g/m². Read gsm and gm2 as g/m². Convert oz/yd² by multiplying by 33.906 and rounding. Keep and display the imperial reading, as in `119 g/m² (3.5 oz/yd²)`. Ambiguous units such as g/m produce `unverified` without a numeric value. Insulation weight stays under Insulation. |
| `denier` | Yarn denier | Ordered numbers formatted as `40D` or `40D × 70D`. A written “denier 90” becomes `90D`. The adapter requires an explicit denier observation. |
| `fabric_recycled_content` | Recycled content | An array of `{ pct, scope }`, with scope `fabric`, `face`, or `claim_only`. A percentage-free claim is stored with `pct: null`. |
| `garment_recycled_content` | Garment recycled content | A separate product-level observation with scope `garment` or `claim_only`. It stays separate from the fabric percentages. |
| `weave` | Construction | Explicit Ripstop, Plain weave, Double weave, Jersey, Grid fleece, Twill, or Knit. Published knit variants can map to Knit. A technology name or generic fleece is insufficient. |
| `fabric_stretch` | Stretch | Mechanical, 2-way, 4-way, or Contains elastane, based on published text. |
| `fabric_certifications` | Certifications | Fabric-level certifications or standards named by the source, such as bluesign. |
| `fabric_treatment` | Fabric treatment | Published finishes and treatments such as UPF or an antimicrobial finish. |

On details, unpublished Fabric name, Composition and Fabric weight use a dash. Other optional fields appear when published. In comparison, rows align by part, layer, and field. A row appears when at least one product has a known value.

### Protection

| Key | Field | Type | Standard unit | Applies to | Compare |
| --- | --- | --- | --- | --- | --- |
| `protection_type` | Protection type | enum | — | all | exact |
| `protection` | Protection claims | list | — | all | set |
| `membrane` | Waterproof membrane | text | — | technical | exact |
| `laminate` | Laminate layers | enum | — | technical | exact |
| `dwr` | Water-repellent treatment | list | — | technical | set |
| `wind` | Wind protection | enum | — | apparel | exact |
| `upf` | Sun protection | text | — | apparel | exact |

Waterproof ratings and breathability will be added in a future version.

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
| `hood` | Hood | boolean | — | hooded style | exact |
| `helmet_hood` | Helmet-compatible hood | boolean | — | outerwear | exact |
| `pit_zips` | Underarm vents | boolean | — | outerwear | exact |
| `two_way_zip` | Two-way zipper | boolean | — | outerwear or pants | exact |
| `powder_skirt` | Powder skirt | boolean | — | snow | exact |
| `leg_zips` | Leg side zippers | boolean | — | bottom | exact |
| `recco` | Search-and-rescue reflector | boolean | — | outerwear or pants | exact |
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
| `fabric_issues` | Unassigned material | list | — | all | set |
| `feature_notes` | Other published features | list | — | all | set |

