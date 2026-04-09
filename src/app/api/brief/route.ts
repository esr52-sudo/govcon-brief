import { NextResponse } from "next/server";
import { readLatestBrief } from "@/lib/cache";

export async function GET() {
  const brief = await readLatestBrief();
  if (!brief) {
    return NextResponse.json({ error: "No brief available" }, { status: 404 });
  }
  return NextResponse.json(brief, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
  });
}
