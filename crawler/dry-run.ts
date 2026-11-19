import { collect } from "./crawl";

const argument = process.argv[2] ?? "5";
const limit = Number(argument);
const counts = { ok: 0, failed: 0 };

if (!/^[1-5]$/.test(argument) || process.argv.length > 3) {
  console.error("Dry-run limit must be between 1 and 5");
  process.exitCode = 1;
} else {
  collect(new Set(), counts, limit).catch((error: unknown) => {
    console.error(JSON.stringify({ event: "stopped", reason: error instanceof Error ? error.message : String(error) }));
    process.exitCode = 1;
  }).finally(() => console.log(JSON.stringify({ event: "summary", ...counts })));
}
