import "server-only";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { get, list, put } from "@vercel/blob";
import type { StoredResponse } from "@/lib/validation/submission";

const PREFIX = "responses/";
const LOCAL_DIR = path.join(process.cwd(), ".data", "responses");

export class StorageUnavailableError extends Error {}

/**
 * Produksi memakai Vercel Blob privat (butuh BLOB_READ_WRITE_TOKEN).
 * Saat pengembangan lokal tanpa token, jawaban ditulis ke folder .data/
 * yang tidak ikut ter-commit.
 */
function backend(): "blob" | "local" {
  if (process.env.BLOB_READ_WRITE_TOKEN) return "blob";
  if (process.env.NODE_ENV !== "production" || process.env.LOCAL_RESPONSE_STORE === "1") return "local";
  throw new StorageUnavailableError("Penyimpanan jawaban belum dikonfigurasi.");
}

function fileName(r: StoredResponse) {
  return `${r.receivedAt.replace(/[:.]/g, "-")}_${r.id}.json`;
}

export async function saveResponse(record: StoredResponse): Promise<void> {
  const body = JSON.stringify(record);
  if (backend() === "blob") {
    await put(PREFIX + fileName(record), body, {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
    });
    return;
  }
  await mkdir(LOCAL_DIR, { recursive: true });
  await writeFile(path.join(LOCAL_DIR, fileName(record)), body, "utf8");
}

export async function loadResponses(): Promise<StoredResponse[]> {
  const out: StoredResponse[] = [];
  if (backend() === "blob") {
    let cursor: string | undefined;
    do {
      const page = await list({ prefix: PREFIX, cursor, limit: 1000 });
      const batch = await Promise.all(
        page.blobs.map(async (b) => {
          const res = await get(b.pathname, { access: "private", useCache: false });
          if (!res?.stream) return null;
          return JSON.parse(await new Response(res.stream).text()) as StoredResponse;
        }),
      );
      for (const r of batch) if (r) out.push(r);
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
  } else {
    const files = await readdir(LOCAL_DIR).catch(() => [] as string[]);
    for (const f of files.filter((f) => f.endsWith(".json"))) {
      out.push(JSON.parse(await readFile(path.join(LOCAL_DIR, f), "utf8")) as StoredResponse);
    }
  }
  return out.sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));
}
