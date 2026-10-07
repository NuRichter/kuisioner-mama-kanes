import { durationEstimate, sampleTargets } from "@/data/research-map";
import type { Analysis, Insight } from "./analyze";
import { fmt, pct, pLabel } from "./stats";

const SMALL_SAMPLE = 30;
const ALPHA_OK = 0.7;

/**
 * Insight deterministik: setiap kalimat dibentuk dari angka hasil analisis dan
 * menyebutkan dasar perhitungannya. Tidak ada klaim kausal.
 */
export function buildInsights(a: Analysis): Insight[] {
  const n = a.totals.analyzed;
  const out: Insight[] = [];

  if (n === 0) {
    return [
      {
        title: "Belum ada jawaban untuk dianalisis",
        body: "Dasbor akan terisi otomatis setelah responden pertama mengirim jawaban yang lengkap.",
        basis: "Jumlah data tersimpan",
        tone: "netral",
      },
    ];
  }

  // 1. Kemajuan pengumpulan terhadap target catatan peneliti nomor 7.
  const single = sampleTargets.find((t) => t.manuscript === "Instrumen tunggal")!;
  const clean = a.totals.clean;
  const toFloor = Math.max(0, single.floor - clean);
  const toTarget = Math.max(0, single.target[0] - clean);
  out.push({
    title: toFloor > 0 ? `Butuh ${toFloor} responden bersih lagi untuk lantai ${single.floor}` : toTarget > 0 ? `Lantai terlampaui, ${toTarget} lagi menuju target ${single.target[0]}` : "Target instrumen tunggal tercapai",
    body: `Saat ini ${clean} responden lolos screening. Disertasi membutuhkan 400, Artikel 1 membutuhkan 650 sampai 700, sehingga instrumen tunggal mengikuti angka yang paling menuntut.`,
    basis: "Catatan peneliti nomor 7",
    tone: toFloor > 0 ? "perhatian" : "baik",
  });

  if (n < SMALL_SAMPLE) {
    out.push({
      title: "Sampel masih kecil, angka belum stabil",
      body: `Analisis memakai ${n} responden. Rata-rata, reliabilitas, dan korelasi dapat bergeser banyak sampai sampel mencapai beberapa ratus.`,
      basis: `n < ${SMALL_SAMPLE}`,
      tone: "perhatian",
    });
  }

  // 2. Manusia vs mesin: inti judul penelitian.
  const hvm = a.humanVsMachine;
  if (hvm.test && Number.isFinite(hvm.test.t)) {
    const racHigher = hvm.rac > hvm.fc;
    const significant = hvm.test.p < 0.05;
    out.push({
      title: significant
        ? `${racHigher ? "Robo advisor" : "Finfluencer"} dinilai lebih kredibel`
        : "Kredibilitas manusia dan mesin belum berbeda nyata",
      body: `Rata-rata kredibilitas finfluencer ${fmt(hvm.fc)} dan robo advisor ${fmt(hvm.rac)} (selisih ${fmt(hvm.fc - hvm.rac)}; t(${hvm.test.df}) = ${fmt(hvm.test.t)}, ${pLabel(hvm.test.p)}, d = ${fmt(hvm.test.d)}). ${pct(hvm.higherRac, n)} responden memberi skor robo advisor lebih tinggi, ${pct(hvm.higherFc, n)} sebaliknya.`,
      basis: "Uji t berpasangan, rata-rata 8 butir FC vs 9 butir RAC",
      tone: "netral",
    });
  }

  // 3. Validitas diskriminan, catatan peneliti nomor 3.
  if (Number.isFinite(a.discriminant.r)) {
    const safe = a.discriminant.r < a.discriminant.threshold;
    out.push({
      title: safe ? "Kepercayaan sistem dan platform masih terpisah" : "Kepercayaan sistem dan platform terlalu berimpit",
      body: `Korelasi skor TRA dan TIP r = ${fmt(a.discriminant.r)}, ${safe ? "di bawah" : "melewati"} batas sekitar ${fmt(a.discriminant.threshold)} dari pemeriksaan sensitivitas.${safe ? "" : " Validitas diskriminan perlu diperiksa ulang."}`,
      basis: "Catatan peneliti nomor 3",
      tone: safe ? "baik" : "perhatian",
    });
  }

  // 4. Reliabilitas.
  const withAlpha = a.constructStats.filter((c) => Number.isFinite(c.alpha));
  if (withAlpha.length) {
    const ok = withAlpha.filter((c) => c.alpha >= ALPHA_OK);
    const lowest = withAlpha.reduce((lo, c) => (c.alpha < lo.alpha ? c : lo), withAlpha[0]);
    out.push({
      title: `${ok.length} dari ${withAlpha.length} konstruk mencapai α ≥ 0,70`,
      body: `Reliabilitas terendah pada ${lowest.construct.name} (α = ${fmt(lowest.alpha)}). Kepercayaan terhadap platform sebagai satu blok 11 butir: α = ${fmt(a.tipAlpha)}.`,
      basis: "Cronbach's alpha, ambang umum 0,70",
      tone: ok.length === withAlpha.length ? "baik" : "perhatian",
    });
  }

  // 5. HTMT tertinggi.
  const blocks = a.correlations.blocks;
  let worst = { v: -Infinity, i: 0, j: 0 };
  a.correlations.htmt.forEach((row, i) =>
    row.forEach((v, j) => {
      if (j > i && Number.isFinite(v) && v > worst.v) worst = { v, i, j };
    }),
  );
  if (Number.isFinite(worst.v)) {
    out.push({
      title: worst.v < 0.85 ? "Semua pasangan konstruk lolos HTMT 0,85" : `HTMT ${blocks[worst.i].label} dan ${blocks[worst.j].label} perlu dicermati`,
      body: `Nilai HTMT tertinggi ${fmt(worst.v)} pada pasangan ${blocks[worst.i].label} dan ${blocks[worst.j].label}.`,
      basis: "HTMT (Henseler dkk., 2015), ambang 0,85 konservatif dan 0,90 longgar",
      tone: worst.v < 0.85 ? "baik" : worst.v < 0.9 ? "netral" : "perhatian",
    });
  }

  // 6. Efek urutan C/D.
  const effects = a.orderEffect.filter((e) => e.test && Number.isFinite(e.test.p));
  if (effects.length) {
    const flagged = effects.filter((e) => e.test!.p < 0.05);
    out.push({
      title: flagged.length ? "Ada indikasi efek urutan Bagian C dan D" : "Tidak tampak efek urutan Bagian C dan D",
      body: effects
        .map((e) => `${e.label}: versi CD ${fmt(e.cd)}, versi DC ${fmt(e.dc)} (${pLabel(e.test!.p)})`)
        .join(". ") + ".",
      basis: "Uji t Welch antarversi form",
      tone: flagged.length ? "perhatian" : "baik",
    });
  }

  // 7. Attention check.
  const screenedN = a.screened.length;
  const failedAny = a.screened.filter((s) => s.acFailed > 0).length;
  const mostFailed = (Object.entries(a.acFailures) as [string, number][]).sort((x, y) => y[1] - x[1])[0];
  out.push({
    title: `${pct(failedAny, screenedN)} responden gagal pada sedikitnya satu attention check`,
    body: `${a.verdicts["keluar-ac"]} dikeluarkan karena gagal dua atau lebih, ${a.verdicts["keluar-longstring"]} dikeluarkan karena gagal satu dan longstring ≥ ${a.options.longstringThreshold}.${mostFailed[1] > 0 ? ` Paling sering gagal: ${mostFailed[0]} (${mostFailed[1]} kali).` : ""}`,
    basis: "Catatan peneliti nomor 4",
    tone: failedAny / Math.max(1, screenedN) > 0.15 ? "perhatian" : "netral",
  });

  // 8. Peta kepercayaan dan risiko (moderasi pada disertasi).
  const quadrants = a.trustRisk.quadrants.filter((q) => q.count > 0);
  if (quadrants.length) {
    const top = quadrants.reduce((m, q) => (q.count > m.count ? q : m), quadrants[0]);
    out.push({
      title: `Kelompok terbesar: “${top.label}”`,
      body: `${pct(top.count, n)} responden berada di kuadran ini (kepercayaan platform dan persepsi risiko dipisah pada titik tengah skala 3). Rata-rata niat investasinya ${fmt(top.intention)}.`,
      basis: "Deskriptif, bukan uji moderasi",
      tone: "netral",
    });
  }

  // 9. Durasi.
  if (Number.isFinite(a.durations.median)) {
    out.push({
      title: `Median durasi ${fmt(a.durations.median, 1)} menit`,
      body: `${pct(a.durations.withinEstimate, screenedN)} responden selesai dalam rentang estimasi ${durationEstimate.minMinutes} sampai ${durationEstimate.maxMinutes} menit. ${a.durations.underHalfMedian} responden selesai kurang dari separuh median dan layak diperiksa bersama indikator longstring.`,
      basis: "Waktu mulai sampai terkirim, dicatat server",
      tone: "netral",
    });
  }

  // 10. Butir paling memecah pendapat.
  const spread = a.itemHighlights.mostSpread;
  if (spread) {
    out.push({
      title: `Pendapat paling terbelah: ${spread.code}`,
      body: `“${spread.text}” memiliki simpangan baku tertinggi (${fmt(spread.sd)}) dengan rata-rata ${fmt(spread.mean)}.`,
      basis: "Simpangan baku per butir",
      tone: "netral",
    });
  }

  return out;
}
