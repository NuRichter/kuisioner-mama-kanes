import { headers } from "next/headers";
import { hashIp } from "@/lib/security/crypto";
import { issueFormToken } from "@/lib/security/form-token";
import { hitLimit } from "@/lib/security/rate-limit";
import { clientIp, isSameOrigin, plainError } from "@/lib/security/request";

/** Batas penerbitan token per IP: longgar untuk jaringan kampus (NAT), ketat untuk skrip. */
const LIMIT = { count: 120, windowSeconds: 3600 };

/** Menerbitkan token formulir saat responden menyetujui partisipasi. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return plainError("Permintaan ditolak.", 403);
  const ip = hashIp(clientIp(await headers()));
  const rate = await hitLimit(`sesi/${ip}`, LIMIT.count, LIMIT.windowSeconds);
  if (rate.limited) return plainError("Terlalu banyak permintaan. Coba lagi nanti.", 429, { "Retry-After": String(rate.retryAfterSeconds) });
  return Response.json({ token: issueFormToken() }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
