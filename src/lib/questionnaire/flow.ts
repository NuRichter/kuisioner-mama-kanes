import {
  basis,
  consent,
  eligibilityRule,
  figureRule,
  likertOrderBase,
  likertSections,
  NO,
  profile,
  screening,
  YES,
} from "@/data/questionnaire";
import type {
  Answers,
  FormVersion,
  LikertSection,
  Section,
} from "@/types/questionnaire";

export type StepId =
  | "intro"
  | "A"
  | "BASIS"
  | "B"
  | "C"
  | "D"
  | "E"
  | "F"
  | "G"
  | "H"
  | "I"
  | "J"
  | "K"
  | "review";

export type StopReason = "declined" | "ineligible" | "no-figure";

/** C dan D bertukar urutan pada versi "DC"; bagian lain tetap. */
export function likertOrder(version: FormVersion): LikertSection[] {
  const order = likertOrderBase.map((id) => likertSections[id]);
  if (version === "DC") {
    const c = order.indexOf(likertSections.C);
    const d = order.indexOf(likertSections.D);
    [order[c], order[d]] = [order[d], order[c]];
  }
  return order;
}

export function sectionSequence(version: FormVersion): Section[] {
  return [screening, basis, profile, ...likertOrder(version)];
}

export function stepSequence(version: FormVersion): StepId[] {
  return [
    "intro",
    ...sectionSequence(version).map((s) => s.id as StepId),
    "review",
  ];
}

export function sectionById(id: string): Section | undefined {
  if (id === screening.id) return screening;
  if (id === basis.id) return basis;
  if (id === profile.id) return profile;
  return likertSections[id as keyof typeof likertSections];
}

export function allLikertCodes(version: FormVersion): string[] {
  return likertOrder(version).flatMap((s) => s.items.map((i) => i.code));
}

/** Menentukan apakah pengisian harus dihentikan setelah langkah tertentu. */
export function stopReasonAfter(
  step: StepId,
  answers: Answers,
): StopReason | null {
  if (step === "intro" && answers[consent.id] !== consent.agreeCode) {
    return "declined";
  }
  if (step === "A" && !isEligible(answers)) return "ineligible";
  if (step === "BASIS" && answers[figureRule.questionId] !== figureRule.continueCode) {
    return "no-figure";
  }
  return null;
}

/** Kriteria kelayakan tahap awal: A1 sampai A8 = Ya dan A9 = Tidak. */
export function isEligible(answers: Answers): boolean {
  return (
    eligibilityRule.mustBeYes.every((id) => answers[id] === YES) &&
    eligibilityRule.mustBeNo.every((id) => answers[id] === NO)
  );
}

export function randomVersion(random: () => number = Math.random): FormVersion {
  return random() < 0.5 ? "CD" : "DC";
}
