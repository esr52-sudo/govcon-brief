import RSSParser from "rss-parser";

const parser = new RSSParser();

export async function fetchFPDS(): Promise<unknown[]> {
  try {
    const feed = await parser.parseURL(
      "https://www.fpds.gov/ezsearch/FEEDS/ATOM?FEEDNAME=PUBLIC&q=LAST_MOD_DATE:[" +
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0] +
        "," +
        new Date().toISOString().split("T")[0] +
        "]&start=0&rows=30"
    );
    return feed.items.map((item) => ({
      title: item.title,
      link: item.link,
      pubDate: item.pubDate || item.isoDate,
      content: typeof item.contentSnippet === "string" ? item.contentSnippet.slice(0, 500) : "",
      source: "FPDS",
    }));
  } catch (err) {
    console.error("FPDS fetch failed:", err);
    return [];
  }
}
