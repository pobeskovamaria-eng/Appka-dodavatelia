import { NextRequest, NextResponse } from "next/server";
import { listSuppliers } from "@/lib/db";
import type { Supplier } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const format = req.nextUrl.searchParams.get("format") || "json";
  const suppliers = listSuppliers();
  const date = new Date().toISOString().slice(0, 10);

  if (format === "csv") {
    const csv = toCsv(suppliers);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="dodavatelia-${date}.csv"`,
      },
    });
  }

  return new NextResponse(JSON.stringify(suppliers, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="dodavatelia-${date}.json"`,
    },
  });
}

function toCsv(items: Supplier[]): string {
  const headers: { key: keyof Supplier | "score" | "materialsStr" | "certificationsStr"; label: string }[] = [
    { key: "name", label: "Názov" },
    { key: "website", label: "Web" },
    { key: "country", label: "Krajina" },
    { key: "city", label: "Mesto" },
    { key: "email", label: "E-mail" },
    { key: "phone", label: "Telefón" },
    { key: "companyType", label: "Typ firmy" },
    { key: "materialsStr", label: "Materiály" },
    { key: "offersMulberry", label: "Mulberry hodváb" },
    { key: "momme19", label: "19 momme" },
    { key: "momme22", label: "22 momme" },
    { key: "offersDyeing", label: "Farbenie" },
    { key: "customColors", label: "Custom colors" },
    { key: "pantoneMatching", label: "Pantone" },
    { key: "certificationsStr", label: "Certifikácie" },
    { key: "b2b", label: "B2B" },
    { key: "sellsMeter", label: "Metráž" },
    { key: "moq", label: "MOQ" },
    { key: "sendsSamples", label: "Vzorky" },
    { key: "shipsSlovakia", label: "Dodáva SK" },
    { key: "shipsEU", label: "Dodáva EÚ" },
    { key: "score", label: "Skóre" },
    { key: "rating", label: "Hodnotenie" },
    { key: "status", label: "Stav" },
    { key: "lastCheck", label: "Posledná kontrola" },
    { key: "lastContact", label: "Posledný kontakt" },
    { key: "notes", label: "Poznámky" },
  ];

  const esc = (v: unknown) => {
    const str = v === null || v === undefined ? "" : String(v);
    if (/[",\n;]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  };

  const rows = items.map((s) => {
    const enriched = {
      ...s,
      score: s.scoreManual ?? s.scoreAuto,
      materialsStr: s.materials.map((m) => `${m.name} (${m.verification})`).join("; "),
      certificationsStr: s.certifications
        .map((c) => `${c.name} (${c.status})`)
        .join("; "),
    };
    return headers.map((h) => esc((enriched as Record<string, unknown>)[h.key])).join(",");
  });

  return [headers.map((h) => h.label).join(","), ...rows].join("\n");
}
