"use client";

import { Check } from "lucide-react";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore } from "react";
import { DoneScreen, IntroStep, ReviewStep, SectionStep, StopScreen, type ReviewRow } from "@/components/questionnaire/steps";
import { Button } from "@/components/ui/controls";
import { meta } from "@/data/questionnaire";
import {
  allLikertCodes,
  likertOrder,
  randomVersion,
  sectionById,
  sectionSequence,
  stepSequence,
  type StepId,
} from "@/lib/questionnaire/flow";
import { forwardLabel, stepTitle } from "@/lib/questionnaire/labels";
import { initialState, parseStoredState, reducer } from "@/lib/questionnaire/state";
import { countAnsweredLikert, validateConsent, validateSection, type FieldErrors } from "@/lib/validation/validate";
import type { AnswerValue } from "@/types/questionnaire";

const STORAGE_KEY = "kuesioner-penelitian:v1";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const subscribeNothing = () => () => {};

function readStorage(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStorage(value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Penyimpanan perangkat tidak tersedia (mode privat); kuesioner tetap berjalan.
  }
}

export function QuestionnaireApp({ contactEmail }: { contactEmail?: string }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => initialState());
  // false saat render server dan hidrasi, true setelahnya.
  const hydrated = useSyncExternalStore(subscribeNothing, () => true, () => false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [announcement, setAnnouncement] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const viewKeyRef = useRef<string | null>(null);

  const steps = useMemo(() => stepSequence(state.version), [state.version]);
  const stepIndex = steps.indexOf(state.step);
  const likertCodes = useMemo(() => allLikertCodes(state.version), [state.version]);
  const answeredLikert = countAnsweredLikert(likertCodes, state.answers);
  const firstLikertId = likertOrder(state.version)[0].id;
  const section = sectionById(state.step);

  // Memulihkan pengisian yang tersimpan di perangkat setelah hidrasi.
  useEffect(() => {
    const saved = parseStoredState(readStorage());
    if (saved) dispatch({ type: "restore", state: saved });
  }, []);

  // Menyimpan setiap perubahan. Setelah terkirim, jawaban dihapus dari perangkat.
  useEffect(() => {
    if (!hydrated) return;
    if (state.status === "submitted") {
      writeStorage(JSON.stringify({ ...initialState(state.version), status: "submitted", step: "review" }));
    } else if (state.step === "intro" && Object.keys(state.answers).length === 0) {
      writeStorage(null);
    } else {
      writeStorage(JSON.stringify({ ...state, restored: undefined }));
    }
  }, [state, hydrated]);

  // Riwayat peramban: tombol kembali perangkat berpindah antarbagian.
  useEffect(() => {
    if (!hydrated) return;
    const hash = state.status === "active" ? `#${state.step}` : `#${state.status}`;
    if (window.location.hash !== hash) {
      const method = viewKeyRef.current === null ? "replaceState" : "pushState";
      window.history[method](null, "", hash === "#intro" ? window.location.pathname : hash);
    }
  }, [state.step, state.status, hydrated]);

  useEffect(() => {
    const onPop = () => {
      const target = (window.location.hash.slice(1) || "intro") as StepId;
      dispatch({ type: "goto", step: target });
      setErrors({});
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Saat langkah berganti: gulir ke atas dan pindahkan fokus ke judul langkah.
  useEffect(() => {
    if (!hydrated) return;
    const key = `${state.step}:${state.status}`;
    if (viewKeyRef.current !== null && viewKeyRef.current !== key) {
      window.scrollTo({ top: 0, behavior: "instant" });
      document.getElementById("judul-langkah")?.focus({ preventScroll: true });
    }
    viewKeyRef.current = key;
  }, [state.step, state.status, hydrated]);

  const onAnswer = useCallback(
    (id: string, value: AnswerValue | undefined) => {
      const isFirstLikertAnswer = section?.kind === "likert" && state.answers[id] === undefined;
      dispatch({ type: "answer", id, value });
      setErrors((prev) => {
        if (!prev[id]) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });

      // Bawa pernyataan berikutnya ke layar bila belum terlihat.
      if (isFirstLikertAnswer) {
        const current = document.querySelector<HTMLElement>(`[data-field="${id}"]`);
        const statements = Array.from(document.querySelectorAll<HTMLElement>("[data-statement]"));
        const nextEl = current ? statements[statements.indexOf(current) + 1] : undefined;
        if (nextEl) {
          const rect = nextEl.getBoundingClientRect();
          if (rect.bottom > window.innerHeight - 24) {
            nextEl.scrollIntoView({ block: "center", behavior: prefersReducedMotion() ? "instant" : "smooth" });
          }
        }
      }
    },
    [section?.kind, state.answers],
  );

  function focusFirstError(fieldErrors: FieldErrors) {
    const first = Object.keys(fieldErrors)[0];
    requestAnimationFrame(() => {
      const ids = Object.keys(fieldErrors);
      const fields = Array.from(document.querySelectorAll<HTMLElement>("[data-field]")).filter((el) =>
        ids.includes(el.dataset.field!),
      );
      const target = fields[0] ?? document.querySelector<HTMLElement>(`[data-field="${first}"]`);
      target?.scrollIntoView({ block: "center", behavior: prefersReducedMotion() ? "instant" : "smooth" });
      target?.querySelector<HTMLElement>("input")?.focus({ preventScroll: true });
    });
  }

  function goForward() {
    const fieldErrors = state.step === "intro" ? validateConsent(state.answers) : section ? validateSection(section, state.answers) : {};
    const count = Object.keys(fieldErrors).length;
    if (count > 0) {
      setErrors(fieldErrors);
      setAnnouncement(
        section?.kind === "likert"
          ? `Ada ${count} pernyataan yang belum dijawab. Lengkapi pernyataan yang ditandai untuk melanjutkan.`
          : `Ada ${count} jawaban yang perlu dilengkapi. Periksa bagian yang ditandai untuk melanjutkan.`,
      );
      focusFirstError(fieldErrors);
      return;
    }
    setErrors({});
    setAnnouncement("");
    dispatch({ type: "advance", now: new Date().toISOString(), version: randomVersion() });
  }

  function goBack() {
    setErrors({});
    setAnnouncement("");
    dispatch({ type: "back" });
  }

  function goto(step: StepId) {
    setErrors({});
    setAnnouncement("");
    dispatch({ type: "goto", step });
  }

  function restart() {
    dialogRef.current?.close();
    setErrors({});
    setAnnouncement("");
    setSubmitError(null);
    writeStorage(null);
    dispatch({ type: "reset", version: "CD" });
  }

  async function submit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formVersion: state.version, startedAt: state.startedAt, answers: state.answers }),
      });
      if (res.ok) {
        dispatch({ type: "submitted" });
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setSubmitError(
        `${data.error ?? "Jawaban belum dapat dikirim."} Jawaban Anda tetap tersimpan di perangkat ini. Silakan coba kirim lagi dalam beberapa saat.`,
      );
    } catch {
      setSubmitError(
        "Koneksi internet terputus saat mengirim. Jawaban Anda tetap tersimpan di perangkat ini. Periksa koneksi, lalu tekan Kirim jawaban lagi.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const reviewRows: ReviewRow[] = sectionSequence(state.version).map((s) => {
    const total = s.kind === "likert" ? s.items.length : s.questions.length;
    const answered = Object.keys(validateSection(s, state.answers)).length;
    return { step: s.id as StepId, total, answered: total - answered };
  });

  const showChrome = state.status === "active";
  const nextStep = steps[stepIndex + 1];

  let content: React.ReactNode;
  if (state.status === "submitted") {
    content = <DoneScreen />;
  } else if (state.status === "stopped" && state.stopReason) {
    content = (
      <StopScreen
        reason={state.stopReason}
        onResume={() => dispatch({ type: "resume" })}
        onRestart={restart}
      />
    );
  } else if (state.step === "intro") {
    content = <IntroStep answers={state.answers} errors={errors} onAnswer={onAnswer} contactEmail={contactEmail} />;
  } else if (state.step === "review") {
    content = <ReviewStep rows={reviewRows} onEdit={goto} submitError={submitError} />;
  } else if (section) {
    content = (
      <SectionStep
        section={section}
        answers={state.answers}
        errors={errors}
        onAnswer={onAnswer}
        showGuide={state.step === firstLikertId}
      />
    );
  }

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-line bg-paper/95 pt-[env(safe-area-inset-top)] backdrop-blur-sm supports-[backdrop-filter]:bg-paper/85">
        <div className="mx-auto flex h-14 max-w-[68rem] items-center justify-between gap-4 px-5 sm:px-8">
          <p className="min-w-0 truncate text-sm font-semibold tracking-[-0.01em] text-ink">
            Kuesioner<span className="hidden min-[360px]:inline"> Penelitian</span>
          </p>
          <div className="flex shrink-0 items-center gap-3">
            {showChrome && section?.kind === "likert" && (
              <p className="text-sm text-muted tabular-nums" aria-label={`${answeredLikert} dari ${meta.likertCount} pernyataan terjawab`}>
                <span className="font-semibold text-ink">{answeredLikert}</span>/{meta.likertCount}
                <span className="hidden sm:inline"> pernyataan</span>
              </p>
            )}
            {hydrated && state.status !== "submitted" && (state.step !== "intro" || state.status === "stopped") && (
              <Button variant="quiet" className="text-sm" onClick={() => dialogRef.current?.showModal()}>
                Mulai ulang
              </Button>
            )}
          </div>
        </div>
        {showChrome && (
          <div className="mx-auto max-w-[68rem] px-5 pb-2.5 sm:px-8">
            <ol className="flex items-end gap-1" aria-label={`Langkah ${stepIndex + 1} dari ${steps.length}`}>
              {steps.map((s, i) => (
                <li
                  key={s}
                  aria-hidden="true"
                  className={`flex-1 rounded-[2px] transition-[background-color] duration-200 ${
                    i === stepIndex ? "h-[5px] bg-accent" : i < stepIndex ? "h-[3px] bg-accent" : "h-[3px] bg-line"
                  }`}
                />
              ))}
            </ol>
          </div>
        )}
      </header>

      <div className="mx-auto w-full max-w-[68rem] flex-1 px-5 sm:px-8 lg:grid lg:grid-cols-[15rem_minmax(0,42rem)] lg:gap-16">
        {showChrome ? (
          <nav aria-label="Bagian kuesioner" className="hidden lg:block">
            <ol className="sticky top-24 grid gap-0.5 py-10">
              {steps.map((s, i) => {
                const t = stepTitle(s);
                const reachable = i <= state.furthest;
                const current = i === stepIndex;
                const done = i < state.furthest || (s !== "review" && i < stepIndex);
                const label = (
                  <>
                    <span className="grid size-5 shrink-0 place-items-center text-xs font-semibold tabular-nums">
                      {done && !current ? <Check aria-hidden="true" className="size-3.5 text-accent" strokeWidth={3} /> : (t.letter ?? "")}
                    </span>
                    <span className="min-w-0 leading-snug">{t.title}</span>
                  </>
                );
                const cls = `flex w-full items-start gap-2.5 rounded-[8px] px-2 py-1.5 text-left text-[0.8125rem] ${
                  current ? "bg-surface font-semibold text-ink" : reachable ? "text-ink-soft hover:bg-surface hover:text-ink" : "text-muted"
                }`;
                return (
                  <li key={s}>
                    {reachable && !current ? (
                      <button type="button" className={cls} onClick={() => goto(s)}>
                        {label}
                      </button>
                    ) : (
                      <span className={cls} aria-current={current ? "step" : undefined}>
                        {label}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        ) : (
          <div className="hidden lg:block" />
        )}

        <main id="konten" className="min-w-0 py-10 sm:py-14">
          {state.restored && showChrome && (
            <p role="status" className="mb-8 rounded-[10px] border border-line bg-surface px-4 py-3 text-sm leading-relaxed text-ink-soft">
              Jawaban yang Anda isi sebelumnya sudah dipulihkan dari perangkat ini. Lanjutkan dari bagian ini.
            </p>
          )}

          <div key={`${state.step}:${state.status}`} className="step-enter">
            {content}
          </div>

          {showChrome && (
            <div className="mt-12 grid gap-4 border-t border-line pt-6">
              <p aria-live="polite" className="text-sm font-medium text-danger empty:hidden">
                {announcement}
              </p>
              <div className="flex gap-3">
                {stepIndex > 0 && (
                  <Button variant="secondary" className="basis-2/5 sm:basis-auto" onClick={goBack}>
                    Kembali
                  </Button>
                )}
                {state.step === "review" ? (
                  <Button className="flex-1 sm:flex-none" onClick={submit} disabled={submitting} aria-busy={submitting}>
                    {submitting ? "Mengirim…" : "Kirim jawaban"}
                  </Button>
                ) : (
                  <Button className="flex-1 sm:flex-none" onClick={goForward}>
                    {state.step === "intro" && state.answers.CONSENT === "0" ? "Lanjutkan" : forwardLabel(nextStep)}
                  </Button>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      <dialog
        ref={dialogRef}
        aria-labelledby="judul-dialog"
        className="m-auto w-[min(26rem,calc(100vw-2.5rem))] overscroll-contain rounded-[14px] bg-surface p-6 text-ink shadow-[0_24px_48px_-12px_rgb(16_32_28/0.25)]"
      >
        <h2 id="judul-dialog" className="text-lg font-semibold">
          Mulai ulang dari awal?
        </h2>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-soft">
          Semua jawaban yang tersimpan di perangkat ini akan dihapus. Tindakan ini tidak dapat dibatalkan.
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={() => dialogRef.current?.close()} autoFocus>
            Batal
          </Button>
          <Button variant="danger" onClick={restart}>
            Hapus jawaban
          </Button>
        </div>
      </dialog>
    </>
  );
}
