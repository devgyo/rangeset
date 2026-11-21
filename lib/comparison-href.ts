export function comparisonHref(slugs: string[]) {
  return slugs.length ? "/compare?ids=" + slugs.map(encodeURIComponent).join(",") : "/compare";
}
