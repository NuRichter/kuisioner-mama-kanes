import { describe, expect, it } from "vitest";
import { columns, csvCell, toCsv } from "@/lib/export/csv";
import { allLikertCodes } from "@/lib/questionnaire/flow";
import { attentionCheck, longestString } from "@/lib/scoring/screening";
import type { StoredResponse } from "@/lib/validation/submission";
import { completeAnswers } from "./fixtures";

describe("attention check (catatan peneliti nomor 4)", () => {
  it("AC1 = 2, AC2 = 4, AC3 = 1 berarti lolos semua", () => {
    const r = attentionCheck({ AC1: "2", AC2: "4", AC3: "1" });
    expect(r.failedCount).toBe(0);
    expect(r.status).toBe("lolos");
  });

  it("gagal pada satu attention check perlu diperiksa longstring", () => {
    const r = attentionCheck({ AC1: "3", AC2: "4", AC3: "1" });
    expect(r.passed.AC1).toBe(false);
    expect(r.status).toBe("periksa-longstring");
  });

  it("gagal pada dua atau lebih dikeluarkan", () => {
    expect(attentionCheck({ AC1: "3", AC2: "5", AC3: "1" }).status).toBe("dikeluarkan");
    expect(attentionCheck({ AC1: "5", AC2: "5", AC3: "5" }).failedCount).toBe(3);
  });
});

describe("indikator longstring", () => {
  it("menghitung rangkaian jawaban identik terpanjang", () => {
    expect(longestString(["a", "b", "c", "d"], { a: "4", b: "4", c: "2", d: "2" })).toBe(2);
    expect(longestString(["a", "b", "c"], { a: "1", b: "1", c: "1" })).toBe(3);
    expect(longestString([], {})).toBe(0);
  });

  it("memutus rangkaian pada jawaban kosong", () => {
    expect(longestString(["a", "b", "c"], { a: "3", c: "3" })).toBe(1);
  });

  it("jawaban seragam pada seluruh 53 butir menghasilkan 53", () => {
    expect(longestString(allLikertCodes("CD"), completeAnswers(() => "5"))).toBe(53);
  });
});

describe("ekspor CSV", () => {
  const record: StoredResponse = {
    id: "id-1",
    receivedAt: "2026-10-08T10:15:00.000Z",
    startedAt: "2026-10-08T10:02:00.000Z",
    durationSeconds: 780,
    formVersion: "CD",
    answers: completeAnswers() as Record<string, string | string[]>,
  };

  it("memuat kolom dummy A10 dan seluruh kode butir", () => {
    const keys = columns.map((c) => c.key);
    expect(keys).toContain("A10_1");
    expect(keys).toContain("A10_5");
    expect(keys).toContain("FC_EXP1");
    expect(keys).toContain("AIL3");
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("menghasilkan satu baris per jawaban", () => {
    const csv = toCsv([record]);
    const [header, row] = csv.replace("﻿", "").trim().split("\r\n");
    expect(header.split(",")).toHaveLength(columns.length);
    expect(row.startsWith("id-1,")).toBe(true);
  });

  it("mengamankan sel dari formula injection dan tanda kutip", () => {
    expect(csvCell("=HYPERLINK()")).toBe("'=HYPERLINK()");
    expect(csvCell('nama "x", y')).toBe('"nama ""x"", y"');
  });
});
