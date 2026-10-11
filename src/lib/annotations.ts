// Log eval results back to Phoenix as span annotations.
import { logSpanAnnotations } from "@arizeai/phoenix-client/spans";

export type EvalResult = {
  spanId: string;
  label?: string;
  score?: number;
  explanation?: string;
};

export async function logResults(
  name: string,
  results: EvalResult[],
  annotatorKind: "CODE" | "LLM" | "HUMAN",
) {
  await logSpanAnnotations({
    spanAnnotations: results.map((r) => ({
      spanId: r.spanId,
      name,
      label: r.label,
      score: r.score,
      explanation: r.explanation,
      annotatorKind,
    })),
    sync: true,
  });
}

export function summarize(name: string, results: EvalResult[]) {
  const counts: Record<string, number> = {};
  for (const r of results) counts[r.label ?? "?"] = (counts[r.label ?? "?"] ?? 0) + 1;
  const parts = Object.entries(counts).map(([label, n]) => `${label}: ${n}`);
  console.log(`${name}: ${parts.join(", ")} (of ${results.length})`);
}
