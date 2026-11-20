import Image from "next/image";
import { ImageOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {genderDisplay, useCopy} from "@/i18n/copy";
import type { CatalogCard, ColorSwatch } from "@/lib/product-view";
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
  const {t} = useCopy();
  return <span className="gender-pill">{genderDisplay(t, gender)}</span>;
}

export function ProductBadges({ product }: { product: Pick<CatalogCard, "veilance" | "example" | "status"> }) {
  const {t} = useCopy();
  return (
    <>
      {product.veilance && <Badge variant="outline" className="rounded-sm">{t("keep.veilance")}</Badge>}
      {product.status === "discontinued" && <Badge variant="outline" className="rounded-sm text-[#e8c3a6]">{t("ui.discontinued")}</Badge>}
      {product.example && <Badge variant="outline" className="example-badge">{t("ui.example_data")}</Badge>}
    </>
  );
}

export function ColorDot({ color }: { color: ColorSwatch }) {
  return <span aria-hidden="true" className={cn("color-dot", !color.hex && "color-dot-empty")} style={color.hex ? { backgroundColor: color.hex } : undefined} />;
}
