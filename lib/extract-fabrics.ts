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
  email: string | null;
  sustainability: boolean;
  siteCertifications: string[];
};

// Certifikáty, ktoré vieme rozpoznať priamo v texte webu (site-level).
const CERT_PATTERNS: [string, RegExp][] = [
  ["OEKO-TEX", /oeko[\s-]?tex/i],
  ["GOTS", /\bgots\b|global organic textile/i],
  ["GRS", /\bgrs\b|global recycled standard/i],
  ["RWS", /\brws\b|responsible wool/i],
  ["BCI", /\bbci\b|better cotton/i],
  ["FSC", /\bfsc\b|forest stewardship/i],
  ["Bluesign", /bluesign/i],
  ["REACH", /\breach\b/i],
  ["ISO 9001", /iso\s?9001/i],
  ["ISO 14001", /iso\s?14001/i],
];

// Slová naznačujúce, že web spomína udržateľnosť (SK/EN/IT).
const SUSTAINABILITY_HINTS = [
  "sustainab", "sostenibil", "eco-friendly", "ecofriendly", "eco friendly",
  "organic", "biologic", "recycl", "riciclat", "responsible", "responsabil",
  "circular", "circolar", "carbon neutral", "carbon-neutral", "ethical", "etico",
  "udržateľn", "eko-", "environment", "ambientale",
];

// Zistí zo stiahnutého textu, či web spomína udržateľnosť a aké certifikáty uvádza.
// Čistá regex analýza (bez LLM) — zadarmo.
export function detectSignals(text: string): { sustainability: boolean; certifications: string[] } {
  const lower = text.toLowerCase();
  const certifications = CERT_PATTERNS.filter(([, re]) => re.test(text)).map(([name]) => name);
  const sustainability =
    certifications.length > 0 || SUSTAINABILITY_HINTS.some((h) => lower.includes(h));
  return { sustainability, certifications };
}

// Nájde v texte webu pravdepodobný kontaktný email (uprednostní role adresy na doméne).
function extractEmail(text: string, website: string): string | null {
  const re = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
  const raw = text.match(re) ?? [];
  const found = [...new Set(raw.map((e) => e.toLowerCase()))].filter((e) => {
    if (/\.(png|jpe?g|gif|webp|svg|css|js)$/i.test(e)) return false;
    if (/(@2x|sentry|wixpress|example\.com|\.wix|godaddy|cloudflare)/i.test(e)) return false;
    return true;
  });
  if (found.length === 0) return null;
  const domain = website.replace(/^www\./, "");
  const roles = ["info@", "contact@", "commerciale@", "vendite@", "sales@", "hello@", "office@"];
  const sameDomain = found.filter((e) => e.endsWith("@" + domain) || e.includes(domain));
  const pool = sameDomain.length ? sameDomain : found;
  for (const r of roles) {
    const m = pool.find((e) => e.startsWith(r));
    if (m) return m;
  }
  return pool[0];
}

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
- composition (zloženie) vypĺňaj VŽDY, keď je v texte uvedené percentuálne/slovné zloženie — je to najdôležitejšie pole. Zachovaj originál (napr. "100% seta", "95% cotone 5% elastan").
- material_type ODVOĎ zo zloženia. Použi LEN tieto kódy a mapuj talianske/anglické názvy vlákien:
    cotone / cotton → cotton
    lino / linen → linen
    lana / wool / cashmere / mohair → wool
    seta / silk → silk
    viscosa / viscose / rayon / modal / cupro / lyocell / tencel → viscose
    poliestere / polyester → polyester
    elastan / elastane / spandex / lycra → elastane
  Ak je v zložení viac vlákien, daj do material_type všetky zodpovedajúce kódy.
