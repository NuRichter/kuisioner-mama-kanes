import "server-only";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { get, head, list, put } from "@vercel/blob";
import { decrypt, encrypt, encryptionConfigured, isEnvelope } from "@/lib/security/crypto";
import type { StoredResponse } from "@/lib/validation/submission";

const PREFIX = "responses/";
const LOCAL_DIR = path.join(process.cwd(), ".data", "responses");
const isProd = process.env.NODE_ENV === "production";

export class StorageUnavailableError extends Error {}

/**
 * Produksi memakai Vercel Blob privat (butuh BLOB_READ_WRITE_TOKEN).
 * Saat pengembangan lokal tanpa token, jawaban ditulis ke folder .data/
 * yang tidak ikut ter-commit.
 */
function backend(): "blob" | "local" {
  if (process.env.BLOB_READ_WRITE_TOKEN) return "blob";
  if (!isProd || process.env.LOCAL_RESPONSE_STORE === "1") return "local";
  throw new StorageUnavailableError("Penyimpanan jawaban belum dikonfigurasi.");
}

/**
 * Setiap jawaban dienkripsi AES-256-GCM sebelum disimpan. Di Blob produksi,
 * enkripsi wajib: tanpa DATA_ENCRYPTION_KEY, penyimpanan menolak menulis
 * (fail closed) alih-alih menyimpan teks biasa.
 */
function serialize(record: StoredResponse, target: "blob" | "local"): string {
  if (encryptionConfigured()) return JSON.stringify(encrypt(JSON.stringify(record)));
  if (target === "blob") throw new StorageUnavailableError("DATA_ENCRYPTION_KEY belum dikonfigurasi; jawaban tidak disimpan tanpa enkripsi.");
  return JSON.stringify(record);
}

function deserialize(text: string): StoredResponse {
  const parsed = JSON.parse(text) as unknown;
  return (isEnvelope(parsed) ? JSON.parse(decrypt(parsed)) : parsed) as StoredResponse;
}

/** Nama berkas = waktu mulai + ID token formulir, sehingga satu token hanya satu jawaban. */
function fileName(r: StoredResponse) {
  return `${r.startedAt.replace(/[:.]/g, "-")}_${r.id}.json`;
}

export type SaveResult = "tersimpan" | "duplikat";

export async function saveResponse(record: StoredResponse): Promise<SaveResult> {
  const target = backend();
  const body = serialize(record, target);
  if (target === "blob") {
    const pathname = PREFIX + fileName(record);
    try {
      await put(pathname, body, { access: "private", contentType: "application/json", addRandomSuffix: false, allowOverwrite: false });
      return "tersimpan";
    } catch (error) {
      // Tanpa allowOverwrite, berkas yang sudah ada membuat put gagal: itu kiriman ulang.
      const existing = await head(pathname).catch(() => null);
      if (existing) return "duplikat";
      throw error;
    }
  }
  await mkdir(LOCAL_DIR, { recursive: true });
  try {
    await writeFile(path.join(LOCAL_DIR, fileName(record)), body, { encoding: "utf8", flag: "wx" });
    return "tersimpan";
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") return "duplikat";
    throw error;
  }
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
          return deserialize(await new Response(res.stream).text());
        }),
      );
      for (const r of batch) if (r) out.push(r);
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
  } else {
    const files = await readdir(LOCAL_DIR).catch(() => [] as string[]);
    for (const f of files.filter((f) => f.endsWith(".json"))) {
      out.push(deserialize(await readFile(path.join(LOCAL_DIR, f), "utf8")));
    }
  }
  return out.sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));
}
