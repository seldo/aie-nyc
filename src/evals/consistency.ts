import { createEvaluator } from "@arizeai/phoenix-evals";

// Pull the headline call (BUY / HOLD / SELL) out of a report.
// Look at headings and lines that say "Recommendation", "Rating" or "Verdict",
// in any case ("HOLD", "Hold"), and a few lines under a "Recommendations"
// heading (comparisons often put their calls in a table, so for those we
// check the first ticker's call). Ignore phrases like "a buy/hold/sell call".
const CALL = /\b(strong buy|buy|hold|sell)\b/i;
const NO_CALL = /\b(no rating|rating: none|recommendation: none|no recommendation)\b/i;
const HEADLINE = /recommendation|rating|verdict|^#/i;
const PHRASE = /buy\s*\/\s*hold\s*\/\s*sell|buy,\s*hold,?\s*or\s*sell/gi;

export function recommendationOf(report: string): string | null {
  const lines = report
    .split("\n")
    .map((l) => l.replace(PHRASE, "").trim())
    .filter(Boolean);
  for (const [i, line] of lines.entries()) {
    if (!HEADLINE.test(line)) continue;
    if (NO_CALL.test(line)) return null;
    const below = /^#+\s*recommendations?\b/i.test(line) ? lines.slice(i + 1, i + 5) : [];
    for (const candidate of [line, ...below]) {
      const call = candidate.match(CALL)?.[1].toUpperCase();
      if (call) return call === "STRONG BUY" ? "BUY" : call;
    }
  }
  return null;
}

// Code eval: did every repetition of the same question give the same call?
export const consistentCall = createEvaluator(
  ({ calls }: { calls: (string | null)[] }) => {
    const consistent = calls.every((c) => c === calls[0]);
    return {
      label: consistent ? "consistent" : "inconsistent",
      score: consistent ? 1 : 0,
      explanation: calls.map((c) => c ?? "no call").join(", "),
    };
  },
  { name: "consistent_call", kind: "CODE" },
);
