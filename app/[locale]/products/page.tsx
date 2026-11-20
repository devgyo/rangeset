import {CatalogPage, catalogMetadata} from "@/components/catalog/catalog-page";

export async function generateMetadata() {
  return catalogMetadata();
}

export default async function ProductsPage({searchParams}: PageProps<"/[locale]/products">) {
  await searchParams;
  return <CatalogPage />;
}
