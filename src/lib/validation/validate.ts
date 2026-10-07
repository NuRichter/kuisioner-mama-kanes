import { consent, LIKERT_SCALE } from "@/data/questionnaire";
import type { Answers, FormQuestion, Section } from "@/types/questionnaire";

/** Peta id kolom → pesan galat yang dapat ditindaklanjuti. */
export type FieldErrors = Record<string, string>;

export const messages = {
  choose: "Silakan pilih salah satu jawaban sebelum melanjutkan.",
  consent: "Pilih salah satu pilihan persetujuan untuk melanjutkan.",
  multi: "Pilih sekurang-kurangnya satu kanal. Anda boleh memilih lebih dari satu.",
  likert: "Pilih salah satu nilai dari 1 sampai 5 untuk pernyataan ini.",
  yearFormat: "Tuliskan tahun lahir dalam empat angka, misalnya 2001.",
  text: "Kolom ini belum diisi. Tuliskan jawaban Anda untuk melanjutkan.",
  detail: (label: string) => `${label} agar jawaban Anda lengkap.`,
  tooLong: (max: number) => `Jawaban terlalu panjang. Gunakan paling banyak ${max} karakter.`,
} as const;

const LIKERT_VALUES: ReadonlySet<string> = new Set(LIKERT_SCALE.map((s) => s.value));

const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;

/** Merapikan teks bebas: hapus karakter kontrol dan spasi berlebih. */
export function cleanText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(CONTROL_CHARS, " ").replace(/\s+/g, " ").trim();
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function validateTextField(
  answers: Answers,
  id: string,
  label: string,
  maxLength: number,
  errors: FieldErrors,
) {
  const text = cleanText(answers[id]);
  if (!text) errors[id] = messages.detail(label);
  else if (text.length > maxLength) errors[id] = messages.tooLong(maxLength);
}

function validateQuestion(q: FormQuestion, answers: Answers, errors: FieldErrors) {
  const value = answers[q.id];

  switch (q.kind) {
    case "yesno": {
      const v = asString(value);
      if (v !== "1" && v !== "0") errors[q.id] = messages.choose;
      return;
    }
    case "single": {
      const v = asString(value);
      const option = q.options.find((o) => o.code === v);
      if (!option) {
        errors[q.id] = messages.choose;
        return;
      }
      if (option.textField) {
        const f = option.textField;
        validateTextField(answers, f.id, f.label, f.maxLength, errors);
      }
      return;
    }
    case "multi": {
      const selected = Array.isArray(value) ? value : [];
      const valid = selected.filter((code) => q.options.some((o) => o.code === code));
      if (valid.length < q.minSelected || valid.length !== selected.length) {
        errors[q.id] = messages.multi;
        return;
      }
      for (const option of q.options) {
        if (option.textField && valid.includes(option.code)) {
          const f = option.textField;
          validateTextField(answers, f.id, f.label, f.maxLength, errors);
        }
      }
      return;
    }
    case "text": {
      const text = cleanText(value);
      if (!text) errors[q.id] = messages.text;
      else if (text.length > q.maxLength) errors[q.id] = messages.tooLong(q.maxLength);
      return;
    }
    case "year": {
      const text = cleanText(value);
      if (!/^\d{4}$/.test(text)) {
        errors[q.id] = messages.yearFormat;
        return;
      }
      const year = Number(text);
      if (year < q.min || year > q.max) errors[q.id] = q.rangeMessage;
      return;
    }
  }
}

export function validateSection(section: Section, answers: Answers): FieldErrors {
  const errors: FieldErrors = {};
  if (section.kind === "likert") {
    for (const item of section.items) {
      const v = asString(answers[item.code]);
      if (!v || !LIKERT_VALUES.has(v)) errors[item.code] = messages.likert;
    }
    return errors;
  }
  for (const q of section.questions) validateQuestion(q, answers, errors);
  return errors;
}

export function validateConsent(answers: Answers): FieldErrors {
  const v = asString(answers[consent.id]);
  return consent.options.some((o) => o.code === v) ? {} : { [consent.id]: messages.consent };
}

/** Jumlah pernyataan Likert yang sudah dijawab dengan nilai sah. */
export function countAnsweredLikert(codes: readonly string[], answers: Answers): number {
  return codes.filter((code) => {
    const v = asString(answers[code]);
    return v !== undefined && LIKERT_VALUES.has(v);
  }).length;
}
