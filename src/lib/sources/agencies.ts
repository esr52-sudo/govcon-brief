import RSSParser from "rss-parser";

const parser = new RSSParser({
  headers: { "User-Agent": "GovConBrief/1.0 (Federal Contracting Intelligence)" },
  timeout: 10000,
});

const AGENCY_FEEDS = [
  { name: "Department of Defense", url: "https://www.defense.gov/DesktopModules/ArticleCS/RSS.ashx?ContentType=1&Site=945&max=10" },
  { name: "HHS", url: "https://www.hhs.gov/rss/news.xml" },
  { name: "DHS", url: "https://www.dhs.gov/news/rss.xml" },
  { name: "GSA", url: "https://www.gsa.gov/rss/gsa-news-releases" },
];

async function fetchFeed(name: string, url: string): Promise<unknown[]> {
  try {
    const feed = await parser.parseURL(url);
    return feed.items.slice(0, 10).map((item) => ({
      title: item.title,
      link: item.link,
      pubDate: item.pubDate || item.isoDate,
      content: typeof item.contentSnippet === "string" ? item.contentSnippet.slice(0, 300) : "",
      source: name,
    }));
  } catch (err) {
    console.error(`${name} RSS feed failed:`, err);
    return [];
  }
}

export async function fetchAgencyNews(): Promise<unknown[]> {
  const results = await Promise.allSettled(
    AGENCY_FEEDS.map((f) => fetchFeed(f.name, f.url))
  );
  return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}
