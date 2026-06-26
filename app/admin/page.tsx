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

export default async function AdminPage() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  // Service-role výber: na admin stránke chceme vidieť aj 'new' a 'rejected'.
  const admin = createSupabaseAdminClient();
  const { data: pending } = await admin
    .from("suppliers")
    .select("id, name, website, country, city, source, source_url, status, created_at, raw")
    .order("created_at", { ascending: false })
    .limit(200);

  const groups = {
    new: (pending ?? []).filter((s) => s.status === "new"),
    published: (pending ?? []).filter((s) => s.status === "published"),
    rejected: (pending ?? []).filter((s) => s.status === "rejected"),
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Review fronta</h1>
        <span className="text-sm text-neutral-600">{user.email}</span>
      </header>

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
