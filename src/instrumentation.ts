// Tracing setup. Import this before anything else.
import "dotenv/config";
import { register } from "@arizeai/phoenix-otel";
import { ClaudeAgentSDKInstrumentation } from "@arizeai/openinference-instrumentation-claude-agent-sdk";
import * as ClaudeAgentSDKModule from "@anthropic-ai/claude-agent-sdk";

export const PROJECT = process.env.PHOENIX_PROJECT ?? "phoenix-101";

// Sends traces to Phoenix. Reads PHOENIX_ENDPOINT from .env.
export const tracerProvider = register({ projectName: PROJECT });

// The Claude Agent SDK is an ES module, and ES module exports are read-only,
// so the instrumentation can't patch the SDK in place. manuallyInstrument()
// returns a traced *copy* of the SDK instead. Always call query() through this
// export: `import { query } from "@anthropic-ai/claude-agent-sdk"` gets the
// original, untraced function and Phoenix will stay empty.
const instrumentation = new ClaudeAgentSDKInstrumentation();
export const ClaudeAgentSDK = instrumentation.manuallyInstrument(ClaudeAgentSDKModule);

// Scripts exit as soon as they finish, so make sure every span is sent first.
export async function flushTraces() {
  await tracerProvider.forceFlush();
}
