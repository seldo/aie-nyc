import { traceAgent } from "@arizeai/phoenix-otel";
import type { Options } from "@anthropic-ai/claude-agent-sdk";
import { ClaudeAgentSDK } from "./instrumentation.js";
import { PROMPTS, type Prompts } from "./prompts.js";

export type Query = { tickers: string; focus: string };
export type Report = { report: string; research: string };

export const AGENT_MODEL = process.env.AGENT_MODEL ?? "claude-haiku-4-5";

const options: Options = {
  model: AGENT_MODEL,
  // Auto-approve web search. Anything else the agent tries is denied.
  allowedTools: ["WebSearch"],
  permissionMode: "dontAsk",
  // Don't load the user's own Claude Code settings or CLAUDE.md files,
  // so everyone's agent behaves the same way.
  settingSources: [],
  // ...and don't offer it any skills installed on this machine either.
  skills: [],
  // If you run this from inside Claude Code, don't let the agent inherit that
  // session's environment (its tools, permissions and scratch directories).
  env: Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !/^(CLAUDE|MCP_)/.test(key)),
  ),
};

// One turn is one query() call. Passing `resume` continues an earlier session.
async function runTurn(prompt: string, resume?: string) {
  let text = "";
  let sessionId = resume;
  for await (const msg of ClaudeAgentSDK.query({
    prompt,
    options: { ...options, resume },
  })) {
    if (msg.type === "result" && msg.subtype === "success") {
      text = msg.result;
      sessionId = msg.session_id;
    }
  }
  return { text, sessionId };
}

// Two turns, one trace: research, then write, wrapped in one parent span.
export function createFinancialReport(prompts: Prompts = PROMPTS) {
  return traceAgent(
    async ({ tickers, focus }: Query): Promise<Report> => {
      const research = await runTurn(prompts.research(tickers, focus));
      const report = await runTurn(prompts.write, research.sessionId);
      return { report: report.text, research: research.text };
    },
    {
      name: "financial_report",
      // Record just the report as this span's output.
      processOutput: (result) => ({
        "output.value": result.report,
        "output.mime_type": "text/plain",
      }),
    },
  );
}

export const financialReport = createFinancialReport();

export function formatQuery({ tickers, focus }: Query) {
  return `Tickers: ${tickers}\nFocus: ${focus}`;
}
