"use client";

import {Link, usePathname} from "@/i18n/navigation";
import {genderDisplay, useCopy} from "@/i18n/ui-copy";
import { memo, useLayoutEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import CompareDockPanel from "./compare-dock-panel";
import {findCompareButton, neighborAfterRemoval} from "./compare-focus";
import {taxonomyPath} from "@/lib/taxonomy";
import { comparisonHref } from "@/lib/comparison-href";
import {catalogBrand, isCatalogProduct} from "@/lib/catalog-scope";
import {safeImage, type CatalogCard} from "@/lib/product-view";

const storageKey = "rangeset:comparison";
const listeners = new Set<() => void>();
let fallback = "";
let dockEntrancePath: string | undefined;
let lastAddButton: HTMLButtonElement | undefined;

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
      item.slug.startsWith(catalogBrand + "-") && /^[a-z0-9-]+$/i.test(item.slug)).map((item) => [item.slug as string, {
      slug: item.slug, name: item.name,
      image: safeImage(item.image),
      category: typeof item.category === "string" ? item.category : null,
      gender: ["men", "women", "unisex"].includes(item.gender) ? item.gender : null,
    } as PickedProduct])).values()].filter((product) => isCatalogProduct(product)).slice(0, 4);
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

export const CompareButton = memo(function CompareButton({ slug, name, image, category, gender, compact = false }:
  Omit<PickedProduct, "taxonomy"> & { compact?: boolean }) {
  const {t} = useCopy();
  const selection = useCompareSelection();
  const selected = selection.some((product) => product.slug === slug);
  const atLimit = !selected && selection.length >= 4;
  return (
    <Button type="button" variant={selected ? "secondary" : "outline"}
      className={compact ? "h-9 w-full justify-center" : "h-10 px-4"} disabled={atLimit}
      aria-label={t("ui.compare_action", {action: t(selected ? "ui.remove" : "ui.compare"), name: `${name} (${genderDisplay(t, gender)})`})}
      data-compare-toggle={slug} aria-pressed={selected} aria-describedby={atLimit ? "catalog-compare-limit" : undefined}
      onClick={(event) => {
        const current = decodeSelection(snapshot());
        const alreadySelected = current.some((product) => product.slug === slug);
        if (!alreadySelected && current.length >= 4) return;
        dockEntrancePath = !current.length && event.detail > 0 ? location.pathname : undefined;
        if (!alreadySelected) lastAddButton = event.currentTarget;
        rememberSelection(alreadySelected
          ? current.filter((product) => product.slug !== slug) : [...current, {slug, name, image, category, gender}]);
      }}>
      {selected ? <Check aria-hidden="true" /> : <Plus aria-hidden="true" />}
      {t(selected ? "ui.added" : compact ? "ui.compare" : "ui.add_to_compare")}
    </Button>
  );
});

export function CompareDock() {
  const {t} = useCopy();
  const selection = useCompareSelection();
  const route = usePathname();
  const onCatalog = route === "/products" || route.startsWith("/products/") || route === "/jackets";
  const dock = useRef<HTMLElement>(null);
  const focusAfterChange = useRef<{trigger: HTMLElement; neighbor?: string; original?: string} | null>(null);
  const entrance = onCatalog && selection.length === 1 && typeof window !== "undefined" && dockEntrancePath === location.pathname;

  useLayoutEffect(() => {
    if (selection.length) dockEntrancePath = undefined;
    const change = focusAfterChange.current;
    if (!change) return;
    focusAfterChange.current = null;
    if (!onCatalog || (document.activeElement !== document.body && document.activeElement !== change.trigger)) return;

    const neighbor = change.neighbor && dock.current && findCompareButton(dock.current, "data-compare-remove", change.neighbor);
    const original = change.original && findCompareButton(document, "data-compare-toggle", change.original);
    const lastAdd = lastAddButton?.isConnected && lastAddButton;
    (neighbor || original || lastAdd || document.querySelector<HTMLElement>("[data-compare-nav]"))?.focus();
    if (!selection.length) lastAddButton = undefined;
  }, [onCatalog, selection]);

  function remove(slug: string | undefined, trigger: HTMLElement) {
    if (document.activeElement === trigger) {
      focusAfterChange.current = {
        trigger,
        neighbor: slug && neighborAfterRemoval(selection, slug),
        original: slug ?? lastAddButton?.getAttribute("data-compare-toggle") ?? selection[0]?.slug,
      };
    }
    rememberSelection(slug ? selection.filter((product) => product.slug !== slug) : []);
  }

  if (!onCatalog) return null;
  return <>
    <p className="sr-only" role="status">{t("ui.compare_selection_status", {count: selection.length})}</p>
    {selection.length > 0 && <CompareDockPanel dockRef={dock} selection={selection} entrance={entrance} onRemove={remove} />}
  </>;
}

export function CatalogNav() {
  const {t} = useCopy();
  const selection = useCompareSelection();
  const route = usePathname();
  const hardshells = taxonomyPath("hardshell-jackets");
  const inHardshells = route === hardshells || route.startsWith(hardshells + "/");
  const links = [
    { label: "ui.nav_catalog", href: "/products", active: !inHardshells && (route === "/products" || route.startsWith("/products/")) },
    { label: "ui.compare", href: comparisonHref(selection.map(({ slug }) => slug)), active: route === "/compare" || route.startsWith("/compare/") },
    { label: "ui.nav_hardshells", href: hardshells, active: inHardshells },
  ];
  return <nav aria-label={t("ui.navigation")} className="flex items-center gap-2.5 sm:gap-6">
    {links.map(({ label, href, active }) => (
      <Link key={label} className="nav-link" data-compare-nav={label === "ui.compare" ? "" : undefined} href={href} aria-current={active ? "page" : undefined}>
        {t(label)}
        {label === "ui.compare" && selection.length > 0 &&
          <span className="ml-1 rounded-sm bg-primary px-1 text-[0.625rem] text-primary-foreground">{selection.length}</span>}
      </Link>
    ))}
  </nav>;
}
