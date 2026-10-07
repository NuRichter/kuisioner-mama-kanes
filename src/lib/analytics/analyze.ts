import {
  basis,
  likertOrderBase,
  likertSections,
  profile as profileSection,
  PROVINCES,
} from "@/data/questionnaire";
import {
  composites,
  constructs,
  discriminantRule,
  durationEstimate,
  globalItems,
  sampleTargets,
  type Construct,
} from "@/data/research-map";
import { allLikertCodes } from "@/lib/questionnaire/flow";
import { attentionCheck, longestString, type AttentionCode } from "@/lib/scoring/screening";
import type { StoredResponse } from "@/lib/validation/submission";
import type { FormQuestion } from "@/types/questionnaire";
import { buildInsights } from "./insights";
import {
  alphaIfDeleted,
  correctedItemTotal,
  cronbachAlpha,
  mean,
  median,
  pairedT,
  pearson,
  quantile,
  sd,
  welchT,
  type TTest,
} from "./stats";

export interface AnalysisOptions {
  version: "all" | "CD" | "DC";
  sample: "clean" | "all";
  /** Ambang longstring untuk responden yang gagal pada satu attention check. */
  longstringThreshold: number;
}

export const defaultOptions: AnalysisOptions = { version: "all", sample: "clean", longstringThreshold: 10 };

export type ScreenVerdict = "lolos" | "lolos-1-gagal" | "keluar-longstring" | "keluar-ac";

export interface ScreenedResponse {
  record: StoredResponse;
  acFailed: number;
  acPassed: Record<AttentionCode, boolean>;
  longstring: number;
  verdict: ScreenVerdict;
  kept: boolean;
}

/** Aturan catatan peneliti nomor 4, dengan ambang longstring yang dapat diatur. */
export function screen(records: StoredResponse[], longstringThreshold: number): ScreenedResponse[] {
  return records.map((record) => {
    const ac = attentionCheck(record.answers);
    const longstring = longestString(allLikertCodes(record.formVersion), record.answers);
    let verdict: ScreenVerdict = "lolos";
    if (ac.failedCount >= 2) verdict = "keluar-ac";
    else if (ac.failedCount === 1) verdict = longstring >= longstringThreshold ? "keluar-longstring" : "lolos-1-gagal";
    return {
      record,
      acFailed: ac.failedCount,
      acPassed: ac.passed,
      longstring,
      verdict,
      kept: verdict === "lolos" || verdict === "lolos-1-gagal",
    };
  });
}

const likertItemText = new Map(
  likertOrderBase.flatMap((id) => likertSections[id].items.map((i) => [i.code, i.text] as const)),
);

export function itemText(code: string): string {
  return likertItemText.get(code) ?? code;
}

function num(r: StoredResponse, code: string): number {
  return Number(r.answers[code]);
}

function score(r: StoredResponse, items: readonly string[]): number {
  return mean(items.map((c) => num(r, c)));
}

export interface ItemStat {
  code: string;
  text: string;
  mean: number;
  sd: number;
  /** Jumlah jawaban 1 sampai 5 (indeks 0 = skor 1). */
  dist: number[];
  itemTotal: number;
  alphaIfDeleted: number;
}

export interface ConstructStat {
  construct: Construct;
  mean: number;
  sd: number;
  alpha: number;
  items: ItemStat[];
}

function constructStat(c: Construct, rs: StoredResponse[]): ConstructStat {
  const rows = rs.map((r) => c.items.map((code) => num(r, code)));
  const itr = correctedItemTotal(rows);
  const aid = alphaIfDeleted(rows);
  const scores = rs.map((r) => score(r, c.items));
  return {
    construct: c,
    mean: mean(scores),
    sd: sd(scores),
    alpha: cronbachAlpha(rows),
    items: c.items.map((code, j) => {
      const values = rows.map((row) => row[j]);
      const dist = [0, 0, 0, 0, 0];
      for (const v of values) if (v >= 1 && v <= 5) dist[v - 1]++;
      return { code, text: itemText(code), mean: mean(values), sd: sd(values), dist, itemTotal: itr[j], alphaIfDeleted: aid[j] };
    }),
  };
}

