"use client";

import { useState } from "react";
import { Button, FieldError } from "@/components/ui/controls";

export function ExportForm() {
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = new FormData(e.currentTarget).get("password");
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Data belum dapat diunduh. Coba lagi dalam beberapa saat.");
        return;
      }
      const blob = await res.blob();
      const name = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? "jawaban.csv";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
      setStatus(`Berkas ${name} berisi ${res.headers.get("X-Response-Count") ?? "0"} jawaban sudah diunduh.`);
    } catch {
      setError("Koneksi terputus. Periksa koneksi internet, lalu coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-10 grid gap-5" noValidate>
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
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "password-galat" : undefined}
          className={`block h-12 w-full max-w-sm rounded-[10px] border bg-surface px-3.5 text-base ${error ? "border-danger" : "border-line-strong"}`}
        />
        <FieldError id="password-galat" message={error ?? undefined} />
      </div>
      <div>
        <Button type="submit" disabled={busy} aria-busy={busy}>
          {busy ? "Menyiapkan berkas…" : "Unduh CSV"}
        </Button>
      </div>
      <p aria-live="polite" className="text-sm text-ink-soft empty:hidden">
        {status}
      </p>
    </form>
  );
}
