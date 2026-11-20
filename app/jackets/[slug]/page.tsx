import { permanentRedirect } from "next/navigation";

export default async function JacketPage({ params }: PageProps<"/jackets/[slug]">) {
  permanentRedirect(`/products/${encodeURIComponent((await params).slug)}`);
}
