import "server-only";

type HeaderSource = Pick<Headers, "get">;

/**
 * IP klien. Di Vercel, x-forwarded-for ditulis ulang oleh edge sehingga entri
 * pertama dapat dipercaya; di lokal jatuh ke "lokal".
 */
export function clientIp(headers: HeaderSource): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "lokal";
}

/**
 * Hanya terima permintaan tulis dari halaman situs ini sendiri. Browser selalu
 * mengirim Origin pada fetch POST; permintaan tanpa Origin atau dari situs lain ditolak.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return false;
  try {
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function isJson(request: Request): boolean {
  return (request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json");
}

export function plainError(message: string, status: number, extra?: Record<string, string>) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store", ...extra } });
}
