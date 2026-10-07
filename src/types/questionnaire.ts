/** Kode jawaban disimpan sebagai string agar seragam di formulir, API, dan CSV. */
export type Code = string;

export interface Option {
  /** Kode yang disimpan dan diekspor. */
  code: Code;
  label: string;
  /** Opsi ini membutuhkan isian teks tambahan (mis. "Lainnya: ___"). */
  textField?: {
    id: string;
    label: string;
    maxLength: number;
    placeholder?: string;
  };
}

interface BaseQuestion {
  id: string;
  /** Nomor tampilan sesuai instrumen, mis. "A1" atau "B3". */
  number: string;
  text: string;
  /** Catatan yang ditujukan kepada responden dan ditampilkan di bawah pertanyaan. */
  note?: string;
}

export interface YesNoQuestion extends BaseQuestion {
  kind: "yesno";
}

export interface SingleQuestion extends BaseQuestion {
  kind: "single";
  options: Option[];
}

export interface MultiQuestion extends BaseQuestion {
  kind: "multi";
  options: Option[];
  minSelected: number;
}

export interface TextQuestion extends BaseQuestion {
  kind: "text";
  maxLength: number;
  autoComplete: string;
  suggestions?: readonly string[];
}

export interface YearQuestion extends BaseQuestion {
  kind: "year";
  min: number;
  max: number;
  rangeMessage: string;
}

export type FormQuestion =
  | YesNoQuestion
  | SingleQuestion
  | MultiQuestion
  | TextQuestion
  | YearQuestion;

export interface LikertItem {
  /** Kode butir sesuai instrumen, mis. "FC_EXP1". Tidak ditampilkan kepada responden. */
  code: string;
  text: string;
}

export interface LikertSection {
  kind: "likert";
  id: string;
  letter: string;
  title: string;
  instruction: string;
  items: LikertItem[];
}

export interface FormSection {
  kind: "form";
  id: string;
  letter?: string;
  title: string;
  intro?: string[];
  questions: FormQuestion[];
}

export type Section = FormSection | LikertSection;

export type AnswerValue = string | string[];
export type Answers = Record<string, AnswerValue | undefined>;

/** Urutan Bagian C dan D diseimbangkan antarversi form. */
export type FormVersion = "CD" | "DC";
