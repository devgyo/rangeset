# Rangeset catalog cards v1.5.0

## Coverage

The audit used the existing catalog through a read-only connection. It applied the published card selection rules to the 417 apparel products. The two retained Professional Use gear items use the same grid and are outside the apparel denominator.

| Cell | Populated | Missing | Coverage |
| --- | ---: | ---: | ---: |
| Weight | 415 | 2 | 99.5% |
| Fit | 416 | 1 | 99.8% |
| Main fabric | 407 | 10 | 97.6% |
| Composition | 392 | 25 | 94.0% |

Of the 407 main-fabric cells, 400 show a published Body fabric name and seven use the dominant Body fiber as the fallback. Six composition cells include a confirmed numeric recycled percentage for the same Body fabric. Missing or unconfirmed values render an em dash.

## Fit mapping

| Arc’teryx label | Standard code | EN | 简体中文 | 日本語 | Products |
| --- | --- | --- | --- | --- | ---: |
| Next to Skin, Next-to-skin | `next_to_skin` | Next to Skin | 贴身版型 | 肌に沿うフィット | 12 |
| Fitted, Fitted Fit | `fitted` | Fitted | 修身版型 | フィット感のあるシルエット | 91 |
| Regular, Regular Fit | `regular` | Regular | 常规版型 | レギュラーフィット | 225 |
| Relaxed, Relaxed Fit | `relaxed` | Relaxed | 宽松版型 | リラックスフィット | 81 |
| Oversized, Oversized Fit | `oversized` | Oversized | 超宽松版型 | オーバーサイズ | 7 |

The brand label and evidence are retained in the detail profile. The card mapping is specified in the [parameter standard](product-parameters.md).

## Changed files

- `lib/parameters/registry.ts` and `lib/parameters/card.ts` define the four slots, fit mapping, and selection of published Body values. `lib/parameters/model.ts` shares the existing number formatter with card copy.
- `lib/catalog.ts` supplies a compact, normalized card projection. `lib/arcteryx-view.ts` removes the previous category-specific card metrics.
- `lib/catalog-search.ts` resolves exact model numbers from slugs and retries only the specified qualifiers when literal search yields no results.
- `components/catalog/catalog-browser.tsx` and `i18n/copy.ts` render the localized grid, weight help and full titles. The glossary, review list, and all three message files include the added wording.
- `lib/tests/catalog-cards.test.ts`, `lib/tests/catalog-routes.test.ts`, and existing catalog tests cover the new product rules.
- `docs/product-parameters.md` defines the v1.5.0 card and search rules.

No schema changes or production database writes were made.

## Browser verification

In each of the three languages, the Beta Insulated Jacket, Beta Jacket, Adze Pant – Walk Gently, Cormac Crew Neck Shirt SS, and Kyanite Jacket showed the same four cells in the same 2×2 layout at 390 px. The page had no horizontal overflow. The Weight help opened and dismissed with Escape. Adze Pant's composition cell shows the dominant fiber and its title includes the complete Body blend.

| Search | English, Simplified Chinese, Japanese |
| --- | --- |
| `9524` | Ifora Jacket only |
| `X000009524` | Ifora Jacket only |
| `x000009524` | Ifora Jacket only |
| `Ifora Hooded Jacket` | Ifora Jacket only |
| `Ifora jacket's` | Ifora Jacket only |

The validated record is `arcteryx-womens-ifora-jacket-9524-x000009524`. Its card shows 505 g in every locale. The regression test includes Ifora Down Jacket to verify that the retry gives precedence to the exact remaining product name.
