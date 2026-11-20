import type { Metadata } from "next";
import Link from "next/link";
import { CatalogNav, CompareDock } from "@/components/catalog/compare-selection";
import { siteUrl } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: { default: "Rangeset — specs, not hype", template: "%s | Rangeset" },
  description: "Browse and compare published Arc’teryx product specifications.",
  openGraph: { siteName: "Rangeset", type: "website" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="dark">
      <body className="flex min-h-dvh flex-col">
        <a href="#main" className="skip-link">Skip to content</a>
        <header className="border-b border-border">
          <div className="site-width flex h-17 items-center justify-between">
            <Link href="/" className="wordmark inline-flex items-center gap-3" aria-label="Rangeset home">
              <span className="brand-mark" aria-hidden="true" />
              RANGESET
            </Link>
            <CatalogNav />
          </div>
        </header>
        <main id="main" className="flex flex-1 flex-col">{children}</main>
        <CompareDock />
        <footer className="border-t border-border">
          <div className="site-width py-5 font-mono text-xs tracking-wider text-muted-foreground">
            Rangeset <span aria-hidden="true">/</span> Arc’teryx gear catalog
          </div>
        </footer>
      </body>
    </html>
  );
}
