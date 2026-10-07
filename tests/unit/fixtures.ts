import { likertOrderBase, likertSections } from "@/data/questionnaire";
import type { Answers } from "@/types/questionnaire";

/** Jawaban lengkap dan layak; nilai Likert dapat diatur per kode. */
export function completeAnswers(likert: (code: string, i: number) => string = () => "4"): Answers {
  const answers: Answers = {
    CONSENT: "1",
    A1: "1", A2: "1", A3: "1", A4: "1", A5: "1", A6: "1", A7: "1", A8: "1", A9: "0",
    A10: ["1", "5"], A10_other: "Kanal Telegram resmi",
    A11: "1", A11_figure: "@contohfigur",
    A12: "2", A13: "3",
    B1: "2001", B2: "Jawa Timur", B3: "1", B4: "3", B5: "1", B6: "2",
  };
  let i = 0;
  for (const id of likertOrderBase) {
    for (const item of likertSections[id].items) answers[item.code] = likert(item.code, i++);
  }
  return answers;
}
