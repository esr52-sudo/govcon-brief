export async function fetchFederalRegister(): Promise<unknown[]> {
  const url = new URL("https://www.federalregister.gov/api/v1/documents.json");
  url.searchParams.set("per_page", "20");
  url.searchParams.set("order", "newest");
  url.searchParams.set(
    "conditions[agencies][]",
    "general-services-administration"
  );
  url.searchParams.set("conditions[term]", "procurement OR contracting OR acquisition");

  try {
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      console.error(`Federal Register API error: ${res.status}`);
      return [];
    }
    const data = await res.json();
    return (data.results ?? []).map((doc: Record<string, unknown>) => ({
      title: doc.title,
      type: doc.type,
      abstract: typeof doc.abstract === "string" ? (doc.abstract as string).slice(0, 500) : "",
      publicationDate: doc.publication_date,
      agencies: doc.agencies,
      htmlUrl: doc.html_url,
      pdfUrl: doc.pdf_url,
      documentNumber: doc.document_number,
    }));
  } catch (err) {
    console.error("Federal Register fetch failed:", err);
    return [];
  }
}
