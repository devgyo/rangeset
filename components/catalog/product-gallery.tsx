"use client";

import { useState } from "react";
import { ColorDot, ProductImage } from "@/components/catalog/product-media";
import type { Colorway, Photo } from "@/lib/arcteryx-view";

export function ProductGallery({ name, colorways, hero, cutout }: {
  name: string; colorways: Colorway[]; hero: string | null; cutout: string | null;
}) {
  const [color, setColor] = useState(0);
  const [angle, setAngle] = useState(0);
  const selected = colorways[color];
  const fallback: Photo[] = [...new Set([cutout, hero])].flatMap((url) => url ? [{ url, label: name, height: "", size: "" }] : []);
  const photos = selected?.photos.length ? selected.photos : fallback;
  const active = photos[angle] ?? photos[0];
  const caption = [active?.height && `Model ${active.height}`, active?.size && `Wearing size ${active.size}`].filter(Boolean).join(" · ");

  return <div className="min-w-0">
    <figure>
      <ProductImage src={active?.url ?? null} alt={active?.label ?? ""} studio={active?.url === cutout || (angle === 0 && Boolean(selected))} eager
        sizes="(min-width: 1024px) 48vw, 90vw" fit="contain" className="gallery-stage" />
      {caption && <figcaption className="border-x border-b bg-card px-3 py-2 text-xs text-muted-foreground">{caption}</figcaption>}
    </figure>
    {photos.length > 1 && <div className="gallery-angles" role="group" aria-label="Photo angles">
      {photos.map((photo, index) => (
        <button type="button" key={photo.url} aria-label={photo.label} aria-pressed={index === angle}
          className="gallery-angle" onClick={() => setAngle(index)}>
          <ProductImage src={photo.url} studio={index === 0} sizes="64px" className="aspect-[4/5]" />
        </button>
      ))}
    </div>}
    {colorways.length > 0 && <div className="mt-3 border bg-card p-3.5">
      <p className="mb-2 text-sm"><span className="control-label mr-2">Colorway</span>{selected?.label}</p>
      <div role="group" aria-label="Colorways" className="flex flex-wrap gap-1.5">
        {colorways.map((item, index) => <button key={index} type="button" aria-label={item.label} aria-pressed={color === index}
          className="color-button" title={item.label} onClick={() => { setColor(index); setAngle(0); }}>
          <ColorDot color={item} />
        </button>)}
      </div>
    </div>}
  </div>;
}
