"use client";

import { useState } from "react";
import type { Supplier } from "@/lib/types";
import { generateEmail } from "@/lib/email";

export function EmailButton({ supplier }: { supplier: Supplier }) {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<"sk" | "en">("sk");
  const { subject, body } = generateEmail(supplier, lang);
  const mailto = `mailto:${encodeURIComponent(supplier.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  async function copy() {
    await navigator.clipboard.writeText(`Predmet: ${subject}\n\n${body}`);
    alert("E-mail skopírovaný do schránky.");
  }

  return (
    <div>
      <button type="button" className="btn" onClick={() => setOpen((v) => !v)}>
        {open ? "Skryť e-mail" : "Vygenerovať e-mail"}
      </button>
      {open && (
        <div className="mt-3 rounded border border-border bg-paper p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <label className="inline-flex items-center gap-2 mb-0 cursor-pointer mr-3">
                <input
                  type="radio"
                  checked={lang === "sk"}
                  onChange={() => setLang("sk")}
                />
                Slovenčina
              </label>
              <label className="inline-flex items-center gap-2 mb-0 cursor-pointer">
                <input
                  type="radio"
                  checked={lang === "en"}
                  onChange={() => setLang("en")}
                />
                English
              </label>
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn" onClick={copy}>
                Kopírovať
              </button>
              <a className="btn btn-primary" href={mailto}>
                Otvoriť v mailovom klientovi
              </a>
            </div>
          </div>
          <div className="text-xs text-ink/60">Predmet</div>
          <div className="text-sm font-medium">{subject}</div>
          <div className="text-xs text-ink/60 pt-2">Telo</div>
          <pre className="whitespace-pre-wrap text-sm font-sans bg-white border border-border rounded p-3">
{body}
          </pre>
        </div>
      )}
    </div>
  );
}
