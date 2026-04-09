import Anthropic from "@anthropic-ai/sdk";
import type { DailyBrief, SourceData } from "./types";

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are a senior GovCon intelligence analyst serving Business Development professionals — BD directors, capture managers, proposal writers, and C-suite executives at government contracting firms.

Your daily brief is read at 7 AM ET by people who need to act on this intelligence. Be precise, actionable, and direct.

Key analytical priorities:
- Flag recompete opportunities explicitly — when an incumbent contract is expiring, name the incumbent and estimated value
- Note when small business set-asides shift to full and open competition — this signals market openings for large primes
- Identify which large primes (Leidos, Booz Allen, SAIC, Northrop, Raytheon, L3Harris, General Dynamics, ManTech, CACI, Perspecta) are winning in each agency
- Connect budget news (CRs, appropriations, shutdown risks) to near-term procurement implications
- Highlight any IDIQ ceiling increases, GWAC task orders, or BPA awards
- Note protest activity that could delay awards

Return your analysis as a JSON object matching the DailyBrief schema exactly.`;

export async function synthesizeBrief(sources: SourceData): Promise<DailyBrief> {
  const today = new Date().toISOString().split("T")[0];

  const historyContext = sources.history.length > 0
    ? `\n\nHISTORICAL BRIEFS (last ${sources.history.length} days for trend tracking):\n${JSON.stringify(sources.history.map(b => ({ date: b.date, bluf: b.bluf, trends: b.trends, topStoryIds: b.topStoryIds })), null, 2)}`
    : "";

  const userPrompt = `Analyze the following data sources and generate today's GovCon intelligence brief for ${today}.

SAM.GOV OPPORTUNITIES (last 24h):
${JSON.stringify(sources.sam.slice(0, 30), null, 2)}

USASPENDING AWARDS (last 7 days):
${JSON.stringify(sources.usaspending.slice(0, 30), null, 2)}

FPDS CONTRACT ACTIONS:
${JSON.stringify(sources.fpds.slice(0, 20), null, 2)}

AGENCY NEWS:
${JSON.stringify(sources.agencies.slice(0, 20), null, 2)}

CONGRESSIONAL ACTIVITY:
${JSON.stringify(sources.congress.slice(0, 15), null, 2)}

FEDERAL REGISTER (procurement/contracting rules):
${JSON.stringify(sources.federalRegister.slice(0, 15), null, 2)}

GOVCON NEWS:
${JSON.stringify(sources.news.slice(0, 15), null, 2)}
${historyContext}

Return a JSON object with this exact structure:
{
  "date": "${today}",
  "generatedAt": "<ISO timestamp>",
  "bluf": "<2-3 sentence bottom line for a BD executive reading at 7am>",
  "stories": [<array of 8-12 items, each with: id (string like "story-1"), headline, source, sourceUrl, sourceName, summary, significance (1-5), analysis, connections (array of related story ids), category (AWARD|SOLICITATION|RECOMPETE|BUDGET|REGULATORY|MARKET)>],
  "awards": [<top 5 largest contract awards with: agency, awardee, value (number in dollars), vehicle, sourceUrl>],
  "opportunities": [<top 5 upcoming solicitations with: agency, title, naicsCode, responseDate, setAside, sourceUrl>],
  "recompetes": [<any identified incumbent contracts expiring with: agency, incumbent, estimatedValue (number), expirationDate, sourceUrl>],
  "budgetSignals": "<1 paragraph on CR status, appropriations news, agency spending pace>",
  "trends": "<2-3 sentences on patterns across the past week>",
  "topStoryIds": [<ids of 2-3 most important items>]
}

If data is sparse for a section, still include the key with reasonable content based on available information. Every sourceUrl must be a real URL from the source data — never fabricate URLs.
Return ONLY the JSON object, no markdown wrapping.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  const cleaned = text.replace(/^```json?\s*/, "").replace(/\s*```$/, "").trim();
  return JSON.parse(cleaned) as DailyBrief;
}
