"use client";

import { useActionState } from "react";
import { Button, FieldError } from "@/components/ui/controls";
import { login, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, { error: null });

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
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            spellCheck={false}
            aria-invalid={state.error ? true : undefined}
            aria-describedby={state.error ? "password-galat" : undefined}
            className={`block h-12 w-full rounded-[10px] border bg-surface px-3.5 text-base ${state.error ? "border-danger" : "border-line-strong"}`}
          />
          <FieldError id="password-galat" message={state.error ?? undefined} />
        </div>
        <Button type="submit" disabled={pending} aria-busy={pending} className="w-full">
          {pending ? "Memeriksa…" : "Masuk"}
        </Button>
      </form>
    </div>
  );
}
