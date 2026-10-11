// Maintainers only: export a project's traces and human labels into data/seed/.
import "dotenv/config";
import { writeFile } from "node:fs/promises";
import { getSpans } from "@arizeai/phoenix-client/spans";
import { getLabels } from "../src/lib/labels.js";

const project = process.argv[2] ?? "phoenix-101";
const { spans: roots } = await getSpans({
  project: { projectName: project },
  parentId: null,
  name: "financial_report",
  limit: 1000,
});
const { spans } = await getSpans({
  project: { projectName: project },
  traceIds: roots.map((s) => s.context.trace_id),
  limit: 1000,
});
const labels = await getLabels(project, roots.map((s) => s.context.span_id), "human_actionable");

await writeFile("data/seed/spans.json", JSON.stringify(spans, null, 1));
await writeFile(
  "data/seed/human-labels.json",
  JSON.stringify(
    [...labels].map(([spanId, l]) => ({
      spanId,
      name: "human_actionable",
      label: l.label,
      score: l.score,
      explanation: l.explanation,
      annotatorKind: "HUMAN",
    })),
    null,
    1,
  ),
);
console.log(`Exported ${spans.length} spans and ${labels.size} labels from ${project}.`);
