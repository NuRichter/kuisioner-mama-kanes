import "server-only";
import path from "node:path";
import { Document, Font, Page, renderToBuffer, StyleSheet, Text as PdfText, View, type TextProps } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import type { Analysis, Distribution } from "@/lib/analytics/analyze";
import { describeOptions } from "@/lib/analytics/options";
import { fmt, pct, pLabel } from "@/lib/analytics/stats";

const fontDir = path.join(process.cwd(), "assets", "fonts");
Font.register({
  family: "Geist",
  fonts: [
    { src: path.join(fontDir, "Geist-Regular.ttf"), fontWeight: 400 },
    { src: path.join(fontDir, "Geist-SemiBold.ttf"), fontWeight: 600 },
    { src: path.join(fontDir, "Geist-Bold.ttf"), fontWeight: 700 },
  ],
});
Font.registerHyphenationCallback((word) => [word]);

/** Geist tidak memiliki glif Yunani; tulis α sebagai "alpha". */
function clean(node: unknown): unknown {
  if (typeof node === "string") return node.replace(/α/g, "alpha");
  if (Array.isArray(node)) return node.map(clean);
  return node;
}

function Text({ children, ...props }: TextProps & { children?: ReactNode }) {
  return <PdfText {...props}>{clean(children) as ReactNode}</PdfText>;
}

const C = {
  ink: "#15191b",
  soft: "#454d52",
  muted: "#5e676c",
  line: "#d9ddd8",
  paper: "#ffffff",
  wash: "#e2ece7",
  viz: "#0f7a5a",
  vizSoft: "#b8dccf",
  danger: "#a1352a",
  lk: ["#b0482f", "#e0a088", "#cfd3cd", "#80bba8", "#0f7a5a"],
};

const s = StyleSheet.create({
  page: { paddingTop: 56, paddingBottom: 56, paddingHorizontal: 48, fontFamily: "Geist", fontSize: 9.5, color: C.ink, lineHeight: 1.45 },
  running: { position: "absolute", top: 24, left: 48, right: 48, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: C.muted },
  footer: { position: "absolute", bottom: 24, left: 48, right: 48, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: C.muted },
  h1: { fontFamily: "Geist", fontWeight: 700, fontSize: 26, lineHeight: 1.15, letterSpacing: -0.4 },
  h2: { fontFamily: "Geist", fontWeight: 700, fontSize: 15, marginBottom: 4 },
  lead: { fontSize: 9.5, color: C.soft, marginBottom: 14, maxWidth: 440 },
  h3: { fontFamily: "Geist", fontWeight: 700, fontSize: 10.5, marginBottom: 6 },
  small: { fontSize: 7.5, color: C.muted },
  rule: { borderTopWidth: 0.75, borderTopColor: C.line },
  th: { fontFamily: "Geist", fontWeight: 700, fontSize: 7.5, color: C.muted, paddingVertical: 4 },
  td: { paddingVertical: 4, borderTopWidth: 0.5, borderTopColor: C.line },
  num: { textAlign: "right" },
});

function Shell({ a, children }: { a: Analysis; children: ReactNode }) {
  return (
    <Page size="A4" style={s.page}>
      <View style={s.running} fixed>
        <Text>Laporan data kuesioner penelitian</Text>
        <Text>{describeOptions(a.options)}</Text>
      </View>
      {children}
      <View style={s.footer} fixed>
        <Text>Questionnaire dibuat Irma Dwi Kusuma © 2026 All Rights Reserved</Text>
        <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </View>
    </Page>
  );
}

function Bar({ value, max, color = C.viz, height = 6 }: { value: number; max: number; color?: string; height?: number }) {
  return (
    <View style={{ height, backgroundColor: "#eef0ed", borderRadius: 1 }}>
      <View style={{ width: `${max ? Math.min(100, (value / max) * 100) : 0}%`, height, backgroundColor: color, borderRadius: 1 }} />
    </View>
  );
}

