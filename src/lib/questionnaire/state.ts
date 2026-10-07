import { stepSequence, stopReasonAfter, type StepId, type StopReason } from "@/lib/questionnaire/flow";
import type { Answers, AnswerValue, FormVersion } from "@/types/questionnaire";

export interface QuestionnaireState {
  version: FormVersion;
  step: StepId;
  /** Indeks langkah terjauh yang pernah dicapai; membatasi lompatan lewat rail. */
  furthest: number;
  answers: Answers;
  startedAt: string | null;
  status: "active" | "stopped" | "submitted";
  stopReason: StopReason | null;
  /** Hanya untuk sesi berjalan: jawaban baru dipulihkan dari perangkat. Tidak disimpan. */
  restored?: boolean;
}

export type Action =
  | { type: "answer"; id: string; value: AnswerValue | undefined }
  | { type: "advance"; now: string; version: FormVersion }
  | { type: "back" }
  | { type: "goto"; step: StepId }
  | { type: "resume" }
  | { type: "submitted" }
  | { type: "restore"; state: QuestionnaireState }
  | { type: "reset"; version: FormVersion };

/** Versi form diundi saat responden menyetujui partisipasi (lihat "advance"). */
export function initialState(version: FormVersion = "CD"): QuestionnaireState {
  return {
    version,
    step: "intro",
    furthest: 0,
    answers: {},
    startedAt: null,
    status: "active",
    stopReason: null,
  };
}

export function reducer(state: QuestionnaireState, action: Action): QuestionnaireState {
  const steps = stepSequence(state.version);
  const index = steps.indexOf(state.step);

  switch (action.type) {
    case "answer": {
      const answers = { ...state.answers };
      if (action.value === undefined) delete answers[action.id];
      else answers[action.id] = action.value;
      return { ...state, answers };
    }
    case "advance": {
      if (state.restored) state = { ...state, restored: false };
      const stop = stopReasonAfter(state.step, state.answers);
      if (stop) return { ...state, status: "stopped", stopReason: stop };
      const next = Math.min(index + 1, steps.length - 1);
      const starting = state.step === "intro" && state.startedAt === null;
      return {
        ...state,
        version: starting ? action.version : state.version,
        step: steps[next],
        furthest: Math.max(state.furthest, next),
        startedAt: starting ? action.now : state.startedAt,
      };
    }
    case "back":
      return { ...state, step: steps[Math.max(index - 1, 0)] };
    case "goto": {
      const target = steps.indexOf(action.step);
      if (target < 0 || target > state.furthest) return state;
      return { ...state, step: action.step, status: "active", stopReason: null, restored: false };
    }
    case "resume":
      // Dari layar berhenti, kembali ke langkah yang memicu penghentian.
      return { ...state, status: "active", stopReason: null };
    case "submitted":
      return { ...state, status: "submitted" };
    case "restore":
      return {
        ...action.state,
        restored: action.state.status === "active" && action.state.step !== "intro",
      };
    case "reset":
      return initialState(action.version);
  }
}

const STEP_IDS = new Set<string>([
  "intro", "A", "BASIS", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "review",
]);

/** Memeriksa bentuk state dari localStorage sebelum dipakai. */
export function parseStoredState(raw: string | null): QuestionnaireState | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as Partial<QuestionnaireState>;
    if (
      (s.version !== "CD" && s.version !== "DC") ||
      typeof s.step !== "string" ||
      !STEP_IDS.has(s.step) ||
      typeof s.furthest !== "number" ||
      typeof s.answers !== "object" ||
      s.answers === null ||
      (s.status !== "active" && s.status !== "stopped" && s.status !== "submitted")
    ) {
      return null;
    }
    return {
      version: s.version,
      step: s.step as StepId,
      furthest: s.furthest,
      answers: s.answers as Answers,
      startedAt: typeof s.startedAt === "string" ? s.startedAt : null,
      status: s.status,
      stopReason: s.stopReason ?? null,
    };
  } catch {
    return null;
  }
}
