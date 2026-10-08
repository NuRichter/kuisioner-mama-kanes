import { analyze } from "@/lib/analytics/analyze";
import { parseOptions } from "@/lib/analytics/options";
import { hasSession, verifyDownloadToken } from "@/lib/auth/session";
import { toCsv } from "@/lib/export/csv";
import { loadResponses } from "@/lib/storage/responses";

const types = {
  csv: "text/csv; charset=utf-8",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
} as const;

type Format = keyof typeof types;

/** Unduhan laporan peneliti. Hanya untuk sesi peneliti yang valid. */
export async function GET(request: Request, ctx: RouteContext<"/api/laporan/[format]">) {
  const { format } = await ctx.params;
  if (!(format in types)) return Response.json({ error: "Format tidak dikenal." }, { status: 404 });
  const url = new URL(request.url);
  // Izin dari cookie sesi, atau dari token unduhan untuk download manager yang tidak membawa cookie.
  const allowed = verifyDownloadToken(url.searchParams.get("t"), format) || (await hasSession());
  if (!allowed) {
    // 403 (bukan 401) agar browser dan download manager tidak memunculkan kotak username/password.
    return new Response(
      "Tautan unduhan tidak berlaku atau sudah kedaluwarsa (30 menit). Buka kembali /peneliti, lalu unduh ulang dari dasbor.",
      { status: 403, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } },
    );
  }
  const options = parseOptions(url.searchParams);

  try {
    const records = await loadResponses();
    const a = analyze(records, options);
    const stamp = new Date().toISOString().slice(0, 10);
    let body: Buffer | string;
    let name: string;

    switch (format as Format) {
      case "csv": {
        const clean = url.searchParams.get("isi") === "bersih";
        body = toCsv(a.screened.filter((s) => !clean || s.kept).map((s) => s.record));
        name = `jawaban-${clean ? "bersih" : "mentah"}-${stamp}.csv`;
        break;
      }
      case "xlsx": {
        const { buildWorkbook } = await import("@/lib/export/xlsx");
        body = await buildWorkbook(a);
        name = `analisis-kuesioner-${stamp}.xlsx`;
        break;
      }
      case "pdf": {
        const { buildPdf } = await import("@/lib/export/pdf");
        body = await buildPdf(a);
        name = `laporan-kuesioner-${stamp}.pdf`;
        break;
      }
      case "pptx": {
        const { buildDeck } = await import("@/lib/export/pptx");
        body = await buildDeck(a);
        name = `presentasi-kuesioner-${stamp}.pptx`;
        break;
      }
    }

    return new Response(typeof body === "string" ? body : new Uint8Array(body), {
      headers: {
        "Content-Type": types[format as Format],
        "Content-Disposition": `attachment; filename="${name}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error(`Gagal membuat laporan ${format}`, error);
    return Response.json({ error: "Laporan belum dapat dibuat. Coba lagi dalam beberapa saat." }, { status: 500 });
  }
}
