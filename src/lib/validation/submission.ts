import { z } from "zod";
import { consent, figureRule } from "@/data/questionnaire";
import { isEligible, sectionSequence } from "@/lib/questionnaire/flow";
import { cleanText, validateConsent, validateSection } from "@/lib/validation/validate";
import type { Answers, FormVersion, Section } from "@/types/questionnaire";

const answerValue = z.union([
  z.string().max(400),
  z.array(z.string().max(8)).max(10),
]);

export const submissionSchema = z
  .object({
    formVersion: z.enum(["CD", "DC"]),
    startedAt: z.iso.datetime(),
    answers: z.record(z.string().max(40), answerValue),
  })
  .strict();

export type Submission = z.infer<typeof submissionSchema>;

export interface StoredResponse {
  id: string;
  receivedAt: string;
  startedAt: string;
  durationSeconds: number;
  formVersion: FormVersion;
  answers: Record<string, string | string[]>;
}

/** Menyalin hanya kolom yang dikenal instrumen, dengan teks bebas yang sudah dirapikan. */
function pickKnownAnswers(sections: Section[], answers: Answers) {
  const out: Record<string, string | string[]> = { [consent.id]: String(answers[consent.id]) };
  for (const section of sections) {
    if (section.kind === "likert") {
      for (const item of section.items) out[item.code] = String(answers[item.code]);
      continue;
    }
    for (const q of section.questions) {
      const value = answers[q.id];
      if (q.kind === "multi") {
        const selected = (value as string[]).slice().sort();
        out[q.id] = selected;
        for (const o of q.options) {
          if (o.textField && selected.includes(o.code)) out[o.textField.id] = cleanText(answers[o.textField.id]);
        }
      } else if (q.kind === "single") {
        out[q.id] = String(value);
        const chosen = q.options.find((o) => o.code === value);
        if (chosen?.textField) out[chosen.textField.id] = cleanText(answers[chosen.textField.id]);
      } else if (q.kind === "text" || q.kind === "year") {
        out[q.id] = cleanText(value);
      } else {
        out[q.id] = String(value);
      }
    }
  }
  return out;
}

export type SubmissionCheck =
  | { ok: true; record: Omit<StoredResponse, "id" | "receivedAt"> }
  | { ok: false; reason: string; fields?: string[] };

/**
 * Validasi penuh di sisi server: seluruh bagian harus lengkap dan responden
 * harus memenuhi kriteria kelayakan yang sama dengan alur di peramban.
 */
export function checkSubmission(input: unknown, now: Date = new Date()): SubmissionCheck {
  const parsed = submissionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "Format data tidak dikenali." };

  const { formVersion, startedAt, answers } = parsed.data;
  const sections = sectionSequence(formVersion);

  const errors = { ...validateConsent(answers) };
  for (const section of sections) Object.assign(errors, validateSection(section, answers));
  const fields = Object.keys(errors);
  if (fields.length > 0) return { ok: false, reason: "Masih ada jawaban yang belum lengkap.", fields };

  if (
    answers[consent.id] !== consent.agreeCode ||
    !isEligible(answers) ||
    answers[figureRule.questionId] !== figureRule.continueCode
  ) {
    return { ok: false, reason: "Jawaban tidak memenuhi kriteria kelayakan." };
  }

  const started = new Date(startedAt);
  const durationSeconds = Math.round((now.getTime() - started.getTime()) / 1000);
  if (!Number.isFinite(durationSeconds) || durationSeconds < 0 || durationSeconds > 60 * 60 * 24 * 7) {
    return { ok: false, reason: "Waktu mulai pengisian tidak valid." };
  }

  return {
    ok: true,
    record: {
      startedAt: started.toISOString(),
      durationSeconds,
      formVersion,
      answers: pickKnownAnswers(sections, answers),
    },
  };
}
