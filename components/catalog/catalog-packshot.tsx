"use client";

import {useState} from "react";
import {ImageOff} from "lucide-react";
import {arcCatalogImage} from "@/lib/arcteryx-packshot";

export function CatalogPackshot({source, eager}: {source: string | null; eager: boolean}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);

  return <div className="packshot-stage relative aspect-[4/5] overflow-hidden">
    {source && failedSource !== source ? (
      // The packshot endpoint already returns a lossless, card-sized WebP.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={arcCatalogImage(source)} alt="" className="absolute inset-0 size-full object-contain"
        loading={eager ? "eager" : "lazy"} decoding="async" onError={() => setFailedSource(source)} />
    ) : <div className="grid h-full place-items-center text-[#73736d]" aria-hidden="true"><ImageOff size={20} /></div>}
  </div>;
}
