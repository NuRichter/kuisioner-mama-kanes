import "server-only";
import { randomUUID } from "node:crypto";
import { openToken, sealToken } from "./crypto";

/**
 * Token formulir diterbitkan server saat responden menyetujui partisipasi.
 * - Waktu mulai berasal dari server, sehingga durasi tidak dapat dipalsukan.
 * - ID token menjadi nama berkas jawaban: satu token hanya bisa menghasilkan satu jawaban.
 * - Pengiriman yang terlalu cepat setelah token terbit ditolak (bot).
 */

interface FormTokenPayload {
  id: string;
  iat: number;
}

/**
 * Tidak mungkin manusia menyelesaikan seluruh kuesioner (53 pernyataan + penyaring)
 * kurang dari ini. FORM_MIN_SECONDS hanya untuk pengujian otomatis.
 */
export const MIN_FILL_SECONDS = (() => {
  const raw = process.env.FORM_MIN_SECONDS?.trim();
  const v = raw ? Number(raw) : NaN;
  return Number.isInteger(v) && v >= 0 ? v : 60;
})();
const MAX_AGE_DAYS = 14;

export function issueFormToken(now = Date.now()): string {
  return sealToken("form", { id: randomUUID(), iat: now } satisfies FormTokenPayload);
}

export type FormTokenCheck =
  | { ok: true; id: string; startedAt: Date }
  | { ok: false; reason: "tidak-sah" | "terlalu-cepat" | "kedaluwarsa" };

export function checkFormToken(token: unknown, now = Date.now()): FormTokenCheck {
  const data = typeof token === "string" ? openToken<FormTokenPayload>("form", token) : null;
  if (!data || typeof data.id !== "string" || !/^[0-9a-f-]{36}$/.test(data.id) || typeof data.iat !== "number") {
    return { ok: false, reason: "tidak-sah" };
  }
  const age = now - data.iat;
  if (age < MIN_FILL_SECONDS * 1000) return { ok: false, reason: "terlalu-cepat" };
  if (age > MAX_AGE_DAYS * 86_400_000) return { ok: false, reason: "kedaluwarsa" };
  return { ok: true, id: data.id, startedAt: new Date(data.iat) };
}
