import { basis, consent, likertOrderBase, likertSections, profile, screening } from "@/data/questionnaire";
import { allLikertCodes } from "@/lib/questionnaire/flow";
import { attentionCheck, longestString } from "@/lib/scoring/screening";
import type { StoredResponse } from "@/lib/validation/submission";
import type { FormSection } from "@/types/questionnaire";

interface Column {
  key: string;
  value: (r: StoredResponse) => string | number;
}

function formColumns(section: FormSection): Column[] {
  const cols: Column[] = [];
  for (const q of section.questions) {
    if (q.kind === "multi") {
      // Satu kolom dummy (1/0) per pilihan agar siap diolah statistik.
      for (const o of q.options) {
        cols.push({
          key: `${q.id}_${o.code}`,
          value: (r) => ((r.answers[q.id] as string[] | undefined)?.includes(o.code) ? 1 : 0),
        });
      }
    } else {
      cols.push({ key: q.id, value: (r) => String(r.answers[q.id] ?? "") });
    }
    if (q.kind === "single" || q.kind === "multi") {
      for (const o of q.options) {
        if (o.textField) {
          const id = o.textField.id;
          cols.push({ key: id, value: (r) => String(r.answers[id] ?? "") });
        }
      }
    }
  }
  return cols;
}

export const columns: Column[] = [
  { key: "response_id", value: (r) => r.id },
  { key: "received_at", value: (r) => r.receivedAt },
  { key: "started_at", value: (r) => r.startedAt },
  { key: "duration_seconds", value: (r) => r.durationSeconds },
  { key: "form_version", value: (r) => r.formVersion },
  { key: consent.id, value: (r) => String(r.answers[consent.id] ?? "") },
  ...formColumns(screening),
  ...formColumns(basis),
  ...formColumns(profile),
  // Kolom Likert selalu dalam urutan instrumen dasar agar antarbaris konsisten.
  ...likertOrderBase.flatMap((id) =>
    likertSections[id].items.map((item) => ({
      key: item.code,
      value: (r: StoredResponse) => String(r.answers[item.code] ?? ""),
    })),
  ),
  { key: "ac_failed_count", value: (r) => attentionCheck(r.answers).failedCount },
  { key: "ac_status", value: (r) => attentionCheck(r.answers).status },
  {
    key: "longstring_max",
    value: (r) => longestString(allLikertCodes(r.formVersion), r.answers),
  },
];

export function csvCell(value: string | number): string {
  let s = String(value);
  // Cegah formula injection saat CSV dibuka di aplikasi lembar kerja.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: StoredResponse[]): string {
  const header = columns.map((c) => c.key).join(",");
  const lines = rows.map((r) => columns.map((c) => csvCell(c.value(r))).join(","));
  // BOM agar Excel membaca UTF-8 dengan benar.
  return "﻿" + [header, ...lines].join("\r\n") + "\r\n";
}
