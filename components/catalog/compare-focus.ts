export function neighborAfterRemoval(products: readonly {slug: string}[], slug: string) {
  const index = products.findIndex((product) => product.slug === slug);
  return index >= 0 ? products[index + 1]?.slug ?? products[index - 1]?.slug : undefined;
}

export function findCompareButton(container: ParentNode, attribute: "data-compare-remove" | "data-compare-toggle", slug: string) {
  return [...container.querySelectorAll<HTMLButtonElement>(`button[${attribute}]`)]
    .find((button) => button.getAttribute(attribute) === slug);
}
