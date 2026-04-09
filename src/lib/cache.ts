import { put, list } from "@vercel/blob";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import type { DailyBrief } from "./types";

const LOCAL_DIR = join(process.cwd(), ".data", "govcon-briefs");
const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;

function ensureLocalDir() {
  if (!existsSync(LOCAL_DIR)) {
    mkdirSync(LOCAL_DIR, { recursive: true });
  }
}

export async function writeBrief(brief: DailyBrief): Promise<void> {
  const dateKey = brief.date;
  const json = JSON.stringify(brief, null, 2);

  if (useBlob) {
    await Promise.all([
      put(`govcon-briefs/${dateKey}.json`, json, {
        access: "public",
        contentType: "application/json",
        addRandomSuffix: false,
      }),
      put(`govcon-briefs/latest.json`, json, {
        access: "public",
        contentType: "application/json",
        addRandomSuffix: false,
      }),
    ]);
  } else {
    ensureLocalDir();
    writeFileSync(join(LOCAL_DIR, `${dateKey}.json`), json);
    writeFileSync(join(LOCAL_DIR, "latest.json"), json);
  }
}

export async function readLatestBrief(): Promise<DailyBrief | null> {
  try {
    if (useBlob) {
      const { blobs } = await list({ prefix: "govcon-briefs/latest.json", limit: 1 });
      if (blobs.length === 0) return null;
      const res = await fetch(blobs[0].url);
      if (!res.ok) return null;
      return res.json() as Promise<DailyBrief>;
    } else {
      const filePath = join(LOCAL_DIR, "latest.json");
      if (!existsSync(filePath)) return null;
      return JSON.parse(readFileSync(filePath, "utf-8")) as DailyBrief;
    }
  } catch {
    return null;
  }
}
