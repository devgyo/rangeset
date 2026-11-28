import {NextIntlClientProvider, type AbstractIntlMessages} from "next-intl";
import {getMessages} from "next-intl/server";
import type {ReactNode} from "react";
import parameterLookup from "@/messages/parameter-lookup.json";

const compareAction = ["ui.compare", "ui.remove", "ui.compare_action", "gender", "status.missing"];
const compareButton = [...compareAction, "ui.added", "ui.add_to_compare", "ui.compare_up_to_four_products"];
const about = ["ui.about"];
const comparisonNotes = Object.values(parameterLookup.notes).filter((key) => key.startsWith("ui."));

const scopes = {
  layout: [
    ...compareButton, ...about, "language", "ui.language", "ui.navigation", "ui.nav_catalog",
    "ui.nav_hardshells", "ui.compare_dock", "ui.compare_count", "ui.compare_selection_status", "ui.clear", "ui.mixed_categories_·_some_parameters_may_n",
  ],
  catalog: [
    ...compareButton, ...about, "taxonomy", "activity", "card", "fiber", "gender", "type", "protection",
    "symbol", "status", "keep.veilance", "field.brand", "field.model", "field.gender", "field.activities",
    "field.weight", "field.fit", "field.fiber_content", "field.product_type", "field.protection_type",
    "value.fit_next_to_skin", "value.fit_fitted", "value.fit_regular", "value.fit_relaxed", "value.fit_oversized",
    "ui.discontinued", "ui.example_data", "ui.view_product", "ui.color_count", "ui.key_specs",
    "ui.sort", "ui.sort_featured", "ui.sort_featured_help", "ui.sort_name", "ui.sort_price_asc", "ui.sort_price_desc",
    "ui.sort_weight", "ui.all", "ui.filter_men", "ui.filter_women", "ui.line", "ui.product_categories",
    "ui.subcategories", "ui.catalog_filters", "ui.search_catalog", "ui.family", "ui.loading_catalog_filters",
    "ui.catalog_done", "ui.catalog_active_filters", "ui.catalog_remove_filter",
    "ui.product_count", "ui.reset_filters", "ui.catalog_load_failed", "ui.catalog_retry",
    "ui.no_products_match_these_filters", "ui.catalog_search_hint", "ui.catalog_all_shown",
  ],
  gallery: ["ui.colorway", "ui.colorways", "ui.color_image_loading", "ui.color_image_failed", "ui.color_image_missing", "ui.color_image_showing", "ui.catalog_retry"],
  compare: [
    ...compareAction, ...about, "taxonomy", "field", "group", "help", "help_label", "status", "status_description",
    "symbol", "part", "subgroup", "note", "season", "cat", "fiber", "construction", "stretch", "value", "activity",
    "type", "protection", "wind", "insulation", "laminate", "keep.g/m²", "keep.dwr", "keep.recco", "keep.pfas", "keep.upf",
    "ui.legend", "ui.mainline", "ui.recycled_claim", "ui.recycled_fiber", "ui.virgin_fiber", "ui.fiber_share",
    "ui.scope_fabric", "ui.scope_face", "ui.scope_garment", "ui.scope_unknown", "ui.weight_reference",
    ...comparisonNotes, "ui.size", "ui.add_a_product", "ui.close_picker",
    "ui.search_products_to_compare", "ui.search_by_name_category_or_gender", "ui.no_matching_products", "ui.catalog_search_hint", "ui.compare_selection_status", "ui.compare_up_to_four_products",
    "ui.scroll_compare", "ui.comparison_table", "ui.specs", "ui.discontinued", "ui.example", "ui.view_on_brand_site",
    "ui.compare_key_differences", "ui.full_specifications", "ui.compare_scroll_left", "ui.compare_scroll_right",
    "ui.no_confirmed_differences_among_directly_", "ui.no_shared_published_specs", "ui.differences_only",
    "ui.highlight_differences", "ui.add_product", "ui.mixed_categories_·_some_parameters_may_n",
    "ui.add_one_more_product_to_compare_specs", "ui.select_two_to_four_products_to_compare", "ui.browse_catalog",
  ],
  jackets: [
    ...compareAction, "field", "group", "symbol", "ui.all", "ui.all_brands", "ui.all_membranes", "ui.all_layers",
    "ui.catalog_order", "ui.weight_asc", "ui.weight_desc", "ui.price_asc", "ui.price_desc", "ui.compare_count",
    "ui.sort", "ui.column_groups", "ui.specs", "ui.clear_selection", "ui.jackets_selected", "ui.jacket_specs",
    "ui.scroll_jackets", "ui.discontinued", "ui.example_data", "ui.no_jackets_match", "ui.no_jackets",
    "ui.jacket_count", "ui.size", "ui.weight_size_missing", "ui.test_method_missing",
  ],
} as const;

export function selectClientMessages(messages: AbstractIntlMessages, scope: keyof typeof scopes): AbstractIntlMessages {
  const selected: AbstractIntlMessages = {};
  for (const entry of scopes[scope]) {
    const [namespace, key] = entry.split(".");
    const records = messages[namespace];
    if (typeof records !== "object" || records === null) continue;
    if (key === undefined) {
      selected[namespace] = {...records};
    } else if (Object.hasOwn(records, key)) {
      const current = selected[namespace];
      selected[namespace] = {...(typeof current === "object" ? current : {}), [key]: records[key]};
    }
  }
  return selected;
}

export async function ClientMessages({scope, children}: {scope: keyof typeof scopes; children: ReactNode}) {
  return <NextIntlClientProvider messages={selectClientMessages(await getMessages(), scope)}>{children}</NextIntlClientProvider>;
}
