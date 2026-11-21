# Rangeset

A catalog for comparing outdoor apparel and backpacks in English, Simplified Chinese and Japanese. Built with the Next.js App Router, TypeScript, Tailwind CSS, and shadcn/ui.

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

For the read-only Arc’teryx and Mammut fixtures, set `RANGESET_LOCAL_CATALOG=1` on the local app server. See [the parameter standard](docs/product-parameters.md) for category rules and the dry-run workflow.

Edit `data/jackets.json` using the `Jacket` type in `lib/types.ts`. The three example records are fictional and use reserved `.example` URLs. Replace them with real records and remove `example: true` to include their detail pages in the sitemap.

- Give each jacket a unique URL-safe `slug`, such as `brand-model`. The same slug identifies a jacket in `/compare?ids=brand-model,other-model`.
- Use grams for weight, centimeters for center back length, millimeters for waterproof rating, denier for face fabric, and USD for price. Weight and price sort on their numeric values in those units. Store weight reference size separately.
- Store breathability with its original unit and test method. The catalog displays each result as reported.
- Store sources as `brand`, `third_party`, or `not_published`. Use `null` with `not_published` or leave an unknown spec out. Keep `false` for a confirmed absence of a feature.
- Set the jacket-level `sourceUrl` and `verifiedAt` when known. Individual specs can also carry a `sourceUrl` and `verifiedAt`. Write dates as `YYYY-MM-DD`.

## Deploy to Vercel

1. Create an empty GitHub repository at `devgyo/rangeset` if needed, then run `git push -u origin main`.
2. Import the repository in Vercel. Select the Next.js framework preset, Node.js 24, and the `main` production branch. Vercel detects pnpm from the project and uses `pnpm build`.
3. If using a custom domain, add it in Vercel and set `SITE_URL` to its HTTPS origin for production. Otherwise the app uses Vercel’s `VERCEL_PROJECT_PRODUCTION_URL`. These values set the canonical URLs, sitemap, and robots file.
4. Deploy and open `/jackets`, a jacket detail, `/sitemap.xml`, and `/robots.txt` on the production domain.

## Arc'teryx catalog

The crawler reads both sitemaps and visits US-English shop pages sequentially. It reads robots.txt on each run, waits at least 1.5 seconds between requests, and stops the run on a 403, 429, or detected challenge. It never uses an ecommerce API. Gzipped PDP HTML and JSON sidecars with the HTTP status, requested/final URLs, and UTC timestamp go under the gitignored `.crawl/raw/arcteryx/` directory. GitHub Actions keeps the crawl log artifact. Raw HTML from a hosted runner is temporary, while Postgres retains the latest parsed JSON for each product.

```sh
pnpm test
pnpm crawl:dry-run 5
```

The dry run accepts 1–5 PDP requests, including redirect hops, and never writes to Postgres. Its first product is the Beta AR fixture. Run the optional ingest integration test by migrating a disposable local Postgres database whose name ends in `_test`, then setting `TEST_DATABASE_URL` to that same database for `pnpm test`.

### Set up Neon and GitHub Actions

1. Create a Neon Postgres database and copy its **direct** connection URL. Apply the checked-in Drizzle migration to a test branch first. Use the direct URL as `DATABASE_URL` when running `pnpm db:migrate`.
2. The initial migration adds eight catalog tables, three enums, indexes, constraints, and Drizzle's migration-history table. It has no data backfill. Confirm before applying it to production. To roll back application behavior, remove the Vercel `DATABASE_URL` and redeploy to return to the example catalog. Dropping the catalog schema later would delete its stored products, prices, and review history.
3. In Vercel, set the **pooled** Neon URL as the server-side `DATABASE_URL` and redeploy. With this variable set, `/products`, `/jackets`, jacket details, comparisons, and the sitemap read Postgres. With it unset, the catalog pages show the example JSON and remain `noindex`.
4. On GitHub, set the Actions repository secret `DATABASE_URL` to the **direct** URL for the same database. Run `gh secret set DATABASE_URL --repo devgyo/rangeset` and paste the connection URL at the prompt. The crawler's session-level lock requires a direct connection.
5. Merge the workflow to the default branch to enable its Monday 03:00 UTC schedule. **Run workflow** in GitHub Actions runs the full catalog on demand. The runner uploads its crawl log on success or failure. Apply migrations before either trigger runs.

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

Arc’teryx has 453 archived styles. The catalog hides 34 footwear styles and one backpack lid, leaving 418 styles eligible for categorization and display.
