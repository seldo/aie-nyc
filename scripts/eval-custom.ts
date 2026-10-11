// npm run eval:custom: run our own actionability judge.
import "../src/instrumentation.js";
import { formatQuery } from "../src/agent.js";
import { getAgentRuns } from "../src/lib/runs.js";
import { logResults, summarize } from "../src/lib/annotations.js";
import { mapPool } from "../src/lib/pool.js";
import { actionability } from "../src/evals/actionability.js";

const runs = await getAgentRuns();
const results = await mapPool(runs, 5, async (run) => ({
  spanId: run.spanId,
  ...(await actionability.evaluate({ input: formatQuery(run.input), output: run.output })),
}));

summarize("actionability", results);
await logResults("actionability", results, "LLM");
console.log("Logged to Phoenix.");
