// Maintainers: print eval results and explanations for every agent run.
// npx tsx scripts/_show.ts actionability faithfulness   (SHOW_PROJECT=… W=width)
import "dotenv/config";
import { getAgentRuns } from "../src/lib/runs.js";
import { getLabels } from "../src/lib/labels.js";
const project = process.env.SHOW_PROJECT ?? "phoenix-101";
const names = process.argv.slice(2);
const runs = await getAgentRuns(project);
const all = await Promise.all(names.map((n) => getLabels(project, runs.map((r) => r.spanId), n)));
for (const run of runs) {
  console.log(`\n=== ${run.input.tickers} | ${run.input.focus} | span ${run.spanId}`);
  names.forEach((n, i) => {
    const l = all[i].get(run.spanId);
    console.log(`  [${n}] ${l?.label}: ${String(l?.explanation ?? "").replace(/\s+/g, " ").slice(0, Number(process.env.W ?? 400))}`);
  });
}
