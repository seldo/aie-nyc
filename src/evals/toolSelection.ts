import { createToolSelectionEvaluator } from "@arizeai/phoenix-evals";
import { judge, telemetry } from "./judge.js";

// Built-in eval: did the agent pick the right tools for this turn?
export const toolSelection = createToolSelectionEvaluator({ model: judge, telemetry });

// The trace records which tools the agent called, but not which ones it could
// have called, so we describe the Claude Agent SDK's built-in tools ourselves.
export const AVAILABLE_TOOLS = `
WebSearch: search the web and get back results with summaries
WebFetch: fetch the contents of a URL
Write: write a file to disk
Edit: edit a file on disk
Read: read a file from disk
Bash: run a shell command
ToolSearch: look up a tool's definition before using it
`;
