// Get agent runs back out of Phoenix, in a shape our evals can use.
import { getSpans } from "@arizeai/phoenix-client/spans";
import { PROJECT } from "../instrumentation.js";
import type { Query } from "../agent.js";

export type AgentRun = {
  spanId: string;
  traceId: string;
  input: Query;
  output: string;
  research: string;
  searchResults: string;
};

type PhoenixSpan = Awaited<ReturnType<typeof getSpans>>["spans"][number];

function attr(span: PhoenixSpan, key: string): unknown {
  return (span.attributes as Record<string, unknown> | undefined)?.[key];
}

export async function getAgentRuns(projectName = PROJECT): Promise<AgentRun[]> {
  // Root spans only: one per run of the agent.
  const { spans } = await getSpans({
    project: { projectName },
    parentId: null,
    name: "financial_report",
    limit: 500,
  });

  // Each run's research is the output of its first turn (the first AGENT span
  // directly under financial_report).
  const turns = await getSpans({
    project: { projectName },
    traceIds: spans.map((s) => s.context.trace_id),
    spanKind: "AGENT",
    limit: 1000,
  });

  // ...and everything its web searches returned.
  const searches = await getSpans({
    project: { projectName },
    traceIds: spans.map((s) => s.context.trace_id),
    name: "WebSearch",
    limit: 1000,
  });

  return spans
    .filter((s) => attr(s, "output.value"))
    .map((root) => {
      const firstTurn = turns.spans
        .filter((t) => t.parent_id === root.context.span_id)
        .sort((a, b) => a.start_time.localeCompare(b.start_time))[0];
      return {
        spanId: root.context.span_id,
        traceId: root.context.trace_id,
        input: parseQuery(attr(root, "input.value")),
        output: String(attr(root, "output.value")),
        research: firstTurn ? String(attr(firstTurn, "output.value") ?? "") : "",
        searchResults: searches.spans
          .filter((t) => t.context.trace_id === root.context.trace_id)
          .map((t) => searchText(attr(t, "output.value")))
          .join("\n\n---\n\n"),
      };
    });
}

function parseQuery(value: unknown): Query {
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  // traceAgent records the function's arguments; ours is a single Query object.
  return Array.isArray(parsed) ? parsed[0] : parsed;
}

// A WebSearch result is JSON: a list of links, plus the text the search returned.
function searchText(value: unknown): string {
  try {
    const parsed = JSON.parse(String(value));
    const text = (parsed.results as unknown[]).filter((r) => typeof r === "string");
    return `Search: ${parsed.query}\n${text.join("\n")}`;
  } catch {
    return String(value ?? "");
  }
}
