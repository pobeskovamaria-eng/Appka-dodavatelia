import Anthropic from "@anthropic-ai/sdk";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Automatická extrakcia detailov látok z webu dodávateľa pomocou Claude.
// Claude načíta web (web_fetch), prejde produktové/látkové podstránky a vráti
// štruktúrované dáta cez nástroj `save_fabrics`. Beží LEN server-side.

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
    "Ulož extrahované druhy látok dodávateľa do katalógu. Zavolaj presne raz, keď máš dáta z webu pozbierané. Ak web nemá použiteľné informácie o látkach, zavolaj s prázdnym poľom fabrics.",
  input_schema: {
    type: "object",
    properties: {
      fabrics: {
        type: "array",
        description: "Zoznam reprezentatívnych druhov látok (max ~10).",
        items: {
          type: "object",
          properties: {
            name: {
              type: ["string", "null"],
              description: "Názov kolekcie alebo typu látky, napr. 'Hodvábny šifón'.",
            },
            material_type: {
              type: "array",
              description: "Kódy materiálov. Použi LEN tieto kódy.",
              items: { type: "string", enum: MATERIAL_CODES },
            },
            composition: {
              type: ["string", "null"],
              description: "Zloženie ako text, napr. '100% hodváb' alebo '95% bavlna, 5% elastan'.",
            },
            weight_gsm: { type: ["integer", "null"], description: "Gramáž v g/m²." },
            width_cm: { type: ["integer", "null"], description: "Šírka v cm." },
            moq: { type: ["integer", "null"], description: "Minimálny odber." },
            moq_unit: { type: ["string", "null"], enum: ["m", "kg", null] },
            certifications: {
              type: "array",
              description: "Certifikáty, napr. 'OEKO-TEX', 'GOTS', 'GRS'.",
              items: { type: "string" },
            },
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
      notes: {
        type: "string",
        description: "Krátka poznámka pre admina (čo sa našlo / nenašlo).",
      },
    },
    required: ["fabrics", "notes"],
    additionalProperties: false,
  },
};

const SYSTEM = `Si asistent pre katalóg dodávateľov textilu. Tvojou úlohou je z webu dodávateľa zistiť, aké druhy látok ponúka, a vrátiť štruktúrované dáta.

Pravidlá:
- Načítaj domovskú stránku cez web_fetch a podľa potreby prejdi na podstránky o produktoch / kolekciách / látkach (napr. "fabrics", "tessuti", "collezioni", "products", "prodotti").
- Extrahuj REPREZENTATÍVNE druhy látok (max ~10), nie každý jednotlivý produkt.
- material_type vyplň LEN kódmi: cotton, linen, wool, silk, viscose, polyester, elastane. Ak materiál nezodpovedá žiadnemu kódu, nechaj material_type prázdne, ale zloženie zachyť v composition.
- Vypĺňaj len to, čo na webe naozaj nájdeš. Nehádaj gramáž, MOQ ani certifikáty — ak údaj nie je uvedený, daj null / prázdne pole.
- Keď máš dáta pozbierané, zavolaj nástroj save_fabrics. Ak web neobsahuje informácie o látkach, zavolaj save_fabrics s prázdnym poľom fabrics a vysvetlením v notes.`;

export async function extractFabricsFromWebsite(opts: {
  name: string;
  website: string; // čistá doména, napr. "vimercatitessuti.com"
}): Promise<ExtractResult> {
  const client = new Anthropic();
  const url = `https://${opts.website}`;

  const tools: any[] = [
    {
      type: "web_fetch_20260209",
      name: "web_fetch",
      max_uses: 6,
      allowed_domains: [opts.website],
      max_content_tokens: 60000,
    },
    SAVE_TOOL,
  ];

  const messages: any[] = [
    {
      role: "user",
      content: `Dodávateľ: ${opts.name}\nWeb: ${url}\n\nNačítaj jeho web a zisti, aké druhy látok ponúka. Potom zavolaj save_fabrics.`,
    },
  ];

  for (let iteration = 0; iteration < 8; iteration++) {
    const response: any = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 8000,
      output_config: { effort: "low" },
      system: SYSTEM,
      tools,
      messages,
    } as any);

    const saveBlock = (response.content ?? []).find(
      (b: any) => b.type === "tool_use" && b.name === "save_fabrics"
    );
    if (saveBlock) {
      const input = saveBlock.input ?? {};
      return {
        fabrics: Array.isArray(input.fabrics) ? input.fabrics : [],
        notes: typeof input.notes === "string" ? input.notes : "",
      };
    }

    // pause_turn: server tool (web_fetch) ešte beží — pošli späť a pokračuj.
    // tool_use bez save_fabrics: nemalo by nastať (web_fetch je server-side), ale pre istotu loopujeme.
    if (response.stop_reason === "pause_turn" || response.stop_reason === "tool_use") {
      messages.push({ role: "assistant", content: response.content });
      continue;
    }

    // end_turn alebo iné — model nezavolal save_fabrics.
    break;
  }

  return { fabrics: [], notes: "Model nevrátil žiadne látky." };
}

// Mapuje extrahované látky na riadky do tabuľky `fabrics` (validuje materiály a jednotky).
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

// Automatická extrakcia: spustí sa raz na dodávateľa (gated cez fabrics_fetched_at).
// Volá sa na pozadí pri publikovaní a z cron backfillu. Tichý — chyby len loguje.
export async function autoExtractFabrics(supplierId: string): Promise<void> {
  const admin = createSupabaseAdminClient();

  const { data: supplier } = await admin
    .from("suppliers")
    .select("id, name, website, fabrics_fetched_at")
    .eq("id", supplierId)
    .maybeSingle();

  if (!supplier) return;
  if (supplier.fabrics_fetched_at) return; // už sme to skúšali

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
