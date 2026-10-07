import { sectionById, type StepId } from "@/lib/questionnaire/flow";

/** Nama langkah untuk rail navigasi dan halaman tinjauan. */
export function stepTitle(step: StepId): { letter?: string; title: string } {
  if (step === "intro") return { title: "Informasi dan persetujuan" };
  if (step === "review") return { title: "Tinjau dan kirim" };
  const section = sectionById(step)!;
  return { letter: section.letter, title: section.title };
}

/** Label tombol maju yang menyebut tujuan berikutnya. */
export function forwardLabel(next: StepId | undefined): string {
  if (!next) return "Lanjutkan";
  if (next === "A") return "Mulai pengisian";
  if (next === "BASIS") return "Lanjut ke Konfirmasi";
  if (next === "review") return "Tinjau jawaban";
  return `Lanjut ke Bagian ${next}`;
}
