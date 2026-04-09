import { list } from "@vercel/blob";
import { readdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import type { DailyBrief } from "../types";

const LOCAL_DIR = join(process.cwd(), ".data", "govcon-briefs");
const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;

export async function fetchBriefHistory(days: number = 7): Promise<DailyBrief[]> {
  try {
    if (useBlob) {
      const token = process.env.BLOB_READ_WRITE_TOKEN;
      const { blobs } = await list({ prefix: "govcon-briefs/", limit: 100, token });
      const datedBlobs = blobs
        .filter((b) => b.pathname.match(/govcon-briefs\/\d{4}-\d{2}-\d{2}\.json$/))
        .sort((a, b) => b.pathname.localeCompare(a.pathname))
        .slice(0, days);

      const briefs = await Promise.allSettled(
        datedBlobs.map(async (blob) => {
          const fetchUrl = blob.downloadUrl ?? blob.url;
          const res = await fetch(fetchUrl, {
            cache: "no-store",
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (!res.ok) return null;
          return res.json() as Promise<DailyBrief>;
        })
      );

      return briefs
        .filter((r): r is PromiseFulfilledResult<DailyBrief | null> => r.status === "fulfilled")
        .map((r) => r.value)
        .filter((b): b is DailyBrief => b !== null);
    } else {
      if (!existsSync(LOCAL_DIR)) return [];
      const files = readdirSync(LOCAL_DIR)
        .filter((f) => f.match(/^\d{4}-\d{2}-\d{2}\.json$/))
        .sort((a, b) => b.localeCompare(a))
        .slice(0, days);

      return files.map((f) =>
        JSON.parse(readFileSync(join(LOCAL_DIR, f), "utf-8")) as DailyBrief
      );
    }
  } catch (err) {
    console.error("Brief history fetch failed:", err);
    return [];
  }
}
