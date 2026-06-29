import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { autoExtractFabrics } from "@/lib/extract-fabrics";
import { scheduleBackground } from "@/lib/background";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";
// Publikovanie spúšťa AI extrakciu látok na pozadí — daj funkcii čas dobehnúť.
export const maxDuration = 60;

async function setStatus(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  if (!id || !["published", "rejected", "new"].includes(status)) return;

  // Over prihláseného usera (RLS hrá obrannú rolu, ale tu primárne autorizujeme).
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const admin = createSupabaseAdminClient();
  await admin.from("suppliers").update({ status }).eq("id", id);

  // Pri publikovaní automaticky dotiahni látky z webu (na pozadí, neblokuje odpoveď).
  if (status === "published") {
    scheduleBackground(autoExtractFabrics(id));
  }

  revalidatePath("/admin");
  revalidatePath("/");
}

// Hromadne dotiahne látky pre dávku dodávateľov s webom, ktorí ešte neboli spracovaní.
// Beží paralelne (max 3 naraz), aby sa zmestil do limitu funkcie.
async function bulkExtract() {
  "use server";
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const admin = createSupabaseAdminClient();
  const { data: batch } = await admin
    .from("suppliers")
    .select("id")
    .not("website", "is", null)
    .is("fabrics_fetched_at", null)
    .limit(3);

  const ids = (batch ?? []).map((s) => s.id);
  await Promise.all(ids.map((id) => autoExtractFabrics(id)));

  const { count } = await admin
    .from("suppliers")
    .select("id", { count: "exact", head: true })
    .not("website", "is", null)
    .is("fabrics_fetched_at", null);

  revalidatePath("/admin");
  revalidatePath("/");
  redirect(`/admin?bulk=${ids.length}&left=${count ?? 0}`);
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: { q?: string; onlyWeb?: string; material?: string; cert?: string; bulk?: string; left?: string };
}) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const q = (searchParams.q ?? "").trim();
  const onlyWeb = searchParams.onlyWeb === "1";
  const material = (searchParams.material ?? "").trim();
  const cert = (searchParams.cert ?? "").trim();

  // Service-role výber: na admin stránke chceme vidieť aj 'new' a 'rejected'.
  // Naťahujeme aj látky, aby sme vedeli filtrovať podľa materiálu/certifikátu (v JS).
  const admin = createSupabaseAdminClient();
  let query = admin
    .from("suppliers")
    .select(
      "id, name, website, country, city, source, source_url, status, created_at, raw, fabrics(material_type, certifications)"
    )
    .order("created_at", { ascending: false })
    .limit(300);

  if (q) query = query.ilike("name", `%${q}%`);
  if (onlyWeb || material || cert) query = query.not("website", "is", null);

  const { data: rawRows } = await query;

  // Filter podľa materiálu / certifikátu — robustne v JS nad naťahanými látkami.
  let rows = rawRows ?? [];
  if (material) {
    rows = rows.filter((s: any) =>
      (s.fabrics ?? []).some((f: any) => (f.material_type ?? []).includes(material))
    );
  }
  if (cert) {
    rows = rows.filter((s: any) =>
      (s.fabrics ?? []).some((f: any) => (f.certifications ?? []).includes(cert))
    );
  }

  const groups = {
    new: rows.filter((s: any) => s.status === "new"),
    published: rows.filter((s: any) => s.status === "published"),
    rejected: rows.filter((s: any) => s.status === "rejected"),
  };

  const anyFilter = !!(q || onlyWeb || material || cert);
  const bulkDone = searchParams.bulk;
  const bulkLeft = searchParams.left;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Review fronta</h1>
        <span className="text-sm text-neutral-600">{user.email}</span>
      </header>

      {bulkDone !== undefined && (
        <div className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          Dotiahnuté látky pre {bulkDone} dodávateľov. Zostáva nespracovaných s webom: {bulkLeft ?? "?"}.
          {Number(bulkLeft) > 0 && " Klikni „Dotiahnuť ďalšiu dávku" znova."}
        </div>
      )}

      <form method="get" className="flex flex-wrap items-center gap-2 rounded border bg-white p-3">
        <input
          name="q"
          defaultValue={q}
          placeholder="Názov dodávateľa…"
          className="min-w-[180px] flex-1 rounded border px-3 py-2 text-sm"
        />
        <select name="material" defaultValue={material} className="rounded border px-3 py-2 text-sm">
          <option value="">Materiál: všetky</option>
          <option value="silk">Hodváb</option>
          <option value="cotton">Bavlna</option>
          <option value="linen">Ľan</option>
          <option value="wool">Vlna</option>
          <option value="viscose">Viskóza</option>
          <option value="polyester">Polyester</option>
        </select>
        <select name="cert" defaultValue={cert} className="rounded border px-3 py-2 text-sm">
          <option value="">Certifikát: všetky</option>
          <option value="OEKO-TEX">OEKO-TEX</option>
          <option value="GOTS">GOTS</option>
          <option value="GRS">GRS</option>
        </select>
        <label className="flex items-center gap-1 text-sm text-neutral-700">
          <input type="checkbox" name="onlyWeb" value="1" defaultChecked={onlyWeb} />
          len s webom
        </label>
        <button type="submit" className="rounded bg-neutral-900 px-4 py-2 text-sm text-white">
          Filtrovať
        </button>
        {anyFilter && (
          <Link href="/admin" className="rounded border px-3 py-2 text-sm hover:bg-neutral-50">
            Zrušiť
          </Link>
        )}
      </form>

      <div className="flex flex-wrap items-center gap-2 rounded border border-indigo-200 bg-indigo-50 p-3 text-sm">
        <span className="text-indigo-900">
          Filter podľa materiálu/certifikátu funguje len pre dodávateľov s dotiahnutými látkami. Dotiahni ich hromadne:
        </span>
        <form action={bulkExtract}>
          <button className="rounded bg-indigo-600 px-3 py-1 text-xs text-white">
            Dotiahnuť ďalšiu dávku (3)
          </button>
        </form>
      </div>

      {(material || cert) && rows.length === 0 && (
        <p className="text-sm text-neutral-600">
          Žiadny dodávateľ s dotiahnutými látkami nevyhovuje filtru. Najprv dotiahni látky (tlačidlo vyššie).
        </p>
      )}

      <Section title={`Na schválenie (${groups.new.length})`} rows={groups.new} action={setStatus} />
      <Section title={`Publikované (${groups.published.length})`} rows={groups.published} action={setStatus} />
      <Section title={`Zamietnuté (${groups.rejected.length})`} rows={groups.rejected} action={setStatus} />
    </div>
  );
}

