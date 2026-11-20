import Image from "next/image";
import { ImageOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { genderLabel, type CatalogCard, type ColorSwatch } from "@/lib/arcteryx-view";
import { cn } from "@/lib/utils";

export function ProductImage({ src, alt = "", sizes, eager, studio = true, fit = "cover", className }: {
  src: string | null; alt?: string; sizes: string; eager?: boolean; studio?: boolean; fit?: "cover" | "contain"; className?: string;
}) {
  return (
    <div className={cn("image-stage relative overflow-hidden", studio && "studio-stage", className)}>
      {src ? <Image src={src} alt={alt} fill unoptimized sizes={sizes} loading={eager ? "eager" : "lazy"} className={fit === "contain" ? "object-contain" : "object-cover"} />
        : <div className="grid h-full place-items-center text-[#73736d]" aria-hidden="true"><ImageOff size={20} /></div>}
    </div>
  );
}

export function GenderPill({ gender }: { gender: CatalogCard["gender"] }) {
  return <span className="gender-pill">{genderLabel(gender)}</span>;
}

export function ProductBadges({ product }: { product: Pick<CatalogCard, "veilance" | "example" | "status"> }) {
  return (
    <>
      {product.veilance && <Badge variant="outline" className="rounded-sm">Veilance</Badge>}
      {product.status === "discontinued" && <Badge variant="outline" className="rounded-sm text-[#e8c3a6]">Discontinued</Badge>}
      {product.example && <Badge variant="outline" className="example-badge">Example data</Badge>}
    </>
  );
}

export function ColorDot({ color }: { color: ColorSwatch }) {
  return <span aria-hidden="true" className={cn("color-dot", !color.hex && "color-dot-empty")} style={color.hex ? { backgroundColor: color.hex } : undefined} />;
}
