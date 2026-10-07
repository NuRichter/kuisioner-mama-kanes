import { describe, expect, it } from "vitest";
import { basis, likertSections, profile, screening } from "@/data/questionnaire";
import { checkSubmission } from "@/lib/validation/submission";
import { cleanText, messages, validateConsent, validateSection } from "@/lib/validation/validate";
import { completeAnswers } from "./fixtures";

describe("validasi per bagian", () => {
  it("Bagian A kosong menandai sembilan pertanyaan", () => {
    expect(Object.keys(validateSection(screening, {}))).toHaveLength(9);
    expect(validateSection(screening, {}).A1).toBe(messages.choose);
  });

  it("persetujuan wajib dipilih", () => {
    expect(validateConsent({})).toHaveProperty("CONSENT");
    expect(validateConsent({ CONSENT: "0" })).toEqual({});
  });

  it("A10 wajib minimal satu dan kanal lainnya wajib ditulis", () => {
    const base = completeAnswers();
    expect(validateSection(basis, { ...base, A10: [] })).toHaveProperty("A10");
    expect(validateSection(basis, { ...base, A10: ["5"], A10_other: "  " })).toHaveProperty("A10_other");
    expect(validateSection(basis, { ...base, A10: ["1", "2", "3", "4"], A10_other: undefined })).toEqual({});
    expect(validateSection(basis, { ...base, A10: ["9"] })).toHaveProperty("A10");
  });

  it("A11 = Ya wajib menuliskan nama atau akun figur", () => {
    expect(validateSection(basis, { ...completeAnswers(), A11_figure: "" })).toHaveProperty("A11_figure");
  });

  it("tahun lahir harus empat angka dalam rentang 1997 sampai 2012", () => {
    const base = completeAnswers();
    expect(validateSection(profile, { ...base, B1: "01" }).B1).toBe(messages.yearFormat);
    expect(validateSection(profile, { ...base, B1: "1996" }).B1).toMatch(/1997 sampai 2012/);
    expect(validateSection(profile, { ...base, B1: "2013" }).B1).toMatch(/1997 sampai 2012/);
    expect(validateSection(profile, { ...base, B1: "1997" })).toEqual({});
    expect(validateSection(profile, { ...base, B1: "2012" })).toEqual({});
  });

  it("opsi Lainnya pada B4 dan B5 wajib diisi", () => {
    const base = completeAnswers();
    expect(validateSection(profile, { ...base, B4: "5" })).toHaveProperty("B4_other");
    expect(validateSection(profile, { ...base, B5: "5", B5_other: "Pekerja lepas" })).toEqual({});
  });

  it("pernyataan Likert hanya menerima nilai 1 sampai 5", () => {
    const base = completeAnswers();
    expect(validateSection(likertSections.F, base)).toEqual({});
    expect(validateSection(likertSections.F, { ...base, INT2: "6" })).toHaveProperty("INT2");
    expect(validateSection(likertSections.F, { ...base, INT3: undefined })).toHaveProperty("INT3");
  });

  it("merapikan teks bebas", () => {
    expect(cleanText("  a\u0000b \n c ")).toBe("a b c");
  });
});

describe("validasi pengiriman di server", () => {
  const now = new Date("2026-10-08T10:15:00.000Z");
  const envelope = (answers = completeAnswers()) => ({
    formVersion: "DC",
    startedAt: "2026-10-08T10:02:00.000Z",
    answers,
  });

  it("menerima jawaban lengkap dan menghitung durasi", () => {
    const r = checkSubmission(envelope(), now);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.record.durationSeconds).toBe(780);
      expect(r.record.answers.A10).toEqual(["1", "5"]);
    }
  });

  it("membuang kolom yang tidak dikenal dan isian Lainnya yang tidak dipilih", () => {
    const r = checkSubmission(envelope({ ...completeAnswers(), EXTRA: "x", B4_other: "abaikan" }), now);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.record.answers).not.toHaveProperty("EXTRA");
      expect(r.record.answers).not.toHaveProperty("B4_other");
    }
  });

  it("menolak jawaban yang tidak lengkap", () => {
    const answers = completeAnswers();
    delete answers.PR3;
    expect(checkSubmission(envelope(answers), now).ok).toBe(false);
  });

  it("menolak responden yang tidak memenuhi kriteria", () => {
    expect(checkSubmission(envelope({ ...completeAnswers(), A9: "1" }), now).ok).toBe(false);
    expect(checkSubmission(envelope({ ...completeAnswers(), CONSENT: "0" }), now).ok).toBe(false);
    expect(checkSubmission(envelope({ ...completeAnswers(), A11: "0" }), now).ok).toBe(false);
  });

  it("menolak bentuk data asing", () => {
    expect(checkSubmission({ formVersion: "XX" }, now).ok).toBe(false);
    expect(checkSubmission({ ...envelope(), injected: true }, now).ok).toBe(false);
    expect(checkSubmission({ ...envelope(), startedAt: "2026-10-09T00:00:00.000Z" }, now).ok).toBe(false);
  });
});