- POZOR: raso/satin/satén, velluto, jersey, popeline, twill sú TYPY TKANIA, nie vlákna — z nich sám materiál neurčuj. Vlákno ber len zo zloženia.
- Ak vlákno nezodpovedá žiadnemu kódu (napr. nylon/poliammide, akryl, canapa) alebo zloženie nie je uvedené, nechaj material_type prázdne, ale composition aj tak zachyť, ak je.
- Nehádaj gramáž, MOQ ani certifikáty — ak údaj nie je uvedený, daj null / prázdne pole.
- Text môže byť v taliančine/angličtine — to je v poriadku.
- Zavolaj nástroj save_fabrics. Ak text neobsahuje info o látkach (napr. len kontakt), zavolaj save_fabrics s prázdnym poľom fabrics a vysvetlením v notes.`;

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

// Rýchle dotiahnutie kontaktného emailu z webu (bez LLM): homepage + kontaktné
// stránky + mailto odkazy. Vracia email alebo null.
export async function fetchContactEmail(website: string): Promise<string | null> {
  const base = `https://${website.replace(/\/+$/, "")}`;
  const paths = ["", "/contatti", "/contact", "/contacts", "/kontakt"];
  const htmls = await Promise.all(paths.map((p) => fetchHtml(base + p, 5000)));
  const mailtos = (htmls.join(" ").match(/mailto:([^"'?>\s]+)/gi) ?? []).map((m) =>
    m.replace(/mailto:/i, "")
  );
  const text = htmls.map((h) => htmlToText(h)).join(" ") + " " + mailtos.join(" ");
  return extractEmail(text, website);
}

// Rýchly sken sustainability + certifikátov z webu (bez LLM): homepage + typické
// stránky o firme/udržateľnosti/certifikáciách. Vracia signály pre backfill.
export async function scanSiteSignals(
  website: string
): Promise<{ sustainability: boolean; certifications: string[] }> {
  const base = `https://${website.replace(/\/+$/, "")}`;
  const paths = [
    "", "/sostenibilita", "/sustainability", "/about", "/chi-siamo",
    "/certificazioni", "/certifications", "/certificati", "/qualita", "/azienda",
  ];
  const htmls = await Promise.all(paths.map((p) => fetchHtml(base + p, 5000)));
  const text = htmls.map((h) => htmlToText(h)).join(" ");
  return detectSignals(text);
}

export async function extractFabricsFromWebsite(
  opts: {
    name: string;
    website: string;
  },
  model: string = "claude-opus-4-8"
): Promise<ExtractResult> {
  console.log("[extract] start", opts.website, "model", model);
  const siteText = await fetchSiteText(opts.website);
  console.log("[extract] fetched text length", siteText.length);

  if (!siteText) {
    return {
      fabrics: [],
      notes: "Web sa nepodarilo stiahnuť (alebo je celý v JS/blokovaný).",
      email: null,
      sustainability: false,
      siteCertifications: [],
    };
  }

  const email = extractEmail(siteText, opts.website);
  const signals = detectSignals(siteText);

  const client = new Anthropic();
  const params: any = {
    model,
    max_tokens: 4000,
    system: SYSTEM,
    tools: [SAVE_TOOL],
    tool_choice: { type: "tool", name: "save_fabrics" },
    messages: [
      {
        role: "user",
        content: `Dodávateľ: ${opts.name}\nWeb: https://${opts.website}\n\nText stiahnutý z webu:\n${siteText}\n\nExtrahuj druhy látok a zavolaj save_fabrics.`,
      },
    ],
  };
  // effort podporujú len Opus/Sonnet 4.6+, nie Haiku — pridaj len pre Opus.
  if (model.startsWith("claude-opus")) {
    params.output_config = { effort: "low" };
  }
  const response: any = await client.messages.create(params);

  const block = (response.content ?? []).find(
    (b: any) => b.type === "tool_use" && b.name === "save_fabrics"
  );
  const input = block?.input ?? {};
  const fabrics = Array.isArray(input.fabrics) ? input.fabrics : [];
  console.log("[extract] fabrics extracted", fabrics.length, "email", email ?? "-");
  return {
    fabrics,
    notes: typeof input.notes === "string" ? input.notes : "",
    email,
    sustainability: signals.sustainability,
    siteCertifications: signals.certifications,
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
export async function autoExtractFabrics(
  supplierId: string,
  model: string = "claude-opus-4-8"
): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { data: supplier } = await admin
    .from("suppliers")
    .select("id, name, website, email, fabrics_fetched_at")
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
    const { fabrics, email, sustainability, siteCertifications } = await extractFabricsFromWebsite(
      {
        name: supplier.name,
        website: supplier.website,
      },
      model
    );
    const rows = mapFabricsToRows(supplierId, fabrics);
    if (rows.length > 0) {
      await admin.from("fabrics").insert(rows);
    }
    // Zapíš signály (sustainability/certifikáty z webu) + prípadne chýbajúci email.
    const patch: any = {
      sustainability,
      site_certifications: siteCertifications,
      signals_scanned_at: new Date().toISOString(),
    };
    if (email && !supplier.email) patch.email = email;
    await admin.from("suppliers").update(patch).eq("id", supplierId);
  } catch (e: any) {
    console.error("autoExtractFabrics failed", supplierId, e?.message ?? e);
  } finally {
    await stamp();
  }
}
