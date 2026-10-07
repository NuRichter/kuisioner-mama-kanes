import "server-only";
import PptxGenJS from "pptxgenjs";
import type { Analysis } from "@/lib/analytics/analyze";
import { describeOptions } from "@/lib/analytics/options";
import { fmt, pct, pLabel } from "@/lib/analytics/stats";

const C = {
  ink: "15191B",
  soft: "454D52",
  muted: "5E676C",
  line: "D9DDD8",
  paper: "F7F8F6",
  viz: "0F7A5A",
  viz2: "C76A12",
  vizSoft: "B8DCCF",
  danger: "A1352A",
  lk: ["B0482F", "E0A088", "CFD3CD", "80BBA8", "0F7A5A"],
};
// Calibri tersedia di setiap instalasi Office; Geist tidak dapat disematkan ke PPTX.
const FONT = "Calibri";
const FALLBACK = "Calibri";

type Slide = PptxGenJS.Slide;

function frame(pptx: PptxGenJS, title: string, lead?: string): Slide {
  const slide = pptx.addSlide();
  slide.background = { color: C.paper };
  slide.addText(title, { x: 0.6, y: 0.4, w: 12.1, h: 0.6, fontFace: FONT, fontSize: 26, bold: true, color: C.ink, margin: 0 });
  if (lead) slide.addText(lead, { x: 0.6, y: 1.0, w: 11.5, h: 0.5, fontFace: FONT, fontSize: 12.5, color: C.soft, margin: 0, valign: "top" });
  slide.addText("Questionnaire dibuat Irma Dwi Kusuma © 2026 All Rights Reserved", { x: 0.6, y: 7.05, w: 8, h: 0.3, fontFace: FONT, fontSize: 9, color: C.muted, margin: 0 });
  return slide;
}

const axis = {
  catAxisLabelColor: C.soft,
  valAxisLabelColor: C.muted,
  catAxisLabelFontFace: FONT,
  valAxisLabelFontFace: FONT,
  catAxisLabelFontSize: 11,
  valAxisLabelFontSize: 10,
  valGridLine: { color: "E3E6E1", size: 0.75 },
  catGridLine: { style: "none" as const },
  catAxisLineShow: false,
  valAxisLineShow: false,
};

