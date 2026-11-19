import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <section className="hero flex flex-1 items-center">
      <div className="site-width relative py-24 sm:py-32">
        <h1 className="hero-title font-semibold">
          <span className="mb-7 block font-mono text-xs font-medium tracking-[0.22em] text-primary uppercase">
            Rangeset<span className="sr-only"> — </span>
          </span>
          Specs, <br />
          <span className="text-primary">not hype.</span>
        </h1>
        <p className="mt-7 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
          An index of urban techwear and hardshell jackets. Compare construction,
          measurements, and features side by side.
        </p>
        <Button asChild size="lg" className="mt-9 h-11 gap-4 px-4">
          <Link href="/jackets">Browse jackets <ArrowUpRight aria-hidden="true" /></Link>
        </Button>
      </div>
    </section>
  );
}
