# Arc’teryx fabric audit · v1.3.0

The audit ran the v1.2.0 and v1.3.0 adapters against the same 453 active Arc’teryx product records with a raw payload. It read the existing catalog, including stored overrides, and wrote no catalog data. A product counts once per field if at least one part or layer has a known value. The record columns count individual known part or layer values.

| Field | v1.2.0 products | v1.3.0 products | Coverage | v1.2.0 records | v1.3.0 records |
| --- | ---: | ---: | ---: | ---: | ---: |
| Fabric name | 452 | 439 | 96.9% | 803 | 729 |
| Composition | 407 | 401 | 88.5% | 770 | 765 |
| Fabric weight | 377 | 377 | 83.2% | 565 | 565 |
| Yarn denier | 247 | 250 | 55.2% | 347 | 350 |
| Recycled content (part/layer) | — | 187 | 41.3% | — | 229 |
| Construction | 302 | 295 | 65.1% | 401 | 394 |
| Stretch | — | 208 | 45.9% | — | 287 |
| Certifications | — | 8 | 1.8% | — | 8 |
| Fabric treatment | — | 2 | 0.4% | — | 2 |
| Garment recycled content | — | 0 | 0.0% | — | 0 |

Thirteen products have a numeric recycled percentage for a part or layer. The 187 total includes percentage-free recycled claims. No product had a qualifying whole-garment percentage or whole-garment claim in this snapshot.

## Yarn denier and Construction

The indexed `face_denier` column had **157** populated products. The v1.2.0 raw-text adapter already displayed denier for **247** products across all parts. v1.3.0 reaches **250** products and 350 part or layer observations. Body or its Face alone goes from **191 to 194** products. The supplied figure of 187 did not match these measured denier scopes. The product counts here use the full snapshot and the scopes stated above. Of the 250 products, 93 have no populated indexed `face_denier` value.