function Section({
  title,
  rows,
  action,
}: {
  title: string;
  rows: any[];
  action: (formData: FormData) => Promise<void>;
}) {
  if (rows.length === 0) return null;
  return (
    <section className="rounded border bg-white">
      <h2 className="border-b px-4 py-2 font-medium">{title}</h2>
      <ul className="divide-y">
        {rows.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <Link href={`/admin/supplier/${s.id}`} className="font-medium hover:underline">
                {s.name}
              </Link>
              {s.raw?.categoryName && (
                <CategoryBadge category={s.raw.categoryName} />
              )}
              <div className="text-xs text-neutral-500">
                {[s.city, s.country, s.website].filter(Boolean).join(" · ")} · zdroj: {s.source ?? "—"}
              </div>
              <FabricSummary fabrics={s.fabrics} />
            </div>
            <div className="flex gap-2">
              <Link
                href={`/admin/supplier/${s.id}`}
                className="rounded border px-3 py-1 text-xs hover:bg-neutral-50"
              >
                Detail / látky
              </Link>
              {s.status !== "published" && (
                <form action={action}>
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="status" value="published" />
                  <button className="rounded bg-emerald-600 px-3 py-1 text-xs text-white">Publikovať</button>
                </form>
              )}
              {s.status !== "rejected" && (
                <form action={action}>
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="status" value="rejected" />
                  <button className="rounded bg-neutral-200 px-3 py-1 text-xs">Zamietnuť</button>
                </form>
              )}
              {s.source_url && (
                <a
                  href={s.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded border px-3 py-1 text-xs"
                >
                  Zdroj
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

const MATERIAL_LABELS: Record<string, string> = {
  cotton: "bavlna",
  linen: "ľan",
  wool: "vlna",
  silk: "hodváb",
  viscose: "viskóza",
  polyester: "polyester",
  elastane: "elastan",
};

// Zhrnutie dotiahnutých látok: zoznam materiálov + certifikátov (pre rýchly shortlist).
function FabricSummary({ fabrics }: { fabrics?: any[] }) {
  if (!Array.isArray(fabrics) || fabrics.length === 0) return null;
  const materials = new Set<string>();
  const certs = new Set<string>();
  for (const f of fabrics) {
    for (const m of f.material_type ?? []) materials.add(MATERIAL_LABELS[m] ?? m);
    for (const c of f.certifications ?? []) certs.add(c);
  }
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-600">
        {fabrics.length} látok
      </span>
      {[...materials].map((m) => (
        <span key={m} className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] text-sky-800">
          {m}
        </span>
      ))}
      {[...certs].map((c) => (
        <span key={c} className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-800">
          {c}
        </span>
      ))}
    </div>
  );
}

const WHOLESALE_HINTS = [
  "ingrosso", "produzione", "manifattura", "lanificio", "tessitura",
  "fornitore", "industria", "fabbrica", "wholesale", "manufacturer",
  "supplier", "mill", "veľkoobchod", "výroba", "výrobca",
];

const RETAIL_HINTS = [
  "negozio", "boutique", "abbigliamento", "store", "shop",
  "predajňa", "obchod",
];

function CategoryBadge({ category }: { category: string }) {
  const lower = category.toLowerCase();
  const isWholesale = WHOLESALE_HINTS.some((w) => lower.includes(w));
  const isRetail = RETAIL_HINTS.some((w) => lower.includes(w));
  const className =
    isWholesale && !isRetail
      ? "bg-emerald-100 text-emerald-800"
      : isRetail
      ? "bg-red-100 text-red-800"
      : "bg-neutral-200 text-neutral-700";
  return (
    <span className={`ml-2 inline-block rounded px-1.5 py-0.5 text-[10px] ${className}`}>
      {category}
    </span>
  );
}
