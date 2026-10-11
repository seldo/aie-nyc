// npm run agent -- TSLA "growth outlook"
import { flushTraces } from "../src/instrumentation.js";
import { financialReport } from "../src/agent.js";

const [tickers = "TSLA", focus = "growth outlook"] = process.argv.slice(2);
console.log(`Researching ${tickers} (${focus})...\n`);

const { report } = await financialReport({ tickers, focus });
console.log(report);

await flushTraces();
console.log("\nDone. Open http://localhost:6006 to see the trace.");
