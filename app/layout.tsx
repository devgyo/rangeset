import type { Metadata } from "next";
import Link from "next/link";
import { siteUrl } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: { default: "Rangeset — specs, not hype", template: "%s | Rangeset" },
  description: "An English-language spec index for urban techwear and hardshell jackets.",
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
            <nav aria-label="Main navigation">
              <Link href="/jackets" className="font-mono text-xs tracking-wider uppercase hover:text-primary">
                Jackets
              </Link>
            </nav>
          </div>
        </header>
        <main id="main" className="flex flex-1 flex-col">{children}</main>
        <footer className="border-t border-border">
          <div className="site-width py-5 font-mono text-xs tracking-wider text-muted-foreground">
            Rangeset <span aria-hidden="true">/</span> Hardshell jacket index
          </div>
        </footer>
      </body>
    </html>
  );
}
