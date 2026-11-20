import {sql} from "drizzle-orm";
import {brands, productRaw, products} from "../db/schema";

// Arc'teryx archives include galleries and other large fields that catalog cards do not use.
const raw = productRaw.payload;
const classificationPayload = sql<Record<string, unknown>>`jsonb_build_object(
  'marketingName', ${raw}->'marketingName', 'productType', ${raw}->'productType',
  'category', ${raw}->'category', 'subCategory', ${raw}->'subCategory', 'isPro', ${raw}->'isPro'
)`;
const cardPayload = sql<Record<string, unknown>>`jsonb_build_object(
  'image', ${raw} #>> '{colourOptions,0,image,url}',
  'mainImage', jsonb_build_object('url', ${raw} #>> '{mainImage,url}'),
  'colourOptions', (select jsonb_agg(jsonb_build_object('label', colour->'label', 'hexCode', colour->'hexCode') order by position)
    from jsonb_array_elements(case when jsonb_typeof(${raw}->'colourOptions') = 'array' then ${raw}->'colourOptions' else '[]'::jsonb end)
    with ordinality as colors(colour, position)),
  'activities', ${raw}->'activities',
  'veilance', jsonb_path_exists(${raw}, '$.breadcrumbs[*] ? (@.label like_regex "^Veilance$" flag "i" || @.url like_regex "(^|/)veilance(/|$)" flag "i")'),
  'shortDescription', left(${raw}->>'shortDescription', 6000),
  'weight', ${raw}->'weight', 'price', ${raw}->'price', 'currencyCode', ${raw}->'currencyCode', 'isUnisex', ${raw}->'isUnisex',
  'features', case when ${products.category} = 'Insulated Jackets' then
    jsonb_path_query_array(${raw}, '$.features[*] ? (@.label like_regex "insulation|construction" flag "i")') end,
  'materials', case when ${products.category} = 'Insulated Jackets' then
    jsonb_path_query_array(${raw}, '$.materials[*] ? (@ like_regex "down|insulation|coreloft|primaloft|octa|climashield|polartec alpha" flag "i")') end
) || ${classificationPayload}`;

const catalogCardPayload = sql<Record<string, unknown>>`${cardPayload} || jsonb_build_object(
  'materials', ${raw}->'materials', 'fit', ${raw}->'fit',
  'origYear', ${raw}->'origYear', 'origSeason', ${raw}->'origSeason'
)`;

const taxonomyPayload = sql<Record<string, unknown>>`jsonb_build_object(
  'description', ${raw}->'description', 'materials', ${raw}->'materials', 'features', ${raw}->'features'
)`;

export function storedBrandPayload(mode: "none" | "card" | "detail") {
  return {
    payload: mode === "detail" ? raw : sql`case when ${brands.slug} = 'arcteryx' then ${mode === "card" ? catalogCardPayload : classificationPayload}
      else ${raw} end`,
    taxonomyPayload: mode === "card" ? sql`case when ${brands.slug} = 'arcteryx' then ${taxonomyPayload} end` : sql`null`,
  };
}
