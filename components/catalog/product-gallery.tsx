"use client";

import {keyedItems} from "./list-keys";
import {useCopy} from "@/i18n/ui-copy";
import { useState } from "react";
import {preload} from "react-dom";
import { ColorDot, ProductImage } from "@/components/catalog/product-media";
import type { Colorway } from "@/lib/product-view";

export function ProductGallery({ name, colorways, cutout }: {
  name: string; colorways: Colorway[]; cutout: string | null;
}) {
  const {t} = useCopy();
  const [color, setColor] = useState(0);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const selected = colorways[color];
  const source = selected ? selected.image : cutout;
  const showImage = source && source !== failedSource;

  if (showImage && color === 0) preload(source, {as: "image", fetchPriority: "high"});

  return <div className="min-w-0">
    <figure>
      {showImage ? (
        <div className="image-stage studio-stage relative overflow-hidden gallery-stage">
          {/* eslint-disable-next-line @next/next/no-img-element -- The brand CDN serves the official packshot. */}
          <img src={source} alt={selected ? `${name} · ${selected.label}` : name} decoding="async"
            fetchPriority={color === 0 ? "high" : undefined} className="absolute inset-0 size-full object-contain"
            onError={() => setFailedSource(source)} />
        </div>
      ) : <ProductImage src={null} className="gallery-stage" />}
    </figure>
    {colorways.length > 0 && <div className="mt-3 border bg-card p-3.5">
      <p className="mb-2 text-sm"><span className="control-label mr-2">{t("ui.colorway")}</span>{selected?.label}</p>
      <div role="group" aria-label={t("ui.colorways")} className="flex flex-wrap gap-1.5">
        {keyedItems(colorways, ({label, hex, image}) => JSON.stringify([label, hex, image])).map(([key, item], index) => <button key={key} type="button" aria-label={item.label} aria-pressed={color === index}
          className="color-button" title={item.label} onClick={() => setColor(index)}>
          <ColorDot color={item} />
        </button>)}
      </div>
    </div>}
  </div>;
}
