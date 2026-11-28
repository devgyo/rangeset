import {readInventory} from "./content-verify/data";
import {sample} from "./content-verify/compare";
import {OfficialReader} from "./content-verify/official";
import {checkCatalog, checkTranslations} from "./content-verify/rules";
import {writeReport} from "./content-verify/report";
import {verifyProducts} from "./content-verify/run";

async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== "--full")) throw new Error("Usage: pnpm verify:content [--full]");
  const full = args.includes("--full");
  const connection = process.env.DATABASE_URL;
  if (!connection) throw new Error("DATABASE_URL is required");
  const date = new Intl.DateTimeFormat("sv-SE", {timeZone: "Asia/Shanghai"}).format(new Date());
  const inventory = await readInventory(connection);
  const selected = sample(inventory, date, full);
  const issues = [...checkCatalog(inventory), ...checkTranslations()];
  console.log(JSON.stringify({event: "start", date, full, catalogSize: inventory.length, selected: selected.length,
    recent: selected.filter(({recent}) => recent).length, ruleFindings: issues.length}));
  const {products, stopped} = await verifyProducts(selected, new OfficialReader(), (processed) => {
    if (processed % 25 === 0) console.log(JSON.stringify({event: "progress", processed, selected: selected.length}));
  });
  const report = await writeReport({date, full, catalogSize: inventory.length, products, issues, stopped});
  console.log(JSON.stringify({event: "finished", stopped, ...report.summary.total, failed: report.failed}));
  if (report.failed) process.exitCode = 1;
}

main().catch((error: unknown) => {
  // Do not expose database connection details in CI logs.
  console.error("Content verification failed before a report could be written.", error instanceof Error ? error.name : "");
  process.exitCode = 1;
});
