import { Check, CircleAlert } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "quiet" | "danger";

const buttonBase =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-[10px] px-5 text-[0.9375rem] font-semibold whitespace-nowrap transition-[background-color,border-color,color,transform] duration-150 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-ink hover:bg-[color-mix(in_oklab,var(--accent)_88%,var(--ink))]",
  danger: "bg-danger text-paper hover:bg-[color-mix(in_oklab,var(--danger)_88%,var(--ink))]",
  secondary: "border border-line-strong text-ink hover:border-ink hover:bg-surface",
  quiet:
    "min-h-11 px-2 text-ink-soft underline-offset-4 hover:text-ink hover:underline",
};

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button type={type} className={`${buttonBase} ${buttonVariants[variant]} ${className}`} {...props} />;
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-2.5 flex items-start gap-2 text-sm leading-snug font-medium text-danger">
      <CircleAlert aria-hidden="true" className="mt-px size-4 shrink-0" strokeWidth={2.25} />
      <span>{message}</span>
    </p>
  );
}

interface OptionRowProps {
  type: "radio" | "checkbox";
  name: string;
  value: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  invalid?: boolean;
  children: ReactNode;
}

/** Baris pilihan: seluruh baris adalah label sehingga tidak ada area mati. */
export function OptionRow({ type, name, value, checked, onChange, invalid, children }: OptionRowProps) {
  return (
    <label
      className={`group flex min-h-[3.25rem] cursor-pointer items-start gap-3 rounded-[10px] border px-4 py-3.5 transition-[background-color,border-color] duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${
        checked
          ? "border-accent bg-accent-wash"
          : invalid
            ? "border-danger bg-surface hover:bg-accent-wash/60"
            : "border-line-strong bg-surface hover:border-ink/40 hover:bg-accent-wash/60"
      }`}
    >
      <input
        type={type}
        name={name}
        value={value}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={`mt-[3px] grid size-[18px] shrink-0 place-items-center border-[1.5px] transition-[background-color,border-color] duration-150 ${
          type === "radio" ? "rounded-full" : "rounded-[4px]"
        } ${checked ? "border-accent bg-accent" : "border-line-strong bg-surface"}`}
      >
        {checked &&
          (type === "radio" ? (
            <span className="size-[7px] rounded-full bg-accent-ink" />
          ) : (
            <Check className="size-3 text-accent-ink" strokeWidth={3.25} />
          ))}
      </span>
      <span className="text-[0.9875rem] leading-snug text-ink">{children}</span>
    </label>
  );
}
