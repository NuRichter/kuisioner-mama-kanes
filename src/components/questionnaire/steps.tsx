"use client";

import { Check, CircleAlert } from "lucide-react";
import type { ReactNode } from "react";
import {
  closing,
  consent,
  glossary,
  LIKERT_SCALE,
  likertGuide,
  meta,
  respondentInfo,
} from "@/data/questionnaire";
import { FormQuestionField } from "@/components/questionnaire/form-question";
import { LikertStatement } from "@/components/questionnaire/likert-statement";
import { withBrand } from "@/components/ui/brand-text";
import { Button, FieldError, OptionRow } from "@/components/ui/controls";
import type { StepId, StopReason } from "@/lib/questionnaire/flow";
import { stepTitle } from "@/lib/questionnaire/labels";
import type { FieldErrors } from "@/lib/validation/validate";
import type { Answers, AnswerValue, Section } from "@/types/questionnaire";

type OnAnswer = (id: string, value: AnswerValue | undefined) => void;

/** Judul langkah: menerima fokus saat langkah berganti agar pembaca layar tahu posisinya. */
export function StepHeading({ children, display = false }: { children: ReactNode; display?: boolean }) {
  return (
    <h1
      id="judul-langkah"
      tabIndex={-1}
      className={`font-semibold tracking-[-0.015em] text-ink outline-none ${
        display
          ? "text-[clamp(1.75rem,1.2rem+2.4vw,2.6rem)] leading-[1.12]"
          : "text-[clamp(1.375rem,1.1rem+1.2vw,1.75rem)] leading-[1.2]"
      }`}
    >
      {children}
    </h1>
  );
}

