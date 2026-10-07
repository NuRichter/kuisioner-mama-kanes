import type { Metadata } from "next";
import { ExportForm } from "./export-form";

export const metadata: Metadata = {
  title: "Unduh data jawaban",
  robots: { index: false, follow: false },
};

export default function ResearcherPage() {
  return (
    <main id="konten" className="mx-auto w-full max-w-[42rem] flex-1 px-5 py-16 sm:px-8">
      <h1 className="text-[1.75rem] leading-tight font-semibold tracking-[-0.015em]">Unduh data jawaban</h1>
      <p className="mt-3 text-base leading-[1.65] text-ink-soft">
        Halaman ini khusus untuk peneliti. Masukkan kata sandi untuk mengunduh seluruh jawaban dalam format CSV.
      </p>
      <ExportForm />
    </main>
  );
}
