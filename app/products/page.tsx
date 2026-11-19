import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { catalogEnabled, listProducts } from "@/lib/catalog";
import { exampleJackets } from "@/lib/jackets";

export const metadata: Metadata = {
  title: "Product catalog",
  description: "Browse the Arc’teryx US catalog by product category.",
  alternates: { canonical: "/products" },
  robots: catalogEnabled ? undefined : { index: false, follow: true },
};

type Listing = Omit<Awaited<ReturnType<typeof listProducts>>[number], "url"> & { url: string | null; example?: boolean };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ category?: string | string[] }> }) {
  const { category } = await searchParams;
  const catalog: Listing[] = catalogEnabled ? await listProducts() : exampleJackets.map((jacket) => ({
    slug: jacket.slug, brand: jacket.brand, name: jacket.model, category: "Hardshell jackets",
    gender: null, url: jacket.sourceUrl, status: "active", isHardshell: true, example: true,
  }));
  const categories = [...new Set(catalog.flatMap((item) => item.category ? [item.category] : []))].sort((a, b) => a.localeCompare(b));
  const selected = typeof category === "string" && categories.includes(category) ? category : "";
  const visible = selected ? catalog.filter((item) => item.category === selected) : catalog;

  return (
    <div className="site-width page-space">
      <h1 className="page-title">Product catalog</h1>
      <p className="mt-3 text-muted-foreground">{catalogEnabled ? "Browse the Arc’teryx US catalog by category." : "Showing example products."}</p>
      <form action="/products" className="my-6 flex flex-wrap items-end gap-3">
        <div className="grid gap-2">
          <label htmlFor="product-category" className="control-label">Category</label>
          <select id="product-category" name="category" defaultValue={selected} className="h-10 max-w-full rounded-lg border border-input bg-card px-2 text-sm">
            <option value="">All categories</option>
            {categories.map((label) => <option key={label}>{label}</option>)}
          </select>
        </div>
        <Button type="submit" className="h-10">Apply filter</Button>
      </form>
      {visible.length ? (
        <div className="data-panel">
          <Table aria-label="Products" scrollLabel="Scrollable product catalog" className="spec-table">
            <TableHeader><TableRow>
              <TableHead scope="col">Product</TableHead>
              <TableHead scope="col">Category</TableHead>
              <TableHead scope="col">Gender</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {visible.map((item) => (
                <TableRow key={item.slug}>
                  <TableHead scope="row" className="h-auto py-3 whitespace-normal">
                    <span className="block pb-1 text-xs text-muted-foreground">{item.brand}</span>
                    {item.isHardshell ? <Link className="spec-link" href={`/jackets/${item.slug}`}>{item.name}</Link>
                      : item.url ? <a className="spec-link" href={item.url}>{item.name}</a> : item.name}
                    {item.status === "discontinued" && <Badge variant="outline" className="ml-2">Discontinued</Badge>}
                    {item.example && <Badge variant="outline" className="example-badge ml-2">Example data</Badge>}
                  </TableHead>
                  <TableCell>{item.category ?? "Not published"}</TableCell>
                  <TableCell className="capitalize">{item.gender ?? "Not published"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : <p className="text-muted-foreground">No products in the catalog yet.</p>}
      <p className="mt-3 font-mono text-xs text-muted-foreground">{visible.length} {visible.length === 1 ? "product" : "products"}</p>
    </div>
  );
}
