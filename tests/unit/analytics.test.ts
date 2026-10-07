import { describe, expect, it } from "vitest";
import { analyze, htmt, screen } from "@/lib/analytics/analyze";
import { cronbachAlpha, fmt, pairedT, pearson, quantile, tTwoTailedP, welchT } from "@/lib/analytics/stats";
import type { StoredResponse } from "@/lib/validation/submission";
import { completeAnswers } from "./fixtures";

describe("statistik dasar", () => {
  it("pearson dan kuantil", () => {
    expect(pearson([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(1);
    expect(pearson([1, 2, 3, 4], [8, 6, 4, 2])).toBeCloseTo(-1);
    expect(quantile([1, 2, 3, 4], 0.5)).toBe(2.5);
  });

  it("p dua sisi distribusi t sesuai tabel", () => {
    expect(tTwoTailedP(2.228, 10)).toBeCloseTo(0.05, 3);
    expect(tTwoTailedP(1.96, 1e6)).toBeCloseTo(0.05, 3);
    expect(tTwoTailedP(0, 5)).toBeCloseTo(1, 6);
  });

  it("cronbach alpha", () => {
    expect(cronbachAlpha([[1, 1], [2, 2], [3, 3], [4, 4]])).toBeCloseTo(1);
    // Dihitung manual: var butir 1,3 masing-masing, var total 9,3 → 1,5 × (1 − 3,9/9,3) = 0,8710.
    const rows = [[3, 4, 3], [4, 4, 5], [2, 3, 2], [5, 5, 4], [3, 2, 3]];
    expect(cronbachAlpha(rows)).toBeCloseTo(0.871, 3);
  });

  it("uji t", () => {
    const w = welchT([5, 6, 7, 8, 9], [1, 2, 3, 4, 5]);
    expect(w.t).toBeCloseTo(4, 6);
    expect(w.df).toBeCloseTo(8, 6);
    const p = pairedT([2, 3, 4, 5], [1, 2, 3, 3]);
    expect(p.diff).toBeCloseTo(1.25);
  });

  it("format angka Indonesia", () => {
    expect(fmt(0.784)).toBe("0,78");
    expect(fmt(NaN)).toBe("-");
  });
});

function record(i: number, overrides: Record<string, string> = {}, likert?: (code: string, i: number) => string): StoredResponse {
  return {
    id: `r${i}`,
    receivedAt: new Date(Date.UTC(2026, 9, 1 + (i % 5), 3)).toISOString(),
    startedAt: new Date(Date.UTC(2026, 9, 1 + (i % 5), 2, 48)).toISOString(),
    durationSeconds: 600 + i * 7,
    formVersion: i % 2 ? "DC" : "CD",
    answers: { ...(completeAnswers(likert) as Record<string, string | string[]>), ...overrides },
  };
}

describe("screening data", () => {
  it("mengikuti catatan peneliti nomor 4", () => {
    const base = { AC1: "2", AC2: "4", AC3: "1" };
    const rs = [
      record(0, base, (_c, i) => String((i % 5) + 1)),
      record(1, { ...base, AC1: "5" }, (_c, i) => String((i % 5) + 1)),
      record(2, { ...base, AC1: "5" }, () => "4"),
      record(3, { ...base, AC1: "5", AC2: "5" }),
    ];
    const s = screen(rs, 10).map((x) => x.verdict);
    expect(s).toEqual(["lolos", "lolos-1-gagal", "keluar-longstring", "keluar-ac"]);
  });
});

describe("analisis", () => {
  // Data dengan variasi terstruktur agar statistik terdefinisi.
  const rs = Array.from({ length: 40 }, (_, i) =>
    record(i, { AC1: "2", AC2: "4", AC3: "1" }, (code) => {
      if (code.startsWith("AC")) return "3";
      const base = code.startsWith("RAC") || code.startsWith("TRA") ? 4 : 3;
      return String(Math.min(5, Math.max(1, base + ((i * 7 + code.length) % 3) - 1)));
    }),
  );
  const a = analyze(rs);

  it("menghitung total dan target", () => {
    expect(a.totals.stored).toBe(40);
    expect(a.totals.clean).toBe(40);
    expect(a.versions.CD + a.versions.DC).toBe(40);
    expect(a.timeline.at(-1)?.cumulative).toBe(40);
  });

  it("memuat 13 konstruk dan matriks 11 blok", () => {
    expect(a.constructStats).toHaveLength(13);
    expect(a.correlations.r).toHaveLength(11);
    expect(a.correlations.r[0][0]).toBe(1);
  });

  it("filter versi dan sampel bekerja", () => {
    expect(analyze(rs, { version: "CD", sample: "all", longstringThreshold: 10 }).totals.analyzed).toBe(20);
  });

  it("insight selalu menyebut dasar perhitungan", () => {
    expect(a.insights.length).toBeGreaterThan(3);
    for (const i of a.insights) expect(i.basis.length).toBeGreaterThan(0);
  });

  it("aman untuk data kosong", () => {
    const empty = analyze([]);
    expect(empty.totals.analyzed).toBe(0);
    expect(empty.insights[0].title).toMatch(/Belum ada/);
  });

  it("HTMT simetris", () => {
    expect(htmt(rs, ["INT1", "INT2", "INT3"], ["PR1", "PR2", "PR3"])).toBeCloseTo(htmt(rs, ["PR1", "PR2", "PR3"], ["INT1", "INT2", "INT3"]));
  });
});
