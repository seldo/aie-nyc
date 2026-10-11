// npm run batch: run every query in data/queries.json, five at a time.
import { flushTraces } from "../src/instrumentation.js";
import { financialReport, type Query } from "../src/agent.js";
import { mapPool } from "../src/lib/pool.js";
import queries from "../data/queries.json" with { type: "json" };

const CONCURRENCY = Number(process.env.CONCURRENCY ?? 5);
const started = Date.now();

await mapPool(queries as Query[], CONCURRENCY, async (query, i) => {
  const label = `[${i + 1}/${queries.length}] ${query.tickers}: ${query.focus}`;
  console.log(`${label} ...`);
  try {
    await financialReport(query);
    console.log(`${label} done`);
  } catch (err) {
    console.log(`${label} FAILED: ${(err as Error).message}`);
  }
});

await flushTraces();
console.log(`\nAll done in ${Math.round((Date.now() - started) / 1000)}s.`);
