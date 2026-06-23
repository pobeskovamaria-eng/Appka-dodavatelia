"use client";

import { useRef, useState } from "react";
import { importSuppliersAction } from "@/app/actions";

export function ImportButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      ref={formRef}
      action={async (fd) => {
        if (
          !confirm(
            "Import pridá dodávateľov z JSON súboru do databázy (existujúce sa neprepíšu, vznikne duplicita ak majú rovnaké ID). Pokračovať?"
          )
        ) {
          return;
        }
        setBusy(true);
        try {
          await importSuppliersAction(fd);
        } finally {
          setBusy(false);
        }
      }}
      className="inline-flex"
    >
      <input
        ref={inputRef}
        type="file"
        name="file"
        accept="application/json,.json"
        className="hidden"
        onChange={() => formRef.current?.requestSubmit()}
      />
      <button
        type="button"
        className="btn"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? "Importujem…" : "Import JSON"}
      </button>
    </form>
  );
}
