"use client";

import {keyedItems} from "./list-keys";
import {useCopy} from "@/i18n/ui-copy";
import {useEffect, useRef, useState} from "react";
import {ColorDot} from "@/components/catalog/product-media";
import {CatalogPackshot} from "./catalog-packshot";
import {arcCatalogImage} from "@/lib/arcteryx-packshot";
import type { Colorway } from "@/lib/product-view";

export function ProductGallery({ name, colorways, cutout }: {
  name: string; colorways: Colorway[]; cutout: string | null;
}) {
  const {t} = useCopy();
  const [choice, setChoice] = useState<{index: number; state: "ready" | "loading" | "failed" | "missing"}>({index: 0, state: colorways[0] && !colorways[0].image ? "missing" : "ready"});
  const [displayed, setDisplayed] = useState(0);
  const [imageVersion, setImageVersion] = useState(0);
  const [settledSource, setSettledSource] = useState<string | null>(null);
  const [imageSettled, setImageSettled] = useState(false);
  const attempt = useRef(0);
  const presented = colorways[displayed];
  const selected = colorways[choice.index];
  const source = presented ? presented.image : cutout;
  const firstImage = colorways[0]?.image;

  function selectColor(index: number) {
    const id = ++attempt.current;
    const requested = colorways[index].image;
    if (!requested) {
      setChoice({index, state: "missing"});
      return;
    }
    if (requested === settledSource) {
      setDisplayed(index);
      setChoice({index, state: "ready"});
      return;
    }

    const image = new Image();
    image.fetchPriority = "high";
    image.src = arcCatalogImage(requested);
    setChoice({index, state: "loading"});
    void image.decode().then(() => {
      if (attempt.current !== id) return;
      if (requested === source) setImageVersion(id);
      setDisplayed(index);
      setSettledSource(requested);
      setChoice({index, state: "ready"});
    }).catch(() => {
      if (attempt.current === id) setChoice({index, state: "failed"});
    });
  }

  useEffect(() => () => { attempt.current++; }, []);

  useEffect(() => {
    if (firstImage && !imageSettled) return;
    const {connection} = navigator as Navigator & {connection?: {saveData?: boolean; effectiveType?: string}};
    if (connection?.saveData || connection?.effectiveType?.endsWith("2g")) return;

    const remaining = [...new Set(colorways.slice(1).map(({image}) => image))]
      .filter((image): image is string => Boolean(image && image !== firstImage)).slice(0, 6);
    let stopped = false;
    function warmNext() {
      if (stopped) return;
      const next = remaining.shift();
      if (!next) return;
      const image = new Image();
      image.fetchPriority = "low";
      image.onload = image.onerror = warmNext;
      image.src = arcCatalogImage(next);
    }
    warmNext();
    warmNext();
    return () => { stopped = true; };
  }, [colorways, firstImage, imageSettled]);

  return <div className="min-w-0">
    <figure>
      <CatalogPackshot key={`${source}:${imageVersion}`} source={source} alt={presented ? `${name} · ${presented.label}` : name}
        eager highPriority className="gallery-stage" onSettled={(loaded) => {
          setImageSettled(true);
          if (loaded) setSettledSource(source);
          else {
            setSettledSource((current) => current === source ? null : current);
            setChoice((current) => current.index === displayed && current.state === "ready"
              ? {index: displayed, state: "failed"} : current);
          }
        }} />
    </figure>
    {colorways.length > 0 && <div className="mt-3 border bg-card p-3.5">
      <p className="mb-2 wrap-break-word text-sm"><span className="control-label mr-2">{t("ui.colorway")}</span>{selected?.label}</p>
      <div role="status" className="wrap-break-word text-xs text-muted-foreground">
        {selected && choice.state !== "ready" && <p className="mb-2">
          {t(choice.state === "loading" ? "ui.color_image_loading" : choice.state === "missing" ? "ui.color_image_missing" : "ui.color_image_failed", {color: selected.label})}
          {presented && source === settledSource && settledSource && <> {t("ui.color_image_showing", {color: presented.label})}</>}
        </p>}
      </div>
      {choice.state === "failed" && <button type="button" className="spec-link mb-2 min-h-8 text-sm" onClick={() => selectColor(choice.index)}>
        {t("ui.catalog_retry")}
      </button>}
      <div role="group" aria-label={t("ui.colorways")} className="flex flex-wrap gap-1.5">
        {keyedItems(colorways, ({label, hex, image}) => JSON.stringify([label, hex, image])).map(([key, item], index) => <button key={key} type="button" aria-label={item.label} aria-pressed={choice.index === index}
          className="color-button" title={item.label} onClick={() => selectColor(index)}>
          <ColorDot color={item} />
        </button>)}
      </div>
    </div>}
  </div>;
}
