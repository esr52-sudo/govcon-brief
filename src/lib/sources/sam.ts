export async function fetchSamOpportunities(): Promise<unknown[]> {
  const apiKey = process.env.SAM_GOV_API_KEY;
  if (!apiKey) {
    console.warn("SAM_GOV_API_KEY not set, skipping SAM.gov fetch");
    return [];
  }

  const postedFrom = new Date(Date.now() - 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const postedTo = new Date().toISOString().split("T")[0];

  const url = new URL("https://api.sam.gov/opportunities/v2/search");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("postedFrom", postedFrom);
  url.searchParams.set("postedTo", postedTo);
  url.searchParams.set("limit", "50");
  url.searchParams.set("offset", "0");

  try {
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(15000) });
    if (!res.ok) {
      console.error(`SAM.gov API error: ${res.status}`);
      return [];
    }
    const data = await res.json();
    return (data.opportunitiesData ?? []).map((opp: Record<string, unknown>) => ({
      title: opp.title,
      solicitationNumber: opp.solicitationNumber,
      agency: opp.fullParentPathName || opp.departmentName,
      type: opp.type,
      postedDate: opp.postedDate,
      responseDeadLine: opp.responseDeadLine,
      naicsCode: opp.naicsCode,
      setAside: opp.typeOfSetAside,
      classificationCode: opp.classificationCode,
      description: typeof opp.description === "string" ? opp.description.slice(0, 500) : "",
      link: opp.uiLink || `https://sam.gov/opp/${opp.noticeId}/view`,
    }));
  } catch (err) {
    console.error("SAM.gov fetch failed:", err);
    return [];
  }
}
