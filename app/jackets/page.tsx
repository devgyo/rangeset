import type { Metadata } from "next";
import { JacketTable } from "@/components/jacket-table";
import { jackets } from "@/lib/jackets";

export const metadata: Metadata = {
  title: "Jacket index",
  description: "Browse and compare hardshell jackets by membrane, construction, weight, price, and features.",
  alternates: { canonical: "/jackets" },
};

export default function JacketsPage() {
  return (
    <div className="site-width page-space">
      <div className="mb-9">
        <h1 className="page-title">Jacket index</h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Browse hardshell specs and select 2–4 jackets to compare.
        </p>
      </div>
      <JacketTable jackets={jackets} />
    </div>
  );
}
