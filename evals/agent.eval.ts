// npm test: our evals, run as a test suite. Fails the build if quality drops.
import * as px from "@arizeai/phoenix-client/vitest";
import "../src/instrumentation.js";
import { financialReport, formatQuery, type Query } from "../src/agent.js";
import { mentionsTicker } from "../src/evals/mentionsTicker.js";
import { actionability } from "../src/evals/actionability.js";

// Keep the CI set small: every test is a real agent run.
const regressionQueries: { input: Query }[] = [
  { input: { tickers: "KO", focus: "dividend yield and stability" } },
  { input: { tickers: "AAPL, MSFT", focus: "which is the better investment right now" } },
  { input: { tickers: "RIVN", focus: "financial health and cash runway" } },
  { input: { tickers: "ZZZQ", focus: "recent earnings" } },
];

px.describe(
  "financial agent",
  () => {
    px.test.each(regressionQueries)((row) => `report for ${row.input.tickers}`, async ({ input }) => {
      const { report } = await financialReport(input);
      px.logOutput(report);
      await px.evaluate(mentionsTicker);
      await px.evaluate(actionability, { input: formatQuery(input) });
    });
  },
  {
    acceptanceCriteria: [
      // Guardrail: every report must be about the right company.
      {
        annotationName: "mentions_ticker",
        metric: "passRate",
        passFn: (a) => a.score === 1,
        minPassRate: 1,
      },
      // Target: reports should be actionable on average.
      { annotationName: "actionability", metric: "average", threshold: 0.8 },
    ],
  },
);
