// npm run check: is everything set up?
import "dotenv/config";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

const ok = (msg: string) => console.log(`  ✔ ${msg}`);
const fail = (msg: string): never => {
  console.log(`  ✘ ${msg}`);
  process.exit(1);
};

console.log("Checking your setup...\n");

const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 22 || (major === 22 && minor < 12)) fail(`Node ${process.versions.node}: you need 22.12 or later`);
ok(`Node ${process.versions.node}`);

const endpoint = process.env.PHOENIX_ENDPOINT;
if (!endpoint) fail("PHOENIX_ENDPOINT isn't set. Copy .env.example to .env");
try {
  const res = await fetch(`${endpoint}/v1/projects`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  ok(`Phoenix is running at ${endpoint}`);
} catch (err) {
  fail(`Can't reach Phoenix at ${endpoint} (${(err as Error).message}). Is \`npm run phoenix\` running?`);
}

if (!process.env.ANTHROPIC_API_KEY) fail("ANTHROPIC_API_KEY isn't set in .env");
try {
  await generateText({ model: anthropic("claude-haiku-4-5"), prompt: "Reply with the word OK.", maxOutputTokens: 5 });
  ok("Your Anthropic key works");
} catch (err) {
  fail(`Your Anthropic key didn't work: ${(err as Error).message}`);
}

// Send one test trace.
const { flushTraces } = await import("../src/instrumentation.js");
const { withSpan } = await import("@arizeai/phoenix-otel");
await withSpan(async () => "Setup check passed!", { name: "setup_check" })();
await flushTraces();
ok("Sent a test trace to Phoenix (look for setup_check)");

console.log("\n✅ You're ready.");
