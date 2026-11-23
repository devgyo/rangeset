"use client";

import {keyedItems} from "./list-keys";
import {useCopy} from "@/i18n/ui-copy";
import { useState } from "react";
import {ColorDot} from "@/components/catalog/product-media";
import {CatalogPackshot} from "./catalog-packshot";
import type { Colorway } from "@/lib/product-view";

export function ProductGallery({ name, colorways, cutout }: {
  name: string; colorways: Colorway[]; cutout: string | null;
}) {
  const {t} = useCopy();
  const [color, setColor] = useState(0);
  const selected = colorways[color];
  const source = selected ? selected.image : cutout;

  return <div className="min-w-0">
    <figure>
      <CatalogPackshot source={source} alt={selected ? `${name} · ${selected.label}` : name}
        eager highPriority={color === 0} className="gallery-stage" />
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
