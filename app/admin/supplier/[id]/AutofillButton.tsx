"use client";

import { useFormStatus } from "react-dom";

export function AutofillButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-indigo-600 px-3 py-1 text-xs text-white disabled:opacity-60"
    >
      {pending ? "Načítavam látky z webu…" : "Doplniť látky z webu (AI)"}
    </button>
  );
}
