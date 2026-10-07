import "server-only";
import ExcelJS from "exceljs";
import type { Analysis } from "@/lib/analytics/analyze";
import { describeOptions } from "@/lib/analytics/options";
import { codebook } from "./codebook";
import { columns } from "./csv";

const PINE = "FF1F5C4E";
const INK = "FF15191B";
const WASH = "FFE2ECE7";

function styleHeader(ws: ExcelJS.Worksheet, row = 1) {
  const r = ws.getRow(row);
  r.font = { bold: true, color: { argb: "FFF5F8F6" }, name: "Calibri", size: 11 };
  r.fill = { type: "pattern", pattern: "solid", fgColor: { argb: PINE } };
  r.alignment = { vertical: "middle", wrapText: true };
  r.height = 22;
  ws.views = [{ state: "frozen", ySplit: row }];
}

function num(v: number, digits = 3) {
  return Number.isFinite(v) ? Number(v.toFixed(digits)) : null;
}

function addData(wb: ExcelJS.Workbook, name: string, a: Analysis, keptOnly: boolean) {
  const ws = wb.addWorksheet(name);
  const rows = a.screened.filter((s) => !keptOnly || s.kept);
  ws.columns = [...columns.map((c) => ({ header: c.key, key: c.key, width: Math.max(9, c.key.length + 2) })), { header: "dipertahankan", key: "dipertahankan", width: 14 }];
  for (const s of rows) {
    const values: Record<string, string | number> = {};
    for (const c of columns) {
      const v = c.value(s.record);
      values[c.key] = typeof v === "string" && /^\d+$/.test(v) && v.length < 6 ? Number(v) : v;
    }
    values.dipertahankan = s.kept ? 1 : 0;
    ws.addRow(values);
  }
  styleHeader(ws);
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length + 1 } };
}

function addMatrix(wb: ExcelJS.Workbook, name: string, labels: string[], values: number[][], note: string) {
  const ws = wb.addWorksheet(name);
  ws.addRow([note]).font = { italic: true, color: { argb: "FF5E676C" } };
  ws.addRow(["", ...labels]);
  labels.forEach((l, i) => {
    const row = ws.addRow([l, ...values[i].map((v, j) => (j < i ? num(v) : null))]);
    row.eachCell((cell, col) => {
      const v = values[i][col - 2];
      if (col > 1 && col - 2 < i && Number.isFinite(v)) {
        const strength = Math.min(1, Math.abs(v));
        const shade = Math.round(255 - strength * 120).toString(16).padStart(2, "0");
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: v < 0 ? `FFFF${shade}${shade}` : `FF${shade}FF${shade}` } };
        cell.numFmt = "0.00";
      }
    });
  });
  styleHeader(ws, 2);
  ws.getColumn(1).width = 26;
  for (let c = 2; c <= labels.length + 1; c++) ws.getColumn(c).width = 12;
}

