"use client";

import { ArrowUp, Eye, EyeOff } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { Button, FieldError } from "@/components/ui/controls";
import { login, type LoginState } from "./actions";

const HINT = "Masukkan kata sandi peneliti…";
const MAX_PIPS = 24;

/** Placeholder yang mengetik sendiri satu kali, lalu menyisakan kursor berkedip. */
function useTypewriter(text: string) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let i = 0;
    const id = window.setInterval(
      () => {
        i = reduce ? text.length : i + 1;
        setCount(i);
        if (i >= text.length) window.clearInterval(id);
      },
      reduce ? 0 : 42,
    );
    return () => window.clearInterval(id);
  }, [text]);
  return text.slice(0, count);
}

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, { error: null, attempt: 0 });
  const [value, setValue] = useState("");
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const typed = useTypewriter(HINT);

  // Setelah percobaan gagal, kembalikan fokus ke kolom dan pilih isinya agar mudah diketik ulang.
  useEffect(() => {
    if (state.attempt > 0) inputRef.current?.select();
  }, [state.attempt]);

  const describedBy = [state.error ? "password-galat" : null, capsLock ? "password-capslock" : null].filter(Boolean).join(" ") || undefined;
  const extra = value.length - MAX_PIPS;

  return (
    <div className="mx-auto w-full max-w-[26rem] px-5 py-20 sm:py-28">
      <h1 className="text-[1.75rem] leading-tight font-semibold tracking-[-0.015em]">Masuk ke dasbor peneliti</h1>
      <p className="mt-3 text-base leading-[1.65] text-ink-soft">
        Dasbor berisi seluruh jawaban responden. Sesi berlaku 8 jam di perangkat ini.
      </p>
      <form action={action} className="mt-10 grid gap-5">
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink">
            Kata sandi peneliti
          </label>
          <div
            className={`relative ${state.attempt % 2 ? "shake-a" : state.attempt ? "shake-b" : ""}`}
          >
            <input
              ref={inputRef}
              id="password"
              name="password"
              type={visible ? "text" : "password"}
              required
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => setCapsLock(e.getModifierState("CapsLock"))}
              onKeyUp={(e) => setCapsLock(e.getModifierState("CapsLock"))}
              onBlur={() => setCapsLock(false)}
              autoComplete="current-password"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              aria-invalid={state.error ? true : undefined}
              aria-describedby={describedBy}
              className={`peer block h-12 w-full rounded-[10px] border bg-surface pr-12 pl-3.5 text-base text-ink transition-[border-color] duration-150 focus-visible:border-accent ${
                visible ? "font-medium tracking-[0.06em] tabular-nums" : "tracking-[0.18em]"
              } ${state.error ? "border-danger" : "border-line-strong"}`}
            />
            {value === "" && (
              <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-base text-muted peer-autofill:hidden">
                {typed}
                <span className="caret ml-px inline-block h-5 w-px bg-ink-soft" />
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setVisible((v) => !v);
                // Setelah tipe input berganti, kembalikan fokus dengan kursor di akhir teks.
                requestAnimationFrame(() => {
                  const el = inputRef.current;
                  if (!el) return;
                  el.focus({ preventScroll: true });
                  el.setSelectionRange(el.value.length, el.value.length);
                });
              }}
              aria-pressed={visible}
              aria-controls="password"
              aria-label="Tampilkan kata sandi"
              title={visible ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
              className="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-[10px] text-muted transition-[color] duration-150 hover:text-ink"
            >
              {visible ? <EyeOff aria-hidden="true" className="size-[18px]" /> : <Eye aria-hidden="true" className="size-[18px]" />}
            </button>
          </div>

          {/* Umpan balik ketikan: satu titik per karakter, tanpa membuka isi kata sandi. */}
          <div aria-hidden="true" className="mt-2.5 flex h-2 items-center gap-[5px]">
            {Array.from({ length: Math.min(value.length, MAX_PIPS) }, (_, i) => (
              <span key={i} className="pip size-1.5 rounded-full bg-accent" />
            ))}
            {extra > 0 && <span className="ml-1 text-[0.6875rem] leading-none font-medium text-muted tabular-nums">+{extra}</span>}
          </div>

          {capsLock && (
            <p id="password-capslock" role="status" className="mt-2 flex items-center gap-1.5 text-sm font-medium text-ink-soft">
              <ArrowUp aria-hidden="true" className="size-4" strokeWidth={2.5} />
              Caps Lock aktif. Kata sandi membedakan huruf besar dan kecil.
            </p>
          )}
          <FieldError id="password-galat" message={state.error ?? undefined} />
        </div>
        <Button type="submit" disabled={pending} aria-busy={pending} className="w-full">
          {pending ? "Memeriksa…" : "Masuk"}
        </Button>
      </form>
    </div>
  );
}
