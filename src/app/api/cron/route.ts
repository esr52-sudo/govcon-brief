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
      await Promise.all([
        (async () => {
          console.log("[cron] Fetching SAM.gov opportunities...");
          try {
            const result = await fetchSamOpportunities();
            console.log(`[cron] SAM.gov fetch complete: ${result.length} items`);
            return result;
          } catch (err) {
            console.error("[cron] SAM.gov fetch failed:", err);
            return [];
          }
        })(),
        (async () => {
          console.log("[cron] Fetching USASpending awards...");
          try {
            const result = await fetchUSASpendingAwards();
            console.log(`[cron] USASpending fetch complete: ${result.length} items`);
            return result;
          } catch (err) {
            console.error("[cron] USASpending fetch failed:", err);
            return [];
          }
        })(),
        (async () => {
          console.log("[cron] Fetching FPDS contracts...");
          try {
            const result = await fetchFPDS();
            console.log(`[cron] FPDS fetch complete: ${result.length} items`);
            return result;
          } catch (err) {
            console.error("[cron] FPDS fetch failed:", err);
            return [];
          }
        })(),
        (async () => {
          console.log("[cron] Fetching agency news...");
          try {
            const result = await fetchAgencyNews();
            console.log(`[cron] Agency news fetch complete: ${result.length} items`);
            return result;
          } catch (err) {
            console.error("[cron] Agency news fetch failed:", err);
            return [];
          }
        })(),
        (async () => {
          console.log("[cron] Fetching Congress bills...");
          try {
            const result = await fetchCongressBills();
            console.log(`[cron] Congress bills fetch complete: ${result.length} items`);
            return result;
          } catch (err) {
            console.error("[cron] Congress bills fetch failed:", err);
            return [];
          }
        })(),
        (async () => {
          console.log("[cron] Fetching Federal Register entries...");
          try {
            const result = await fetchFederalRegister();
            console.log(`[cron] Federal Register fetch complete: ${result.length} items`);
            return result;
          } catch (err) {
            console.error("[cron] Federal Register fetch failed:", err);
            return [];
          }
        })(),
        (async () => {
          console.log("[cron] Fetching GovCon news...");
          try {
            const result = await fetchGovConNews();
            console.log(`[cron] GovCon news fetch complete: ${result.length} items`);
            return result;
          } catch (err) {
            console.error("[cron] GovCon news fetch failed:", err);
            return [];
          }
        })(),
        (async () => {
          console.log("[cron] Fetching brief history...");
          try {
            const result = await fetchBriefHistory(7);
            console.log(`[cron] Brief history fetch complete: ${result.length} items`);
            return result;
          } catch (err) {
            console.error("[cron] Brief history fetch failed:", err);
            return [];
          }
        })(),
      ]);

    const sources: SourceData = {
      sam,
      usaspending,
      fpds,
      agencies,
      congress,
      federalRegister,
      news,
      history,
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
