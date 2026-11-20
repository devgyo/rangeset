import {notFound} from "next/navigation";
import {CatalogPage, catalogMetadata} from "@/components/catalog/catalog-page";
import {taxonomyGroup} from "@/lib/taxonomy";

type Props = PageProps<"/[locale]/products/category/[category]">;

export async function generateMetadata({params}: Props) {
  const {category} = await params;
  if (!taxonomyGroup(category)) notFound();
  return catalogMetadata(category);
}

export default async function CategoryPage({params, searchParams}: Props) {
  const [{category}] = await Promise.all([params, searchParams]);
  if (!taxonomyGroup(category)) notFound();
  return <CatalogPage category={category} />;
}
