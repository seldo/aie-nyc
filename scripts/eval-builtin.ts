// npm run eval:builtin: run the built-in correctness and faithfulness evals.
import "../src/instrumentation.js";
import { formatQuery } from "../src/agent.js";
import { getAgentRuns } from "../src/lib/runs.js";
import { logResults, summarize } from "../src/lib/annotations.js";
import { mapPool } from "../src/lib/pool.js";
import { correctness, faithfulness } from "../src/evals/builtin.js";

const runs = await getAgentRuns();

const correctnessResults = await mapPool(runs, 5, async (run) => ({
  spanId: run.spanId,
  ...(await correctness.evaluate({ input: formatQuery(run.input), output: run.output })),
}));
summarize("correctness", correctnessResults);
await logResults("correctness", correctnessResults, "LLM");

// Faithfulness gets what the agent actually saw as its context:
// the raw web search results, plus its own research notes.
const faithfulnessResults = await mapPool(runs, 5, async (run) => ({
  spanId: run.spanId,
  ...(await faithfulness.evaluate({
    input: formatQuery(run.input),
    output: run.output,
    context: `${run.searchResults}\n\n---\n\nResearch notes:\n${run.research}`,
  })),
}));
summarize("faithfulness", faithfulnessResults);
await logResults("faithfulness", faithfulnessResults, "LLM");

console.log("Logged to Phoenix.");
