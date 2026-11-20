# Rangeset product parameter standard v1.7.0

The registry in `lib/parameters/registry.ts` owns field keys, labels, ordering, types, units, enum values, applicability, formatters, comparison policies, and glossary entries. The table below is the v1.7.0 field inventory. Product adapters emit a `Profile` from `lib/parameters/model.ts`. Add brand-specific extraction in an adapter and map its values to the same keys.

## Catalog scope

Rangeset catalogs apparel and backpacks. The original brand category stays in `products.category`. The catalog resolves at most one Rangeset leaf at read time. Footwear, backpack accessories and other equipment stay outside the public catalog. Records with unresolved or contradictory construction are searchable and have detail pages. They are excluded from category lists and comparison recommendations.

## Rangeset taxonomy

| Group | Leaves |
| --- | --- |
| Outerwear | Hardshell Jackets · Insulated Shells · Down Jackets · Synthetic Insulated Jackets · Softshell Jackets · Windshells · Coats & Tailoring · Vests |
| Fleece & Midlayers | Fleece & Midlayers |
| Shirts & Tops | Shirts & Tops |
| Base Layers | Base Layer Tops · Base Layer Bottoms |
| Bottoms | Hardshell Pants · Insulated Pants · Softshell Pants · Pants · Tights & Leggings · Shorts · Skirts |
| Dresses & One-Pieces | Dresses · One-Piece Suits |
| Backpacks | Backpacks |

Brand, gender, activity and series are independent facets. Category routes use stable English slugs under `/products/category/`. Legacy catalog category URLs and the hard-shell index redirect with HTTP 301 in each language. The canonical URL, language alternates and sitemap use the new path. The tree in `lib/taxonomy.ts` defines each leaf. The [glossary](i18n/glossary.csv) provides the English, Simplified Chinese and Japanese names, with Japanese marked for review.

The first applicable rule wins. Scope and backpack checks precede base layers, one-piece garments, dresses, skirts and shorts. Pants resolve in the order tights, fixed fill, body waterproofing, softshell and other pants. Next check contradictory body claims, sleeveless outerwear, unfilled fleece or knit midlayers, and ordinary tops. For the remaining outerwear, waterproof membrane and fixed fill give Insulated Shells. Otherwise use the primary torso fill, followed by body waterproofing, tailoring, softshell and windshell. A 3-in-1 uses the outer layer. Ski use remains an activity. A waterproof panel, DWR, WINDSTOPPER or GORE-TEX INFINIUM alone is insufficient for a hardshell. The legacy `is_hardshell` value is excluded from classification.

Use `parameters.taxonomy` in `manual_overrides` with a stable leaf key, optionally wrapped in `{"value":"outer.hardshell","reason":"…","updatedAt":"YYYY-MM-DD"}`. Conflicting automatic classifications of same-brand model variants enter review. A valid manual choice takes priority. See the [rule research](taxonomy-research.md) and [Arc’teryx coverage audit](arcteryx-taxonomy-v1.7.0.md).

## Brand adapters

`lib/brands/index.ts` registers Arc’teryx and Mammut. Each adapter supplies catalog eligibility, merchandising fields, model numbers, taxonomy facts and the common `Profile`. Brands preserve product names, technology names and cited original text. Card selection, search, featured sorting, and comparison use the same data model. Material records follow Body, Reinforcement, Panel and Lining, with Face and Backer attached to their owning part.