/** Blok konstruk untuk korelasi dan HTMT (TIP sebagai satu blok 11 butir). */
export const matrixBlocks: { id: string; label: string; items: readonly string[] }[] = [
  ...["FC_EXP", "FC_TRW", "RAC_CAP", "RAC_RSP"].map((id) => {
    const c = constructs.find((x) => x.id === id)!;
    return { id, label: c.short, items: c.items };
  }),
  { id: "TIP", label: "Kepercayaan platform", items: composites.TIP },
  ...["PR", "INT", "PSR", "DIS", "TRA", "AIL"].map((id) => {
    const c = constructs.find((x) => x.id === id)!;
    return { id, label: c.short, items: c.items };
  }),
];

/**
 * HTMT (Henseler, Ringle, & Sarstedt, 2015): rata-rata korelasi antarbutir
 * lintas konstruk dibagi rata-rata geometrik korelasi antarbutir dalam konstruk.
 */
export function htmt(rs: StoredResponse[], a: readonly string[], b: readonly string[]): number {
  const col = (code: string) => rs.map((r) => num(r, code));
  const cache = new Map<string, number[]>();
  const get = (code: string) => cache.get(code) ?? (cache.set(code, col(code)), cache.get(code)!);
  const avg = (pairs: [string, string][]) => mean(pairs.map(([x, y]) => Math.abs(pearson(get(x), get(y)))));
  const within = (items: readonly string[]) => {
    const pairs: [string, string][] = [];
    for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) pairs.push([items[i], items[j]]);
    return avg(pairs);
  };
  const hetero: [string, string][] = [];
  for (const x of a) for (const y of b) hetero.push([x, y]);
  return avg(hetero) / Math.sqrt(within(a) * within(b));
}

export interface Distribution {
  id: string;
  number: string;
  question: string;
  rows: { code: string; label: string; count: number }[];
  other?: string[];
}

function distributionFor(q: FormQuestion, rs: StoredResponse[]): Distribution {
  if (q.kind !== "single" && q.kind !== "multi") return { id: q.id, number: q.number, question: q.text, rows: [] };
  const rows = q.options.map((o) => ({
    code: o.code,
    label: o.label,
    count: rs.filter((r) => {
      const v = r.answers[q.id];
      return Array.isArray(v) ? v.includes(o.code) : v === o.code;
    }).length,
  }));
  const otherField = q.options.find((o) => o.textField)?.textField?.id;
  const other = otherField
    ? rs.map((r) => r.answers[otherField]).filter((v): v is string => typeof v === "string" && v.length > 0)
    : undefined;
  return { id: q.id, number: q.number, question: q.text, rows, other };
}

export interface Insight {
  title: string;
  body: string;
  basis: string;
  tone: "baik" | "netral" | "perhatian";
}

export interface Analysis {
  options: AnalysisOptions;
  generatedAt: string;
  totals: { stored: number; inVersion: number; analyzed: number; clean: number };
  screened: ScreenedResponse[];
  verdicts: Record<ScreenVerdict, number>;
  acFailures: Record<AttentionCode, number>;
  longstrings: number[];
  durations: { minutes: number[]; median: number; q1: number; q3: number; withinEstimate: number; underHalfMedian: number };
  timeline: { date: string; count: number; cumulative: number }[];
  targets: (typeof sampleTargets)[number][];
  versions: { CD: number; DC: number };
  profile: {
    birthYears: { year: number; count: number }[];
    provinces: { name: string; count: number }[];
    unknownProvinces: string[];
    distributions: Distribution[];
    channels: Distribution;
    recency: Distribution;
    frequency: Distribution;
    channelCombos: { label: string; count: number }[];
  };
  constructStats: ConstructStat[];
  tipAlpha: number;
  correlations: { blocks: typeof matrixBlocks; r: number[][]; htmt: number[][] };
  discriminant: { r: number; threshold: number };
  redundancy: { code: string; label: string; r: number }[];
  humanVsMachine: { fc: number; rac: number; test: TTest | null; higherFc: number; higherRac: number; equal: number; points: { fc: number; rac: number }[] };
  orderEffect: { label: string; cd: number; dc: number; test: TTest | null }[];
  trustRisk: {
    points: { tip: number; pr: number; int: number }[];
    quadrants: { key: string; label: string; count: number; intention: number }[];
  };
  intentionByTrust: { band: string; n: number; intention: number }[];
  itemHighlights: { mostAgreed: ItemStat | null; mostNeutral: ItemStat | null; mostSpread: ItemStat | null };
  insights: Insight[];
}

