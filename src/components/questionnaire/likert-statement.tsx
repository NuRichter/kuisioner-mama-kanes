"use client";

import { LIKERT_SCALE } from "@/data/questionnaire";
import { withBrand } from "@/components/ui/brand-text";
import { FieldError } from "@/components/ui/controls";
import type { LikertItem } from "@/types/questionnaire";

interface Props {
  item: LikertItem;
  index: number;
  value: string | undefined;
  error?: string;
  onAnswer: (code: string, value: string) => void;
}

/**
 * Satu pernyataan Likert dengan "penggaris skala": lima segmen yang menyatu,
 * dibangun dari grup radio bawaan agar navigasi panah dan pembaca layar bekerja.
 */
export function LikertStatement({ item, index, value, error, onAnswer }: Props) {
  const errorId = `${item.code}-galat`;
  return (
    <fieldset
      data-field={item.code}
      data-statement
      aria-describedby={error ? errorId : undefined}
      className={`relative scroll-mt-28 ${error ? "before:absolute before:-left-4 before:top-0 before:bottom-0 before:w-0.5 before:rounded-full before:bg-danger sm:before:-left-5" : ""}`}
    >
      <legend className="mb-3.5 flex w-full gap-3">
        <span aria-hidden="true" className="w-6 shrink-0 pt-[0.2rem] text-[0.8125rem] font-semibold text-muted tabular-nums">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="text-[1.0625rem] leading-[1.55] font-[450] text-ink">{withBrand(item.text)}</span>
      </legend>

      <div
        className={`grid grid-cols-5 overflow-hidden rounded-[10px] border bg-surface sm:ml-9 ${
          error ? "border-danger" : "border-line-strong"
        }`}
      >
        {LIKERT_SCALE.map((point, i) => {
          const checked = value === point.value;
          return (
            <label
              key={point.value}
              className={`relative flex min-h-[3.75rem] cursor-pointer flex-col items-center justify-start gap-1 px-1 pt-2.5 pb-2 text-center transition-[background-color,color] duration-150 has-[:focus-visible]:z-10 has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-accent ${
                i > 0 ? "border-l border-line" : ""
              } ${checked ? "bg-accent text-accent-ink" : "text-ink hover:bg-accent-wash"}`}
            >
              <input
                type="radio"
                name={item.code}
                value={point.value}
                checked={checked}
                onChange={() => onAnswer(item.code, point.value)}
                className="sr-only"
              />
              <span className="text-base leading-none font-semibold tabular-nums">{point.value}</span>
              <span
                className={`text-[0.6875rem] leading-tight font-medium sm:text-xs ${
                  checked ? "text-accent-ink" : "text-muted"
                }`}
              >
                {point.label}
              </span>
            </label>
          );
        })}
      </div>
      <div className="sm:ml-9">
        <FieldError id={errorId} message={error} />
      </div>
    </fieldset>
  );
}
