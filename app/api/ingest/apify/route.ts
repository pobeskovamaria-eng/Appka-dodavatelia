import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { normalizeSupplier, type RawSupplier } from "@/lib/normalize";

// Apify webhook payload: { resource: { defaultDatasetId, ... }, eventType, ... }
// Konfigurácia v Apify: Webhooks → URL = https://<domena>/api/ingest/apify?secret=<APIFY_WEBHOOK_SECRET>

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const url = new URL(request.url);
  const providedSecret = url.searchParams.get("secret");
  const expectedSecret = process.env.APIFY_WEBHOOK_SECRET;
  if (!expectedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const apifyToken = process.env.APIFY_TOKEN;
  if (!apifyToken) {
    return NextResponse.json({ error: "APIFY_TOKEN missing" }, { status: 500 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const datasetId: string | undefined =
    body?.resource?.defaultDatasetId ??
    body?.defaultDatasetId ??
    body?.datasetId;

  const sourceTag: string =
    typeof body?.source === "string" ? body.source : "apify_gmaps";

  if (!datasetId) {
    return NextResponse.json({ error: "datasetId missing in payload" }, { status: 400 });
  }

  // 1) Stiahni dataset z Apify
  const datasetRes = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?clean=true&format=json&token=${apifyToken}`,
    { cache: "no-store" }
  );
  if (!datasetRes.ok) {
    return NextResponse.json(
      { error: "apify dataset fetch failed", status: datasetRes.status },
      { status: 502 }
    );
  }
  const items = (await datasetRes.json()) as RawSupplier[];

  // 2) Normalizuj
  const normalized = items
    .map((it) => normalizeSupplier(it, sourceTag))
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (normalized.length === 0) {
    return NextResponse.json({ ok: true, received: items.length, inserted: 0 });
  }

  // 3) Dedup + upsert — primárny kľúč pre dedup je `website` (jedinečný index).
  //    Záznamy bez webu necháme prejsť ako insert; dedup zvládne admin pri review.
  const admin = createSupabaseAdminClient();

  const withWebsite = normalized.filter((n) => n.website);
  const withoutWebsite = normalized.filter((n) => !n.website);

  let upserted = 0;
  if (withWebsite.length > 0) {
    const { data, error } = await admin
      .from("suppliers")
      .upsert(withWebsite, { onConflict: "website", ignoreDuplicates: false })
      .select("id");
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    upserted += data?.length ?? 0;
  }

  let inserted = 0;
  if (withoutWebsite.length > 0) {
    const { data, error } = await admin
      .from("suppliers")
      .insert(withoutWebsite)
      .select("id");
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    inserted += data?.length ?? 0;
  }

  return NextResponse.json({
    ok: true,
    received: items.length,
    normalized: normalized.length,
    upserted,
    inserted,
  });
}