| Mammut published field | Normalization |
| --- | --- |
| Cut | Athletic and Tight → Fitted. Regular, Snow Sports Regular, Ski Regular and Climbing Regular → Regular. Relaxed and Ski Relaxed → Relaxed. Source wording is kept as evidence. |
| Weight | Published grams. Reference size remains unpublished when absent. |
| Main material, Reinforcement, Insert, Lining | Body, Reinforcement, Panel and Lining. Location-specific backing stays on its owner. Fiber percentages and explicitly recycled fibers are kept. |
| Main material (Denier), Water column, Breathability | Ordered denier, hydrostatic head in mm, and RET or MVTR with published units and bounds. |
| Main fabric name | A structured name or a description identifying the body/outer fabric. An unscoped technology mention leaves the named field unpublished. |
| Filling, Fill power, Fill weight | Published fill type, down ratio and power, and fill mass or location-specific synthetic density when published. |
| Variant originalPrice, price, color, size, inStock | List and sale price stored separately in USD. Cards and price sorting use list price. Variant stock is derived only from published combinations and flags. |
| Release year / season | Used only when explicitly published. An in-season stock flag does not give a release date. Merchandising labels such as New Style and New Colors Added stay in the source data. |

Use the saved US HTML crawl to reproduce the [Mammut dry-run report](mammut-import-v1.7.0.md). The local catalog loads `data/arcteryx-local.json` and `data/mammut-dry-run.json` in read-only mode. Run `RANGESET_LOCAL_CATALOG=1 pnpm dev`, or set that variable on both `pnpm build` and `pnpm start` for a production-mode local server. `pnpm crawl:mammut:dry-run` refreshes the dry run. Pass `--from-cache` to reprocess saved HTML. `crawler/mammut-import.ts --apply` is the separate transactional importer for new Mammut rows, after approval.

## Catalog cards and search

Every card uses the same 2×2 grid defined by `cardFields` in `lib/parameters/registry.ts`. Its order is Weight, Fit, Main fabric, Composition. A value without confirmed data uses an em dash. The grid never substitutes a different spec and omits waterproofing. Prices and product actions stay outside the grid.

| Cell | Selection and display |
| --- | --- |
| Weight | The published normalized item weight in grams, such as `505 g`. The heading explains that weighing sizes can differ by brand and Arc’teryx and Mammut typically omit the reference size. The card displays the weight value without a size suffix. |
| Fit | The published fit mapped through the table below. Unrecognized labels use an em dash. The original label and source evidence stay in the detail profile. |
| Main fabric | The first published Body fabric name in source order. If Body has no name, display its largest published fiber share, such as `Nylon 100%`. If neither exists, display an em dash. |
| Composition | The largest published share from one Body composition, with a published fabric-scope recycled percentage for that same Body record when available. Use source order to break a tie. The title gives the complete Body composition and any displayed recycled percentage. Lining, panels, unquantified claims, and garment-wide or face-only percentages do not supply a Body value. |

When multiple Body records exist, the composition from the named Body record takes priority. If that record has no published composition, use the first Body record with one. Percentages and units use the standard formatter. Fiber names, fit labels, and the recycled suffix use the glossary.

### Card fit mapping

| Normalized code | Arc’teryx labels | English | 简体中文 | 日本語 |
| --- | --- | --- | --- | --- |
| `next_to_skin` | Next to Skin, Next-to-skin | Next to Skin | 贴身版型 | 肌に沿うフィット |
| `fitted` | Fitted, Fitted Fit | Fitted | 修身版型 | フィット感のあるシルエット |
| `regular` | Regular, Regular Fit | Regular | 常规版型 | レギュラーフィット |
| `relaxed` | Relaxed, Relaxed Fit | Relaxed | 宽松版型 | リラックスフィット |
| `oversized` | Oversized, Oversized Fit | Oversized | 超宽松版型 | オーバーサイズ |

The mapping ignores case and normalizes hyphens and spacing. Search accepts published model numbers case-insensitively, including Arc’teryx short and full numbers and Mammut article numbers such as `1010-33030`. It first applies the normal token search. When no result matches, it may omit the whole qualifiers `hooded`, `hoodie`, and `hoody`, or normalize the possessive `jacket's` to `jacket`. On retry, an exact product name takes precedence over other token matches. Search does not apply fuzzy matching. See the [card coverage and verification report](catalog-cards-v1.5.0.md).

## Featured catalog sort

Featured is the default in all three languages. It ranks the current filtered and searched result set before pagination:

