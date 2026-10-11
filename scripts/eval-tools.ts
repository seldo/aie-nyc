// npm run eval:tools: grade the tools the agent chose, turn by turn.
import "dotenv/config";
import { getSpans } from "@arizeai/phoenix-client/spans";
import { PROJECT } from "../src/instrumentation.js";
import { getAgentRuns } from "../src/lib/runs.js";
import { logResults, summarize, type EvalResult } from "../src/lib/annotations.js";
import { mapPool } from "../src/lib/pool.js";
import { toolSelection, AVAILABLE_TOOLS } from "../src/evals/toolSelection.js";

const runs = await getAgentRuns();
const { spans } = await getSpans({
  project: { projectName: PROJECT },
  traceIds: runs.map((r) => r.traceId),
  limit: 1000,
});
const attr = (s: (typeof spans)[number], k: string) =>
  (s.attributes as Record<string, unknown>)[k];

// Each run has two turns (research, then writing); each turn's tool calls are its children.
const turns = runs.flatMap((run) =>
  spans
    .filter((s) => s.parent_id === run.spanId && s.name === "ClaudeAgent.query")
    .sort((a, b) => a.start_time.localeCompare(b.start_time))
    .map((turn, i) => ({
      run,
      turn: i === 0 ? "research" : "writing",
      spanId: turn.context.span_id,
      prompt: String(attr(turn, "input.value")),
      tools: spans
        .filter((s) => s.parent_id === turn.context.span_id && s.span_kind === "TOOL")
        .sort((a, b) => a.start_time.localeCompare(b.start_time))
        .map((s) => `${s.name}(${String(attr(s, "input.value") ?? "").slice(0, 150)})`),
    })),
);

const results = await mapPool(turns, 8, async (t) => ({
  spanId: t.spanId,
  ...(await toolSelection.evaluate({
    input: t.prompt,
    availableTools: AVAILABLE_TOOLS,
    toolSelection: t.tools.length ? t.tools.join("\n") : "(no tools called)",
  })),
}));

for (const kind of ["research", "writing"]) {
  const subset = results.filter((_, i) => turns[i].turn === kind) as EvalResult[];
  summarize(`tool_selection (${kind} turns)`, subset);
}
for (const [i, r] of results.entries()) {
  if (r.label !== "correct") {
    const t = turns[i];
    console.log(`\n  ${t.run.input.tickers} ${t.turn} turn: ${t.tools.map((x) => x.split("(")[0]).join(", ")}`);
    console.log(`    ${String(r.explanation).replace(/\s+/g, " ").slice(0, 300)}`);
  }
}
await logResults("tool_selection", results, "LLM");
console.log("\nLogged to Phoenix (on each agent turn's span).");
