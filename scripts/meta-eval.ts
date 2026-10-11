// npm run meta: does our actionability judge agree with human labels?
// npm run meta -- test   checks the held-out test split instead of dev.
import "../src/instrumentation.js";
import { PROJECT } from "../src/instrumentation.js";
import { createDataset } from "@arizeai/phoenix-client/datasets";
import { asExperimentEvaluator, runExperiment } from "@arizeai/phoenix-client/experiments";
import { formatQuery, type Query } from "../src/agent.js";
import { getAgentRuns } from "../src/lib/runs.js";
import { getLabels } from "../src/lib/labels.js";
import { actionability } from "../src/evals/actionability.js";
import { SEED_PROJECT } from "./seed.js";

const SPLIT = process.argv[2] === "test" ? "test" : "dev";
const DATASET = "actionability-golden";

// 1. Every report with a human label: from the seed project, and your own.
const labeled = [];
for (const projectName of [SEED_PROJECT, PROJECT]) {
  const runs = await getAgentRuns(projectName).catch(() => []);
  const labels = await getLabels(projectName, runs.map((r) => r.spanId), "human_actionable");
  for (const run of runs) {
    const human = labels.get(run.spanId)?.label;
    if (human) labeled.push({ ...run, humanLabel: human });
  }
}
console.log(`Found ${labeled.length} human-labeled reports.`);

// 2. Turn them into a golden dataset: about three quarters dev, one quarter test.
// Sorting by span ID first means a report always lands in the same split.
labeled.sort((a, b) => a.spanId.localeCompare(b.spanId));
await createDataset({
  name: DATASET,
  description: "Human labels for actionability",
  examples: labeled.map((run, i) => ({
    input: { input: formatQuery(run.input as Query), output: run.output },
    output: { label: run.humanLabel },
    splits: i % 4 === 0 ? "test" : "dev",
    spanId: run.spanId,
  })),
});

// 3. Run the judge on one split and compare it with the humans.
const verdicts: { judge: string; human: string; request: string; explanation: string }[] = [];
await runExperiment({
  experimentName: `judge-vs-human-${SPLIT}`,
  dataset: { datasetName: DATASET, splits: [SPLIT] },
  task: async (example) => {
    const result = await actionability.evaluate(example.input as { input: string; output: string });
    verdicts.push({
      judge: result.label ?? "",
      human: String(example.output?.label),
      request: String(example.input.input).replace(/\s+/g, " "),
      explanation: result.explanation ?? "",
    });
    return { label: result.label, explanation: result.explanation };
  },
  evaluators: [
    asExperimentEvaluator({
      name: "agrees_with_human",
      kind: "CODE",
      evaluate: ({ output, expected }) => {
        const agrees = (output as { label?: string }).label === expected?.label;
        return { label: agrees ? "agree" : "disagree", score: agrees ? 1 : 0 };
      },
    }),
  ],
});

// 4. Precision and recall, treating "not actionable" (a failure) as the positive class.
const FAIL = "not actionable";
const tp = verdicts.filter((v) => v.judge === FAIL && v.human === FAIL).length;
const fp = verdicts.filter((v) => v.judge === FAIL && v.human !== FAIL).length;
const fn = verdicts.filter((v) => v.judge !== FAIL && v.human === FAIL).length;
const tn = verdicts.length - tp - fp - fn;
const pct = (n: number, d: number) => (d === 0 ? "n/a" : `${Math.round((100 * n) / d)}%`);

console.log(`\nJudge vs. human on the ${SPLIT} split (${verdicts.length} reports)\n`);
console.log(`                     judge: fail   judge: pass`);
console.log(`  human: fail        ${String(tp).padStart(6)}        ${String(fn).padStart(6)}`);
console.log(`  human: pass        ${String(fp).padStart(6)}        ${String(tn).padStart(6)}`);
console.log(`\nAgreement: ${pct(tp + tn, verdicts.length)}`);
console.log(`Precision: ${pct(tp, tp + fp)}  (when the judge says "not actionable", is it right?)`);
console.log(`Recall:    ${pct(tp, tp + fn)}  (of the really not-actionable reports, how many did it catch?)`);

// 5. The interesting part: why do they disagree?
for (const v of verdicts.filter((v) => v.judge !== v.human)) {
  console.log(`\nDISAGREE on "${v.request}": human says ${v.human}, judge says ${v.judge}`);
  console.log(`  Judge's reasoning: ${v.explanation}`);
}
