import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { Dashboard } from "@/components/research/dashboard";
import { analyze } from "@/lib/analytics/analyze";
import { parseOptions } from "@/lib/analytics/options";
import { hasSession } from "@/lib/auth/session";
import { loadResponses } from "@/lib/storage/responses";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Dasbor peneliti",
  robots: { index: false, follow: false },
};

export default function ResearcherPage({ searchParams }: PageProps<"/peneliti">) {
  return (
    <Suspense fallback={<p className="mx-auto max-w-[26rem] px-5 py-28 text-sm text-muted">Memuat dasbor…</p>}>
      <ResearcherArea searchParams={searchParams} />
    </Suspense>
  );
}

async function ResearcherArea({ searchParams }: { searchParams: PageProps<"/peneliti">["searchParams"] }) {
  // Sesi dan cap waktu laporan bergantung pada waktu sekarang: render hanya saat permintaan.
  await connection();
  if (!(await hasSession())) return <LoginForm />;
  const options = parseOptions(await searchParams);
  const analysis = await loadResponses()
    .then((records) => analyze(records, options))
    .catch((error: unknown) => {
      console.error("Gagal memuat dasbor", error);
      return null;
    });
  if (analysis) return <Dashboard a={analysis} />;
  return (
    <div className="mx-auto max-w-[32rem] px-5 py-28">
      <h1 className="text-xl font-semibold">Data belum dapat dimuat</h1>
      <p className="mt-2 text-ink-soft">Penyimpanan jawaban tidak dapat dihubungi. Muat ulang halaman dalam beberapa saat.</p>
    </div>
  );
}