function Bars({ d, n }: { d: Distribution; n: number }) {
  const max = Math.max(1, ...d.rows.map((r) => r.count));
  return (
    <View wrap={false} style={{ marginBottom: 14 }}>
      <Text style={s.h3}>{`${d.number}. ${d.question}`}</Text>
      {d.rows.map((r) => (
        <View key={r.code} style={{ marginBottom: 4 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: C.soft, maxWidth: 200 }}>{r.label}</Text>
            <Text>{`${r.count}  ${pct(r.count, n)}`}</Text>
          </View>
          <Bar value={r.count} max={max} />
        </View>
      ))}
    </View>
  );
}

function LikertStack({ dist }: { dist: number[] }) {
  const total = dist.reduce((x, y) => x + y, 0) || 1;
  return (
    <View style={{ flexDirection: "row", height: 6, width: "100%" }}>
      {dist.map((v, i) => (v > 0 ? <View key={i} style={{ width: `${(v / total) * 100}%`, backgroundColor: C.lk[i], marginRight: i < 4 ? 0.8 : 0 }} /> : null))}
    </View>
  );
}

function Matrix({ labels, codes, values, threshold }: { labels: string[]; codes: string[]; values: number[][]; threshold?: number }) {
  const w = 34;
  return (
    <View>
      {labels.map((row, i) => (
        <View key={row} style={{ flexDirection: "row", alignItems: "center", marginBottom: 1.5 }}>
          <Text style={{ width: 110, fontSize: 7, color: C.soft }}>{`${row} (${codes[i]})`}</Text>
          {labels.slice(0, i).map((col, j) => {
            const v = values[i][j];
            const strength = Number.isFinite(v) ? Math.min(1, Math.abs(v)) : 0;
            const base = v < 0 ? [176, 72, 47] : [15, 122, 90];
            const mix = (k: number) => Math.round(255 - (255 - base[k]) * strength * 0.85);
            const over = threshold !== undefined && v >= threshold;
            return (
              <View key={col} style={{ width: w, height: 16, marginRight: 1.5, justifyContent: "center", backgroundColor: `rgb(${mix(0)},${mix(1)},${mix(2)})`, position: "relative" }}>
                <Text style={{ fontSize: 6.5, textAlign: "center", color: strength > 0.55 ? "#ffffff" : C.ink }}>{fmt(v)}</Text>
                {over && <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderWidth: 1.2, borderColor: C.danger }} />}
              </View>
            );
          })}
        </View>
      ))}
      <View style={{ flexDirection: "row", marginLeft: 110, marginTop: 2 }}>
        {codes.slice(0, -1).map((l) => (
          <Text key={l} style={{ width: w, marginRight: 1.5, fontSize: 6, color: C.muted, textAlign: "center" }}>{l}</Text>
        ))}
      </View>
    </View>
  );
}

