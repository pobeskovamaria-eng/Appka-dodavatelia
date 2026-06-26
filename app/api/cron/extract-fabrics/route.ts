import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { autoExtractFabrics } from "@/lib/extract-fabrics";

// Backfill: pre publikovaných dodávateľov bez pokusu o extrakciu dotiahne látky.
// Spúšťa Vercel Cron (Authorization: Bearer CRON_SECRET) alebo manuálne cez ?secret=.
// Spracuje len malú dávku za beh, aby sa zmestil do limitu funkcie a šetril API kredit.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BATCH = 2;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  const qsecret = new URL(request.url).searchParams.get("secret");

  if (!secret || (auth !== `Bearer ${secret}` && qsecret !== secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("suppliers")
    .select("id")
    .eq("status", "published")
    .is("fabrics_fetched_at", null)
    .not("website", "is", null)
    .limit(BATCH);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let processed = 0;
  for (const s of data ?? []) {
    await autoExtractFabrics(s.id);
    processed++;
  }

  return NextResponse.json({ ok: true, processed, remaining_in_batch: (data ?? []).length });
}
