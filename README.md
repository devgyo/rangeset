# Rangeset

A catalog for comparing Arc’teryx apparel and backpacks in English, Simplified Chinese and Japanese. Built with the Next.js App Router, TypeScript, Tailwind CSS, and shadcn/ui.

## Local setup

Use Node.js 24 and pnpm 10.33.2, the version pinned in `package.json`.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open [localhost:3000](http://localhost:3000).

```sh
pnpm lint
pnpm build
pnpm start
```

## Catalog data

The public catalog lists Arc’teryx’s US products. For the read-only local catalog, export the Arc’teryx fixture with `pnpm exec tsx scripts/export-arcteryx-fixture.ts` and set `RANGESET_LOCAL_CATALOG=1` on the local app server. The public catalog is empty when neither Postgres nor the fixture is configured. See [the parameter standard](docs/product-parameters.md) for category rules and the dry-run workflow.

## Deploy to Vercel

1. Create an empty GitHub repository at `devgyo/rangeset` if needed, then run `git push -u origin main`.
2. Import the repository in Vercel. Select the Next.js framework preset, Node.js 24, and the `main` production branch. Vercel detects pnpm from the project and uses `pnpm build`.
3. If using a custom domain, add it in Vercel and set `SITE_URL` to its HTTPS origin for production. Otherwise the app uses Vercel’s `VERCEL_PROJECT_PRODUCTION_URL`. These values set the canonical URLs, sitemap, and robots file.
4. Deploy and open `/jackets`, a jacket detail, `/sitemap.xml`, and `/robots.txt` on the production domain.

## Arc'teryx catalog

The crawler reads both US storefront sitemaps, then discovers PRO · LEAF apparel, backpacks and accessories on the official LEAF US category pages. Both sources use the same Arc’teryx catalog and the same weekly workflow. A LEAF run validates the rendered tiles against the official list and structured metadata before reconciling the advertised SKUs with the detail pages. Any disagreement stops the LEAF update and retains its last complete import. The LEAF product pages publish list prices and product options. The catalog and snapshots leave LEAF online stock unknown because that storefront does not offer public online checkout. It reads robots.txt on each run, waits at least 1.5 seconds between requests, and stops the run on a 403, 429, or detected challenge. It never uses an ecommerce API. Gzipped PDP HTML and JSON sidecars with the HTTP status, requested/final URLs, and UTC timestamp go under the gitignored `.crawl/raw/arcteryx/` directory. GitHub Actions keeps the crawl log artifact. Raw HTML from a hosted runner is temporary, while Postgres retains the latest parsed JSON for each product.

```sh
pnpm test
pnpm crawl:dry-run 5
pnpm crawl:dry-run --leaf 5
```

Each dry run accepts 1–5 product requests, including redirect hops, and never writes to Postgres. The main-store dry run starts at the Beta AR fixture. Run the optional ingest integration test by migrating a disposable local Postgres database whose name ends in `_test`, then setting `TEST_DATABASE_URL` to that same database for `pnpm test`.

### Set up Neon and GitHub Actions

1. Create a Neon Postgres database and copy its **direct** connection URL. Apply the checked-in Drizzle migration to a test branch first. Use the direct URL as `DATABASE_URL` when running `pnpm db:migrate`.
2. The initial migration adds eight catalog tables, three enums, indexes, constraints, and Drizzle's migration-history table. It has no data backfill. Confirm before applying it to production. Removing the Vercel `DATABASE_URL` and redeploying leaves the catalog empty. Dropping the catalog schema later would delete its stored products, prices, and review history.
3. In Vercel, set the **pooled** Neon URL as the server-side `DATABASE_URL` and redeploy. With this variable set, `/products`, `/jackets`, jacket details, comparisons, and the sitemap read Postgres. With it unset, the catalog pages remain empty and marked `noindex`.
4. On GitHub, set the Actions repository secret `DATABASE_URL` to the **direct** URL for the same database. Run `gh secret set DATABASE_URL --repo devgyo/rangeset` and paste the connection URL at the prompt. The crawler's session-level lock requires a direct connection.
5. Merge the workflow to the default branch to enable its Monday 03:00 UTC schedule. **Run workflow** in GitHub Actions can run the full catalog or only the LEAF source on demand. The runner uploads its crawl log on success or failure. Apply migrations before either trigger runs.

### Catalog schema and review

| Table | Contents |
| --- | --- |
| `brands` | Brand identity and website |
| `products` | Stable brand/external ID, catalog fields, lifecycle, and predecessor/successor references |
| `product_specs` | Published spec values, units, source URLs, raw supporting text, and fetch times |
| `product_raw` | Latest complete parsed product JSON, including original materials and features |
| `prices` | Append-only price and stock observations by variant and channel. An empty variant identifies the product-level observation. The crawler writes to `brand_us`. |
| `changes` | Automatic changes and pending reviews with old and new values |
| `manual_overrides` | Operator-owned values keyed by product and field |
| `crawl_runs` | Start/end times, page counts, and stop reasons |

New products and changes to price, stock, and catalog text are applied automatically. Changes to weight, membrane, layers, face denier, or other numeric specs by more than 10% are recorded for review while the previous spec stays live. A product is marked discontinued after three consecutive completed runs count it as absent. A verified reappearance resets the streak. Candidate successor links remain pending until an operator reviews them.

Inspect `changes` where `status = 'needs_review'`. To approve a spec, confirm the candidate is still current, then update the live `product_specs` row and mark the change approved in one transaction. For a successor, set the predecessor and successor references together before approving the change. A rejected candidate keeps the published value in place. Use `manual_overrides` for operator values that should take precedence over later crawl observations. The site recognizes product fields `name`, `category`, `gender`, `url`, `status`, dollar `price`, and `spec.<key>` values such as `spec.weight_g`. Use `parameters.taxonomy` to choose a unified category. A JSON null spec override displays as unpublished.

The public catalog includes official website accessories such as hats, gloves, socks, garment care and pack accessories. The weekly crawl also processes footwear for the archive.

## Catalog content verification

Run `pnpm verify:content` with the direct `DATABASE_URL`, or add `--full` for a baseline over the entire visible catalog. The database session is read-only. The daily sample targets 5% (at least 40, where available) and includes all products added or recorded in `changes` in the last seven days. This can make the sample larger. Archived styles excluded from the storefront are outside the audit.

The verifier uses the official US product pages from the main Arc’teryx and LEAF catalogs. It follows robots.txt, waits at least 1.5 seconds between requests within a run and stops on HTTP 403/429 or a challenge. A missing or unreadable value is reported as unverifiable. The accuracy denominator is matches plus mismatches. The JSON report includes the offline rule findings and individual checks. The Markdown report includes an accuracy breakdown and the first ten mismatches per field.

The offline checks use catalog data and the latest successful per-product snapshot where available. Size conventions use the official [Arc’teryx US sizing guide](https://arcteryx.com/us/en/help/sizing/unisex). The translation check uses the versioned glossary and preserves protected names and the approved Japanese help fallback.

Online stock checks match the manufacturer's variant SKU against the latest successful `price_snapshots` records. A snapshot must be from the same Asia/Shanghai calendar day as the official observation and no more than six hours older. Missing, older and unpaired observations are reported as unverifiable.

`Verify catalog content` starts daily at 15:00 China time and waits for the day's latest snapshot workflow to finish. Stock differences fail the job when they exceed 10% of comparable variant SKUs. Reports always include stock differences. The other checks retain a 98% aggregate accuracy threshold and a maximum of three mismatches per field. Reports are uploaded on failure, including when there are no verifiable observations. GitHub sends failure mail to the triggering or scheduled-workflow actor when [Actions email notifications](https://docs.github.com/en/subscriptions-and-notifications/how-tos/managing-github-actions-notifications) are enabled for that account.
