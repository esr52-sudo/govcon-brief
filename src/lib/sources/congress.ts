export async function fetchCongressBills(): Promise<unknown[]> {
  const apiKey = process.env.CONGRESS_API_KEY;
  if (!apiKey) {
    console.warn("CONGRESS_API_KEY not set, skipping Congress.gov fetch");
    return [];
  }

  const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  try {
    const url = `https://api.congress.gov/v3/bill?fromDateTime=${fromDate}T00:00:00Z&sort=updateDate+desc&limit=30&api_key=${apiKey}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      console.error(`Congress.gov API error: ${res.status}`);
      return [];
    }
    const data = await res.json();
    const bills = data.bills ?? [];
    return bills
      .filter((bill: Record<string, unknown>) => {
        const title = ((bill.title as string) || "").toLowerCase();
        return (
          title.includes("appropriation") ||
          title.includes("defense") ||
          title.includes("homeland") ||
          title.includes("veteran") ||
          title.includes("health") ||
          title.includes("continuing resolution") ||
          title.includes("procurement") ||
          title.includes("budget")
        );
      })
      .map((bill: Record<string, unknown>) => ({
        number: bill.number,
        title: bill.title,
        type: bill.type,
        chamber: bill.originChamber,
        latestAction: bill.latestAction,
        updateDate: bill.updateDate,
        url: bill.url,
        congress: bill.congress,
      }));
  } catch (err) {
    console.error("Congress.gov fetch failed:", err);
    return [];
  }
}