| Product newly showing denier under v1.3.0 | Part | Value | Evidence |
| --- | --- | --- | --- |
| [Squamish Hoody](https://rangeset.com/products/arcteryx-mens-squamish-hoody-0276-x000010276) | Body | 30D | The named Tyono fabric has an explicit 30D reading in the construction feature. |
| [Squamish Jacket](https://rangeset.com/products/arcteryx-mens-squamish-jacket-0284-x000010284) | Body | 30D | The named Tyono fabric has an explicit 30D reading in the construction feature. |
| [Squamish Hoody](https://rangeset.com/products/arcteryx-womens-squamish-hoody-0268-x000010268) | Body | 30D | The named Tyono fabric has an explicit 30D reading in the construction feature. |

Mionn Insulated Jacket already showed a 20D lining. The additional “20D Nylon lining” line is retained as corroboration on the existing 20D value.

Construction coverage moves from **302 to 295** products and from **401 to 394** part or layer observations. Twenty products lost their last Construction value and 13 gained one. The change follows the supported explicit terms, so generic fleece and mesh no longer count on their own, while explicit terms such as Grid fleece and Knit qualify.

<details>
<summary>Body or Face: 37 products with denier outside the legacy index</summary>

| Product | Slug | Published values by source label |
| --- | --- | --- |
| Alpha PRO 50 Backpack | `arcteryx-alpha-pro-50-backpack-0629-x000010629` | Lining 70D, Body 315D |
| Atom Hoody | `arcteryx-mens-atom-hoody-9556-x000009556` | Body 20D × 20D, Lining 20D |
| Atom Jacket | `arcteryx-mens-atom-jacket-9561-x000009561` | Body 20D × 20D, Lining 20D |
| Atom SV Hoody | `arcteryx-mens-atom-sv-hoody-9902-x000009902` | Body 30D × 30D, Lining 20D, Contrast 20D |
| Atom SV Jacket | `arcteryx-mens-atom-sv-jacket-9901-x000009901` | Body 30D × 30D, Lining 20D, Contrast 20D |
| Beta Insulated Jacket | `arcteryx-mens-beta-insulated-jacket-0866-x000010866` | Lining 20D, Body 40D × 70D |
| Beta SL Jacket | `arcteryx-mens-beta-sl-jacket-0553-x000010553` | Contrast 40D × 70D, Body 40D × 70D |
| Beta SL Jacket | `arcteryx-mens-beta-sl-jacket-0854-x000010854` | Contrast 40D × 70D, Body 40D × 70D |
| Cronin Insulated Overshirt | `arcteryx-mens-cronin-insulated-overshirt-0971-x000010971` | Body 70D × 160D, Lining 20D |
| Cusec Shirt LS | `arcteryx-mens-cusec-shirt-ls-0156-x000010156` | Body 30D |
| Diode Insulated Jacket | `arcteryx-mens-diode-insulated-jacket-0948-x000010948` | Lining 20D, Body 40D × 70D |
| Diode Insulated Jacket | `arcteryx-mens-diode-insulated-jacket-9108-x000009108` | Lining 20D, Body 40D × 70D |
| Field Jacket | `arcteryx-mens-field-jacket-9942-x000009942` | Body 75D × 150D |
| Monitor Down Coat | `arcteryx-mens-monitor-down-coat-0799-x000010799` | Lining 20D, Body 70D × 160D |
| Nuclei SV Parka | `arcteryx-mens-nuclei-sv-parka-9891-x000009891` | Lining 20D, Body 20D |
| Ski Guide Bib Pant | `arcteryx-mens-ski-guide-bib-pant-1170-x000011170` | Body 75D × 150D |
| Spere Insulated Jacket | `arcteryx-mens-spere-insulated-jacket-9110-x000009110` | Lining 20D, Body 40D × 70D |
| Squamish Hoody | `arcteryx-mens-squamish-hoody-0276-x000010276` | Body 30D |
| Squamish Jacket | `arcteryx-mens-squamish-jacket-0284-x000010284` | Body 30D |
| Altira Insulated Cropped Jacket | `arcteryx-womens-altira-insulated-cropped-jacket-0747-x000010747` | Lining 20D, Body 40D × 70D |
| Atom Hoody | `arcteryx-womens-atom-hoody-9452-x000009452` | Body 20D × 20D, Lining 20D |
| Atom Jacket | `arcteryx-womens-atom-jacket-9855-x000009855` | Body 20D × 20D, Lining 20D |
| Atom SV Hoody | `arcteryx-womens-atom-sv-hoody-9853-x000009853` | Body 30D × 30D, Lining 20D, Contrast 20D |
| Atom SV Jacket | `arcteryx-womens-atom-sv-jacket-9852-x000009852` | Body 30D × 30D, Lining 20D, Contrast 20D |
| Atom Vest | `arcteryx-womens-atom-vest-9507-x000009507` | Body 20D × 20D, Lining 20D |
| Beta Insulated Jacket | `arcteryx-womens-beta-insulated-jacket-0512-x000010512` | Lining 20D, Body 40D × 70D |
| Beta SL Jacket | `arcteryx-womens-beta-sl-jacket-0020-x000010020` | Body 40D × 70D |
| Beta SL Jacket | `arcteryx-womens-beta-sl-jacket-0881-x000010881` | Contrast 40D × 70D, Body 40D × 70D |
| Beta SL Skirt | `arcteryx-womens-beta-sl-skirt-0565-x000010565` | Body 40D × 70D |
| Clarkia Wide Leg Pant | `arcteryx-womens-clarkia-wide-leg-pant-0602-x000010602` | Body 70D × 160D |
| Diantric Shirt SS | `arcteryx-womens-diantric-shirt-ss-0157-x000010157` | Body 30D |
| Elec Insulated Jacket | `arcteryx-womens-elec-insulated-jacket-9512-x000009512` | Body 20D × 20D, Lining 20D |
| Leutia Pant | `arcteryx-womens-leutia-pant-0962-x000010962` | Contrast 50D, Body 70D × 160D |
| Naya Cropped Jacket | `arcteryx-womens-naya-cropped-jacket-0327-x000010327` | Body 40D × 70D |
| Nitra Trench Coat | `arcteryx-womens-nitra-trench-coat-0311-x000010311` | Body 40D × 70D |
| Ski Guide Bib Pant | `arcteryx-womens-ski-guide-bib-pant-1171-x000011171` | Body 75D × 150D |
| Squamish Hoody | `arcteryx-womens-squamish-hoody-0268-x000010268` | Body 30D |

</details>

<details>
<summary>Other parts or layers: 56 products with denier outside the legacy index</summary>

| Product | Slug | Published values by source label |
| --- | --- | --- |
| Atom SL Hoody | `arcteryx-mens-atom-sl-hoody-9560-x000009560` | Contrast 40D, Lining 20D |
| Atom SL Jacket | `arcteryx-mens-atom-sl-jacket-0282-x000010282` | Contrast 40D, Lining 20D |
| Atom Vest | `arcteryx-mens-atom-vest-9559-x000009559` | Contrast 40D, Lining 20D |
| Cerium Hoody | `arcteryx-mens-cerium-hoody-0521-x000010521` | Lining 10D × 20D |
| Cerium Jacket | `arcteryx-mens-cerium-jacket-0579-x000010579` | Lining 10D × 20D |
| Cerium Vest | `arcteryx-mens-cerium-vest-0531-x000010531` | Lining 10D × 20D |
| Cronin AR Hoody | `arcteryx-mens-cronin-ar-hoody-0699-x000010699` | Lining 20D |
| Demlo Insulated Jacket | `arcteryx-mens-demlo-insulated-jacket-0319-x000010319` | Lining 20D |
| Diode Insulated Bomber | `arcteryx-mens-diode-insulated-bomber-9876-x000009876` | Lining 20D |
| Diode MX Pant | `arcteryx-mens-diode-mx-pant-9124-x000009124` | Contrast 50D |
| Disomy Wool Pant | `arcteryx-mens-disomy-wool-pant-0800-x000010800` | Contrast 50D |
| Epsilon Down Hoody | `arcteryx-mens-epsilon-down-hoody-9895-x000009895` | Lining 20D |
| Gamma Jacket | `arcteryx-mens-gamma-jacket-0940-x000010940` | Contrast 50D |
| Gamma Lightweight Hoody | `arcteryx-mens-gamma-lightweight-hoody-0606-x000010606` | Contrast 70D |
| Gamma Lightweight Hoody | `arcteryx-mens-gamma-lightweight-hoody-0895-x000010895` | Contrast 50D |
| Gamma Lightweight Jacket | `arcteryx-mens-gamma-lightweight-jacket-0609-x000010609` | Contrast 70D |
| Indisce MX Blazer | `arcteryx-mens-indisce-mx-blazer-9946-x000009946` | Contrast 50D |
| Indisce MX Pant | `arcteryx-mens-indisce-mx-pant-9947-x000009947` | Contrast 50D |
| Konseal Insulated Jacket | `arcteryx-mens-konseal-insulated-jacket-0656-x000010656` | Lining 20D |
| Mionn Insulated Jacket | `arcteryx-mens-mionn-insulated-jacket-9116-x000009116` | Lining 20D |
| Mionn Insulated Overshirt | `arcteryx-mens-mionn-insulated-overshirt-9117-x000009117` | Lining 20D |
| Mionn Softshell Overshirt | `arcteryx-mens-mionn-softshell-overshirt-9303-x000009303` | Contrast 50D |
| Naroda Insulated Jacket | `arcteryx-mens-naroda-insulated-jacket-0673-x000010673` | Lining 20D |
| Naroda Insulated Vest | `arcteryx-mens-naroda-insulated-vest-0794-x000010794` | Lining 20D |
| Proton Hoody | `arcteryx-mens-proton-hoody-8436-x000008436` | Lining 20D |
| Sarya Wool Insulated Jacket | `arcteryx-mens-sarya-wool-insulated-jacket-0681-x000010681` | Lining 20D |
| Solano Hoody | `arcteryx-mens-solano-hoody-0950-x000010950` | Contrast 50D, Lining 20D |
| Solano Hoody | `arcteryx-mens-solano-hoody-9568-x000009568` | Lining 20D |
| Solano Jacket | `arcteryx-mens-solano-jacket-0896-x000010896` | Contrast 50D, Lining 20D |
| Thorium Hoody | `arcteryx-mens-thorium-hoody-0657-x000010657` | Lining 10D × 20D |
| Thorium Jacket | `arcteryx-mens-thorium-jacket-0695-x000010695` | Lining 10D × 20D |
| Voronoi Wool Jacket | `arcteryx-mens-voronoi-wool-jacket-1088-x000011088` | Contrast 50D, Lining 15D |
| Voronoi Wool Jacket | `arcteryx-mens-voronoi-wool-jacket-9959-x000009959` | Contrast 50D, Lining 15D |
| Mutton Insulated Jacket - Walk Gently | `arcteryx-mutton-insulated-jacket-walk-gently-0627-x000010627` | Lining 20D |
| Atom SL Hoody | `arcteryx-womens-atom-sl-hoody-9511-x000009511` | Contrast 40D, Lining 20D |
| Atom SL Jacket | `arcteryx-womens-atom-sl-jacket-9510-x000009510` | Contrast 40D, Lining 20D |
| Belfry Wool Jacket | `arcteryx-womens-belfry-wool-jacket-9772-x000009772` | Contrast 50D, Lining 15D |
| Cementis Wool Insulated Jacket | `arcteryx-womens-cementis-wool-insulated-jacket-0791-x000010791` | Lining 20D |
| Cerium Hoody | `arcteryx-womens-cerium-hoody-0554-x000010554` | Lining 10D × 20D |
| Cerium Jacket | `arcteryx-womens-cerium-jacket-0584-x000010584` | Lining 10D × 20D |
| Cerium Vest | `arcteryx-womens-cerium-vest-0556-x000010556` | Lining 10D × 20D |
| Clarkia AR Insulated Hoody | `arcteryx-womens-clarkia-ar-insulated-hoody-0746-x000010746` | Lining 20D |
| Corva Insulated Jacket | `arcteryx-womens-corva-insulated-jacket-0792-x000010792` | Lining 20D |
| Gamma Lightweight Hoody | `arcteryx-womens-gamma-lightweight-hoody-0924-x000010924` | Contrast 50D |
| Nia Pant | `arcteryx-womens-nia-pant-0963-x000010963` | Contrast 50D |
| Omineca Down Pant | `arcteryx-womens-omineca-down-pant-0742-x000010742` | Lining 20D |
| Omineca Short Jacket | `arcteryx-womens-omineca-short-jacket-0498-x000010498` | Lining 20D |
| Proton Heavyweight Hoody | `arcteryx-womens-proton-heavyweight-hoody-0588-x000010588` | Lining 20D |
| Proton Hoody | `arcteryx-womens-proton-hoody-9095-x000009095` | Lining 20D |
| Reane Wool Pant | `arcteryx-womens-reane-wool-pant-0789-x000010789` | Contrast 50D |
| Serin Wool Skirt | `arcteryx-womens-serin-wool-skirt-0786-x000010786` | Contrast 50D |
| Sonii SL Utility Short 10" | `arcteryx-womens-sonii-sl-utility-short-10-1122-x000011122` | Contrast 70D |
| Sonii Utility Vest | `arcteryx-womens-sonii-utility-vest-0266-x000010266` | Contrast 50D |
| Tecta Pant | `arcteryx-womens-tecta-pant-0788-x000010788` | Contrast 50D |
| Thorium Jacket | `arcteryx-womens-thorium-jacket-0546-x000010546` | Lining 10D × 20D |
| Thorium Vest | `arcteryx-womens-thorium-vest-0547-x000010547` | Lining 10D × 20D |

</details>

## Needs review

17 source observations require review. Seven composition observations combine percentages that exceed 100% when read as a single composition. They include possible repeated descriptions or mixed layer data, and remain unverified as a composition. Other rows are missing an unambiguous location. There are no separate `unverified` fabric-weight observations in this snapshot.

| Product | Reason | Original Arc’teryx source text |
| --- | --- | --- |
| [Covert Pullover Hoody](https://rangeset.com/products/arcteryx-mens-covert-pullover-hoody-0726-x000010726) | Composition exceeds 100% | Body:  Alpenex II - 100% Recycled Polyester Heather sweater look fleece, 340gsm -  100% Polyester |
| [Frame Polo Shirt LS](https://rangeset.com/products/arcteryx-mens-frame-polo-shirt-ls-x000007226) | Location unspecified | Merino / Nylon core spun jersey 16.5mn: 87% Wool, 13% Nylon - RWS Wool |
| [Frame Polo Shirt SS](https://rangeset.com/products/arcteryx-mens-frame-polo-shirt-ss-x000007208) | Location unspecified | Merino / Nylon core spun jersey 16.5mn: 87% Wool, 13% Nylon - RWS Wool |
| [Frame Shirt LS](https://rangeset.com/products/arcteryx-mens-frame-shirt-ls-x000007258) | Location unspecified | Merino / Nylon core spun jersey 16.5mn: 87% Wool, 13% Nylon - RWS Wool |
| [Frame Shirt SS](https://rangeset.com/products/arcteryx-mens-frame-shirt-ss-x000006361) | Location unspecified | Merino / Nylon core spun jersey 16.5mn: 87% Wool, 13% Nylon - RWS Wool |
| [Ionia Merino Wool Shirt SS](https://rangeset.com/products/arcteryx-mens-ionia-merino-wool-shirt-ss-x000006816) | Location unspecified | Merino / Nylon core spun jersey 16.5mn: 87% Wool, 13% Nylon - RWS Wool |
| [Norvan Softshell Jacket](https://rangeset.com/products/arcteryx-mens-norvan-softshell-jacket-0731-x000010731) | Composition exceeds 100% | Body: Recycled 20D Nylon Stretch Dissolvable Plain Weave Face with Recycled Poly Backer - 72% Nylon, 53% Wool, 28% Elastane, 47% Polyester Backing |
| [Norvan Softshell Pant](https://rangeset.com/products/arcteryx-mens-norvan-softshell-pant-0732-x000010732) | Composition exceeds 100% | Body: Recycled 20D Nylon Stretch Dissolvable Plain Weave Face with Recycled Poly Backer - 72% Nylon, 53% Wool, 28% Elastane, 47% Polyester Backing |
| [Secant Comp Short](https://rangeset.com/products/arcteryx-mens-secant-comp-short-x000007353) | Location unspecified | Stretch woven plain weave: 78% nylon, 22% elastane |
| [Secant Comp Short](https://rangeset.com/products/arcteryx-mens-secant-comp-short-x000007353) | Location unspecified | Lightweight stretch double weave with DWR: 87% Nylon, 13% Elastane |
| [Voronoi Wool Jacket](https://rangeset.com/products/arcteryx-mens-voronoi-wool-jacket-9959-x000009959) | Location unspecified | 288gsm wool-polyester blend |
| [Frame Crew Neck Shirt LS](https://rangeset.com/products/arcteryx-womens-frame-crew-neck-shirt-ls-x000006804) | Location unspecified | Merino / Nylon core spun jersey 16.5mn: 87% Wool, 13% Nylon - RWS Wool |
| [Frame Shirt SS](https://rangeset.com/products/arcteryx-womens-frame-shirt-ss-x000006198) | Location unspecified | Merino / Nylon core spun jersey 16.5mn: 87% Wool, 13% Nylon - RWS Wool |
| [Norvan Softshell Jacket](https://rangeset.com/products/arcteryx-womens-norvan-softshell-jacket-0577-x000010577) | Composition exceeds 100% | Body: Recycled 20D Nylon Stretch Dissolvable Plain Weave Face with Recycled Poly Backer - 72% Nylon, 53% Wool, 28% Elastane, 47% Polyester Backing |
| [Norvan Softshell Pant](https://rangeset.com/products/arcteryx-womens-norvan-softshell-pant-0612-x000010612) | Composition exceeds 100% | Body: Recycled 20D Nylon Stretch Dissolvable Plain Weave Face with Recycled Poly Backer - 72% Nylon, 53% Wool, 28% Elastane, 47% Polyester Backing |
| [Omineca Down Pant](https://rangeset.com/products/arcteryx-womens-omineca-down-pant-0742-x000010742) | Composition exceeds 100% | Body:  100% Recycled Nylon Mini Ripstop Mechanical Stretch, 47gsm, FC0 DWR - 100% Nylon |
| [Omineca Short Jacket](https://rangeset.com/products/arcteryx-womens-omineca-short-jacket-0498-x000010498) | Composition exceeds 100% | Body:  100% Recycled Nylon Mini Ripstop Mechanical Stretch, 47gsm, FC0 DWR - 100% Nylon |

## Scope decisions

The canonical parts are Body, Reinforcement, Panel, and Lining. An explicit insert or contrast panel maps to Panel. Reinforcement wording takes precedence for reinforced inserts. A secondary material explicitly labelled as a lining maps to Lining. Unqualified Secondary and unsupported location labels stay in the source evidence as `needs_review`.

Protection code was left as found. No Protection changes were applied or reverted, and no rating or breathability fields were added. The existing Backer data continues to be attached to its fabric as a layer. The audit and browser review used the existing Arc’teryx payloads.


## Files

- `lib/parameters/fabric.ts` contains the reusable textile parsers and unit conversion.
- `lib/parameters/arcteryx.ts` maps existing brand payloads and overrides to the new records.
- `lib/parameters/model.ts` and `lib/parameters/registry.ts` define field types, location order, formatting and comparison.
- `components/catalog/parameter-table.tsx` and `components/catalog/comparison-grid.tsx` render fabric parts, layers and value rows.
- `lib/tests/parameters.test.ts` covers the conversion, evidence, mapping and display rules.
- `docs/product-parameters.md` records the standard, and this report records the migration audit.

## Browser verification

- **Beta AR Jacket** shows Body at 136 g/m² and 100D, and Panel at 126 g/m² and 80D. Each has a Backer sublayer. The yarn-denier help and the original Contrast source text are accessible.
- **Adze Pant – Walk Gently** is the Adze record available in the catalog. The single Body block has no repeated heading. TerraTex™ shows 126 g/m² and 95% Nylon / 5% Elastane. The 98 g/m² fill appears under Insulation.
- **Konseal GTX Shoe** shows Leather under Lining. Composition and Fabric weight show dashes.
- **Three-product comparison** aligns Body fabric weight as 136 g/m², 126 g/m², and a dash. Panel and Lining get separate sections. All-unpublished rows are hidden and the matrix scrolls horizontally within its container at 390 px.
