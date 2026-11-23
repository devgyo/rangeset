import {collect, collectLeaf} from "./crawl";

const args = process.argv.slice(2);
const leaf = args[0] === "--leaf";
const [argument = "5", extra] = leaf ? args.slice(1) : args;
const limit = Number(argument);
const counts = { ok: 0, failed: 0 };

if (!/^[1-5]$/.test(argument) || extra !== undefined) {
  console.error("Dry-run limit must be between 1 and 5");
  process.exitCode = 1;
} else {
  const run = leaf ? collectLeaf(counts, limit) : collect(new Set(), counts, limit);
  run.catch((error: unknown) => {
    console.error(JSON.stringify({ event: "stopped", reason: error instanceof Error ? error.message : String(error) }));
    process.exitCode = 1;
  }).finally(() => console.log(JSON.stringify({ event: "summary", ...counts })));
}