- **A:** at least three card values, with a release in one of the two latest distinct published seasons in the results.
- **B:** at least three card values, with an older or unpublished release season.
- **C:** at most two card values.
- **D:** explicitly sold out, or fewer than half of the reported size–color combinations are in stock. D takes precedence over all other tiers.

Unknown stock does not downgrade a product. A published value or an explicit N/A counts toward card completeness. The main-fabric composition fallback counts when shown. Within each tier, smooth weighted round-robin interleaves brands in proportion to their product counts. Brand queues use newest season first, same-season style families together, then name A–Z. Missing release seasons follow dated items within their tier and brand. Selecting Featured clears the sort URL parameter. Name, price and weight remain available.

See [the composite sort report](composite-sort-v1.6.0.md) for the algorithm and data rules.

## Evidence and review

Each fact carries the source URL, original field path and text, extraction method, and source update time when available. Evidence is retained internally for resolving conflicts and verifying data. Product detail and comparison pages omit evidence, source links, and raw source text from their parameter presentation. Existing raw payloads and indexed specs stay in their original storage.

- **Not published** means there is no usable published observation for an applicable field.
- **Not applicable** means the field does not apply to the product's construction or type.
- **Conflicting sources** means two published or recorded observations disagree.
- **Needs verification** means the text or value cannot be resolved reliably. Examples include multiple unpaired measurements and percentages over 100 within one fabric component.
- An explicit negative is displayed as **No**. A missing boolean stays unknown.

## Manual overrides

Existing `manual_overrides` entries apply after source extraction. A `parameters.<key>` entry takes precedence over legacy field aliases and survives refreshes because the adapter reads these entries without writing to them. A legacy product-level denier or fabric-weight override attaches to the sole main fabric when identifiable. With multiple main fabrics it is flagged for review until an explicit structured override assigns the correct part.

Example value for `parameters.weight`:

```json
{"value":0.455,"unit":"kg","reference":{"size":"M","gender":"men"},"updatedAt":"2026-11-20"}
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

The Weight row includes the reference size when published. Unpublished sizes are flagged once under the comparison row heading. Published sizes must agree when both are known.

## Coverage limits

Weight reference sizes, down fill mass, and test conditions are often absent. Fill-power values keep their published number with units and methods withheld when the source does not identify them. Broad construction claims and treatment labels do not establish a temperature rating or absence of PFAS. Brand-labelled fabric, dyeing, and assembly locations remain distinct. Unclear material text and otherwise unmapped feature statements remain available in internal records.

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
| `fit` | Fit | text | — | apparel | exact |
| `back_length` | Centre back length | number | cm | upper | measurement |
| `inseam` | Inseam | number | cm | bottom | measurement |
| `sizes` | Available sizes | list | — | all | set |
| `colors` | Colorways | number | — | all | exact |

### Main fabric

Published material records are organized as **Body**, **Reinforcement**, **Panel**, then **Lining**. The source label and original text remain in the evidence. Face and Backer are layers of an identified part. Contrast panels and explicit inserts map to Panel, reinforced inserts to Reinforcement, and a secondary layer explicitly described as a lining maps to Lining. A bare “Secondary” or a material name with no supported location is preserved internally as `needs_review`. A product with only Body omits the Body heading on the detail page.

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

Waterproof ratings and breathability keep their published units and qualifiers. Confirm a matching test method and reporting convention before comparing readings.

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

### Internal review fields

These fields support internal data review. They are excluded from detail and comparison pages.

| Key | Field | Type | Standard unit | Applies to | Compare |
| --- | --- | --- | --- | --- | --- |
| `source_notes` | Supplemental material text | list | — | all | set |
| `fabric_issues` | Unassigned material | list | — | all | set |
| `feature_notes` | Other published features | list | — | all | set |


## Changelog

- **v1.7.0** adds the Rangeset taxonomy, shared brand adapters and a Mammut US dry run.

- **v1.6.0** introduces Featured as the default catalog sort and removes the source controls, source links, and original source text from product detail and comparison views. Evidence remains available internally for conflict handling and data verification.
