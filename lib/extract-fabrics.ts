import Anthropic from "@anthropic-ai/sdk";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Rýchla extrakcia detailov látok z webu dodávateľa.
// 1) appka si sama paralelne stiahne homepage + pár pravdepodobných podstránok,
// 2) HTML zredukuje na text,
// 3) Claude (claude-opus-4-8) spraví JEDNO volanie a vráti štruktúrované látky.
// Celé sa zmestí do ~15–20 s (limit serverless funkcie je 60 s). Len server-side.

export const MATERIAL_CODES = [
  "cotton",
  "linen",
  "wool",
  "silk",
  "viscose",
  "polyester",
  "elastane",
] as const;

export type ExtractedFabric = {
  name: string | null;
  material_type: string[];
  composition: string | null;
  weight_gsm: number | null;
  width_cm: number | null;
  moq: number | null;
  moq_unit: "m" | "kg" | null;
  certifications: string[];
  colors: string[];
};

export type ExtractResult = {
  fabrics: ExtractedFabric[];
  notes: string;
};

const SAVE_TOOL = {
  name: "save_fabrics",
  description:
    "Ulož extrahované druhy látok dodávateľa. Zavolaj VŽDY presne raz. Ak text neobsahuje použiteľné info o látkach, daj prázdne pole fabrics a vysvetlenie do notes.",
  input_schema: {
    type: "object",
    properties: {
      fabrics: {
        type: "array",
        description: "Reprezentatívne druhy látok (max ~10).",
        items: {
          type: "object",
          properties: {
            name: { type: ["string", "null"] },
            material_type: {
              type: "array",
              items: { type: "string", enum: MATERIAL_CODES },
            },
            composition: { type: ["string", "null"] },
            weight_gsm: { type: ["integer", "null"] },
            width_cm: { type: ["integer", "null"] },
            moq: { type: ["integer", "null"] },
            moq_unit: { type: ["string", "null"], enum: ["m", "kg", null] },
            certifications: { type: "array", items: { type: "string" } },
            colors: { type: "array", items: { type: "string" } },
          },
          required: [
            "name",
            "material_type",
            "composition",
            "weight_gsm",
            "width_cm",
            "moq",
            "moq_unit",
            "certifications",
            "colors",
          ],
          additionalProperties: false,
        },
      },
      notes: { type: "string" },
    },
    required: ["fabrics", "notes"],
    additionalProperties: false,
  },
};

const SYSTEM = `Si asistent pre katalóg dodávateľov textilu. Dostaneš text stiahnutý z webu dodávateľa. Tvojou úlohou je z neho zistiť, aké druhy látok ponúka.

Pravidlá:
- Extrahuj REPREZENTATÍVNE druhy látok (max ~10), nie každý jednotlivý produkt.
- material_type vyplň LEN kódmi: cotton, linen, wool, silk, viscose, polyester, elastane. Ak materiál nezodpovedá kódu, nechaj material_type prázdne, ale zloženie zachyť v composition.
- Vypĺňaj len to, čo v texte naozaj je. Nehádaj gramáž, MOQ ani certifikáty — ak údaj nie je uvedený, daj null / prázdne pole.
- Text môže byť v taliančine/angličtine — to je v poriadku.
- Zavolaj nástroj save_fabrics. Ak text neobsahuje info o látkach (napr. len kontakt, prázdna stránka), zavolaj save_fabrics s prázdnym poľom fabrics a vysvetlením v notes.`;

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchHtml(url: string, ms = 6000): Promise<string> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: { "user-agent": "Mozilla/5.0 (compatible; AppkaDodavatelia/1.0)" },
      cache: "no-store",
    });
    clearTimeout(timer);
    if (!res.ok) return "";
    return await res.text();
  } catch {
    return "";
  }
}

// Slová, ktoré naznačujú produktovú/látkovú stránku.
const PRODUCT_HINTS = [
  "tessut", "raso", "cotone", "lino", "seta", "lana", "viscos", "satin", "saten",
  "velluto", "jersey", "popeline", "fabric", "cloth", "tela", "panno", "mussola",
  "crepe", "chiffon", "organza", "taffeta", "gabardine", "denim", "flanella", "tweed",
];

function extractSameHostLinks(html: string, base: string): string[] {
  const out = new Set<string>();
  const host = new URL(base).host;
  const re = /<a\s[^>]*href=["']([^"'#]+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      const u = new URL(m[1], base);
      if (u.host !== host) continue;
      out.add(u.origin + u.pathname);
    } catch {
      /* ignore */
    }
  }
  return [...out];
}

function scoreProductLink(url: string): number {
  const l = url.toLowerCase();
  let score = 0;
  for (const h of PRODUCT_HINTS) if (l.includes(h)) score += 2;
  // hlbšia cesta = pravdepodobnejšie detail produktu (nie len kategória)
  const segs = new URL(url).pathname.split("/").filter(Boolean).length;
  score += Math.min(segs, 4);
  return score;
}

