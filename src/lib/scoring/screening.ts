import { attentionChecks } from "@/data/questionnaire";

export type AttentionCode = keyof typeof attentionChecks;

export interface AttentionResult {
  passed: Record<AttentionCode, boolean>;
  failedCount: number;
  /**
   * Aturan catatan peneliti: gagal pada dua attention check atau lebih
   * dikeluarkan; gagal pada satu perlu diperiksa dengan indikator longstring.
   */
  status: "lolos" | "periksa-longstring" | "dikeluarkan";
}

export function attentionCheck(answers: Record<string, unknown>): AttentionResult {
  const codes = Object.keys(attentionChecks) as AttentionCode[];
  const passed = Object.fromEntries(
    codes.map((code) => [code, answers[code] === attentionChecks[code]]),
  ) as Record<AttentionCode, boolean>;
  const failedCount = codes.filter((code) => !passed[code]).length;
  const status = failedCount >= 2 ? "dikeluarkan" : failedCount === 1 ? "periksa-longstring" : "lolos";
  return { passed, failedCount, status };
}

/**
 * Indikator longstring: panjang rangkaian terpanjang jawaban identik yang
 * berurutan, dihitung menurut urutan tampil butir pada versi form responden.
 */
export function longestString(orderedCodes: readonly string[], answers: Record<string, unknown>): number {
  let longest = 0;
  let run = 0;
  let previous: unknown = undefined;
  for (const code of orderedCodes) {
    const value = answers[code];
    if (value === undefined) {
      run = 0;
      previous = undefined;
      continue;
    }
    run = value === previous ? run + 1 : 1;
    previous = value;
    longest = Math.max(longest, run);
  }
  return longest;
}
