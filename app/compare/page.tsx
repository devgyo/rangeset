import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { JacketSpec } from "@/components/spec-value";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getJacket } from "@/lib/jackets";
import { fields } from "@/lib/specs";
import type { Jacket } from "@/lib/types";

export const metadata: Metadata = {
  title: "Compare jackets",
  description: "Compare up to four hardshell jackets side by side.",
  robots: { index: false, follow: true },
};

function readComparison(ids: string | string[] | undefined): Jacket[] | null {
  if (typeof ids !== "string") return null;
  const slugs = [...new Set(ids.split(",").map((id) => id.trim()))];
  if (slugs.length < 2 || slugs.length > 4) return null;

  const jackets = slugs.map(getJacket);
  return jackets.every((jacket) => jacket !== undefined) ? jackets : null;
}

export default async function ComparePage({ searchParams }: PageProps<"/compare">) {
  const { ids } = await searchParams;
  const jackets = readComparison(ids);

  return (
    <div className="site-width page-space">
      <Link href="/jackets" className="back-link"><ArrowLeft size={15} aria-hidden="true" /> Jacket index</Link>
      <h1 className="page-title mt-7 mb-8">Compare jackets</h1>
      {jackets ? (
        <div className="data-panel">
          <Table aria-label="Side-by-side jacket comparison" scrollLabel="Scrollable comparison table" className="spec-table compare-table">
            <TableHeader>
              <TableRow>
                <TableHead scope="col" className="sticky-cell">Specification</TableHead>
                {jackets.map((jacket) => (
                  <TableHead key={jacket.slug} scope="col" className="h-auto py-4">
                    <span className="block text-xs text-muted-foreground">{jacket.brand}</span>
                    <Link href={`/jackets/${jacket.slug}`} className="spec-link text-base">{jacket.model}</Link>
                    {jacket.example && <Badge variant="outline" className="example-badge mt-1.5 flex w-fit">Example data</Badge>}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((field) => (
                <TableRow key={field.key}>
                  <TableHead scope="row" className="sticky-cell py-3">{field.label}</TableHead>
                  {jackets.map((jacket) => (
                    <TableCell key={jacket.slug}><JacketSpec specs={jacket.specs} field={field} /></TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <Card className="data-card max-w-lg">
          <CardContent>
            <p className="mb-4 text-muted-foreground">
              {ids ? "This link needs 2–4 jackets from the index." : "Select 2–4 jackets in the index to start a comparison."}
            </p>
            <Button asChild><Link href="/jackets">Choose jackets</Link></Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
