# Rangeset catalog scope v1.4.0

## Inventory

A read-only inventory matched 34 of 453 active product records. Every match had the Footwear category. Their normalized product types were 24 shoes and 10 boots. The matched names and types were reviewed against the catalog records to check for clothing. The 34 product slugs are listed in [the retirement inventory](footwear-offline-v1.4.0.csv).

The code allowlist gates the original database reads before the catalog, home, search, detail, comparison, and sitemap use the records. The filter also checks normalized product type when the category is a clothing category. The existing raw records, indexed facts, manual overrides, schema, and ingestion jobs were untouched.

## Remaining categories

| Category | Items |
| --- | ---: |
| Shell Jackets | 113 |
| Insulated Jackets | 81 |
| Pants | 73 |
| Shirts and Tops | 66 |
| Fleece | 35 |
| Base Layer | 21 |
| Professional Use | 15 |
| Shorts | 10 |
| Dresses and Skirts | 5 |
| **Total** | **419** |

Professional Use retains one backpack (Alpha PRO 50 Backpack) and one accessory (PRO Backpack Lid Replacement). The inventory contained zero gloves, mittens, hats, caps, or beanies. These counts include the two retained non-clothing records, leaving 417 apparel records.

## Changes

- `lib/catalog-scope.ts`, `lib/catalog.ts`, and `lib/arcteryx-view.ts` enforce and use the category allowlist. The existing sitemap consumes the same filtered catalog reads.
- `lib/parameters/classification.ts` identifies stored footwear types for exclusion. `lib/parameters/registry.ts`, `model.ts`, `arcteryx.ts`, and `fabric.ts` remove footwear-only parameters, extraction, and help while preserving garment weights, reference sizes, lining, and measurements.
- `lib/comparison.ts`, `app/[locale]/compare/page.tsx`, and `components/catalog/compare-selection.tsx` filter old selections and exclude retired IDs before applying the four-product limit. `app/[locale]/products/[slug]/page.tsx` uses the same public lookup for both metadata and content.
- `components/catalog/parameter-table.tsx`, `i18n/copy.ts`, the three `messages/*.json` files, `docs/i18n/`, and `scripts/i18n-check` remove footwear presentation and 30 message keys.
- `lib/tests/catalog-scope.test.ts` and `lib/tests/catalog-routes.test.ts` cover the category policy and localized routes. Existing apparel and parameter tests were updated, along with [the parameter standard](product-parameters.md).

## Verification

- English, Simplified Chinese, and Japanese catalogs, search results, and home category navigation expose only the retained products.
- Konseal GTX Shoe returns HTTP 404 in all three languages, with no redirect, product alternates, structured data, or OG product image. Beta AR Jacket and Adze Pant – Walk Gently still return HTTP 200.
- Comparisons accept clothing IDs after retiring footwear IDs, including when shoes occur first in the input. All-footwear links show the localized empty state.
- The sitemap contains none of the 34 retired slugs. Lint, the glossary check, all 49 tests, and builds with and without a database connection passed. Route tests run with `TEST_SITE_URL` pointed at a local database-backed server.
