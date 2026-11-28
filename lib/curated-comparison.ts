export const betaShellComparison = {
  path: "/compare/beta-ar-vs-beta-sl",
  slugs: [
    "arcteryx-mens-beta-ar-jacket-1062-x000011062",
    "arcteryx-mens-beta-sl-jacket-0553-x000010553",
  ],
};

export function hasBetaShellPair(slugs: readonly string[]) {
  return betaShellComparison.slugs.every((slug) => slugs.includes(slug));
}
