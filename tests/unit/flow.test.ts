import { describe, expect, it } from "vitest";
import { likertSections, meta } from "@/data/questionnaire";
import { allLikertCodes, isEligible, likertOrder, randomVersion, stepSequence, stopReasonAfter } from "@/lib/questionnaire/flow";
import { initialState, parseStoredState, reducer } from "@/lib/questionnaire/state";
import { completeAnswers } from "./fixtures";

describe("instrumen", () => {
  it("memuat tepat 53 pernyataan Likert dengan kode unik", () => {
    const codes = Object.values(likertSections).flatMap((s) => s.items.map((i) => i.code));
    expect(codes).toHaveLength(meta.likertCount);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("jumlah butir per bagian sesuai peta penggunaan butir", () => {
    const counts = Object.fromEntries(Object.entries(likertSections).map(([k, s]) => [k, s.items.length]));
    expect(counts).toEqual({ C: 8, D: 9, E: 12, F: 3, G: 6, H: 2, I: 7, J: 3, K: 3 });
  });

  it("menempatkan attention check pada posisi sesuai dokumen", () => {
    expect(likertSections.E.items[6].code).toBe("AC1");
    expect(likertSections.G.items[2].code).toBe("AC2");
    expect(likertSections.I.items[3].code).toBe("AC3");
  });
});

describe("penyeimbangan urutan C dan D", () => {
  it("versi CD dan DC hanya menukar Bagian C dan D", () => {
    expect(likertOrder("CD").map((s) => s.id)).toEqual(["C", "D", "E", "F", "G", "H", "I", "J", "K"]);
    expect(likertOrder("DC").map((s) => s.id)).toEqual(["D", "C", "E", "F", "G", "H", "I", "J", "K"]);
  });

  it("urutan langkah lengkap", () => {
    expect(stepSequence("DC")).toEqual(["intro", "A", "BASIS", "B", "D", "C", "E", "F", "G", "H", "I", "J", "K", "review"]);
  });

  it("mengundi versi secara seimbang", () => {
    expect(randomVersion(() => 0.1)).toBe("CD");
    expect(randomVersion(() => 0.9)).toBe("DC");
  });

  it("urutan kode pada versi DC dimulai dari butir robo advisor", () => {
    expect(allLikertCodes("DC")[0]).toBe("RAC_CAP1");
  });
});

describe("kriteria kelayakan", () => {
  it("A1 sampai A8 = Ya dan A9 = Tidak lolos", () => {
    expect(isEligible(completeAnswers())).toBe(true);
  });

  it.each(["A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8"])("%s = Tidak menghentikan pengisian", (id) => {
    const a = { ...completeAnswers(), [id]: "0" };
    expect(isEligible(a)).toBe(false);
    expect(stopReasonAfter("A", a)).toBe("ineligible");
  });

  it("A9 = Ya (sudah bertransaksi) menghentikan pengisian", () => {
    expect(stopReasonAfter("A", { ...completeAnswers(), A9: "1" })).toBe("ineligible");
  });

  it("menolak persetujuan menghentikan pengisian", () => {
    expect(stopReasonAfter("intro", { CONSENT: "0" })).toBe("declined");
    expect(stopReasonAfter("intro", { CONSENT: "1" })).toBeNull();
  });

  it("A11 = Tidak menghentikan pengisian, A12 dan A13 tidak", () => {
    expect(stopReasonAfter("BASIS", { ...completeAnswers(), A11: "0" })).toBe("no-figure");
    expect(stopReasonAfter("BASIS", { ...completeAnswers(), A12: "6", A13: "1" })).toBeNull();
  });
});

describe("state", () => {
  it("mengundi versi dan mencatat waktu mulai saat persetujuan", () => {
    let s = reducer(initialState(), { type: "answer", id: "CONSENT", value: "1" });
    s = reducer(s, { type: "advance", now: "2026-10-08T00:00:00.000Z", version: "DC" });
    expect(s.step).toBe("A");
    expect(s.version).toBe("DC");
    expect(s.startedAt).toBe("2026-10-08T00:00:00.000Z");
    // Versi tidak berubah lagi setelah pengisian dimulai.
    s = reducer(s, { type: "back" });
    s = reducer(s, { type: "advance", now: "2026-10-08T00:05:00.000Z", version: "CD" });
    expect(s.version).toBe("DC");
    expect(s.startedAt).toBe("2026-10-08T00:00:00.000Z");
  });

  it("kembali tidak menghapus jawaban dan lompatan dibatasi langkah terjauh", () => {
    let s = reducer(initialState(), { type: "answer", id: "CONSENT", value: "1" });
    s = reducer(s, { type: "advance", now: "2026-10-08T00:00:00.000Z", version: "CD" });
    s = reducer(s, { type: "answer", id: "A1", value: "1" });
    s = reducer(s, { type: "back" });
    expect(s.answers.A1).toBe("1");
    expect(reducer(s, { type: "goto", step: "K" })).toBe(s);
    expect(reducer(s, { type: "goto", step: "A" }).step).toBe("A");
  });

  it("berhenti lalu memperbaiki jawaban kembali ke langkah yang sama", () => {
    let s = reducer(initialState(), { type: "answer", id: "CONSENT", value: "0" });
    s = reducer(s, { type: "advance", now: "x", version: "CD" });
    expect(s.status).toBe("stopped");
    s = reducer(s, { type: "resume" });
    expect(s.status).toBe("active");
    expect(s.step).toBe("intro");
  });

  it("menandai pemulihan hanya untuk pengisian yang sedang berjalan", () => {
    const saved = { ...initialState(), step: "E" as const, furthest: 7 };
    expect(reducer(initialState(), { type: "restore", state: saved }).restored).toBe(true);
    expect(reducer(initialState(), { type: "restore", state: initialState() }).restored).toBe(false);
  });

  it("menolak state tersimpan yang rusak", () => {
    expect(parseStoredState("{")).toBeNull();
    expect(parseStoredState(JSON.stringify({ version: "XY" }))).toBeNull();
    const ok = { ...initialState(), step: "E", furthest: 7 };
    expect(parseStoredState(JSON.stringify(ok))?.step).toBe("E");
  });
});
