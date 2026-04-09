import { NextResponse } from "next/server";
import { fetchSamOpportunities } from "@/lib/sources/sam";
import { fetchUSASpendingAwards } from "@/lib/sources/usaspending";
import { fetchFPDS } from "@/lib/sources/fpds";
import { fetchAgencyNews } from "@/lib/sources/agencies";
import { fetchCongressBills } from "@/lib/sources/congress";
import { fetchFederalRegister } from "@/lib/sources/federal-register";
import { fetchGovConNews } from "@/lib/sources/newsapi";
import { fetchBriefHistory } from "@/lib/sources/history";
import { synthesizeBrief } from "@/lib/claude";
import { writeBrief } from "@/lib/cache";
import type { SourceData } from "@/lib/types";

export const maxDuration = 120;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [sam, usaspending, fpds, agencies, congress, federalRegister, news, history] =
      await Promise.allSettled([
        fetchSamOpportunities(),
        fetchUSASpendingAwards(),
        fetchFPDS(),
        fetchAgencyNews(),
        fetchCongressBills(),
        fetchFederalRegister(),
        fetchGovConNews(),
        fetchBriefHistory(7),
      ]);

    const sources: SourceData = {
      sam: sam.status === "fulfilled" ? sam.value : [],
      usaspending: usaspending.status === "fulfilled" ? usaspending.value : [],
      fpds: fpds.status === "fulfilled" ? fpds.value : [],
      agencies: agencies.status === "fulfilled" ? agencies.value : [],
      congress: congress.status === "fulfilled" ? congress.value : [],
      federalRegister: federalRegister.status === "fulfilled" ? federalRegister.value : [],
      news: news.status === "fulfilled" ? news.value : [],
      history: history.status === "fulfilled" ? history.value : [],
    };

    const brief = await synthesizeBrief(sources);
    await writeBrief(brief);

    return NextResponse.json({
      ok: true,
      date: brief.date,
      stories: brief.stories.length,
      awards: brief.awards.length,
      opportunities: brief.opportunities.length,
    });
  } catch (err) {
    console.error("Cron job failed:", err);
    return NextResponse.json(
      { error: "Brief generation failed", details: String(err) },
      { status: 500 }
    );
  }
}
