// The agent's prompts. These are deliberately bad: one line each.
// Edit them! Everyone's agent will end up a little different.

export type Prompts = {
  research: (tickers: string, focus: string) => string;
  write: string;
};

export const ORIGINAL_PROMPTS: Prompts = {
  research: (tickers, focus) =>
    `Research ${tickers}. Focus on: ${focus}. Use web search to find current financial data.`,
  write: `Now write a concise financial report based on your research above.`,
};

// Step 7: every change here maps to something the evals found.
export const IMPROVED_PROMPTS: Prompts = {
  research: (tickers, focus) => `Research ${tickers}. Focus on: ${focus}.
Use web search to find current financial data, news, and trends.

You MUST gather:
- Specific financial ratios (P/E, debt-to-equity, margins)
- News from the last 6 months
- The current stock price or recent price performance
- Competitive context and market position

If a ticker doesn't exist or you can't find reliable data for it, say so plainly.
Don't guess.`,
  write: `Now write a concise financial report based on your research above.

The report MUST be actionable:
- Make an explicit buy / hold / sell recommendation, with reasons
- Name concrete risks, with supporting data from your research
- Look forward, not just back
- If there are several tickers, include a section comparing them directly
- Only use numbers that appear in your research

Return the report as your reply. Don't write it to a file.`,
};

// Switch this to IMPROVED_PROMPTS (or your own) in step 7.
// PROMPTS=improved in the environment does the same thing.
export const PROMPTS: Prompts =
  process.env.PROMPTS === "improved" ? IMPROVED_PROMPTS : ORIGINAL_PROMPTS;
