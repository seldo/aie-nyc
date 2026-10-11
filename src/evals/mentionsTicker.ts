import { createEvaluator } from "@arizeai/phoenix-evals";
import type { Query } from "../agent.js";

// Code eval: does the report mention every ticker we asked about?
export const mentionsTicker = createEvaluator(
  ({ input, output }: { input: Query; output: string }) => {
    const tickers = input.tickers.split(",").map((t) => t.trim());
    const missing = tickers.filter((t) => !output.includes(t));
    return missing.length === 0
      ? { label: "pass", score: 1 }
      : { label: "fail", score: 0, explanation: `Missing: ${missing.join(", ")}` };
  },
  { name: "mentions_ticker", kind: "CODE" },
);
