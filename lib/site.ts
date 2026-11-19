const vercelOrigin = process.env.VERCEL_PROJECT_PRODUCTION_URL;
export const siteUrl = new URL(
  process.env.SITE_URL || (vercelOrigin ? `https://${vercelOrigin}` : "http://localhost:3000"),
);
