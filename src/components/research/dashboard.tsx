import { CircleAlert, CircleCheck, Download, Info, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import {
  BarList,
  ChartFrame,
  CumulativeLine,
  Heatmap,
  Histogram,
  LikertBar,
  LikertLegend,
  MeanRuler,
  Scatter,
} from "@/components/charts/charts";
import { durationEstimate } from "@/data/research-map";
import type { Analysis, Insight, ScreenVerdict } from "@/lib/analytics/analyze";
import { describeOptions, optionsToQuery } from "@/lib/analytics/options";
import { fmt, pct, pLabel } from "@/lib/analytics/stats";
import { logout } from "@/app/peneliti/actions";

const chapters = [
  { id: "ringkasan", label: "Ringkasan dan insight" },
  { id: "pengumpulan", label: "Pengumpulan" },
  { id: "screening", label: "Screening data" },
  { id: "profil", label: "Profil responden" },
  { id: "konstruk", label: "Konstruk dan butir" },
  { id: "manusia-mesin", label: "Manusia vs mesin" },
  { id: "kepercayaan-risiko", label: "Kepercayaan dan risiko" },
  { id: "hubungan", label: "Hubungan antarkonstruk" },
  { id: "urutan", label: "Efek urutan C dan D" },
  { id: "data", label: "Data jawaban" },
];

const verdictLabel: Record<ScreenVerdict, string> = {
  lolos: "Lolos semua attention check",
  "lolos-1-gagal": "Gagal 1, longstring di bawah ambang (dipertahankan)",
  "keluar-longstring": "Gagal 1 dan longstring tinggi (dikeluarkan)",
  "keluar-ac": "Gagal 2 atau lebih (dikeluarkan)",
};

function Chapter({ id, title, lead, children }: { id: string; title: string; lead?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-judul`} className="scroll-mt-6 border-t border-line pt-10 lg:scroll-mt-28">
      <h2 id={`${id}-judul`} className="text-[1.375rem] leading-tight font-semibold tracking-[-0.015em]">{title}</h2>
      {lead && <p className="mt-2 max-w-[68ch] text-[0.9375rem] leading-relaxed text-ink-soft">{lead}</p>}
      <div className="mt-8 grid grid-cols-1 gap-10">{children}</div>
    </section>
  );
}

function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-xl font-semibold text-ink">{value}</dd>
      {sub && <dd className="text-sm text-muted">{sub}</dd>}
    </div>
  );
}

function ToneMark({ tone }: { tone: Insight["tone"] }) {
  if (tone === "baik")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent">
        <CircleCheck aria-hidden="true" className="size-3.5" /> Aman
      </span>
    );
  if (tone === "perhatian")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-danger">
        <CircleAlert aria-hidden="true" className="size-3.5" /> Perlu perhatian
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted">
      <Info aria-hidden="true" className="size-3.5" /> Catatan
    </span>
  );
}

/** Penggaris target sampel: titik lantai dan rentang target dari catatan peneliti nomor 7. */
function TargetRuler({ clean, stored }: { clean: number; stored: number }) {
  const max = 750;
  const at = (v: number) => `${(Math.min(v, max) / max) * 100}%`;
  const marks = [
    { v: 300, label: "300", note: "Lantai Artikel 2" },
    { v: 400, label: "400", note: "Disertasi" },
    { v: 500, label: "500", note: "Lantai instrumen" },
  ];
  return (
    <div className="grid gap-2" role="img" aria-label={`${clean} responden bersih dari target 650 sampai 700`}>
      <div className="relative h-11">
        <div className="absolute inset-x-0 top-4 h-3 rounded-[3px] bg-line" />
        <div className="absolute top-4 h-3 rounded-[3px] bg-viz-1/30" style={{ width: at(stored) }} />
        <div className="absolute top-4 h-3 rounded-l-[3px] bg-viz-1" style={{ width: at(clean) }} />
        <div className="absolute top-2 h-7 border-x-2 border-ink/70" style={{ left: at(650), width: `calc(${at(700)} - ${at(650)})` }} />
        {marks.map((m) => (
          <div key={m.v} className="absolute top-2 h-7 w-px bg-ink/60" style={{ left: at(m.v) }} />
        ))}
      </div>
      <div className="relative h-9 text-xs text-muted tabular-nums">
        {marks.map((m) => (
          <span key={m.v} className="absolute hidden -translate-x-1/2 text-center leading-tight sm:block" style={{ left: at(m.v) }}>
            <span className="block font-semibold text-ink-soft">{m.label}</span>
            {m.note}
          </span>
        ))}
        <span className="absolute -translate-x-1/2 text-center leading-tight" style={{ left: at(675) }}>
          <span className="block font-semibold text-ink-soft">650-700</span>
          Target
        </span>
      </div>
    </div>
  );
}

function ItemTable({ c }: { c: Analysis["constructStats"][number] }) {
  return (
    <table className="w-full min-w-[40rem] text-sm">
      <thead>
        <tr className="text-left text-muted">
          <th className="py-2 pr-3 font-medium">Butir</th>
          <th className="w-[38%] py-2 pr-3 font-medium">Sebaran jawaban</th>
          <th className="py-2 pr-3 text-right font-medium">Rerata</th>
          <th className="py-2 pr-3 text-right font-medium">SD</th>
          <th className="py-2 pr-3 text-right font-medium" title="Korelasi butir-total terkoreksi">r butir-total</th>
          <th className="py-2 text-right font-medium" title="Alpha bila butir dihapus">α jika dihapus</th>
        </tr>
      </thead>
      <tbody>
        {c.items.map((i) => (
          <tr key={i.code} className="align-top">
            <td className="py-2.5 pr-3">
              <span className="block font-semibold text-ink tabular-nums" translate="no">{i.code}</span>
              <span className="block max-w-[36ch] leading-snug text-ink-soft">{i.text}</span>
            </td>
            <td className="py-3 pr-3"><LikertBar dist={i.dist} label={i.code} /></td>
            <td className="py-2.5 pr-3 text-right tabular-nums">{fmt(i.mean)}</td>
            <td className="py-2.5 pr-3 text-right tabular-nums">{fmt(i.sd)}</td>
            <td className={`py-2.5 pr-3 text-right tabular-nums ${i.itemTotal < 0.3 ? "font-semibold text-danger" : ""}`}>{fmt(i.itemTotal)}</td>
            <td className={`py-2.5 text-right tabular-nums ${i.alphaIfDeleted > c.alpha ? "font-semibold text-danger" : ""}`}>{fmt(i.alphaIfDeleted)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function Dashboard({ a }: { a: Analysis }) {
  const n = a.totals.analyzed;
  const query = optionsToQuery(a.options);
  const exportQuery = query ? `${query}&` : "?";
  const generated = new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(a.generatedAt));
  const durationBins = Array.from({ length: 31 }, (_, m) => ({
    label: m === 30 ? "30+" : String(m),
    value: a.durations.minutes.filter((x) => (m === 30 ? x >= 30 : x >= m && x < m + 1)).length,
  }));
  const longBins = Array.from({ length: 27 }, (_, i) => {
    const v = i + 1;
    return { label: v === 27 ? "27+" : String(v), value: a.longstrings.filter((x) => (v === 27 ? x >= 27 : x === v)).length, highlight: v >= a.options.longstringThreshold };
  });
  const { blocks, r, htmt } = a.correlations;
  const blockLabels = blocks.map((b) => b.label);
  const hvm = a.humanVsMachine;
  const recent = [...a.screened].sort((x, y) => y.record.receivedAt.localeCompare(x.record.receivedAt)).slice(0, 80);

  return (
    <div className="mx-auto w-full max-w-[80rem] px-5 sm:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4 pt-10 pb-6">
        <div>
          <h1 className="text-[clamp(1.6rem,1.2rem+1.6vw,2.2rem)] leading-tight font-semibold tracking-[-0.02em]">Dasbor peneliti</h1>
          <p className="mt-1.5 text-sm text-muted">Data per {generated} WIB. Menampilkan {describeOptions(a.options)}.</p>
        </div>
        <form action={logout}>
          <button type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-[10px] px-3 text-sm font-medium text-ink-soft hover:bg-surface hover:text-ink">
            <LogOut aria-hidden="true" className="size-4" /> Keluar
          </button>
        </form>
      </header>

      {/* Satu baris filter untuk seluruh grafik dan unduhan. */}
      <div className="-mx-5 border-y border-line bg-paper/95 px-5 py-3 backdrop-blur-sm sm:-mx-8 sm:px-8 lg:sticky lg:top-0 lg:z-10">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <form method="get" className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-xs font-medium text-muted">
              Versi form
              <select name="versi" defaultValue={a.options.version === "all" ? "" : a.options.version} className="h-10 rounded-[8px] border border-line-strong bg-surface px-2.5 text-sm text-ink">
                <option value="">Semua</option>
                <option value="CD">CD (C lalu D)</option>
                <option value="DC">DC (D lalu C)</option>
              </select>
            </label>
            <label className="grid gap-1 text-xs font-medium text-muted">
              Sampel
              <select name="sampel" defaultValue={a.options.sample === "all" ? "semua" : ""} className="h-10 rounded-[8px] border border-line-strong bg-surface px-2.5 text-sm text-ink">
                <option value="">Bersih (lolos screening)</option>
                <option value="semua">Semua jawaban</option>
              </select>
            </label>
            <label className="grid gap-1 text-xs font-medium text-muted">
              Ambang longstring
              <input name="longstring" type="number" min={3} max={53} defaultValue={a.options.longstringThreshold} inputMode="numeric" className="h-10 w-24 rounded-[8px] border border-line-strong bg-surface px-2.5 text-sm text-ink tabular-nums" />
            </label>
            <button type="submit" className="h-10 rounded-[8px] bg-ink px-4 text-sm font-semibold text-paper hover:bg-ink/85">Terapkan</button>
          </form>
          <nav aria-label="Unduhan" className="flex flex-wrap items-center gap-1.5 text-sm">
            <span className="mr-1 text-xs font-medium text-muted">Unduh</span>
            {[
              { href: `/api/laporan/csv${exportQuery}isi=semua`, label: "CSV mentah" },
              { href: `/api/laporan/csv${exportQuery}isi=bersih`, label: "CSV bersih" },
              { href: `/api/laporan/xlsx${query}`, label: "Excel" },
              { href: `/api/laporan/pdf${query}`, label: "PDF" },
              { href: `/api/laporan/pptx${query}`, label: "PowerPoint" },
            ].map((d) => (
              <a key={d.label} href={d.href} download className="inline-flex h-10 items-center gap-1.5 rounded-[8px] border border-line-strong bg-surface px-3 font-medium text-ink hover:border-ink">
                <Download aria-hidden="true" className="size-3.5" />
                {d.label}
              </a>
            ))}
          </nav>
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-12">
        <nav aria-label="Bab dasbor" className="hidden lg:block">
          <ol className="sticky top-36 grid gap-0.5 py-10 text-[0.8125rem]">
            {chapters.map((c) => (
              <li key={c.id}>
                <a href={`#${c.id}`} className="block rounded-[8px] px-2 py-1.5 text-ink-soft hover:bg-surface hover:text-ink">{c.label}</a>
              </li>
            ))}
          </ol>
        </nav>

        <main id="konten" className="grid min-w-0 grid-cols-1 gap-14 py-10">
          <section id="ringkasan" aria-labelledby="ringkasan-judul" className="scroll-mt-24 grid grid-cols-1 gap-10">
            <h2 id="ringkasan-judul" className="sr-only">Ringkasan dan insight</h2>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-end">
              <div className="grid gap-5">
                <p className="text-[clamp(3rem,2rem+4vw,4.75rem)] leading-none font-semibold tracking-[-0.03em] text-ink">
                  {a.totals.clean}
                  <span className="ml-3 align-middle text-base font-medium tracking-normal text-ink-soft">responden bersih menuju target 650 sampai 700</span>
                </p>
                <TargetRuler clean={a.totals.clean} stored={a.totals.inVersion} />
              </div>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-1">
                <Stat label="Jawaban tersimpan" value={a.totals.stored} sub={a.options.version !== "all" ? `${a.totals.inVersion} pada ${a.options.version}` : undefined} />
                <Stat label="Dianalisis di dasbor ini" value={n} />
                <Stat label="Versi CD : DC" value={`${a.versions.CD} : ${a.versions.DC}`} />
                <Stat label="Median durasi" value={`${fmt(a.durations.median, 1)} menit`} />
              </dl>
            </div>

            <div>
              <h3 className="text-[1.0625rem] font-semibold">Insight dari data</h3>
              <p className="mt-1 text-sm text-muted">Dibentuk otomatis dari angka di bawah. Setiap insight menyebut dasar perhitungannya.</p>
              <ol className="mt-6 grid gap-x-10 md:grid-cols-2">
                {a.insights.map((i) => (
                  <li key={i.title} className="grid content-start gap-2 border-t border-line py-5">
                    <ToneMark tone={i.tone} />
                    <p className="text-base leading-snug font-semibold text-ink">{i.title}</p>
                    <p className="text-[0.9375rem] leading-relaxed text-ink-soft">{i.body}</p>
                    <p className="text-xs text-muted">Dasar: {i.basis}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <Chapter id="pengumpulan" title="Pengumpulan" lead="Jumlah jawaban tersimpan per hari (WIB) dan lama pengisian setiap responden.">
            <div className="grid gap-10 xl:grid-cols-2">
              <ChartFrame
                title="Jawaban kumulatif"
                note="Garis acuan: target dari catatan peneliti nomor 7. Dihitung dari seluruh jawaban tersimpan."
                table={
                  <table className="text-sm tabular-nums">
                    <thead><tr className="text-left text-muted"><th className="pr-6 font-medium">Tanggal</th><th className="pr-6 font-medium">Harian</th><th className="font-medium">Kumulatif</th></tr></thead>
                    <tbody>{a.timeline.map((t) => <tr key={t.date}><td className="pr-6">{t.date}</td><td className="pr-6">{t.count}</td><td>{t.cumulative}</td></tr>)}</tbody>
                  </table>
                }
              >
                <CumulativeLine points={a.timeline.map((t) => ({ label: t.date, value: t.cumulative }))} refs={[{ value: 400, label: "Disertasi" }, { value: 500, label: "Lantai" }, { value: 650, label: "Target" }]} />
              </ChartFrame>
              <ChartFrame
                title="Durasi pengisian (menit)"
                note={`Arsiran: estimasi ${durationEstimate.minMinutes} sampai ${durationEstimate.maxMinutes} menit pada lembar informasi. Garis: median ${fmt(a.durations.median, 1)} menit (kuartil ${fmt(a.durations.q1, 1)} sampai ${fmt(a.durations.q3, 1)}).`}
              >
                <Histogram bins={durationBins} band={{ from: 11, to: 13, label: "Estimasi" }} marker={Number.isFinite(a.durations.median) ? { at: Math.min(30, a.durations.median), label: "Median" } : undefined} labelEvery={5} unit=" menit" />
              </ChartFrame>
            </div>
          </Chapter>

          <Chapter id="screening" title="Screening data" lead={`Aturan catatan peneliti nomor 4: AC1 lolos pada skor 2, AC2 pada skor 4, AC3 pada skor 1. Gagal dua atau lebih dikeluarkan; gagal satu diperiksa dengan longstring (ambang saat ini ${a.options.longstringThreshold}, dapat diubah di atas).`}>
            <div className="grid gap-10 xl:grid-cols-2">
              <ChartFrame title="Hasil screening" note={`${a.screened.length} jawaban diperiksa, ${a.totals.clean} dipertahankan.`}>
                <BarList rows={(Object.keys(verdictLabel) as ScreenVerdict[]).map((k) => ({ label: verdictLabel[k], count: a.verdicts[k] }))} total={a.screened.length} />
              </ChartFrame>
              <ChartFrame title="Kegagalan per attention check" note="Jumlah responden yang tidak memilih jawaban yang diminta.">
                <BarList rows={(["AC1", "AC2", "AC3"] as const).map((k) => ({ label: `${k} (diminta skor ${{ AC1: 2, AC2: 4, AC3: 1 }[k]})`, count: a.acFailures[k] }))} total={a.screened.length} />
              </ChartFrame>
            </div>
            <ChartFrame title="Longstring: rangkaian jawaban identik terpanjang" note="Dihitung menurut urutan tampil butir pada versi form responden. Batang berwarna kontras berada pada atau di atas ambang.">
              <Histogram bins={longBins} labelEvery={2} unit=" butir berurutan" />
            </ChartFrame>
          </Chapter>

          <Chapter id="profil" title="Profil responden" lead="Karakteristik responden (Bagian B) dan basis penilaian (A10 sampai A13).">
            <div className="grid gap-x-10 gap-y-12 md:grid-cols-2">
              <ChartFrame title="Tahun lahir (B1)">
                <Histogram bins={a.profile.birthYears.map((b) => ({ label: String(b.year).slice(2), value: b.count }))} labelEvery={1} unit="" />
              </ChartFrame>
              <ChartFrame title="Provinsi domisili (B2)" note={a.profile.unknownProvinces.length ? `${a.profile.unknownProvinces.length} isian tidak cocok dengan daftar provinsi: ${[...new Set(a.profile.unknownProvinces)].slice(0, 5).join(", ")}` : undefined}>
                <BarList rows={a.profile.provinces.slice(0, 8).map((p) => ({ label: p.name, count: p.count }))} total={n} />
              </ChartFrame>
              {a.profile.distributions.map((d) => (
                <ChartFrame key={d.id} title={`${d.question} (${d.number})`} note={d.other?.length ? `Lainnya: ${[...new Set(d.other)].slice(0, 4).join(", ")}` : undefined}>
                  <BarList rows={d.rows.map((r) => ({ label: r.label, count: r.count }))} total={n} />
                </ChartFrame>
              ))}
              <ChartFrame title="Kanal resmi informasi robo advisor (A10)" note="Responden boleh memilih lebih dari satu, sehingga persentase tidak berjumlah 100%.">
                <BarList rows={a.profile.channels.rows.map((r) => ({ label: r.label, count: r.count }))} total={n} />
              </ChartFrame>
              <ChartFrame title="Kombinasi kanal paling umum">
                <BarList rows={a.profile.channelCombos} total={n} />
              </ChartFrame>
              <ChartFrame title="Terakhir melihat konten figur acuan (A12)">
                <BarList rows={a.profile.recency.rows.map((r) => ({ label: r.label, count: r.count }))} total={n} />
              </ChartFrame>
              <ChartFrame title="Frekuensi melihat konten sebulan terakhir (A13)">
                <BarList rows={a.profile.frequency.rows.map((r) => ({ label: r.label, count: r.count }))} total={n} />
              </ChartFrame>
            </div>
          </Chapter>

          <Chapter id="konstruk" title="Konstruk dan butir" lead="Rata-rata skor konstruk (titik) dengan rentang ±1 SD, reliabilitas Cronbach's alpha, dan pemakaian butir menurut Peta Penggunaan Butir. Buka setiap konstruk untuk melihat sebaran jawaban per butir.">
            <LikertLegend />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[44rem] text-sm">
                <thead>
                  <tr className="text-left text-muted">
                    <th className="py-2 pr-4 font-medium">Konstruk</th>
                    <th className="py-2 pr-4 font-medium">Kode</th>
                    <th className="w-[30%] py-2 pr-4 font-medium">Rerata pada skala 1 sampai 5</th>
                    <th className="py-2 pr-4 text-right font-medium">Rerata</th>
                    <th className="py-2 pr-4 text-right font-medium">SD</th>
                    <th className="py-2 text-right font-medium">α</th>
                  </tr>
                </thead>
                <tbody>
                  {a.constructStats.map((c) => (
                    <tr key={c.construct.id} className="border-t border-line">
                      <td className="py-3 pr-4">
                        <span className="block font-medium text-ink">{c.construct.name}</span>
                        <span className="block text-xs text-muted">{c.construct.items.length} butir · {c.construct.dissertation !== "Tidak dipakai" ? `Disertasi: ${c.construct.dissertation}` : c.construct.article}</span>
                      </td>
                      <td className="py-3 pr-4 text-xs font-semibold text-ink-soft" translate="no">{c.construct.usage}</td>
                      <td className="py-3 pr-4"><MeanRuler mean={c.mean} sd={c.sd} /></td>
                      <td className="py-3 pr-4 text-right tabular-nums">{fmt(c.mean)}</td>
                      <td className="py-3 pr-4 text-right tabular-nums">{fmt(c.sd)}</td>
                      <td className={`py-3 text-right font-semibold tabular-nums ${c.alpha < 0.7 ? "text-danger" : "text-ink"}`}>{fmt(c.alpha)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="-mt-6 text-sm text-muted">Kepercayaan terhadap platform sebagai satu blok 11 butir: α = {fmt(a.tipAlpha)}. Nilai merah: α di bawah 0,70, r butir-total di bawah 0,30, atau α naik bila butir dihapus.</p>
            <div className="grid grid-cols-1 gap-3">
              {a.constructStats.map((c) => (
                <details key={c.construct.id} className="group min-w-0 rounded-[10px] border border-line bg-surface open:pb-2">
                  <summary className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3 text-[0.9375rem] font-medium">
                    <span>{c.construct.name}</span>
                    <span className="text-sm text-muted tabular-nums">α {fmt(c.alpha)}</span>
                  </summary>
                  <div className="overflow-x-auto px-4">
                    <ItemTable c={c} />
                  </div>
                </details>
              ))}
            </div>
            <div className="grid gap-x-10 gap-y-6 md:grid-cols-3">
              {[
                { label: "Paling disetujui", item: a.itemHighlights.mostAgreed, value: (i: NonNullable<typeof a.itemHighlights.mostAgreed>) => `${pct(i.dist[3] + i.dist[4], n)} memilih 4 atau 5` },
                { label: "Paling banyak netral", item: a.itemHighlights.mostNeutral, value: (i: NonNullable<typeof a.itemHighlights.mostAgreed>) => `${pct(i.dist[2], n)} memilih 3` },
                { label: "Paling memecah pendapat", item: a.itemHighlights.mostSpread, value: (i: NonNullable<typeof a.itemHighlights.mostAgreed>) => `SD ${fmt(i.sd)}` },
              ].map((h) =>
                h.item ? (
                  <div key={h.label} className="grid content-start gap-2 border-t border-line pt-4">
                    <p className="text-sm text-muted">{h.label}</p>
                    <p className="text-[0.9375rem] leading-snug text-ink"><span className="font-semibold" translate="no">{h.item.code}</span> {h.item.text}</p>
                    <LikertBar dist={h.item.dist} label={h.item.code} />
                    <p className="text-sm text-ink-soft">{h.value(h.item)}</p>
                  </div>
                ) : null,
              )}
            </div>
          </Chapter>

          <Chapter id="manusia-mesin" title="Manusia vs mesin" lead="Inti judul penelitian: kredibilitas finfluencer (8 butir FC) dibandingkan kredibilitas robo advisor (9 butir RAC) pada responden yang sama. Titik di atas garis diagonal menilai robo advisor lebih kredibel.">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-center">
              <Scatter points={hvm.points.map((p) => ({ x: p.fc, y: p.rac }))} xLabel="Kredibilitas finfluencer" yLabel="Kredibilitas robo advisor" diagonal />
              <dl className="grid gap-5">
                <Stat label="Rerata finfluencer" value={fmt(hvm.fc)} />
                <Stat label="Rerata robo advisor" value={fmt(hvm.rac)} />
                <Stat label="Uji t berpasangan" value={hvm.test ? `t(${hvm.test.df}) = ${fmt(hvm.test.t)}` : "-"} sub={hvm.test ? `${pLabel(hvm.test.p)}, d = ${fmt(hvm.test.d)}` : "Butuh minimal 3 responden"} />
                <Stat label="Robo advisor lebih tinggi" value={pct(hvm.higherRac, n)} sub={`Finfluencer lebih tinggi ${pct(hvm.higherFc, n)}, sama ${pct(hvm.equal, n)}`} />
              </dl>
            </div>
          </Chapter>

          <Chapter id="kepercayaan-risiko" title="Kepercayaan dan risiko" lead="Disertasi menguji interaksi kepercayaan terhadap platform dan persepsi risiko. Peta ini membagi responden pada titik tengah skala (3) dan menampilkan rata-rata niat investasi tiap kelompok. Ini gambaran deskriptif, bukan uji moderasi.">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-center">
              <Scatter
                points={a.trustRisk.points.map((p) => ({ x: p.tip, y: p.pr }))}
                xLabel="Kepercayaan terhadap platform"
                yLabel="Persepsi risiko"
                quadrantAt={3}
                quadrantLabels={{ tl: "Ragu dan waspada", tr: "Percaya, tetap waspada", bl: "Ragu, merasa aman", br: "Percaya, merasa aman" }}
              />
              <table className="text-sm">
                <thead><tr className="text-left text-muted"><th className="py-2 pr-4 font-medium">Kelompok</th><th className="py-2 pr-4 text-right font-medium">n</th><th className="py-2 text-right font-medium">Niat</th></tr></thead>
                <tbody>
                  {a.trustRisk.quadrants.map((q) => (
                    <tr key={q.key} className="border-t border-line"><td className="py-2.5 pr-4">{q.label}</td><td className="py-2.5 pr-4 text-right tabular-nums">{q.count}</td><td className="py-2.5 text-right font-semibold tabular-nums">{fmt(q.intention)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ChartFrame title="Rata-rata niat investasi menurut tingkat kepercayaan platform" note="Skor kepercayaan platform dikelompokkan pada batas skala 3 dan 4.">
              <ul className="grid gap-3">
                {a.intentionByTrust.map((b) => (
                  <li key={b.band} className="grid grid-cols-[10rem_minmax(0,1fr)_4rem] items-center gap-3 text-sm">
                    <span className="text-ink-soft">{b.band} <span className="text-muted">(n {b.n})</span></span>
                    <MeanRuler mean={b.intention} sd={NaN} />
                    <span className="text-right font-semibold tabular-nums">{fmt(b.intention)}</span>
                  </li>
                ))}
              </ul>
            </ChartFrame>
          </Chapter>

          <Chapter id="hubungan" title="Hubungan antarkonstruk" lead="Korelasi Pearson antar skor konstruk dan HTMT untuk validitas diskriminan. Kepercayaan terhadap platform dihitung sebagai satu blok 11 butir.">
            <div className="grid gap-12 2xl:grid-cols-2">
              <ChartFrame title="Korelasi skor konstruk (r)" note="Hijau positif, merah bata negatif; makin pekat makin kuat.">
                <Heatmap labels={blockLabels} values={r} mode="diverging" />
              </ChartFrame>
              <ChartFrame title="HTMT" note="Sel bergaris merah: HTMT ≥ 0,85 (ambang konservatif Henseler dkk., 2015).">
                <Heatmap labels={blockLabels} values={htmt} mode="sequential" threshold={0.85} />
              </ChartFrame>
            </div>
            <div className="grid gap-x-10 gap-y-6 md:grid-cols-2">
              <div className="grid content-start gap-2 border-t border-line pt-4">
                <p className="text-sm text-muted">Catatan peneliti nomor 3</p>
                <p className="text-[0.9375rem] leading-relaxed text-ink">
                  Korelasi Kepercayaan RA (TRA) dan Kepercayaan platform (TIP): <span className="font-semibold tabular-nums">r = {fmt(a.discriminant.r)}</span>. Validitas diskriminan bertahan selama di bawah sekitar {fmt(a.discriminant.threshold)}.
                </p>
                <ToneMark tone={!Number.isFinite(a.discriminant.r) ? "netral" : a.discriminant.r < a.discriminant.threshold ? "baik" : "perhatian"} />
              </div>
              <div className="grid content-start gap-2 border-t border-line pt-4">
                <p className="text-sm text-muted">Redundancy analysis (indikasi awal)</p>
                {a.redundancy.map((x) => (
                  <p key={x.code} className="text-[0.9375rem] leading-relaxed text-ink">
                    <span className="font-semibold" translate="no">{x.code}</span> dengan skor {x.label.toLowerCase()}: <span className="font-semibold tabular-nums">r = {fmt(x.r)}</span>
                  </p>
                ))}
                <p className="text-sm text-muted">Pada PLS-SEM, koefisien jalur antara item global dan konstruk formatif umumnya diharapkan ≥ 0,70.</p>
              </div>
            </div>
          </Chapter>

          <Chapter id="urutan" title="Efek urutan C dan D" lead="Bagian C dan D diacak antarversi form. Bila urutan tidak berpengaruh, rata-rata kedua versi seharusnya mirip.">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-sm">
                <thead><tr className="text-left text-muted"><th className="py-2 pr-4 font-medium">Skor</th><th className="py-2 pr-4 text-right font-medium">Versi CD</th><th className="py-2 pr-4 text-right font-medium">Versi DC</th><th className="py-2 pr-4 text-right font-medium">Selisih</th><th className="py-2 text-right font-medium">Uji t Welch</th></tr></thead>
                <tbody>
                  {a.orderEffect.map((e) => (
                    <tr key={e.label} className="border-t border-line">
                      <td className="py-3 pr-4">{e.label}</td>
                      <td className="py-3 pr-4 text-right tabular-nums">{fmt(e.cd)}</td>
                      <td className="py-3 pr-4 text-right tabular-nums">{fmt(e.dc)}</td>
                      <td className="py-3 pr-4 text-right tabular-nums">{fmt(e.cd - e.dc)}</td>
                      <td className="py-3 text-right tabular-nums">{e.test ? `${pLabel(e.test.p)}, d = ${fmt(e.test.d)}` : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Chapter>

          <Chapter id="data" title="Data jawaban" lead={`80 jawaban terbaru dari ${a.screened.length} yang diperiksa. Unduh CSV atau Excel untuk seluruh kolom.`}>
            <div className="max-h-[32rem] overflow-auto rounded-[10px] border border-line">
              <table className="w-full min-w-[46rem] text-sm">
                <thead className="sticky top-0 bg-surface">
                  <tr className="text-left text-muted">
                    <th className="px-3 py-2.5 font-medium">Diterima (WIB)</th>
                    <th className="px-3 py-2.5 font-medium">ID</th>
                    <th className="px-3 py-2.5 font-medium">Versi</th>
                    <th className="px-3 py-2.5 text-right font-medium">Durasi</th>
                    <th className="px-3 py-2.5 text-right font-medium">AC gagal</th>
                    <th className="px-3 py-2.5 text-right font-medium">Longstring</th>
                    <th className="px-3 py-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((s) => (
                    <tr key={s.record.id} className="border-t border-line">
                      <td className="px-3 py-2 whitespace-nowrap tabular-nums">{new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(s.record.receivedAt))}</td>
                      <td className="px-3 py-2 text-xs text-muted tabular-nums" translate="no">{s.record.id.slice(0, 13)}</td>
                      <td className="px-3 py-2">{s.record.formVersion}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmt(s.record.durationSeconds / 60, 1)} mnt</td>
                      <td className="px-3 py-2 text-right tabular-nums">{s.acFailed}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{s.longstring}</td>
                      <td className={`px-3 py-2 ${s.kept ? "text-ink-soft" : "font-medium text-danger"}`}>{s.kept ? "Dipertahankan" : "Dikeluarkan"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Chapter>
        </main>
      </div>
    </div>
  );
}
