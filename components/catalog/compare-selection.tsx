"use client";

import {Link, usePathname} from "@/i18n/navigation";
import {genderDisplay, useCopy} from "@/i18n/ui-copy";
import { useMemo, useSyncExternalStore } from "react";
import { Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import {taxonomyPath} from "@/lib/taxonomy";
import { comparisonHref } from "@/lib/comparison-href";
import {isCatalogProduct} from "@/lib/catalog-scope";
import {safeImage, type CatalogCard} from "@/lib/product-view";

const CompareDockPanel = dynamic(() => import("./compare-dock-panel"), {ssr: false});

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
  const selection = useCompareSelection();
  const route = usePathname();
  if (!selection.length || (!route.startsWith("/products") && route !== "/jackets")) return null;
  return <CompareDockPanel selection={selection} onChange={rememberSelection} />;
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
