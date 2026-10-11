// npm run experiment: run the agent on a fixed dataset and score it.
import "../src/instrumentation.js";
import { PROJECT } from "../src/instrumentation.js";
import { createDataset, getDatasetInfo } from "@arizeai/phoenix-client/datasets";
import { asExperimentEvaluator, runExperiment } from "@arizeai/phoenix-client/experiments";
import { createFinancialReport, formatQuery, type Query, type Report } from "../src/agent.js";
import { PROMPTS, IMPROVED_PROMPTS } from "../src/prompts.js";
import { getAgentRuns } from "../src/lib/runs.js";
import { getLabels } from "../src/lib/labels.js";
import { mentionsTicker } from "../src/evals/mentionsTicker.js";
import { faithfulness } from "../src/evals/builtin.js";
import { actionability } from "../src/evals/actionability.js";

const DATASET = process.env.DATASET ?? "financial-agent-regressions";

// In the workshop you build this dataset in the Phoenix UI. If you skipped
// that, we build it here: failing reports in a "fails" split, passing
// reports in a "passes" split.
async function ensureDataset() {
  try {
    await getDatasetInfo({ dataset: { datasetName: DATASET } });
    return; // already there
  } catch {
    // not created yet
  }
  const runs = await getAgentRuns();
  const labels = await getLabels(PROJECT, runs.map((r) => r.spanId), "actionability");
  const examples = runs
    .filter((r) => labels.has(r.spanId))
    .map((r) => ({
      input: r.input,
      output: { report: r.output },
      splits: labels.get(r.spanId)?.label === "actionable" ? "passes" : "fails",
      spanId: r.spanId,
    }));
  if (examples.length === 0) throw new Error("No actionability results yet: run `npm run eval:custom` first.");
  await createDataset({ name: DATASET, description: "Reports that failed and passed actionability", examples });
  console.log(`Created dataset ${DATASET} with ${examples.length} examples.`);
}

await ensureDataset();

const financialReport = createFinancialReport(PROMPTS);

const experimentName =
  process.env.EXPERIMENT_NAME ?? (PROMPTS === IMPROVED_PROMPTS ? "improved-prompts" : "my-prompts");

await runExperiment({
  experimentName,
  dataset: { datasetName: DATASET },
  task: async (example) => financialReport(example.input as Query),
  // The task returns { report, research }, so each eval picks the fields it needs.
  evaluators: [
    asExperimentEvaluator({
      name: "mentions_ticker",
      kind: "CODE",
      evaluate: ({ input, output }) =>
        mentionsTicker.evaluate({ input: input as Query, output: (output as Report).report }),
    }),
    asExperimentEvaluator({
      name: "faithfulness",
      kind: "LLM",
      evaluate: ({ input, output }) =>
        faithfulness.evaluate({
          input: formatQuery(input as Query),
          output: (output as Report).report,
          context: (output as Report).research,
        }),
    }),
    asExperimentEvaluator({
      name: "actionability",
      kind: "LLM",
      evaluate: ({ input, output }) =>
        actionability.evaluate({
          input: formatQuery(input as Query),
          output: (output as Report).report,
        }),
    }),
  ],
  repetitions: Number(process.env.REPETITIONS ?? 1),
  concurrency: Number(process.env.CONCURRENCY ?? 5),
});