export function IntroStep({
  answers,
  errors,
  onAnswer,
  contactEmail,
}: {
  answers: Answers;
  errors: FieldErrors;
  onAnswer: OnAnswer;
  contactEmail?: string;
}) {
  const info: { term: string; text: ReactNode }[] = [
    { term: "Tujuan", text: withBrand(respondentInfo.purpose) },
    { term: "Waktu", text: respondentInfo.duration },
    { term: "Sukarela", text: respondentInfo.voluntary },
    { term: "Kerahasiaan", text: withBrand(respondentInfo.privacy) },
    { term: "Cara menjawab", text: respondentInfo.noRightAnswer },
    {
      term: "Kontak",
      text: (
        <>
          {respondentInfo.contactLead}
          {contactEmail ? (
            <>
              , melalui surel{" "}
              <a
                href={`mailto:${contactEmail}`}
                className="font-medium text-accent underline underline-offset-4 [overflow-wrap:anywhere]"
                translate="no"
              >
                {contactEmail}
              </a>
              .
            </>
          ) : (
            "."
          )}
        </>
      ),
    },
  ];

  const message = errors[consent.id];

  return (
    <div className="grid gap-12">
      <header className="grid gap-4">
        <StepHeading display>{meta.title}</StepHeading>
        <p className="max-w-[60ch] text-base leading-[1.65] text-ink-soft tabular-nums">
          {meta.likertCount} pernyataan dengan skala 1 sampai 5. Jawaban tersimpan otomatis di perangkat ini selama pengisian, sehingga Anda dapat melanjutkan bila halaman tertutup.
        </p>
      </header>

      <section aria-labelledby="judul-informasi" className="grid gap-5">
        <h2 id="judul-informasi" className="text-lg font-semibold tracking-[-0.01em]">
          {respondentInfo.heading}
        </h2>
        <dl className="grid gap-x-8 gap-y-5 border-t border-line pt-5 sm:grid-cols-[9rem_minmax(0,1fr)]">
          {info.map((row) => (
            <div key={row.term} className="contents">
              <dt className="text-sm font-semibold text-ink sm:pt-0.5">{row.term}</dt>
              <dd className="-mt-3.5 text-base leading-[1.65] text-ink-soft sm:mt-0">{row.text}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="judul-persetujuan" className="grid gap-4 border-t border-line pt-8">
        <h2 id="judul-persetujuan" className="text-lg font-semibold tracking-[-0.01em]">
          {consent.heading}
        </h2>
        <fieldset data-field={consent.id} aria-describedby={message ? `${consent.id}-galat` : undefined}>
          <legend className="mb-4 text-base leading-[1.65] text-ink-soft">{consent.statement}</legend>
          <div className="grid gap-2.5 sm:max-w-lg">
            {consent.options.map((o) => (
              <OptionRow
                key={o.code}
                type="radio"
                name={consent.id}
                value={o.code}
                checked={answers[consent.id] === o.code}
                invalid={!!message}
                onChange={() => onAnswer(consent.id, o.code)}
              >
                {o.label}
              </OptionRow>
            ))}
          </div>
          <FieldError id={`${consent.id}-galat`} message={message} />
        </fieldset>
      </section>
    </div>
  );
}

function SectionHeader({ section }: { section: Section }) {
  return (
    <header className="grid gap-2">
      {section.letter && (
        <p className="text-sm font-semibold text-accent tabular-nums">
          Bagian {section.letter}
          {section.kind === "likert" && (
            <span className="font-medium text-muted"> · {section.items.length} pernyataan</span>
          )}
        </p>
      )}
      <StepHeading>{withBrand(section.title)}</StepHeading>
    </header>
  );
}

function Note({ children }: { children: ReactNode }) {
  return (
    <p className="border-l-2 border-accent pl-4 text-base leading-[1.65] text-ink-soft">{children}</p>
  );
}

function LikertGuide() {
  return (
    <section aria-labelledby="judul-petunjuk" className="grid gap-4 rounded-[10px] border border-line bg-surface p-5 sm:p-6">
      <h2 id="judul-petunjuk" className="text-base font-semibold">
        {likertGuide.heading}
      </h2>
      <p className="text-[0.9375rem] leading-relaxed text-ink-soft">{likertGuide.lead}</p>
      <ol className="grid grid-cols-5 overflow-hidden rounded-[8px] border border-line text-center">
        {LIKERT_SCALE.map((p, i) => (
          <li key={p.value} className={`grid gap-1 px-1 py-2.5 ${i > 0 ? "border-l border-line" : ""}`}>
            <span className="font-semibold tabular-nums">{p.value}</span>
            <span className="text-[0.6875rem] leading-tight font-medium text-muted sm:text-xs">{p.label}</span>
          </li>
        ))}
      </ol>
      <p className="text-[0.9375rem] leading-relaxed text-ink-soft">{likertGuide.closing}</p>
    </section>
  );
}

export function SectionStep({
  section,
  answers,
  errors,
  onAnswer,
  showGuide,
}: {
  section: Section;
  answers: Answers;
  errors: FieldErrors;
  onAnswer: OnAnswer;
  showGuide: boolean;
}) {
  if (section.kind === "likert") {
    return (
      <div className="grid gap-10">
        {showGuide && <LikertGuide />}
        <div className="grid gap-5">
          <SectionHeader section={section} />
          <Note>{withBrand(section.instruction)}</Note>
        </div>
        <div className="grid gap-10 sm:gap-12">
          {section.items.map((item, i) => (
            <LikertStatement
              key={item.code}
              item={item}
              index={i}
              value={answers[item.code] as string | undefined}
              error={errors[item.code]}
              onAnswer={onAnswer}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-10">
      <div className="grid gap-5">
        <SectionHeader section={section} />
        {section.intro?.map((p) => <Note key={p}>{p}</Note>)}
        {section.id === "A" && (
          <dl className="grid gap-3 text-[0.9375rem] leading-relaxed text-ink-soft">
            <dt className="text-sm font-semibold text-ink">Istilah</dt>
            {glossary.map((g) => (
              <dd key={g.term}>
                <span className="font-semibold text-ink">{withBrand(g.term)}</span> adalah{" "}
                {withBrand(g.definition.charAt(0).toLowerCase() + g.definition.slice(1))}
              </dd>
            ))}
          </dl>
        )}
      </div>
      <div className="grid gap-10 sm:gap-12">
        {section.questions.map((q) => (
          <FormQuestionField key={q.id} question={q} answers={answers} errors={errors} onAnswer={onAnswer} />
        ))}
      </div>
    </div>
  );
}

export interface ReviewRow {
  step: StepId;
  answered: number;
  total: number;
}

export function ReviewStep({
  rows,
  onEdit,
  submitError,
}: {
  rows: ReviewRow[];
  onEdit: (step: StepId) => void;
  submitError: string | null;
}) {
  return (
    <div className="grid gap-8">
      <header className="grid gap-3">
        <StepHeading>Tinjau sebelum mengirim</StepHeading>
        <p className="text-base leading-[1.65] text-ink-soft">
          Seluruh bagian sudah terisi. Anda masih dapat membuka kembali bagian mana pun untuk mengubah jawaban. Setelah dikirim, jawaban tidak dapat diubah.
        </p>
      </header>
      <ol className="grid border-t border-line">
        {rows.map((row) => {
          const t = stepTitle(row.step);
          const complete = row.answered === row.total;
          return (
            <li key={row.step} className="flex items-center gap-3 border-b border-line py-3.5">
              <span
                aria-hidden="true"
                className={`grid size-6 shrink-0 place-items-center rounded-full ${complete ? "bg-accent text-accent-ink" : "border border-line-strong"}`}
              >
                {complete && <Check className="size-3.5" strokeWidth={3} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[0.9375rem] leading-snug font-medium text-ink">
                  {t.letter ? `Bagian ${t.letter}. ` : ""}
                  {withBrand(t.title)}
                </span>
                <span className="block text-sm text-muted tabular-nums">
                  {row.answered} dari {row.total} terjawab
                </span>
              </span>
              <Button variant="quiet" onClick={() => onEdit(row.step)} aria-label={`Ubah jawaban ${t.letter ? `Bagian ${t.letter}` : t.title}`}>
                Ubah
              </Button>
            </li>
          );
        })}
      </ol>
      {submitError && (
        <div role="alert" className="flex gap-3 rounded-[10px] bg-danger-wash p-4 text-[0.9375rem] leading-relaxed text-ink">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-danger" />
          <p>{submitError}</p>
        </div>
      )}
    </div>
  );
}

const stopCopy: Record<StopReason, string> = {
  declined:
    "Anda memilih tidak setuju untuk berpartisipasi, sehingga pengisian dihentikan. Tidak ada jawaban yang dikirim. Terima kasih atas waktu Anda.",
  ineligible:
    "Berdasarkan jawaban pada Bagian A, kriteria kelayakan penelitian ini belum terpenuhi, sehingga pengisian dihentikan. Tidak ada jawaban yang dikirim. Terima kasih atas waktu Anda.",
  "no-figure":
    "Penelitian ini memerlukan satu figur finfluencer yang dapat Anda ingat dengan jelas sebagai acuan penilaian, sehingga pengisian dihentikan. Tidak ada jawaban yang dikirim. Terima kasih atas waktu Anda.",
};

export function StopScreen({
  reason,
  onResume,
  onRestart,
}: {
  reason: StopReason;
  onResume: () => void;
  onRestart: () => void;
}) {
  return (
    <div className="grid gap-8">
      <header className="grid gap-4">
        <StepHeading>Pengisian dihentikan</StepHeading>
        <p className="max-w-[60ch] text-base leading-[1.65] text-ink-soft">{stopCopy[reason]}</p>
        <p className="max-w-[60ch] text-base leading-[1.65] text-ink-soft">
          Jika Anda salah memilih jawaban, Anda dapat kembali dan memperbaikinya.
        </p>
      </header>
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" onClick={onResume}>
          Perbaiki jawaban
        </Button>
        <Button variant="quiet" onClick={onRestart}>
          Kembali ke halaman awal
        </Button>
      </div>
    </div>
  );
}

export function DoneScreen() {
  return (
    <div className="grid gap-5">
      <span aria-hidden="true" className="grid size-11 place-items-center rounded-full bg-accent text-accent-ink">
        <Check className="size-5" strokeWidth={2.75} />
      </span>
      <StepHeading>Jawaban Anda sudah terkirim</StepHeading>
      <p className="max-w-[60ch] text-[1.0625rem] leading-[1.65] text-ink-soft">{closing}</p>
      <p className="text-sm text-muted">Anda dapat menutup halaman ini.</p>
    </div>
  );
}
