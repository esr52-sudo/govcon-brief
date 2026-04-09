export async function fetchUSASpendingAwards(): Promise<unknown[]> {
  const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const endDate = new Date().toISOString().split("T")[0];

  const body = {
    filters: {
      time_period: [{ start_date: startDate, end_date: endDate }],
      award_type_codes: ["A", "B", "C", "D"],
      agencies: [
        { type: "funding", tier: "toptier", name: "Department of Defense" },
        { type: "funding", tier: "toptier", name: "Department of Health and Human Services" },
        { type: "funding", tier: "toptier", name: "Department of Homeland Security" },
        { type: "funding", tier: "toptier", name: "General Services Administration" },
        { type: "funding", tier: "toptier", name: "Department of Veterans Affairs" },
      ],
    },
    fields: [
      "Award ID",
      "Recipient Name",
      "Award Amount",
      "Awarding Agency",
      "Award Type",
      "Start Date",
      "Description",
    ],
    limit: 50,
    page: 1,
    sort: "Award Amount",
    order: "desc",
  };

  try {
    const res = await fetch(
      "https://api.usaspending.gov/api/v2/search/spending_by_award/",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      }
    );
    if (!res.ok) {
      console.error(`USASpending API error: ${res.status}`);
      return [];
    }
    const data = await res.json();
    return (data.results ?? []).map((award: Record<string, unknown>) => ({
      awardId: award["Award ID"],
      recipient: award["Recipient Name"],
      amount: award["Award Amount"],
      agency: award["Awarding Agency"],
      type: award["Award Type"],
      startDate: award["Start Date"],
      description: typeof award["Description"] === "string" ? (award["Description"] as string).slice(0, 500) : "",
    }));
  } catch (err) {
    console.error("USASpending fetch failed:", err);
    return [];
  }
}
