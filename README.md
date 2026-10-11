# Evaluations with Phoenix 101

The workshop repo for **Evaluations with Phoenix 101** at AI Engineer NYC, October 2026.

## Setup

Do these first. They're the slow part.

You need **Node 22.12 or later** (`node --version`) and an **Anthropic API key** from [platform.claude.com](https://platform.claude.com/settings/keys).

**1. Install uv.** It's a fast Python package manager, and it's how we run Phoenix. You don't need Python installed: uv fetches its own.

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

(On Windows, or if that doesn't work, see [the uv docs](https://docs.astral.sh/uv/getting-started/installation/). If you'd rather use Docker, `docker compose up` replaces step 3.)

**2. Get the repo and add your key.**

```bash
git clone https://github.com/seldo/aie-nyc
cd aie-nyc
npm install
cp .env.example .env      # then paste your ANTHROPIC_API_KEY into .env
```

**3. Start Phoenix**, and leave it running. The first run downloads Phoenix, which takes a minute.

```bash
npm run phoenix
```

**4. In a second terminal, check everything works and load the example data.**

```bash
npm run check             # checks Node, Phoenix and your key, and sends a test trace
npm run seed              # loads example traces and human labels
```

`npm run check` ends with a green tick when you're ready. Then open http://localhost:6006 to see Phoenix.

**5. Install the Phoenix plugin or skill for your coding agent.** We use it later, for error analysis.

- Claude Code: `claude plugin marketplace add Arize-ai/phoenix`, then `claude plugin install arize-phoenix@arize-phoenix`, then start a new Claude Code session
- Anything else: `npx skills add Arize-ai/phoenix --skill phoenix-error-analysis`

## What you'll do

You'll build a small financial-analyst agent with the [Claude Agent SDK](https://platform.claude.com/docs/en/agent-sdk/overview), trace it with [Phoenix](https://arize.com/docs/phoenix), and then:

1. read its traces, by hand and with your coding agent
2. write a code eval
3. try two built-in LLM evals
4. write your own LLM judge
5. check that judge against human labels
6. run an experiment to prove a prompt change helped
7. run all of it as a test suite with `npm test`

## The steps

| Step | Command | What it does |
|---|---|---|
| Trace one run | `npm run agent -- TSLA "growth outlook"` | Runs the agent once |
| Trace a batch | `npm run batch` | Runs all 15 queries in `data/queries.json`, five at a time (3–4 minutes) |
| Error analysis | your coding agent | See the prompt below |
| Code eval | `npm run eval:code` | Does each report mention the ticker? |
| Built-in evals | `npm run eval:builtin` | Correctness and faithfulness |
| Tool-call eval | `npm run eval:tools` | Did each agent turn pick sensible tools? (built-in tool selection judge) |
| Custom eval | `npm run eval:custom` | Our actionability judge (`src/evals/actionability.ts`) |
| Meta-eval | `npm run meta` (then `npm run meta -- test`) | Judge vs. human labels, on the dev split then the test split |
| Experiment | `npm run experiment` | Runs the agent on `financial-agent-regressions` and scores it (about 4 minutes). `REPETITIONS=3` runs each example three times, which is what the consistency eval needs |
| Consistency eval | `npm run eval:consistency` | Did every repetition of a question make the same buy/hold/sell call? Runs on an existing experiment; free |
| Try a newer model | `AGENT_MODEL=claude-haiku-5-5 npm run experiment` | Same experiment on Haiku 5.5 (about $1.20 a run; `REPETITIONS=1` for a quicker version) |
| Evals in CI | `npm test` | The same evals as a Vitest suite, with pass/fail acceptance criteria (about 4 minutes) |

Every eval script logs its results back to Phoenix as annotations on the traces.

### Error analysis prompt

Paste this into your coding agent (with the Phoenix plugin or skill installed):

> Use Phoenix at http://localhost:6006, project phoenix-101. Read the financial_report traces. Propose failure categories, count how many traces fall in each, and annotate each trace with its category.

### Step 7: the experiment

Before `npm run experiment`, change `PROMPTS` in `src/prompts.ts` to `IMPROVED_PROMPTS`, or better, write your own. (`PROMPTS=improved npm run experiment` does the same thing without editing.)

The experiment needs a dataset called `financial-agent-regressions`. In the workshop we build it in the Phoenix UI: failing reports in a `fails` split, passing ones in a `passes` split. If it doesn't exist, the script builds it for you from your actionability results.

## What it costs

Each agent run costs about $0.30 in Anthropic usage (Haiku 4.5 plus web searches), and each judge call a few cents (Sonnet 5.5). Roughly:

| Step | Agent runs | Cost |
|---|---|---|
| `npm run batch` | 15 | ~$4.50 |
| `npm run experiment` (16 examples) | 16 | ~$5 plus judging |
| `npm test` | 4 | ~$1.20 |

`REPETITIONS=3` triples the experiment. Haiku 5.5 (`AGENT_MODEL=claude-haiku-5-5`) is about $1.20 a run.

## What's where

```
src/instrumentation.ts   tracing setup (import this first)
src/agent.ts             the agent: two turns, one trace
src/prompts.ts           the prompts: edit these
src/evals/               mentions_ticker, built-ins, actionability
src/lib/                 helpers for reading runs and logging results
scripts/                 one script per step
evals/agent.eval.ts      the Vitest eval suite
data/queries.json        test queries, including some nasty edge cases
data/seed/               pre-captured traces and human labels
.github/workflows/       runs `npm test` in GitHub Actions
```

## Gotchas

- **Phoenix is empty.** Call `query()` through the `ClaudeAgentSDK` exported from `src/instrumentation.ts`, never `import { query } from "@anthropic-ai/claude-agent-sdk"`. The SDK is an ES module, so the instrumentation can only give you a traced copy of it.
- **`npm install` complains about `@anthropic-ai/sdk` peer dependencies.** `.npmrc` sets `legacy-peer-deps` for exactly this; keep it.
- **Running from inside Claude Code?** The agent strips Claude Code's environment variables before starting, so it behaves the same as it would in a plain terminal.
- **Phoenix data lives in `.phoenix-data/`.** Delete that folder to start fresh.
