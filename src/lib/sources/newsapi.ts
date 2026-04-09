export async function fetchGovConNews(): Promise<unknown[]> {
  const apiKey = process.env.NEWSAPI_KEY;
  if (!apiKey) {
    console.warn("NEWSAPI_KEY not set, skipping NewsAPI fetch");
    return [];
  }

  const fromDate = new Date(Date.now() - 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const query = encodeURIComponent(
    '"government contracting" OR "federal procurement" OR "GovCon" OR "SAM.gov" OR "IDIQ" OR "GWAC"'
  );

  try {
    const url = `https://newsapi.org/v2/everything?q=${query}&from=${fromDate}&sortBy=relevancy&pageSize=20&apiKey=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      console.error(`NewsAPI error: ${res.status}`);
      return [];
    }
    const data = await res.json();
    return (data.articles ?? []).map((article: Record<string, unknown>) => ({
      title: article.title,
      description: article.description,
      url: article.url,
      source: (article.source as Record<string, unknown>)?.name,
      publishedAt: article.publishedAt,
      content: typeof article.content === "string" ? (article.content as string).slice(0, 500) : "",
    }));
  } catch (err) {
    console.error("NewsAPI fetch failed:", err);
    return [];
  }
}
