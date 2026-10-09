import { headers } from "next/headers";
import { checkSubmission } from "@/lib/validation/submission";
import { audit } from "@/lib/security/audit";
import { hashIp } from "@/lib/security/crypto";
import { checkFormToken } from "@/lib/security/form-token";
import { hitLimit } from "@/lib/security/rate-limit";
import { clientIp, isJson, isSameOrigin, plainError } from "@/lib/security/request";
import { saveResponse, StorageUnavailableError } from "@/lib/storage/responses";

const MAX_BODY_BYTES = 32_000;
/** Longgar untuk banyak responden di satu jaringan kampus, cukup untuk menahan spam. */
const LIMIT = { count: 40, windowSeconds: 3600 };

export async function POST(request: Request) {
  if (!isSameOrigin(request) || !isJson(request)) return plainError("Permintaan ditolak.", 403);

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) return plainError("Data jawaban terlalu besar.", 413);
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return plainError("Data jawaban terlalu besar.", 413);

  const ip = hashIp(clientIp(await headers()));
  const rate = await hitLimit(`jawaban/${ip}`, LIMIT.count, LIMIT.windowSeconds);
  if (rate.limited) {
    await audit("jawaban.ditolak", { alasan: "batas-laju", ip });
    return plainError("Terlalu banyak pengiriman dari jaringan ini. Coba lagi nanti.", 429, { "Retry-After": String(rate.retryAfterSeconds) });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return plainError("Format data tidak dikenali.", 400);
  }

  const now = new Date();
  const token = checkFormToken((body as { formToken?: unknown } | null)?.formToken, now.getTime());
  if (!token.ok) {
    await audit("jawaban.ditolak", { alasan: `token-${token.reason}`, ip });
    const message =
      token.reason === "terlalu-cepat"
        ? "Jawaban dikirim terlalu cepat untuk diproses. Tunggu sebentar, lalu kirim lagi."
        : "Sesi pengisian tidak dikenali. Muat ulang halaman, lalu kirim lagi.";
    return plainError(message, 422);
  }

  const result = checkSubmission(body, now, token.startedAt);
  if (!result.ok) {
    return Response.json({ error: result.reason, fields: result.fields }, { status: 422, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const saved = await saveResponse({ id: token.id, receivedAt: now.toISOString(), ...result.record });
    // Kiriman ulang dari token yang sama dianggap berhasil (idempoten), tanpa menyimpan dua kali.
    return Response.json({ id: token.id, duplicate: saved === "duplikat" }, { status: saved === "duplikat" ? 200 : 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const unavailable = error instanceof StorageUnavailableError;
    console.error("Gagal menyimpan jawaban", unavailable ? error.message : error);
    return plainError("Jawaban belum dapat disimpan saat ini.", unavailable ? 503 : 500);
  }
}