export async function buildDeck(a: Analysis): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = "Laporan data kuesioner penelitian";
  pptx.author = "Irma Dwi Kusuma";
  pptx.theme = { headFontFace: FONT, bodyFontFace: FALLBACK };
  const n = a.totals.analyzed;
  const generated = new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" }).format(new Date(a.generatedAt));

  // 1. Sampul.
  {
    const s = pptx.addSlide();
    s.background = { color: C.paper };
    s.addText("Laporan data kuesioner penelitian", { x: 0.6, y: 0.6, w: 8, h: 0.4, fontFace: FONT, fontSize: 13, color: C.muted, margin: 0 });
    s.addText("Kredibilitas Sumber Manusia dan Sistem Cerdas dalam Ekosistem Investasi Digital", { x: 0.6, y: 1.2, w: 10.5, h: 1.9, fontFace: FONT, fontSize: 38, bold: true, color: C.ink, margin: 0, valign: "top" });
    s.addText(String(a.totals.clean), { x: 0.6, y: 4.3, w: 4, h: 1.3, fontFace: FONT, fontSize: 96, bold: true, color: C.viz, margin: 0 });
    s.addText("responden bersih menuju target 650 sampai 700", { x: 0.6, y: 5.55, w: 7, h: 0.4, fontFace: FONT, fontSize: 15, color: C.soft, margin: 0 });
    s.addText(`Data per ${generated}. ${describeOptions(a.options)}.`, { x: 0.6, y: 6.6, w: 11, h: 0.3, fontFace: FONT, fontSize: 10.5, color: C.muted, margin: 0 });
  }

  // 2. Kemajuan terhadap target.
  {
    const s = frame(pptx, "Kemajuan pengumpulan", "Responden bersih dibandingkan lantai dan target pada catatan peneliti nomor 7.");
    s.addChart(pptx.ChartType.bar, [
      { name: "Responden bersih", labels: ["Artikel 2 (lantai 300)", "Disertasi (400)", "Lantai instrumen (500)", "Target instrumen (650)"], values: [a.totals.clean, a.totals.clean, a.totals.clean, a.totals.clean] },
      { name: "Kekurangan", labels: ["Artikel 2 (lantai 300)", "Disertasi (400)", "Lantai instrumen (500)", "Target instrumen (650)"], values: [300, 400, 500, 650].map((t) => Math.max(0, t - a.totals.clean)) },
    ], {
      x: 0.6, y: 1.7, w: 8.4, h: 5.1, barDir: "bar", barGrouping: "stacked", chartColors: [C.viz, "E3E6E1"], barGapWidthPct: 60,
      showLegend: true, legendPos: "b", legendFontFace: FONT, legendFontSize: 11, legendColor: C.soft, showValue: true, dataLabelColor: C.ink, dataLabelFontSize: 10, dataLabelFontFace: FONT, ...axis,
    });
    const facts = [
      ["Tersimpan", String(a.totals.stored)],
      ["Bersih", String(a.totals.clean)],
      ["Versi CD : DC", `${a.versions.CD} : ${a.versions.DC}`],
      ["Median durasi", Number.isFinite(a.durations.median) ? `${fmt(a.durations.median, 1)} menit` : "-"],
    ];
    facts.forEach(([k, v], i) => {
      s.addText(k, { x: 9.6, y: 1.9 + i * 1.2, w: 3, h: 0.3, fontFace: FONT, fontSize: 11, color: C.muted, margin: 0 });
      s.addText(v, { x: 9.6, y: 2.2 + i * 1.2, w: 3.2, h: 0.55, fontFace: FONT, fontSize: 26, bold: true, color: C.ink, margin: 0 });
    });
  }

  // 3. Insight (dua slide bila perlu).
  const chunks = [a.insights.slice(0, 4), a.insights.slice(4, 8), a.insights.slice(8)].filter((c) => c.length);
  chunks.forEach((chunk, ci) => {
    const s = frame(pptx, chunks.length > 1 ? `Insight dari data (${ci + 1}/${chunks.length})` : "Insight dari data");
    chunk.forEach((ins, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 0.6 + col * 6.2;
      const y = 1.35 + row * 2.8;
      const toneColor = ins.tone === "perhatian" ? C.danger : ins.tone === "baik" ? C.viz : C.muted;
      s.addShape(pptx.ShapeType.line, { x, y, w: 5.8, h: 0, line: { color: C.line, width: 1 } });
      s.addText(ins.tone === "perhatian" ? "Perlu perhatian" : ins.tone === "baik" ? "Aman" : "Catatan", { x, y: y + 0.15, w: 5.8, h: 0.3, fontFace: FONT, fontSize: 10, bold: true, color: toneColor, margin: 0 });
      s.addText(ins.title, { x, y: y + 0.45, w: 5.8, h: 0.6, fontFace: FONT, fontSize: 16, bold: true, color: C.ink, margin: 0, valign: "top" });
      s.addText(ins.body, { x, y: y + 1.05, w: 5.8, h: 1.2, fontFace: FONT, fontSize: 11, color: C.soft, margin: 0, valign: "top", fit: "shrink" });
      s.addText(`Dasar: ${ins.basis}`, { x, y: y + 2.25, w: 5.8, h: 0.3, fontFace: FONT, fontSize: 9, color: C.muted, margin: 0 });
    });
  });

  // 4. Screening.
  {
    const s = frame(pptx, "Screening data", `Catatan peneliti nomor 4, ambang longstring ${a.options.longstringThreshold}. ${a.totals.clean} dari ${a.screened.length} dipertahankan.`);
    s.addChart(pptx.ChartType.bar, [
      { name: "Responden", labels: ["Lolos semua AC", "Gagal 1, longstring rendah", "Gagal 1, longstring tinggi", "Gagal 2 atau lebih"], values: [a.verdicts.lolos, a.verdicts["lolos-1-gagal"], a.verdicts["keluar-longstring"], a.verdicts["keluar-ac"]] },
    ], { x: 0.6, y: 1.7, w: 7.4, h: 5.1, barDir: "bar", chartColors: [C.viz], showValue: true, dataLabelFontFace: FONT, dataLabelFontSize: 11, dataLabelColor: C.ink, barGapWidthPct: 70, ...axis });
    s.addChart(pptx.ChartType.bar, [
      { name: "Gagal", labels: ["AC1 (skor 2)", "AC2 (skor 4)", "AC3 (skor 1)"], values: [a.acFailures.AC1, a.acFailures.AC2, a.acFailures.AC3] },
    ], { x: 8.4, y: 1.7, w: 4.4, h: 5.1, barDir: "col", chartColors: [C.viz2], showValue: true, dataLabelFontFace: FONT, dataLabelFontSize: 11, dataLabelColor: C.ink, showTitle: true, title: "Kegagalan per attention check", titleFontFace: FONT, titleFontSize: 12, titleColor: C.soft, ...axis });
  }

  // 5. Manusia vs mesin.
  {
    const hvm = a.humanVsMachine;
    const s = frame(pptx, "Manusia vs mesin", "Kredibilitas finfluencer (FC) dibandingkan robo advisor (RAC) pada responden yang sama. Titik di atas diagonal: RAC lebih tinggi.");
    s.addChart(pptx.ChartType.scatter, [
      { name: "FC", values: hvm.points.map((p) => p.fc) },
      { name: "Responden", values: hvm.points.map((p) => p.rac) },
    ], {
      x: 0.6, y: 1.7, w: 6.6, h: 5.2, chartColors: [C.viz], lineSize: 0, lineDataSymbol: "circle", lineDataSymbolSize: 6,
      valAxisMinVal: 1, valAxisMaxVal: 5, catAxisMinVal: 1, catAxisMaxVal: 5, showValAxisTitle: true, valAxisTitle: "Robo advisor", showCatAxisTitle: true, catAxisTitle: "Finfluencer",
      valAxisTitleFontFace: FONT, catAxisTitleFontFace: FONT, valAxisTitleColor: C.soft, catAxisTitleColor: C.soft, showLegend: false, ...axis,
    });
    const facts = [
      ["Rerata finfluencer", fmt(hvm.fc)],
      ["Rerata robo advisor", fmt(hvm.rac)],
      ["Uji t berpasangan", hvm.test ? `t(${hvm.test.df}) = ${fmt(hvm.test.t)}` : "-"],
      ["", hvm.test ? `${pLabel(hvm.test.p)}, d = ${fmt(hvm.test.d)}` : ""],
      ["RAC lebih tinggi", pct(hvm.higherRac, n)],
    ];
    facts.forEach(([k, v], i) => {
      if (k) s.addText(k, { x: 7.8, y: 1.8 + i * 0.95, w: 5, h: 0.3, fontFace: FONT, fontSize: 11, color: C.muted, margin: 0 });
      s.addText(v, { x: 7.8, y: (k ? 2.08 : 1.85) + i * 0.95, w: 5, h: 0.5, fontFace: FONT, fontSize: k ? 22 : 13, bold: Boolean(k), color: C.ink, margin: 0 });
    });
  }

  // 6. Konstruk.
  {
    const s = frame(pptx, "Rerata dan reliabilitas konstruk", "Skala 1 sampai 5. Tabel kanan: Cronbach's alpha; merah di bawah 0,70.");
    const cs = a.constructStats;
    // Grafik batang horizontal menggambar kategori pertama di bawah; balik agar terbaca dari atas.
    const top = [...cs].reverse();
    s.addChart(pptx.ChartType.bar, [{ name: "Rerata", labels: top.map((c) => c.construct.short), values: top.map((c) => (Number.isFinite(c.mean) ? Number(c.mean.toFixed(2)) : 0)) }], {
      x: 0.6, y: 1.6, w: 7.6, h: 5.3, barDir: "bar", chartColors: [C.viz], valAxisMinVal: 1, valAxisMaxVal: 5, showValue: true, dataLabelFormatCode: "0.00", dataLabelFontFace: FONT, dataLabelFontSize: 10, dataLabelColor: C.ink, barGapWidthPct: 45, ...axis,
    });
    const rows: PptxGenJS.TableRow[] = [
      [
        { text: "Konstruk", options: { bold: true, color: C.muted } },
        { text: "Kode", options: { bold: true, color: C.muted } },
        { text: "α", options: { bold: true, color: C.muted, align: "right" } },
      ],
      ...cs.map((c) => [
        { text: c.construct.short },
        { text: c.construct.usage, options: { color: C.soft } },
        { text: fmt(c.alpha), options: { align: "right" as const, bold: true, color: c.alpha < 0.7 ? C.danger : C.ink } },
      ]),
    ];
    s.addTable(rows, { x: 8.6, y: 1.6, w: 4.2, colW: [2.6, 0.8, 0.8], fontFace: FONT, fontSize: 10, color: C.ink, border: { type: "solid", pt: 0.5, color: C.line }, rowH: 0.36 });
  }

  // 7. Kepercayaan dan risiko.
  {
    const s = frame(pptx, "Kepercayaan platform dan persepsi risiko", "Responden dibagi pada titik tengah skala 3. Batang: rata-rata niat investasi tiap kelompok (deskriptif, bukan uji moderasi).");
    const q = a.trustRisk.quadrants;
    s.addChart(pptx.ChartType.bar, [{ name: "Rerata niat investasi", labels: q.map((x) => `${x.label} (n ${x.count})`), values: q.map((x) => (Number.isFinite(x.intention) ? Number(x.intention.toFixed(2)) : 0)) }], {
      x: 0.6, y: 1.7, w: 7.6, h: 5.1, barDir: "bar", chartColors: [C.viz], valAxisMinVal: 1, valAxisMaxVal: 5, showValue: true, dataLabelFormatCode: "0.00", dataLabelFontFace: FONT, dataLabelColor: C.ink, barGapWidthPct: 60, ...axis,
    });
    const rows: PptxGenJS.TableRow[] = [
      [{ text: "Tingkat kepercayaan platform", options: { bold: true, color: C.muted } }, { text: "n", options: { bold: true, color: C.muted, align: "right" } }, { text: "Niat", options: { bold: true, color: C.muted, align: "right" } }],
      ...a.intentionByTrust.map((b) => [{ text: b.band }, { text: String(b.n), options: { align: "right" as const } }, { text: fmt(b.intention), options: { align: "right" as const, bold: true } }]),
    ];
    s.addTable(rows, { x: 8.6, y: 1.8, w: 4.2, colW: [2.6, 0.7, 0.9], fontFace: FONT, fontSize: 11, color: C.ink, border: { type: "solid", pt: 0.5, color: C.line }, rowH: 0.42 });
  }

  // 8. Korelasi dan diskriminan.
  {
    const s = frame(pptx, "Korelasi antarkonstruk", `Pearson r antar skor konstruk. TRA dengan TIP: r = ${fmt(a.discriminant.r)} (batas sekitar 0,78, catatan peneliti nomor 3).`);
    const labels = a.correlations.blocks.map((b) => b.label);
    const header: PptxGenJS.TableRow = [{ text: "" }, ...labels.slice(0, -1).map((l) => ({ text: l, options: { fontSize: 8, color: C.muted, bold: true } }))];
    const body: PptxGenJS.TableRow[] = labels.map((row, i) => [
      { text: row, options: { fontSize: 9, color: C.soft, bold: true } },
      ...labels.slice(0, -1).map((_, j) => {
        const v = a.correlations.r[i][j];
        if (j >= i || !Number.isFinite(v)) return { text: "" };
        const strength = Math.min(1, Math.abs(v));
        const base = v < 0 ? [176, 72, 47] : [15, 122, 90];
        const hex = base.map((b) => Math.round(255 - (255 - b) * strength * 0.85).toString(16).padStart(2, "0")).join("");
        return { text: fmt(v), options: { fill: { color: hex }, color: strength > 0.55 ? "FFFFFF" : C.ink, align: "center" as const, fontSize: 9 } };
      }),
    ]);
    s.addTable([header, ...body], { x: 0.6, y: 1.7, w: 12.1, colW: [1.9, ...labels.slice(0, -1).map(() => 1.02)], fontFace: FONT, border: { type: "solid", pt: 1, color: C.paper }, rowH: 0.42 });
  }

  // 9. Profil.
  {
    const s = frame(pptx, "Profil responden", `Berdasarkan ${n} responden yang dianalisis.`);
    a.profile.distributions.slice(0, 3).forEach((d, i) => {
      const rows = [...d.rows].reverse();
      s.addChart(pptx.ChartType.bar, [{ name: d.number, labels: rows.map((r) => r.label), values: rows.map((r) => r.count) }], {
        x: 0.6 + i * 4.1, y: 1.6, w: 3.9, h: 5.2, barDir: "bar", chartColors: [C.viz], showValue: true, dataLabelFontFace: FONT, dataLabelFontSize: 9, dataLabelColor: C.ink,
        showTitle: true, title: `${d.question} (${d.number})`, titleFontFace: FONT, titleFontSize: 12, titleColor: C.ink, barGapWidthPct: 50, ...axis, catAxisLabelFontSize: 9,
      });
    });
  }

  // 10. Efek urutan.
  {
    const s = frame(pptx, "Efek urutan Bagian C dan D", "Rata-rata skor menurut versi form, uji t Welch.");
    const rows: PptxGenJS.TableRow[] = [
      ["Skor", "Versi CD", "Versi DC", "Selisih", "Uji t Welch"].map((t) => ({ text: t, options: { bold: true, color: C.muted } })),
      ...a.orderEffect.map((e) => [
        { text: e.label },
        { text: fmt(e.cd), options: { align: "right" as const } },
        { text: fmt(e.dc), options: { align: "right" as const } },
        { text: fmt(e.cd - e.dc), options: { align: "right" as const } },
        { text: e.test ? `${pLabel(e.test.p)}, d = ${fmt(e.test.d)}` : "-", options: { align: "right" as const } },
      ]),
    ];
    s.addTable(rows, { x: 0.6, y: 1.8, w: 12.1, colW: [4.6, 1.6, 1.6, 1.6, 2.7], fontFace: FONT, fontSize: 13, color: C.ink, border: { type: "solid", pt: 0.5, color: C.line }, rowH: 0.6 });
  }

  const out = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
  return out;
}
