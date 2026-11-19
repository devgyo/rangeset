# Rangeset

An English-language index for comparing urban techwear and hardshell jackets. Built with the Next.js App Router, TypeScript, Tailwind CSS, and shadcn/ui.

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