const QUADRANTS = [
  { key: "tinggi-tinggi", label: "Percaya, tetap waspada", tipHigh: true, prHigh: true },
  { key: "tinggi-rendah", label: "Percaya, merasa aman", tipHigh: true, prHigh: false },
  { key: "rendah-tinggi", label: "Ragu dan waspada", tipHigh: false, prHigh: true },
  { key: "rendah-rendah", label: "Ragu, merasa aman", tipHigh: false, prHigh: false },
] as const;

/** Titik tengah skala (3 = Netral) memisahkan kuadran. */
const MIDPOINT = 3;

export function analyze(all: StoredResponse[], options: AnalysisOptions = defaultOptions, now = new Date()): Analysis {
  const inVersion = options.version === "all" ? all : all.filter((r) => r.formVersion === options.version);
  const screened = screen(inVersion, options.longstringThreshold);
  const cleanN = screened.filter((s) => s.kept).length;
  const used = options.sample === "clean" ? screened.filter((s) => s.kept) : screened;
  const rs = used.map((s) => s.record);
  const n = rs.length;

  const verdicts: Record<ScreenVerdict, number> = { lolos: 0, "lolos-1-gagal": 0, "keluar-longstring": 0, "keluar-ac": 0 };
  for (const s of screened) verdicts[s.verdict]++;
  const acFailures: Record<AttentionCode, number> = { AC1: 0, AC2: 0, AC3: 0 };
  for (const s of screened) for (const k of Object.keys(s.acPassed) as AttentionCode[]) if (!s.acPassed[k]) acFailures[k]++;

  const minutes = screened.map((s) => s.record.durationSeconds / 60);
  const med = median(minutes);

  // Linimasa berdasarkan seluruh data tersimpan (pengumpulan, bukan analisis).
  const byDay = new Map<string, number>();
  for (const r of all) {
    const day = new Date(r.receivedAt).toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }
  let cum = 0;
  const timeline = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count, cumulative: (cum += count) }));

  // Profil.
  const yearCounts = new Map<number, number>();
  for (const r of rs) {
    const y = Number(r.answers.B1);
    if (Number.isFinite(y)) yearCounts.set(y, (yearCounts.get(y) ?? 0) + 1);
  }
  const birthYears = Array.from({ length: 16 }, (_, i) => 1997 + i).map((year) => ({ year, count: yearCounts.get(year) ?? 0 }));
  const provinceCounts = new Map<string, number>();
  const unknownProvinces: string[] = [];
  const canonical = new Map(PROVINCES.map((p) => [p.toLowerCase(), p]));
  for (const r of rs) {
    const raw = String(r.answers.B2 ?? "").trim();
    const match = canonical.get(raw.toLowerCase());
    if (match) provinceCounts.set(match, (provinceCounts.get(match) ?? 0) + 1);
    else if (raw) unknownProvinces.push(raw);
  }
  const provinces = [...provinceCounts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  const q = (id: string) => [...basis.questions, ...profileSection.questions].find((x) => x.id === id)!;
  const channels = distributionFor(q("A10"), rs);
  const comboCounts = new Map<string, number>();
  for (const r of rs) {
    const sel = (r.answers.A10 as string[] | undefined) ?? [];
    const label = sel
      .map((code) => channels.rows.find((row) => row.code === code)?.label.replace(/ resmi Bareksa| Bareksa/g, "") ?? code)
      .join(" + ");
    if (label) comboCounts.set(label, (comboCounts.get(label) ?? 0) + 1);
  }

  // Konstruk.
  const constructStats = constructs.map((c) => constructStat(c, rs));
  const tipAlpha = cronbachAlpha(rs.map((r) => composites.TIP.map((code) => num(r, code))));

  const blockScores = matrixBlocks.map((b) => rs.map((r) => score(r, b.items)));
  const r = matrixBlocks.map((_, i) => matrixBlocks.map((__, j) => (i === j ? 1 : pearson(blockScores[i], blockScores[j]))));
  const h = matrixBlocks.map((a, i) => matrixBlocks.map((b, j) => (i === j ? NaN : htmt(rs, a.items, b.items))));
  const idx = (id: string) => matrixBlocks.findIndex((b) => b.id === id);
  const discR = r[idx(discriminantRule.a)][idx(discriminantRule.b)];

  const fcScores = rs.map((x) => score(x, composites.FC));
  const racScores = rs.map((x) => score(x, composites.RAC));
  const redundancy = globalItems.map((g) => ({
    code: g.code,
    label: g.label,
    r: pearson(rs.map((x) => num(x, g.code)), g.target === "FC" ? fcScores : racScores),
  }));

  const hvm = {
    fc: mean(fcScores),
    rac: mean(racScores),
    test: n >= 3 ? pairedT(fcScores, racScores) : null,
    higherFc: fcScores.filter((v, i) => v - racScores[i] > 1e-9).length,
    higherRac: fcScores.filter((v, i) => racScores[i] - v > 1e-9).length,
    equal: fcScores.filter((v, i) => Math.abs(v - racScores[i]) <= 1e-9).length,
    points: fcScores.map((fc, i) => ({ fc, rac: racScores[i] })),
  };

  const cd = rs.filter((x) => x.formVersion === "CD");
  const dc = rs.filter((x) => x.formVersion === "DC");
  const orderEffect = (["FC", "RAC"] as const).map((key) => {
    const a = cd.map((x) => score(x, composites[key]));
    const b = dc.map((x) => score(x, composites[key]));
    return {
      label: key === "FC" ? "Kredibilitas finfluencer (Bagian C)" : "Kredibilitas robo advisor (Bagian D)",
      cd: mean(a),
      dc: mean(b),
      test: a.length >= 2 && b.length >= 2 ? welchT(a, b) : null,
    };
  });

  const points = rs.map((x) => ({ tip: score(x, composites.TIP), pr: score(x, constructs.find((c) => c.id === "PR")!.items), int: score(x, ["INT1", "INT2", "INT3"]) }));
  const quadrants = QUADRANTS.map((qd) => {
    const inside = points.filter((p) => p.tip >= MIDPOINT === qd.tipHigh && p.pr >= MIDPOINT === qd.prHigh);
    return { key: qd.key, label: qd.label, count: inside.length, intention: mean(inside.map((p) => p.int)) };
  });
  const bands = [
    { band: "Di bawah 3", test: (v: number) => v < 3 },
    { band: "3 sampai di bawah 4", test: (v: number) => v >= 3 && v < 4 },
    { band: "4 ke atas", test: (v: number) => v >= 4 },
  ];
  const intentionByTrust = bands.map((b) => {
    const inside = points.filter((p) => b.test(p.tip));
    return { band: b.band, n: inside.length, intention: mean(inside.map((p) => p.int)) };
  });

  const allItems = constructStats.flatMap((c) => c.items);
  const by = (fn: (i: ItemStat) => number) => (n >= 3 ? allItems.reduce((best, i) => (fn(i) > fn(best) ? i : best), allItems[0]) : null);
  const itemHighlights = {
    mostAgreed: by((i) => (i.dist[3] + i.dist[4]) / Math.max(1, n)),
    mostNeutral: by((i) => i.dist[2] / Math.max(1, n)),
    mostSpread: by((i) => i.sd),
  };

  const analysis: Analysis = {
    options,
    generatedAt: now.toISOString(),
    totals: { stored: all.length, inVersion: inVersion.length, analyzed: n, clean: cleanN },
    screened,
    verdicts,
    acFailures,
    longstrings: screened.map((s) => s.longstring),
    durations: {
      minutes,
      median: med,
      q1: quantile(minutes, 0.25),
      q3: quantile(minutes, 0.75),
      withinEstimate: minutes.filter((m) => m >= durationEstimate.minMinutes && m <= durationEstimate.maxMinutes).length,
      underHalfMedian: minutes.filter((m) => m < med / 2).length,
    },
    timeline,
    targets: sampleTargets,
    versions: { CD: inVersion.filter((x) => x.formVersion === "CD").length, DC: inVersion.filter((x) => x.formVersion === "DC").length },
    profile: {
      birthYears,
      provinces,
      unknownProvinces,
      distributions: ["B3", "B4", "B5", "B6"].map((id) => distributionFor(q(id), rs)),
      channels,
      recency: distributionFor(q("A12"), rs),
      frequency: distributionFor(q("A13"), rs),
      channelCombos: [...comboCounts.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, 6),
    },
    constructStats,
    tipAlpha,
    correlations: { blocks: matrixBlocks, r, htmt: h },
    discriminant: { r: discR, threshold: discriminantRule.threshold },
    redundancy,
    humanVsMachine: hvm,
    orderEffect,
    trustRisk: { points, quadrants },
    intentionByTrust,
    itemHighlights,
    insights: [],
  };
  analysis.insights = buildInsights(analysis);
  return analysis;
}

