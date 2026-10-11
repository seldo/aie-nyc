// npm run eval:consistency: same question, same advice?
// Checks every example in an experiment: did all its repetitions make the same call?
import "dotenv/config";
import { getDatasetInfo, getDatasetExamples } from "@arizeai/phoenix-client/datasets";
import { asExperimentEvaluator, getExperiment, evaluateExperiment } from "@arizeai/phoenix-client/experiments";
import type { Report } from "../src/agent.js";
import { recommendationOf, consistentCall } from "../src/evals/consistency.js";

const DATASET = process.env.DATASET ?? "financial-agent-regressions";
const EXPERIMENT = process.argv[2] ?? "improved-prompts";

// Find the experiment by name (the most recent one, if there are several).
const dataset = await getDatasetInfo({ dataset: { datasetName: DATASET } });
const listing = await fetch(`${process.env.PHOENIX_ENDPOINT}/v1/datasets/${dataset.id}/experiments`).then((r) => r.json());
const match = (listing.data as { id: string; name: string; created_at: string }[])
  .filter((e) => e.name === EXPERIMENT)
  .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
if (!match) throw new Error(`No experiment called ${EXPERIMENT} on ${DATASET}`);
const experiment = await getExperiment({ experimentId: match.id });

// Group every run's recommendation by the example it came from.
const { examples } = await getDatasetExamples({ dataset: { datasetName: DATASET } });
const inputOf = new Map(examples.map((e) => [e.id, JSON.stringify(e.input)]));
const calls = new Map<string, (string | null)[]>();
for (const run of Object.values(experiment.runs)) {
  const key = inputOf.get(run.datasetExampleId)!;
  const report = (run.output as Report | null)?.report ?? "";
  calls.set(key, [...(calls.get(key) ?? []), recommendationOf(report)]);
}

// Score each example, and attach the score to every run of it in Phoenix.
const verdicts = new Map<string, Awaited<ReturnType<typeof consistentCall.evaluate>>>();
for (const [key, c] of calls) verdicts.set(key, await consistentCall.evaluate({ calls: c }));

await evaluateExperiment({
  experiment,
  evaluators: [
    asExperimentEvaluator({
      name: "consistent_call",
      kind: "CODE",
      evaluate: ({ input }) => verdicts.get(JSON.stringify(input))!,
    }),
  ],
});

console.log(`\nSame question, same call? (${EXPERIMENT}, ${experiment.repetitions} repetitions)\n`);
for (const [key, v] of verdicts) {
  const { tickers, focus } = JSON.parse(key);
  console.log(`  ${v.label === "consistent" ? "✔" : "✘"} ${`${tickers}: ${focus}`.padEnd(52)} ${v.explanation}`);
}
const ok = [...verdicts.values()].filter((v) => v.label === "consistent").length;
console.log(`\n${ok} of ${verdicts.size} questions got the same call every time.`);
