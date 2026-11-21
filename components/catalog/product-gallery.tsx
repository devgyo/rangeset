"use client";

import {keyedItems} from "./list-keys";
import {useCopy} from "@/i18n/ui-copy";
import {getImageProps} from "next/image";
import { useState } from "react";
import {preload} from "react-dom";
import { ColorDot, ProductImage } from "@/components/catalog/product-media";
import type { Colorway, Photo } from "@/lib/product-view";
import {cn} from "@/lib/utils";

// The gallery uses the full content width below lg, then the left column of the product grid.
const gallerySizes = "(min-width: 1530px) 43.7rem, (min-width: 1024px) calc(47.37vw - 1.58rem), (min-width: 320px) calc(90vw), calc(100vw - 2rem)";

export function ProductGallery({ name, colorways, hero, cutout }: {
  name: string; colorways: Colorway[]; hero: string | null; cutout: string | null;
}) {
  const {t} = useCopy();
  const [color, setColor] = useState(0);
  const [angle, setAngle] = useState(0);
  const selected = colorways[color];
  const fallback: Photo[] = [...new Set([cutout, hero])].flatMap((url) => url ? [{ url, label: name, height: "", size: "" }] : []);
  const photos = selected?.photos.length ? selected.photos : fallback;
  const active = photos[angle] ?? photos[0];
  const caption = [active?.height && t("ui.model_height", {height: active.height}), active?.size && t("ui.wearing_size", {size: active.size})].filter(Boolean).join(" · ");
  const studio = active?.url === cutout || (angle === 0 && Boolean(selected));
  const firstPhoto = color === 0 && angle === 0;
  const mainImage = active && getImageProps({
    src: active.url, alt: active.label, fill: true, sizes: gallerySizes, loading: "eager",
    fetchPriority: firstPhoto ? "high" : undefined, className: "object-contain",
  }).props;

  if (mainImage && firstPhoto) {
    preload(mainImage.src, {
      as: "image", imageSrcSet: mainImage.srcSet, imageSizes: mainImage.sizes, fetchPriority: "high",
    });
  }

  return <div className="min-w-0">
    <figure>
      {mainImage ? (
        <div className={cn("image-stage relative overflow-hidden gallery-stage", studio && "studio-stage")}>
          {/* eslint-disable-next-line @next/next/no-img-element -- getImageProps supplies Next.js optimization. */}
          <img {...mainImage} alt={mainImage.alt} />
        </div>
      ) : <ProductImage src={null} studio={studio} className="gallery-stage" />}
      {caption && <figcaption className="border-x border-b bg-card px-3 py-2 text-xs text-muted-foreground">{caption}</figcaption>}
    </figure>
    {photos.length > 1 && <div className="gallery-angles" role="group" aria-label={t("ui.photo_angles")}>
      {photos.map((photo, index) => (
        <button type="button" key={photo.url} aria-label={photo.label} aria-pressed={index === angle}
          className="gallery-angle" onClick={() => setAngle(index)}>
          <ProductImage src={photo.url} studio={index === 0} className="aspect-[4/5]" />
        </button>
      ))}
    </div>}
    {colorways.length > 0 && <div className="mt-3 border bg-card p-3.5">
      <p className="mb-2 text-sm"><span className="control-label mr-2">{t("ui.colorway")}</span>{selected?.label}</p>
      <div role="group" aria-label={t("ui.colorways")} className="flex flex-wrap gap-1.5">
        {keyedItems(colorways, ({label, hex, photos}) => JSON.stringify([label, hex, photos[0]?.url])).map(([key, item], index) => <button key={key} type="button" aria-label={item.label} aria-pressed={color === index}
          className="color-button" title={item.label} onClick={() => { setColor(index); setAngle(0); }}>
          <ColorDot color={item} />
        </button>)}
      </div>
    </div>}
  </div>;
}
