import { anthropic } from "@ai-sdk/anthropic";

// The judge is a different, more capable model than the agent (Haiku).
export const JUDGE_MODEL = process.env.JUDGE_MODEL ?? "claude-sonnet-5-5";
export const judge = anthropic(JUDGE_MODEL);

// Don't trace the judge's own LLM calls into our project: we only want traces
// of the agent, not of us testing the agent.
export const telemetry = { isEnabled: false };
