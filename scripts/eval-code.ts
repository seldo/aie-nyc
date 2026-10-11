// npm run eval:code: run the ticker check on every agent run and log it to Phoenix.
import "../src/instrumentation.js";
import { getAgentRuns } from "../src/lib/runs.js";
import { logResults, summarize } from "../src/lib/annotations.js";
import { mentionsTicker } from "../src/evals/mentionsTicker.js";

const runs = await getAgentRuns();
const results = await Promise.all(
  runs.map(async (run) => ({ spanId: run.spanId, ...(await mentionsTicker.evaluate(run)) })),
);

summarize("mentions_ticker", results);
for (const [i, r] of results.entries()) {
  if (r.label === "fail") console.log(`  ${runs[i].input.tickers}: ${r.explanation}`);
}
await logResults("mentions_ticker", results, "CODE");
console.log("Logged to Phoenix.");
