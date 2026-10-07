"use client";

import { useEffect, useRef } from "react";
import { NO, YES } from "@/data/questionnaire";
import { withBrand } from "@/components/ui/brand-text";
import { FieldError, OptionRow } from "@/components/ui/controls";
import type { FieldErrors } from "@/lib/validation/validate";
import type { Answers, AnswerValue, FormQuestion, Option } from "@/types/questionnaire";

interface Props {
  question: FormQuestion;
  answers: Answers;
  errors: FieldErrors;
  onAnswer: (id: string, value: AnswerValue | undefined) => void;
}

const inputClass =
  "block h-12 w-full rounded-[10px] border bg-surface px-3.5 text-base text-ink placeholder:text-muted transition-[border-color] duration-150 focus-visible:border-accent";

function errorId(id: string) {
  return `${id}-galat`;
}

/** Isian teks untuk opsi "Lainnya" atau nama figur; muncul saat opsinya dipilih. */
function DetailField({
  option,
  answers,
  errors,
  onAnswer,
}: {
  option: Option;
  answers: Answers;
  errors: FieldErrors;
  onAnswer: Props["onAnswer"];
}) {
  const ref = useRef<HTMLInputElement>(null);
  const field = option.textField!;
  const message = errors[field.id];

  useEffect(() => {
    // Fokus otomatis hanya saat isian baru dimunculkan dan masih kosong.
    if (ref.current && !ref.current.value) ref.current.focus({ preventScroll: true });
  }, []);

  return (
    <div className="mt-2 mb-1 ml-[2.375rem]" data-field={field.id}>
      <label htmlFor={field.id} className="mb-1.5 block text-sm font-medium text-ink-soft">
        {field.label}
      </label>
      <input
        ref={ref}
        id={field.id}
        name={field.id}
        type="text"
        autoComplete="off"
        spellCheck={false}
        maxLength={field.maxLength}
        value={(answers[field.id] as string | undefined) ?? ""}
        onChange={(e) => onAnswer(field.id, e.target.value)}
        aria-invalid={message ? true : undefined}
        aria-describedby={message ? errorId(field.id) : undefined}
        className={`${inputClass} ${message ? "border-danger" : "border-line-strong"}`}
      />
      <FieldError id={errorId(field.id)} message={message} />
    </div>
  );
}

function QuestionHeading({ number, text, as: Tag }: { number: string; text: string; as: "legend" | "label" }) {
  const content = (
    <>
      <span className="mb-1.5 block text-[0.8125rem] font-semibold tracking-wide text-muted tabular-nums" translate="no">
        {number}
      </span>
      <span className="block text-[1.0625rem] leading-[1.55] font-[450] text-ink">{withBrand(text)}</span>
    </>
  );
  return Tag === "legend" ? <legend className="mb-4 w-full">{content}</legend> : <>{content}</>;
}

export function FormQuestionField({ question: q, answers, errors, onAnswer }: Props) {
  const message = errors[q.id];
  const value = answers[q.id];
  const describedBy = message ? errorId(q.id) : undefined;

  if (q.kind === "text" || q.kind === "year") {
    const listId = q.kind === "text" && q.suggestions ? `${q.id}-saran` : undefined;
    return (
      <div data-field={q.id}>
        <label htmlFor={q.id} className="mb-3 block">
          <QuestionHeading number={q.number} text={q.text} as="label" />
        </label>
        <input
          id={q.id}
          name={q.id}
          type="text"
          inputMode={q.kind === "year" ? "numeric" : "text"}
          pattern={q.kind === "year" ? "[0-9]*" : undefined}
          maxLength={q.kind === "year" ? 4 : q.maxLength}
          autoComplete={q.kind === "year" ? "off" : q.autoComplete}
          spellCheck={false}
          list={listId}
          placeholder={q.kind === "year" ? "Contoh: 2001…" : "Ketik atau pilih provinsi…"}
          value={(value as string | undefined) ?? ""}
          onChange={(e) =>
            onAnswer(q.id, q.kind === "year" ? e.target.value.replace(/\D/g, "") : e.target.value)
          }
          aria-invalid={message ? true : undefined}
          aria-describedby={describedBy}
          className={`${inputClass} ${q.kind === "year" ? "max-w-[10rem] tabular-nums" : "max-w-md"} ${
            message ? "border-danger" : "border-line-strong"
          }`}
        />
        {listId && q.kind === "text" && (
          <datalist id={listId}>
            {q.suggestions!.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        )}
        <FieldError id={errorId(q.id)} message={message} />
      </div>
    );
  }

  if (q.kind === "yesno") {
    return (
      <fieldset data-field={q.id} aria-describedby={describedBy}>
        <QuestionHeading number={q.number} text={q.text} as="legend" />
        <div className="grid grid-cols-2 gap-2.5 sm:max-w-sm">
          {[
            { code: YES, label: "Ya" },
            { code: NO, label: "Tidak" },
          ].map((o) => (
            <OptionRow
              key={o.code}
              type="radio"
              name={q.id}
              value={o.code}
              checked={value === o.code}
              invalid={!!message}
              onChange={() => onAnswer(q.id, o.code)}
            >
              {o.label}
            </OptionRow>
          ))}
        </div>
        <FieldError id={errorId(q.id)} message={message} />
      </fieldset>
    );
  }

  const isMulti = q.kind === "multi";
  const selected = isMulti ? ((value as string[] | undefined) ?? []) : [];

  return (
    <fieldset data-field={q.id} aria-describedby={describedBy}>
      <QuestionHeading number={q.number} text={q.text} as="legend" />
      <div className="grid gap-2.5">
        {q.options.map((o) => {
          const checked = isMulti ? selected.includes(o.code) : value === o.code;
          return (
            <div key={o.code}>
              <OptionRow
                type={isMulti ? "checkbox" : "radio"}
                name={q.id}
                value={o.code}
                checked={checked}
                invalid={!!message}
                onChange={(on) => {
                  if (!isMulti) return onAnswer(q.id, o.code);
                  const next = on ? [...selected, o.code] : selected.filter((c) => c !== o.code);
                  onAnswer(q.id, next.length ? next : undefined);
                }}
              >
                {withBrand(o.label)}
              </OptionRow>
              {checked && o.textField && (
                <DetailField option={o} answers={answers} errors={errors} onAnswer={onAnswer} />
              )}
            </div>
          );
        })}
      </div>
      <FieldError id={errorId(q.id)} message={message} />
      {q.note && (
        <p className="mt-4 border-l-2 border-line-strong pl-3.5 text-sm leading-relaxed text-ink-soft">
          <span className="font-semibold text-ink">Catatan.</span> {q.note}
        </p>
      )}
    </fieldset>
  );
}
