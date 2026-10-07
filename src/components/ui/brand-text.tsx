import type { ReactNode } from "react";

/** Menandai nama merek agar tidak diterjemahkan otomatis oleh peramban. */
export function withBrand(text: string): ReactNode {
  if (!text.includes("Bareksa")) return text;
  return text.split(/(Bareksa)/g).map((part, i) =>
    part === "Bareksa" ? (
      <span key={i} translate="no">
        {part}
      </span>
    ) : (
      part
    ),
  );
}
