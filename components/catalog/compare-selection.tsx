"use client";

import {Link, usePathname} from "@/i18n/navigation";
import {genderDisplay, useCopy} from "@/i18n/copy";
import { useMemo, useSyncExternalStore } from "react";
import { ArrowRight, Check, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/catalog/product-media";
import {taxonomyPath} from "@/lib/taxonomy";
import { comparisonHref } from "@/lib/comparison";
import {isCatalogProduct} from "@/lib/catalog-scope";
import {safeImage, type CatalogCard} from "@/lib/product-view";

const storageKey = "rangeset:comparison";
const listeners = new Set<() => void>();
let fallback = "";

export type PickedProduct = Pick<CatalogCard, "slug" | "name" | "image" | "category" | "gender" | "taxonomy">;

function snapshot() {
  try { return localStorage.getItem(storageKey) ?? ""; }
  catch { return fallback; }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => { listeners.delete(listener); window.removeEventListener("storage", listener); };
}

function decodeSelection(value: string): PickedProduct[] {
  try {
    const items: unknown = JSON.parse(value);
    if (!Array.isArray(items)) return [];
    return [...new Map(items.filter((item) => item && typeof item.slug === "string" && typeof item.name === "string" &&
      /^[a-z0-9-]+$/i.test(item.slug)).map((item) => [item.slug as string, {
      slug: item.slug, name: item.name,
      image: safeImage(item.image),
      category: typeof item.category === "string" ? item.category : null,
      gender: ["men", "women", "unisex"].includes(item.gender) ? item.gender : null,
    } as PickedProduct])).values()].filter((product) => /^mammut-\d{4}-\d{5}$/.test(product.slug) ||
      isCatalogProduct(product) && !/\b(?:backpack|pack) lid\b/i.test(product.name)).slice(0, 4);
  } catch { return []; }
}

export function rememberSelection(items: PickedProduct[]) {
  fallback = JSON.stringify(items.slice(0, 4).map(({ slug, name, image, category, gender }) =>
    ({ slug, name, image, category, gender })));
  try { localStorage.setItem(storageKey, fallback); } catch {}
  listeners.forEach((listener) => listener());
}

export function useCompareSelection() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => "");
  return useMemo(() => decodeSelection(raw), [raw]);
}

export function CompareButton({ product, compact = false }: { product: PickedProduct; compact?: boolean }) {
  const {t} = useCopy();
  const selection = useCompareSelection();
  const selected = selection.some(({ slug }) => slug === product.slug);
  const atLimit = !selected && selection.length >= 4;
  return (
    <Button type="button" variant={selected ? "secondary" : "outline"}
      className={compact ? "h-9 w-full justify-center" : "h-10 px-4"} disabled={atLimit}
      aria-label={t("ui.compare_action", {action: t(selected ? "ui.remove" : "ui.compare"), name: `${product.name} (${genderDisplay(t, product.gender)})`})}
      aria-pressed={selected} title={atLimit ? t("ui.compare_up_to_four_products") : undefined}
      onClick={() => {
        const current = decodeSelection(snapshot());
        rememberSelection(current.some(({ slug }) => slug === product.slug)
          ? current.filter(({ slug }) => slug !== product.slug) : [...current, product]);
      }}>
      {selected ? <Check aria-hidden="true" /> : <Plus aria-hidden="true" />}
      {t(selected ? "ui.added" : compact ? "ui.compare" : "ui.add_to_compare")}
    </Button>
  );
}

export function CompareDock() {
  const {t} = useCopy();
  const selection = useCompareSelection();
  const route = usePathname();
  if (!selection.length || (!route.startsWith("/products") && route !== "/jackets")) return null;
  const mixed = new Set(selection.map(({ category }) => category)).size > 1;
  return (
    <aside data-compare-dock aria-label={t("ui.compare_dock")} className="compare-dock">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex gap-1.5 overflow-x-auto px-0.5 py-1">
            {selection.map((product) => (
              <div key={product.slug} className="flex max-w-44 shrink-0 items-center gap-2 border border-border bg-card p-1">
                <ProductImage src={product.image} sizes="28px" className="size-7 shrink-0" />
                <Link href={`/products/${product.slug}`} className="truncate text-xs hover:text-primary" title={product.name}>
                  {product.name} <span className="sr-only">{genderDisplay(t, product.gender)}</span>
                </Link>
                <button type="button" aria-label={t("ui.compare_action", {action: t("ui.remove"), name: `${product.name} (${genderDisplay(t, product.gender)})`})}
                  className="grid size-7 shrink-0 place-items-center hover:text-primary"
                  onClick={() => rememberSelection(selection.filter(({ slug }) => slug !== product.slug))}>
                  <X size={14} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
          {mixed && <p className="mt-1 text-xs text-muted-foreground">{t("ui.mixed_categories_·_some_parameters_may_n")}</p>}
        </div>
        <div className="ml-auto flex shrink-0 gap-1.5">
          <Button type="button" variant="ghost" className="h-9" onClick={() => rememberSelection([])}>{t("ui.clear")}</Button>
          {selection.length < 2 ? <Button className="h-9" disabled>{t("ui.compare_count", {count: 1})}</Button> :
            <Button asChild className="h-9"><Link href={comparisonHref(selection.map(({ slug }) => slug))}>{t("ui.compare_count", {count: selection.length})} <ArrowRight aria-hidden="true" /></Link></Button>}
        </div>
      </div>
    </aside>
  );
}

export function CatalogNav() {
  const {t} = useCopy();
  const selection = useCompareSelection();
  const route = usePathname();
  const links = [
    { label: "ui.nav_catalog", href: "/products", active: route.startsWith("/products") },
    { label: "ui.compare", href: comparisonHref(selection.map(({ slug }) => slug)), active: route === "/compare" },
    { label: "ui.nav_hardshells", href: taxonomyPath("hardshell-jackets"), active: route === taxonomyPath("hardshell-jackets") },
  ];
  return <nav aria-label={t("ui.navigation")} className="flex items-center gap-2.5 sm:gap-6">
    {links.map(({ label, href, active }) => (
      <Link key={label} className="nav-link" href={href} aria-current={active ? "page" : undefined}>
        {t(label)}
        {label === "ui.compare" && selection.length > 0 &&
          <span className="ml-1 rounded-sm bg-primary px-1 text-[0.625rem] text-primary-foreground">{selection.length}</span>}
      </Link>
    ))}
  </nav>;
}
