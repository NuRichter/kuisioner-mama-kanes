import { createHash, timingSafeEqual } from "node:crypto";
import { toCsv } from "@/lib/export/csv";
import { loadResponses, StorageUnavailableError } from "@/lib/storage/responses";

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

function passwordMatches(input: unknown): boolean {
  const expected = process.env.EXPORT_PASSWORD;
  if (!expected || expected.length < 12 || typeof input !== "string") return false;
  return timingSafeEqual(digest(input), digest(expected));
}

/** Unduhan CSV seluruh jawaban, hanya untuk peneliti (kata sandi lewat body, bukan URL). */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { password?: unknown } | null;

  if (!passwordMatches(body?.password)) {
    await new Promise((r) => setTimeout(r, 800));
    return Response.json({ error: "Kata sandi tidak cocok. Periksa kembali lalu coba lagi." }, { status: 401 });
  }

  try {
    const rows = await loadResponses();
    const stamp = new Date().toISOString().slice(0, 10);
    return new Response(toCsv(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="jawaban-kuesioner-${stamp}.csv"`,
        "Cache-Control": "no-store",
        "X-Response-Count": String(rows.length),
      },
    });
  } catch (error) {
    console.error("Gagal memuat jawaban", error);
    const status = error instanceof StorageUnavailableError ? 503 : 500;
    return Response.json({ error: "Data jawaban belum dapat dimuat saat ini." }, { status });
  }
}
