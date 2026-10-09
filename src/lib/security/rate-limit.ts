import "server-only";
import { del, get, put } from "@vercel/blob";

/**
 * Pembatas laju jendela tetap. Di produksi penghitung disimpan di Vercel Blob
 * (privat) agar berlaku lintas instans serverless; di lokal cukup di memori.
 * Penghitung bersifat perkiraan (tanpa transaksi atomik), cukup untuk
 * memperlambat tebakan kata sandi dan spam.
 */

interface Counter {
  count: number;
  resetAt: number;
}

const memory = new Map<string, Counter>();
const blobBackend = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const path = (key: string) => `sistem/batas/${key}.json`;

async function read(key: string, now: number): Promise<Counter | null> {
  let counter: Counter | null = null;
  if (blobBackend()) {
    try {
      const res = await get(path(key), { access: "private", useCache: false });
      if (res?.stream) counter = JSON.parse(await new Response(res.stream).text()) as Counter;
    } catch {
      counter = null;
    }
  } else {
    counter = memory.get(key) ?? null;
  }
  return counter && counter.resetAt > now ? counter : null;
}

async function write(key: string, counter: Counter) {
  if (blobBackend()) {
    await put(path(key), JSON.stringify(counter), { access: "private", contentType: "application/json", addRandomSuffix: false, allowOverwrite: true });
  } else {
    memory.set(key, counter);
  }
}

export interface LimitState {
  count: number;
  limited: boolean;
  retryAfterSeconds: number;
}

/** Lihat penghitung tanpa menambah. */
export async function peekLimit(key: string, limit: number, now = Date.now()): Promise<LimitState> {
  const c = await read(key, now);
  const count = c?.count ?? 0;
  return { count, limited: count >= limit, retryAfterSeconds: c ? Math.ceil((c.resetAt - now) / 1000) : 0 };
}

/** Tambah satu pada penghitung dan kembalikan statusnya. */
export async function hitLimit(key: string, limit: number, windowSeconds: number, now = Date.now()): Promise<LimitState> {
  const c = (await read(key, now)) ?? { count: 0, resetAt: now + windowSeconds * 1000 };
  c.count += 1;
  try {
    await write(key, c);
  } catch (error) {
    // Kegagalan penyimpanan penghitung tidak boleh memblokir pengguna sah.
    console.error("Gagal menyimpan penghitung laju", error);
  }
  return { count: c.count, limited: c.count > limit, retryAfterSeconds: Math.ceil((c.resetAt - now) / 1000) };
}

export async function resetLimit(key: string) {
  if (blobBackend()) {
    await del(path(key)).catch(() => undefined);
  } else {
    memory.delete(key);
  }
}
