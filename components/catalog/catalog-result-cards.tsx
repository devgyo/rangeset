"use client";

import {CatalogCardView} from "./catalog-card-view";
import type {CatalogListing} from "@/lib/catalog";

export default function CatalogResultCards({products}: {products: CatalogListing[]}) {
  return products.map((product, index) => <CatalogCardView key={product.slug} product={product} eager={index < 2} />);
}
