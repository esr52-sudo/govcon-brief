import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { fetchBriefHistory } from "@/lib/sources/history";

export const maxDuration = 60;

export async function POST(request: Request) {
  const { messages } = (await request.json()) as { messages: UIMessage[] };

  const history = await fetchBriefHistory(7);
  const briefContext = history.length > 0
    ? history.map((b) => `--- Brief for ${b.date} ---\nBLUF: ${b.bluf}\nTrends: ${b.trends}\nBudget: ${b.budgetSignals}\nTop Awards: ${b.awards.map((a) => `${a.awardee} — $${(a.value / 1e6).toFixed(1)}M (${a.agency})`).join("; ")}\nTop Opportunities: ${b.opportunities.map((o) => `${o.title} (${o.agency}, ${o.setAside})`).join("; ")}\nStories: ${b.stories.map((s) => `[${s.category}] ${s.headline}`).join("; ")}`).join("\n\n")
    : "No historical briefs available yet.";

  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    system: `You are a senior GovCon Business Development intelligence analyst. You have access to the last 7 days of daily intelligence briefs for context.

Your role is to answer questions about federal contracting opportunities, awards, recompetes, budget signals, and market trends. Be specific, cite sources when available, and frame answers in terms of BD implications.

When discussing dollar amounts, use $XM or $XB format. When discussing timelines, note response deadlines and fiscal year context.

RECENT INTELLIGENCE BRIEFS:
${briefContext}`,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
