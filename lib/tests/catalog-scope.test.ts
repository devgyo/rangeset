import assert from "node:assert/strict";
import {test} from "node:test";
import {isCatalogProduct} from "../catalog-scope";
import {categoryCounts} from "../arcteryx-view";
import {productTypes, fieldsByKey, groups, parameterVersion, terms} from "../parameters/registry";

test("only the approved clothing categories and the existing professional-use items are eligible", () => {
  const rows = [
    {name: "Beta AR Jacket", category: "Shell Jackets"},
    {name: "Adze Pant", category: "Pants"},
    {name: "Bootcut Pants", category: "Pants"},
    {name: "Alpha PRO 50 Backpack", category: "Professional Use"},
    {name: "PRO Backpack Lid Replacement", category: "Professional Use"},
    {name: "Konseal GTX Shoe", category: "Footwear"},
    {name: "Mislabeled Trail Boot", category: "Shell Jackets"},
    {name: "Unknown Category", category: "Unapproved"},
  ];
  const visible = rows.filter((row) => isCatalogProduct(row));
  assert.deepEqual(visible, rows.slice(0, 5));
  assert.deepEqual(categoryCounts(visible), [
    {label: "Shell Jackets", count: 1}, {label: "Pants", count: 2}, {label: "Professional Use", count: 2},
  ]);
});

test("catalog guard recognizes raw and overridden footwear types in an allowed category", () => {
  const item = {name: "Unclassified model", category: "Professional Use"};
  assert.equal(isCatalogProduct(item, {raw: {productType: "Sandal"}}), false);
  assert.equal(isCatalogProduct(item, {overrides: new Map([["parameters.product_type", {value: "mule"}]])}), false);
  assert.equal(isCatalogProduct({name: "Unclear model", category: "Footwear"}), false);
  assert.equal(isCatalogProduct(item), true);
});

test("public parameter registry omits footwear parameter choices and help without removing clothing fit and lining", () => {
  assert.equal(parameterVersion, "1.8.0");
  assert.ok(!Object.hasOwn(groups, "footwear"));
  for (const style of ["shoe", "boot", "sandal", "mule"]) assert.ok(!Object.hasOwn(productTypes, style));
  for (const key of ["drop", "forefoot_stack", "heel_stack", "lugs", "outsole", "midsole", "upper", "waterproof_lining", "weight_basis"]) {
    assert.ok(!fieldsByKey.has(key));
  }
  assert.ok(!Object.hasOwn(terms, "drop"));
  assert.ok(fieldsByKey.has("weight_size"));
  assert.ok(fieldsByKey.has("materials"));
  assert.ok(fieldsByKey.has("fit"));
});