export async function buildWorkbook(a: Analysis): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Kuesioner Penelitian";
  wb.created = new Date(a.generatedAt);

  // Ringkasan dan insight.
  const sum = wb.addWorksheet("Ringkasan");
  sum.getColumn(1).width = 34;
  sum.getColumn(2).width = 90;
  sum.addRow(["Laporan data kuesioner"]).font = { bold: true, size: 16, color: { argb: INK } };
  sum.addRow(["Kredibilitas Sumber Manusia dan Sistem Cerdas dalam Ekosistem Investasi Digital"]).font = { italic: true };
  sum.addRow([]);
  const facts: [string, string | number][] = [
    ["Dibuat", new Date(a.generatedAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) + " WIB"],
    ["Filter", describeOptions(a.options)],
    ["Jawaban tersimpan", a.totals.stored],
    ["Responden bersih", a.totals.clean],
    ["Dianalisis", a.totals.analyzed],
    ["Versi CD : DC", `${a.versions.CD} : ${a.versions.DC}`],
    ["Median durasi (menit)", num(a.durations.median, 1) ?? "-"],
  ];
  for (const f of facts) sum.addRow(f).getCell(1).font = { bold: true };
  sum.addRow([]);
  const ih = sum.addRow(["Insight", "Uraian dan dasar"]);
  ih.font = { bold: true, color: { argb: "FFF5F8F6" } };
  ih.fill = { type: "pattern", pattern: "solid", fgColor: { argb: PINE } };
  for (const i of a.insights) {
    const row = sum.addRow([i.title, `${i.body}\nDasar: ${i.basis}`]);
    row.alignment = { wrapText: true, vertical: "top" };
    row.getCell(1).font = { bold: true };
  }

  addData(wb, "Data mentah", a, false);
  addData(wb, "Data bersih", a, true);

  const cb = wb.addWorksheet("Kodebook");
  cb.columns = [
    { header: "Variabel", key: "variable", width: 18 },
    { header: "Pertanyaan atau keterangan", key: "description", width: 80 },
    { header: "Nilai", key: "values", width: 60 },
    { header: "Kode pemakaian", key: "usage", width: 16 },
  ];
  for (const r of codebook()) cb.addRow(r).alignment = { wrapText: true, vertical: "top" };
  styleHeader(cb);

  const cs = wb.addWorksheet("Konstruk");
  cs.columns = [
    { header: "Kode", key: "id", width: 10 },
    { header: "Konstruk", key: "name", width: 36 },
    { header: "Pemakaian", key: "usage", width: 11 },
    { header: "Disertasi", key: "dis", width: 28 },
    { header: "Artikel turunan", key: "art", width: 34 },
    { header: "Butir", key: "k", width: 7 },
    { header: "Rerata", key: "mean", width: 9 },
    { header: "SD", key: "sd", width: 8 },
    { header: "Cronbach α", key: "alpha", width: 11 },
  ];
  for (const c of a.constructStats)
    cs.addRow({ id: c.construct.id, name: c.construct.name, usage: c.construct.usage, dis: c.construct.dissertation, art: c.construct.article, k: c.construct.items.length, mean: num(c.mean), sd: num(c.sd), alpha: num(c.alpha) });
  cs.addRow({ id: "TIP", name: "Kepercayaan terhadap platform (11 butir)", usage: "D", dis: "Mediator utama", art: "Tidak dipakai", k: 11, alpha: num(a.tipAlpha) });
  styleHeader(cs);
  cs.getColumn("alpha").eachCell((cell, row) => {
    if (row > 1 && typeof cell.value === "number" && cell.value < 0.7) cell.font = { bold: true, color: { argb: "FFA1352A" } };
  });

  const it = wb.addWorksheet("Butir");
  it.columns = [
    { header: "Kode", key: "code", width: 11 },
    { header: "Konstruk", key: "construct", width: 30 },
    { header: "Pernyataan", key: "text", width: 70 },
    { header: "Rerata", key: "mean", width: 9 },
    { header: "SD", key: "sd", width: 8 },
    ...[1, 2, 3, 4, 5].map((v) => ({ header: `n skor ${v}`, key: `n${v}`, width: 9 })),
    { header: "r butir-total", key: "itr", width: 12 },
    { header: "α jika dihapus", key: "aid", width: 13 },
  ];
  for (const c of a.constructStats)
    for (const i of c.items)
      it.addRow({ code: i.code, construct: c.construct.name, text: i.text, mean: num(i.mean), sd: num(i.sd), n1: i.dist[0], n2: i.dist[1], n3: i.dist[2], n4: i.dist[3], n5: i.dist[4], itr: num(i.itemTotal), aid: num(i.alphaIfDeleted) }).alignment = { wrapText: true, vertical: "top" };
  styleHeader(it);

  const labels = a.correlations.blocks.map((b) => b.label);
  addMatrix(wb, "Korelasi", labels, a.correlations.r, "Korelasi Pearson antar skor konstruk (segitiga bawah).");
  addMatrix(wb, "HTMT", labels, a.correlations.htmt, "HTMT (Henseler dkk., 2015). Ambang 0,85 konservatif; 0,90 longgar.");

  const an = wb.addWorksheet("Uji tambahan");
  an.getColumn(1).width = 46;
  an.getColumn(2).width = 14;
  an.getColumn(3).width = 14;
  an.getColumn(4).width = 14;
  an.getColumn(5).width = 14;
  const hvm = a.humanVsMachine;
  const head = (cells: string[]) => {
    const r = an.addRow(cells);
    r.font = { bold: true };
    r.fill = { type: "pattern", pattern: "solid", fgColor: { argb: WASH } };
  };
  head(["Manusia vs mesin (uji t berpasangan)", "FC", "RAC", "t", "p"]);
  an.addRow(["Rerata kredibilitas", num(hvm.fc), num(hvm.rac), num(hvm.test?.t ?? NaN), num(hvm.test?.p ?? NaN, 4)]);
  an.addRow([]);
  head(["Efek urutan (uji t Welch)", "CD", "DC", "t", "p"]);
  for (const e of a.orderEffect) an.addRow([e.label, num(e.cd), num(e.dc), num(e.test?.t ?? NaN), num(e.test?.p ?? NaN, 4)]);
  an.addRow([]);
  head(["Kuadran kepercayaan platform x persepsi risiko", "n", "Niat", "", ""]);
  for (const q of a.trustRisk.quadrants) an.addRow([q.label, q.count, num(q.intention)]);
  an.addRow([]);
  head(["Validitas diskriminan (catatan peneliti nomor 3)", "r", "Batas", "", ""]);
  an.addRow(["TRA dengan TIP", num(a.discriminant.r), a.discriminant.threshold]);
  an.addRow([]);
  head(["Redundancy analysis (indikasi awal)", "r", "", "", ""]);
  for (const r of a.redundancy) an.addRow([`${r.code} dengan skor ${r.label.toLowerCase()}`, num(r.r)]);

  const pr = wb.addWorksheet("Profil");
  pr.getColumn(1).width = 60;
  pr.getColumn(2).width = 10;
  pr.getColumn(3).width = 10;
  const n = a.totals.analyzed || 1;
  for (const d of [...a.profile.distributions, a.profile.channels, a.profile.recency, a.profile.frequency]) {
    const h = pr.addRow([`${d.number}. ${d.question}`, "n", "%"]);
    h.font = { bold: true };
    h.fill = { type: "pattern", pattern: "solid", fgColor: { argb: WASH } };
    for (const r of d.rows) pr.addRow([r.label, r.count, num((r.count / n) * 100, 1)]);
    pr.addRow([]);
  }
  const ph = pr.addRow(["B2. Provinsi domisili", "n", "%"]);
  ph.font = { bold: true };
  ph.fill = { type: "pattern", pattern: "solid", fgColor: { argb: WASH } };
  for (const p of a.profile.provinces) pr.addRow([p.name, p.count, num((p.count / n) * 100, 1)]);

  return Buffer.from(await wb.xlsx.writeBuffer());
}
