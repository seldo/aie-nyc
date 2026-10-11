import { createClassificationEvaluator } from "@arizeai/phoenix-evals";
import { judge, telemetry } from "./judge.js";

// A custom LLM judge, in five parts:
// 1. the judge's role, 2. explicit criteria, 3. labeled examples,
// 4. the data, clearly marked, 5. a constrained answer.
// Make the criteria yours: what would make *you* act on one of these reports?
export const ACTIONABILITY_TEMPLATE = `
You are evaluating a financial report written by an AI research assistant.
Your job is to decide whether it gives actionable investment guidance,
not just a summary of data.

ACTIONABLE: the report
- makes a specific recommendation (buy / hold / sell, or an equivalent like "accumulate below $X")
- names concrete risks, with supporting data
- looks forward, not just back
- explains WHY it recommends what it does

NOT ACTIONABLE: the report
- only summarizes data, with no interpretation
- makes no recommendation or next step
- mentions risks with no evidence
- only describes the past

If the company in the request doesn't exist and the report says so clearly,
that is ACTIONABLE: telling the reader not to act is useful guidance.

Example of an ACTIONABLE report:
"NVDA's data center revenue grew 120% year on year and margins are
expanding; at 35x forward earnings against a sector median of 22x,
the premium is justified only if that growth holds. Key risk: most
revenue comes from a handful of cloud customers. Recommendation:
accumulate on pullbacks; trim if data center growth drops below 40%."

Example of a NOT ACTIONABLE report:
"NVDA is a major player in the semiconductor industry. The company
has seen significant growth in recent years driven by AI demand.
Investors should consider various factors when making decisions."

[BEGIN DATA]
************
User request: {{input}}
************
Financial report: {{output}}
************
[END DATA]

Based on the criteria above, is this financial report ACTIONABLE or NOT ACTIONABLE?
`;

export const actionability = createClassificationEvaluator<{ input: string; output: string }>({
  name: "actionability",
  model: judge,
  telemetry,
  promptTemplate: ACTIONABILITY_TEMPLATE,
  choices: { actionable: 1, "not actionable": 0 },
});
