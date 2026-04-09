import Anthropic from "@anthropic-ai/sdk";
import type { DailyBrief, SourceData } from "./types";

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are a senior GovCon intelligence analyst serving BD professionals — BD directors, capture managers, proposal writers, and executives.

Key priorities:
- Flag recompete opportunities explicitly with incumbent and estimated value
- Note small business set-aside shifts to full and open
- Identify which large primes are winning in each agency
- Connect budget news to near-term procurement implications
- Highlight IDIQ ceiling increases, GWAC task orders, BPA awards

Return your analysis as a JSON object matching the DailyBrief schema exactly.`;

function compact(data: unknown[], limit: number): string {
  return JSON.stringify(data.slice(0, limit));
}

export async function synthesizeBrief(sources: SourceData): Promise<DailyBrief> {
  const today = new Date().toISOString().split("T")[0];

  const historyContext = sources.history.length > 0
    ? `\nPRIOR BRIEFS:${JSON.stringify(sources.history.map(b => ({ date: b.date, bluf: b.bluf, trends: b.trends })))}`
    : "";

  const userPrompt = `Generate today's GovCon brief for ${today}.

SAM.GOV:${compact(sources.sam, 15)}
USASPENDING:${compact(sources.usaspending, 15)}
FPDS:${compact(sources.fpds, 10)}
AGENCY NEWS:${compact(sources.agencies, 10)}
CONGRESS:${compact(sources.congress, 10)}
FED REGISTER:${compact(sources.federalRegister, 10)}
GOVCON NEWS:${compact(sources.news, 10)}${historyContext}

Return JSON:{"date":"${today}","generatedAt":"<ISO>","bluf":"<2-3 sentences>","stories":[<8-12 items with id,headline,source,sourceUrl,sourceName,summary,significance(1-5),analysis,connections[],category(AWARD|SOLICITATION|RECOMPETE|BUDGET|REGULATORY|MARKET)>],"awards":[<top 5: agency,awardee,value(number),vehicle,sourceUrl>],"opportunities":[<top 5: agency,title,naicsCode,responseDate,setAside,sourceUrl>],"recompetes":[<expiring: agency,incumbent,estimatedValue,expirationDate,sourceUrl>],"budgetSignals":"<1 paragraph>","trends":"<2-3 sentences>","topStoryIds":["<2-3 ids>"]}
Use real URLs from source data only. Return ONLY JSON, no markdown.`;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 4096,
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
