import { basis, consent, LIKERT_SCALE, likertOrderBase, likertSections, profile, screening } from "@/data/questionnaire";
import { constructs } from "@/data/research-map";
import type { FormSection } from "@/types/questionnaire";
import { columns } from "./csv";

export interface CodebookRow {
  variable: string;
  description: string;
  values: string;
  usage?: string;
}

const likertValues = LIKERT_SCALE.map((s) => `${s.value} = ${s.label}`).join("; ");

function formRows(section: FormSection): CodebookRow[] {
  const rows: CodebookRow[] = [];
  for (const q of section.questions) {
    if (q.kind === "yesno") rows.push({ variable: q.id, description: q.text, values: "1 = Ya; 0 = Tidak" });
    else if (q.kind === "single") rows.push({ variable: q.id, description: q.text, values: q.options.map((o) => `${o.code} = ${o.label}`).join("; ") });
    else if (q.kind === "multi")
      for (const o of q.options) rows.push({ variable: `${q.id}_${o.code}`, description: `${q.text} Pilihan: ${o.label}`, values: "1 = dipilih; 0 = tidak dipilih" });
    else if (q.kind === "year") rows.push({ variable: q.id, description: q.text, values: `Tahun ${q.min} sampai ${q.max}` });
    else rows.push({ variable: q.id, description: q.text, values: "Teks bebas" });
    if (q.kind === "single" || q.kind === "multi")
      for (const o of q.options) if (o.textField) rows.push({ variable: o.textField.id, description: o.textField.label, values: "Teks bebas, diisi bila opsi dipilih" });
  }
  return rows;
}

const usageOf = new Map(constructs.flatMap((c) => c.items.map((i) => [i, c.usage] as const)));

export function codebook(): CodebookRow[] {
  const known: CodebookRow[] = [
    { variable: "response_id", description: "ID jawaban (acak)", values: "UUID" },
    { variable: "received_at", description: "Waktu jawaban diterima server (UTC)", values: "ISO 8601" },
    { variable: "started_at", description: "Waktu responden menyetujui partisipasi (UTC)", values: "ISO 8601" },
    { variable: "duration_seconds", description: "Durasi dari persetujuan sampai terkirim", values: "Detik" },
    { variable: "form_version", description: "Versi form: urutan Bagian C dan D", values: "CD = C lalu D; DC = D lalu C" },
    { variable: consent.id, description: consent.statement, values: "1 = Setuju" },
    ...formRows(screening),
    ...formRows(basis),
    ...formRows(profile),
    ...likertOrderBase.flatMap((id) =>
      likertSections[id].items.map((item) => ({
        variable: item.code,
        description: `Bagian ${id}. ${item.text}`,
        values: likertValues,
        usage: item.code.startsWith("AC") ? "S" : usageOf.get(item.code),
      })),
    ),
    { variable: "ac_failed_count", description: "Jumlah attention check yang gagal (AC1 = 2, AC2 = 4, AC3 = 1)", values: "0 sampai 3" },
    { variable: "ac_status", description: "Status attention check menurut catatan peneliti nomor 4", values: "lolos; periksa-longstring; dikeluarkan" },
    { variable: "longstring_max", description: "Rangkaian jawaban identik terpanjang menurut urutan tampil", values: "1 sampai 53" },
  ];
  // Pastikan setiap kolom CSV terdokumentasi.
  const byVar = new Map(known.map((r) => [r.variable, r]));
  return columns.map((c) => byVar.get(c.key) ?? { variable: c.key, description: "", values: "" });
}