// 1) stiahne homepage + prehľadové stránky, 2) nájde produktové odkazy,
// 3) stiahne najsľubnejšie produktové detaily — kde býva zloženie, gramáž atď.
async function fetchSiteText(website: string): Promise<string> {
  const base = `https://${website.replace(/\/+$/, "")}`;
  const seeds = ["", "/tessuti", "/prodotti", "/shop", "/catalogo", "/collezioni"];

  const seedHtml = await Promise.all(seeds.map((p) => fetchHtml(base + p)));
  const seedText = seedHtml
    .map((h) => htmlToText(h))
    .filter(Boolean)
    .join("\n")
    .slice(0, 14000);

  const seedSet = new Set(seeds.map((p) => (base + p).replace(/\/+$/, "")));
  const links = new Set<string>();
  for (const html of seedHtml) for (const l of extractSameHostLinks(html, base)) links.add(l);

  const ranked = [...links]
    .filter((l) => !seedSet.has(l.replace(/\/+$/, "")))
    .map((l) => [l, scoreProductLink(l)] as const)
    .filter(([, s]) => s > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([l]) => l);

  const productHtml = await Promise.all(ranked.map((l) => fetchHtml(l)));
  const productBlock = ranked
    .map((l, i) => {
      const t = htmlToText(productHtml[i]);
      return t ? `[PRODUKT ${l}]\n${t.slice(0, 4500)}` : "";
    })
    .filter(Boolean)
    .join("\n\n");

  console.log("[extract] product pages fetched", ranked.length);
  return `${seedText}\n\n${productBlock}`.slice(0, 45000);
}

export async function extractFabricsFromWebsite(opts: {
  name: string;
  website: string;
}): Promise<ExtractResult> {
  console.log("[extract] start", opts.website);
  const siteText = await fetchSiteText(opts.website);
  console.log("[extract] fetched text length", siteText.length);

  if (!siteText) {
    return { fabrics: [], notes: "Web sa nepodarilo stiahnuť (alebo je celý v JS/blokovaný)." };
  }

  const client = new Anthropic();
  const response: any = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 4000,
    output_config: { effort: "low" },
    system: SYSTEM,
    tools: [SAVE_TOOL],
    tool_choice: { type: "tool", name: "save_fabrics" },
    messages: [
      {
        role: "user",
        content: `Dodávateľ: ${opts.name}\nWeb: https://${opts.website}\n\nText stiahnutý z webu:\n${siteText}\n\nExtrahuj druhy látok a zavolaj save_fabrics.`,
      },
    ],
  } as any);

  const block = (response.content ?? []).find(
    (b: any) => b.type === "tool_use" && b.name === "save_fabrics"
  );
  const input = block?.input ?? {};
  const fabrics = Array.isArray(input.fabrics) ? input.fabrics : [];
  console.log("[extract] fabrics extracted", fabrics.length);
  return {
    fabrics,
    notes: typeof input.notes === "string" ? input.notes : "",
  };
}

// Mapuje extrahované látky na riadky do tabuľky `fabrics`.
export function mapFabricsToRows(supplierId: string, fabrics: ExtractedFabric[]) {
  return (Array.isArray(fabrics) ? fabrics : []).slice(0, 20).map((f) => ({
    supplier_id: supplierId,
    name: typeof f.name === "string" && f.name.trim() ? f.name.trim() : null,
    composition:
      typeof f.composition === "string" && f.composition.trim() ? f.composition.trim() : null,
    weight_gsm: Number.isFinite(f.weight_gsm as number) ? f.weight_gsm : null,
    width_cm: Number.isFinite(f.width_cm as number) ? f.width_cm : null,
    moq: Number.isFinite(f.moq as number) ? f.moq : null,
    moq_unit: f.moq_unit === "m" || f.moq_unit === "kg" ? f.moq_unit : null,
    material_type: (Array.isArray(f.material_type) ? f.material_type : []).filter((m) =>
      (MATERIAL_CODES as readonly string[]).includes(m)
    ),
    certifications: Array.isArray(f.certifications) ? f.certifications : [],
    colors: Array.isArray(f.colors) ? f.colors : [],
  }));
}

// Automatická extrakcia: raz na dodávateľa (gated cez fabrics_fetched_at). Tichá.
export async function autoExtractFabrics(supplierId: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { data: supplier } = await admin
    .from("suppliers")
    .select("id, name, website, fabrics_fetched_at")
    .eq("id", supplierId)
    .maybeSingle();

  if (!supplier) return;
  if (supplier.fabrics_fetched_at) return;

  const stamp = () =>
    admin
      .from("suppliers")
      .update({ fabrics_fetched_at: new Date().toISOString() })
      .eq("id", supplierId);

  if (!supplier.website) {
    await stamp();
    return;
  }

  try {
    const { fabrics } = await extractFabricsFromWebsite({
      name: supplier.name,
      website: supplier.website,
    });
    const rows = mapFabricsToRows(supplierId, fabrics);
    if (rows.length > 0) {
      await admin.from("fabrics").insert(rows);
    }
  } catch (e: any) {
    console.error("autoExtractFabrics failed", supplierId, e?.message ?? e);
  } finally {
    await stamp();
  }
}
