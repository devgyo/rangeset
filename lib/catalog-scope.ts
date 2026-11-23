import {categoryOrder} from "./arcteryx-view";
import {isFootwearProduct} from "./parameters/classification";

export const catalogBrand = "arcteryx";

const allowedCategories = new Set(categoryOrder);

export function isCatalogProduct(product: Parameters<typeof isFootwearProduct>[0], input?: Parameters<typeof isFootwearProduct>[1]) {
  return product.category !== null && allowedCategories.has(product.category) && !isFootwearProduct(product, input);
}
