import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JacketSpec } from "@/components/spec-value";
import { getJacket } from "@/lib/jackets";
import { fields, formatSpec, groups, notPublished } from "@/lib/specs";
import type { Spec } from "@/lib/types";

export async function generateMetadata({ params }: PageProps<"/jackets/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const jacket = await getJacket(slug);
  if (!jacket) notFound();

  return {
    title: `${jacket.brand} ${jacket.model}`,
    description: `${jacket.example ? "Example listing for" : "Hardshell jacket specs for"} the ${jacket.brand} ${jacket.model}. See construction, measurements, and features.`,
    alternates: { canonical: `/jackets/${jacket.slug}` },
    robots: jacket.example ? { index: false, follow: true } : undefined,
  };
}

function Provenance({ spec }: { spec?: Spec<string | number | boolean> }) {
  if (!spec || (spec.source === "not_published" && !spec.sourceUrl && !spec.verifiedAt)) return null;

  const source = { brand: "Brand", third_party: "Third party", manual: "Manual override", not_published: notPublished }[spec.source];

  return (
    <div className="mt-1 flex flex-wrap items-baseline gap-x-2 text-xs text-muted-foreground">
      {spec.sourceUrl ? <a className="spec-link" href={spec.sourceUrl}>{source} source</a> : <span>{source}</span>}
      {spec.verifiedAt && <time dateTime={spec.verifiedAt} className="font-mono">{spec.verifiedAt}</time>}
    </div>
  );
}

export default async function JacketPage({ params }: PageProps<"/jackets/[slug]">) {
  const { slug } = await params;
  const jacket = await getJacket(slug);
  if (!jacket) notFound();

  return (
    <article className="site-width page-space">
      <Link href="/jackets" className="back-link"><ArrowLeft size={15} aria-hidden="true" /> Jacket index</Link>
      <header className="mt-7 mb-8">
        <p className="control-label mb-2">{jacket.brand}</p>
        <h1 className="page-title">{jacket.model}</h1>
        {jacket.status === "discontinued" && <Badge variant="outline" className="mt-4">Discontinued</Badge>}
        {jacket.example && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="example-badge">Example data</Badge>
            <p className="text-sm text-muted-foreground">The product, specs, and source records are fictional.</p>
          </div>
        )}
      </header>
      <div className="grid gap-4 lg:grid-cols-3">
        {groups.map((group) => (
          <Card key={group} className="data-card gap-3 py-5">
            <CardHeader className="px-5"><CardTitle><h2>{group}</h2></CardTitle></CardHeader>
            <CardContent className="px-5">
              <dl>
                {fields.filter((field) => field.group === group).map((field) => (
                  <div key={field.key} className="detail-row">
                    <dt className="text-muted-foreground">{field.label}</dt>
                    <dd className="min-w-0">
                      <JacketSpec specs={jacket.specs} field={field} showWeightSize={false} />
                      <Provenance spec={jacket.specs[field.key]} />
                    </dd>
                  </div>
                ))}
                {group === "Numbers" && (
                  <div className="detail-row">
                    <dt className="text-muted-foreground">Weight reference size</dt>
                    <dd>
                      {formatSpec(jacket.specs.weightSize)}
                      <Provenance spec={jacket.specs.weightSize} />
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="data-card mt-4 gap-3 py-5">
        <CardHeader className="px-5"><CardTitle><h2>Source record</h2></CardTitle></CardHeader>
        <CardContent className="px-5">
          <dl>
            <div className="detail-row">
              <dt className="text-muted-foreground">Source URL</dt>
              <dd className="min-w-0 break-all">
                {jacket.sourceUrl ? (
                  <a className="spec-link" href={jacket.sourceUrl}>
                    {jacket.sourceUrl} <ArrowUpRight size={14} className="inline" aria-hidden="true" />
                  </a>
                ) : notPublished}
              </dd>
            </div>
            <div className="detail-row">
              <dt className="text-muted-foreground">Last verified</dt>
              <dd>
                {jacket.verifiedAt ? <time dateTime={jacket.verifiedAt} className="font-mono">{jacket.verifiedAt}</time> : notPublished}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </article>
  );
}