function Report({ a }: { a: Analysis }) {
  const n = a.totals.analyzed;
  const generated = new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(a.generatedAt));
  const hvm = a.humanVsMachine;
  const tone = { baik: "Aman", perhatian: "Perlu perhatian", netral: "Catatan" } as const;
  const labels = a.correlations.blocks.map((b) => b.label);
  const codes = a.correlations.blocks.map((b) => b.id);

  return (
    <Document title="Laporan data kuesioner penelitian" author="Irma Dwi Kusuma" language="id">
      {/* Sampul */}
      <Page size="A4" style={[s.page, { justifyContent: "space-between" }]}>
        <View>
          <Text style={[s.small, { marginBottom: 12 }]}>Laporan data kuesioner penelitian</Text>
          <Text style={s.h1}>Kredibilitas Sumber Manusia dan Sistem Cerdas dalam Ekosistem Investasi Digital</Text>
          <Text style={[s.lead, { marginTop: 14 }]}>{`Data per ${generated} WIB. Menampilkan ${describeOptions(a.options)}.`}</Text>
        </View>
        <View>
          <Text style={{ fontFamily: "Geist", fontWeight: 700, fontSize: 64, color: C.ink, lineHeight: 1 }}>{String(a.totals.clean)}</Text>
          <Text style={{ fontSize: 11, color: C.soft, marginTop: 6, marginBottom: 14 }}>responden bersih menuju target 650 sampai 700</Text>
          <View style={{ height: 10, backgroundColor: "#eef0ed", position: "relative" }}>
            <View style={{ position: "absolute", left: 0, top: 0, height: 10, width: `${Math.min(100, (a.totals.inVersion / 750) * 100)}%`, backgroundColor: C.vizSoft }} />
            <View style={{ position: "absolute", left: 0, top: 0, height: 10, width: `${Math.min(100, (a.totals.clean / 750) * 100)}%`, backgroundColor: C.viz }} />
            {[300, 400, 500, 650, 700].map((v) => (
              <View key={v} style={{ position: "absolute", left: `${(v / 750) * 100}%`, top: -3, height: 16, width: 0.75, backgroundColor: C.ink }} />
            ))}
          </View>
          <View style={{ position: "relative", height: 26, marginTop: 4 }}>
            {[
              { v: 300, l: "300 lantai A2" },
              { v: 400, l: "400 disertasi" },
              { v: 500, l: "500 lantai" },
              { v: 675, l: "650-700 target" },
            ].map((m) => (
              <Text key={m.v} style={{ position: "absolute", left: `${(m.v / 750) * 100 - 6}%`, fontSize: 7, color: C.muted }}>{m.l}</Text>
            ))}
          </View>
          <View style={{ flexDirection: "row", gap: 28, marginTop: 18 }}>
            {[
              ["Tersimpan", String(a.totals.stored)],
              ["Dianalisis", String(n)],
              ["Versi CD : DC", `${a.versions.CD} : ${a.versions.DC}`],
              ["Median durasi", Number.isFinite(a.durations.median) ? `${fmt(a.durations.median, 1)} menit` : "-"],
            ].map(([k, v]) => (
              <View key={k}>
                <Text style={s.small}>{k}</Text>
                <Text style={{ fontFamily: "Geist", fontWeight: 700, fontSize: 13 }}>{v}</Text>
              </View>
            ))}
          </View>
        </View>
        <Text style={s.small}>Questionnaire dibuat Irma Dwi Kusuma © 2026 All Rights Reserved</Text>
      </Page>

      <Shell a={a}>
        <Text style={s.h2}>Insight dari data</Text>
        <Text style={s.lead}>Dibentuk otomatis dari angka pada laporan ini. Setiap insight menyebut dasar perhitungannya dan tidak memuat klaim kausal.</Text>
        {a.insights.map((i) => (
          <View key={i.title} wrap={false} style={[s.rule, { paddingVertical: 9, flexDirection: "row", gap: 14 }]}>
            <Text style={{ width: 70, fontSize: 7.5, fontFamily: "Geist", fontWeight: 700, color: i.tone === "perhatian" ? C.danger : i.tone === "baik" ? C.viz : C.muted }}>{tone[i.tone]}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: "Geist", fontWeight: 700, fontSize: 10.5, marginBottom: 2 }}>{i.title}</Text>
              <Text style={{ color: C.soft }}>{i.body}</Text>
              <Text style={[s.small, { marginTop: 3 }]}>{`Dasar: ${i.basis}`}</Text>
            </View>
          </View>
        ))}
      </Shell>

      <Shell a={a}>
        <Text style={s.h2}>Screening data</Text>
        <Text style={s.lead}>{`Catatan peneliti nomor 4: AC1 lolos pada skor 2, AC2 pada 4, AC3 pada 1. Gagal dua atau lebih dikeluarkan; gagal satu dikeluarkan bila longstring ≥ ${a.options.longstringThreshold}.`}</Text>
        {(
          [
            ["Lolos semua attention check", a.verdicts.lolos],
            ["Gagal 1, longstring di bawah ambang", a.verdicts["lolos-1-gagal"]],
            ["Gagal 1 dan longstring tinggi (keluar)", a.verdicts["keluar-longstring"]],
            ["Gagal 2 atau lebih (keluar)", a.verdicts["keluar-ac"]],
          ] as const
        ).map(([label, v]) => (
          <View key={label} style={{ marginBottom: 6 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: C.soft }}>{label}</Text>
              <Text>{`${v}  ${pct(v, a.screened.length)}`}</Text>
            </View>
            <Bar value={v} max={Math.max(1, a.screened.length)} />
          </View>
        ))}
        <View style={{ flexDirection: "row", gap: 24, marginTop: 10, marginBottom: 22 }}>
          {(["AC1", "AC2", "AC3"] as const).map((k) => (
            <View key={k}>
              <Text style={s.small}>{`${k} gagal`}</Text>
              <Text style={{ fontFamily: "Geist", fontWeight: 700, fontSize: 13 }}>{String(a.acFailures[k])}</Text>
            </View>
          ))}
        </View>

        <Text style={s.h2}>Konstruk</Text>
        <Text style={s.lead}>Rerata skor konstruk pada skala 1 sampai 5 dan reliabilitas Cronbach&apos;s alpha. Merah: α di bawah 0,70.</Text>
        <View style={{ flexDirection: "row" }}>
          <Text style={[s.th, { flex: 1 }]}>Konstruk</Text>
          <Text style={[s.th, { width: 34 }]}>Kode</Text>
          <Text style={[s.th, { width: 150 }]}>Rerata</Text>
          <Text style={[s.th, s.num, { width: 40 }]}>SD</Text>
          <Text style={[s.th, s.num, { width: 40 }]}>α</Text>
        </View>
        {a.constructStats.map((c) => (
          <View key={c.construct.id} style={[s.td, { flexDirection: "row", alignItems: "center" }]} wrap={false}>
            <Text style={{ flex: 1 }}>{c.construct.name}</Text>
            <Text style={{ width: 34, fontSize: 7.5, color: C.soft }}>{c.construct.usage}</Text>
            <View style={{ width: 150, flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={{ width: 110 }}>
                <Bar value={Number.isFinite(c.mean) ? c.mean - 1 : 0} max={4} />
              </View>
              <Text>{fmt(c.mean)}</Text>
            </View>
            <Text style={[s.num, { width: 40 }]}>{fmt(c.sd)}</Text>
            <Text style={[s.num, { width: 40, fontFamily: "Geist", fontWeight: 700, color: c.alpha < 0.7 ? C.danger : C.ink }]}>{fmt(c.alpha)}</Text>
          </View>
        ))}
        <Text style={[s.small, { marginTop: 6 }]}>{`Kepercayaan terhadap platform sebagai satu blok 11 butir: α = ${fmt(a.tipAlpha)}.`}</Text>
      </Shell>

      <Shell a={a}>
        <Text style={s.h2}>Sebaran jawaban per butir</Text>
        <Text style={s.lead}>Batang bertumpuk dari skor 1 (merah bata) sampai 5 (hijau), dengan rerata dan korelasi butir-total terkoreksi.</Text>
        {a.constructStats.map((c) => (
          <View key={c.construct.id} style={{ marginBottom: 10 }}>
            <Text style={[s.h3, { marginBottom: 3 }]}>{c.construct.name}</Text>
            {c.items.map((i) => (
              <View key={i.code} wrap={false} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 3 }}>
                <Text style={{ width: 52, fontSize: 7.5, fontFamily: "Geist", fontWeight: 700 }}>{i.code}</Text>
                <View style={{ flex: 1 }}><LikertStack dist={i.dist} /></View>
                <Text style={{ width: 30, ...s.num }}>{fmt(i.mean)}</Text>
                <Text style={{ width: 36, ...s.num, color: i.itemTotal < 0.3 ? C.danger : C.soft }}>{`r ${fmt(i.itemTotal)}`}</Text>
              </View>
            ))}
          </View>
        ))}
      </Shell>

      <Shell a={a}>
        <Text style={s.h2}>Manusia vs mesin</Text>
        <Text style={s.lead}>Kredibilitas finfluencer (8 butir FC) dibandingkan kredibilitas robo advisor (9 butir RAC) pada responden yang sama.</Text>
        <View style={{ flexDirection: "row", gap: 30, marginBottom: 22 }}>
          {[
            ["Finfluencer", fmt(hvm.fc)],
            ["Robo advisor", fmt(hvm.rac)],
            ["Uji t berpasangan", hvm.test ? `t(${hvm.test.df}) = ${fmt(hvm.test.t)}; ${pLabel(hvm.test.p)}` : "-"],
            ["RAC lebih tinggi", pct(hvm.higherRac, n)],
          ].map(([k, v]) => (
            <View key={k}>
              <Text style={s.small}>{k}</Text>
              <Text style={{ fontFamily: "Geist", fontWeight: 700, fontSize: 12 }}>{v}</Text>
            </View>
          ))}
        </View>

        <Text style={s.h2}>Kepercayaan dan risiko</Text>
        <Text style={s.lead}>Kepercayaan terhadap platform dan persepsi risiko dipisah pada titik tengah skala 3. Deskriptif, bukan uji moderasi.</Text>
        {a.trustRisk.quadrants.map((q) => (
          <View key={q.key} style={[s.td, { flexDirection: "row" }]}>
            <Text style={{ flex: 1 }}>{q.label}</Text>
            <Text style={{ width: 70, ...s.num }}>{`n ${q.count}`}</Text>
            <Text style={{ width: 90, ...s.num, fontFamily: "Geist", fontWeight: 700 }}>{`niat ${fmt(q.intention)}`}</Text>
          </View>
        ))}

        <Text style={[s.h2, { marginTop: 22 }]}>Efek urutan C dan D</Text>
        {a.orderEffect.map((e) => (
          <View key={e.label} style={[s.td, { flexDirection: "row" }]}>
            <Text style={{ flex: 1 }}>{e.label}</Text>
            <Text style={{ width: 70, ...s.num }}>{`CD ${fmt(e.cd)}`}</Text>
            <Text style={{ width: 70, ...s.num }}>{`DC ${fmt(e.dc)}`}</Text>
            <Text style={{ width: 90, ...s.num }}>{e.test ? pLabel(e.test.p) : "-"}</Text>
          </View>
        ))}

        <Text style={[s.h2, { marginTop: 22 }]}>Validitas diskriminan</Text>
        <Text style={{ color: C.soft }}>{`TRA dengan TIP: r = ${fmt(a.discriminant.r)} (batas sekitar ${fmt(a.discriminant.threshold)}, catatan peneliti nomor 3).`}</Text>
        {a.redundancy.map((x) => (
          <Text key={x.code} style={{ color: C.soft }}>{`${x.code} dengan skor ${x.label.toLowerCase()}: r = ${fmt(x.r)} (redundancy analysis, indikasi awal).`}</Text>
        ))}
      </Shell>

      <Shell a={a}>
        <Text style={s.h2}>Korelasi skor konstruk</Text>
        <Text style={s.lead}>Pearson r, segitiga bawah. Hijau positif, merah bata negatif.</Text>
        <Matrix labels={labels} codes={codes} values={a.correlations.r} />
        <Text style={[s.h2, { marginTop: 24 }]}>HTMT</Text>
        <Text style={s.lead}>Sel bergaris merah: HTMT ≥ 0,85 (Henseler dkk., 2015).</Text>
        <Matrix labels={labels} codes={codes} values={a.correlations.htmt} threshold={0.85} />
      </Shell>

      <Shell a={a}>
        <Text style={s.h2}>Profil responden</Text>
        <Text style={s.lead}>{`Berdasarkan ${n} responden yang dianalisis.`}</Text>
        <View style={{ flexDirection: "row", gap: 28 }}>
          <View style={{ flex: 1 }}>
            {a.profile.distributions.slice(0, 2).map((d) => <Bars key={d.id} d={d} n={n} />)}
            <Bars d={a.profile.recency} n={n} />
          </View>
          <View style={{ flex: 1 }}>
            {a.profile.distributions.slice(2).map((d) => <Bars key={d.id} d={d} n={n} />)}
            <Bars d={a.profile.frequency} n={n} />
          </View>
        </View>
      </Shell>
    </Document>
  );
}

export async function buildPdf(a: Analysis): Promise<Buffer> {
  return renderToBuffer(<Report a={a} />);
}
