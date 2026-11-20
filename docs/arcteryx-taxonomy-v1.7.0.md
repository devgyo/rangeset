# Arc’teryx taxonomy audit · v1.7.0

Source: locally saved Arc’teryx catalog snapshot from the v1.3.0 parameter audit. The runtime rules use the saved official materials and construction statements; the reference mapping primarily used tags.

- Stored rows: 453. Non-footwear reference rows: 419. Matched across snapshots: 419.
- Eligible: 418. Automatically classified: 412 / 418 (98.56%). Review: 6. Hidden from this reference scope: 1.
- Reference differences: 14. The reference includes the hidden pack lid, so automatic classification across all 419 reference rows is 98.33%.

- The body material identifies GORE-TEX on Altus, Decca, Fissile, Ifora, Sabre and Spere. Those models resolve to insulated shells when fixed fill is present.
- The published material tables identify Coreloft on Demlo, Diode and Mutton. Both Beta Insulated Jacket pages identify waterproof GORE-TEX in their body material and feature text.
- The pack lid is retained in the archived input and excluded from public category and product routes.

## Category counts

| Leaf or state | Products |
| --- | ---: |
| base.bottom | 7 |
| base.top | 14 |
| bottoms.hardshell | 23 |
| bottoms.insulated | 5 |
| bottoms.pants | 29 |
| bottoms.shorts | 10 |
| bottoms.skirt | 4 |
| bottoms.softshell | 16 |
| bottoms.tights | 3 |
| fleece | 34 |
| hidden | 1 |
| needs_review | 6 |
| onepiece.dress | 1 |
| onepiece.suit | 1 |
| outer.down | 14 |
| outer.hardshell | 59 |
| outer.insulated_shell | 30 |
| outer.softshell | 31 |
| outer.synthetic | 33 |
| outer.tailoring | 5 |
| outer.vest | 11 |
| outer.windshell | 15 |
| packs.backpack | 1 |
| tops | 66 |

## Reference differences

| Model | Gender | CSV | Runtime | Slug |
| --- | --- | --- | --- | --- |
| Altus Down Jacket | m | outer.down | outer.insulated_shell | arcteryx-mens-altus-down-jacket-9879-x000009879 |
| Beta Insulated Jacket | m | REVIEW:同款男女标签不一致（男款有 GTX，女款无） | outer.insulated_shell | arcteryx-mens-beta-insulated-jacket-0866-x000010866 |
| Beta Insulated Jacket | w | REVIEW:同款男女标签不一致（男款有 GTX，女款无） | outer.insulated_shell | arcteryx-womens-beta-insulated-jacket-0512-x000010512 |
| Decca Down Bomber | w | outer.down | outer.insulated_shell | arcteryx-womens-decca-down-bomber-9958-x000009958 |
| Decca Down Parka | w | outer.down | outer.insulated_shell | arcteryx-womens-decca-down-parka-9961-x000009961 |
| Demlo Insulated Jacket | m | REVIEW:保暖但未公布填充类型 | outer.synthetic | arcteryx-mens-demlo-insulated-jacket-0319-x000010319 |
| Diode Insulated Bomber | m | REVIEW:保暖但未公布填充类型 | outer.synthetic | arcteryx-mens-diode-insulated-bomber-9876-x000009876 |
| Fissile SV Down Jacket | m | outer.down | outer.insulated_shell | arcteryx-mens-fissile-sv-down-jacket-9886-x000009886 |
| Ifora Down Jacket | w | outer.down | outer.insulated_shell | arcteryx-womens-ifora-down-jacket-9874-x000009874 |
| Ifora Down Parka | w | outer.down | outer.insulated_shell | arcteryx-womens-ifora-down-parka-9875-x000009875 |
| Mutton Insulated Jacket - Walk Gently | u | REVIEW:保暖但未公布填充类型 | outer.synthetic | arcteryx-mutton-insulated-jacket-walk-gently-0627-x000010627 |
| Sabre Insulated Jacket | m | outer.synthetic | outer.insulated_shell | arcteryx-mens-sabre-insulated-jacket-9913-x000009913 |
| Spere Insulated Jacket | m | REVIEW:保暖但未公布填充类型 | outer.insulated_shell | arcteryx-mens-spere-insulated-jacket-9110-x000009110 |
| PRO Backpack Lid Replacement | u | packs.accessory | hidden | arcteryx-pro-backpack-lid-replacement-1030-x000011030 |

## Review queue

| Model | Gender | Reason | Slug |
| --- | --- | --- | --- |
| Rhoam Hybrid Jacket | men | Published waterproof and water-resistant construction statements disagree | arcteryx-mens-rhoam-hybrid-jacket-9572-x000009572 |
| Solano Hoody | men | Published waterproof and water-resistant construction statements disagree | arcteryx-mens-solano-hoody-0950-x000010950 |
| Solano Hoody | men | Published waterproof and water-resistant construction statements disagree | arcteryx-mens-solano-hoody-9568-x000009568 |
| Solano Jacket | men | Published waterproof and water-resistant construction statements disagree | arcteryx-mens-solano-jacket-0896-x000010896 |
| Asset Airshell Jacket | women | No conclusive body construction or garment type | arcteryx-womens-asset-airshell-jacket-9639-x000009639 |
| Rhoam Hybrid Jacket | women | Published waterproof and water-resistant construction statements disagree | arcteryx-womens-rhoam-hybrid-jacket-9562-x000009562 |
