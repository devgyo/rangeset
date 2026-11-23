"use client";

import {useState} from "react";
import {ImageOff} from "lucide-react";
import {arcCatalogImage} from "@/lib/arcteryx-packshot";
import {cn} from "@/lib/utils";

export function CatalogPackshot({source, eager, alt = "", highPriority, className, onSettled}: {
  source: string | null;
  eager: boolean;
  alt?: string;
  highPriority?: boolean;
  className?: string;
  onSettled?: () => void;
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);

  return <div className={cn("packshot-stage relative aspect-[4/5] overflow-hidden", className)}>
    {source && failedSource !== source ? (
      // The packshot endpoint already returns a lossless WebP.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={arcCatalogImage(source)} alt={alt} className="absolute inset-0 size-full object-contain"
        loading={eager ? "eager" : "lazy"} fetchPriority={highPriority ? "high" : undefined}
        decoding="async" ref={onSettled && ((image) => { if (image?.complete) onSettled(); })}
        onLoad={onSettled} onError={() => { setFailedSource(source); onSettled?.(); }} />
    ) : <div className="grid h-full place-items-center text-[#73736d]" aria-hidden="true"><ImageOff size={20} /></div>}
  </div>;
}
