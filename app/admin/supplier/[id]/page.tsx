import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { extractFabricsFromWebsite, MATERIAL_CODES } from "@/lib/extract-fabrics";

export const dynamic = "force-dynamic";
// Extrakcia cez web_fetch + Claude môže trvať dlhšie — daj serverless funkcii viac času.
export const maxDuration = 60;

// ---------- Server actions ----------

async function requireAdmin() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  return user;
}

function parseCsv(value: FormDataEntryValue | null): string[] {
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseIntOrNull(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

function parseStringOrNull(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const s = value.trim();
  return s.length > 0 ? s : null;
}

async function addFabric(formData: FormData) {
  "use server";
  await requireAdmin();
  const supplierId = String(formData.get("supplier_id"));
  if (!supplierId) return;

  const moqUnitRaw = parseStringOrNull(formData.get("moq_unit"));
  const moq_unit = moqUnitRaw === "m" || moqUnitRaw === "kg" ? moqUnitRaw : null;

  const admin = createSupabaseAdminClient();
  await admin.from("fabrics").insert({
    supplier_id: supplierId,
    name: parseStringOrNull(formData.get("name")),
    composition: parseStringOrNull(formData.get("composition")),
    weight_gsm: parseIntOrNull(formData.get("weight_gsm")),
    width_cm: parseIntOrNull(formData.get("width_cm")),
    moq: parseIntOrNull(formData.get("moq")),
    moq_unit,
    material_type: formData.getAll("material_type").map(String).filter(Boolean),
    certifications: formData.getAll("certifications").map(String).filter(Boolean),
    colors: parseCsv(formData.get("colors")),
  });

  revalidatePath(`/admin/supplier/${supplierId}`);
}

async function updateFabric(formData: FormData) {
  "use server";
  await requireAdmin();
  const id = String(formData.get("id"));
  const supplierId = String(formData.get("supplier_id"));
  if (!id || !supplierId) return;

  const moqUnitRaw = parseStringOrNull(formData.get("moq_unit"));
  const moq_unit = moqUnitRaw === "m" || moqUnitRaw === "kg" ? moqUnitRaw : null;

  const admin = createSupabaseAdminClient();
  await admin
    .from("fabrics")
    .update({
      name: parseStringOrNull(formData.get("name")),
      composition: parseStringOrNull(formData.get("composition")),
      weight_gsm: parseIntOrNull(formData.get("weight_gsm")),
      width_cm: parseIntOrNull(formData.get("width_cm")),
      moq: parseIntOrNull(formData.get("moq")),
      moq_unit,
      material_type: formData.getAll("material_type").map(String).filter(Boolean),
      certifications: formData.getAll("certifications").map(String).filter(Boolean),
      colors: parseCsv(formData.get("colors")),
    })
    .eq("id", id);

  revalidatePath(`/admin/supplier/${supplierId}`);
}

async function deleteFabric(formData: FormData) {
  "use server";
  await requireAdmin();
  const id = String(formData.get("id"));
  const supplierId = String(formData.get("supplier_id"));
  if (!id || !supplierId) return;

  const admin = createSupabaseAdminClient();
  await admin.from("fabrics").delete().eq("id", id);
  revalidatePath(`/admin/supplier/${supplierId}`);
}

async function setSupplierStatus(formData: FormData) {
  "use server";
  await requireAdmin();
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  if (!id || !["new", "published", "rejected"].includes(status)) return;

  const admin = createSupabaseAdminClient();
  await admin.from("suppliers").update({ status }).eq("id", id);
  revalidatePath(`/admin/supplier/${id}`);
  revalidatePath("/admin");
}

// Automaticky doplní látky z webu dodávateľa cez Claude (web_fetch + extrakcia).
async function autofillFabrics(formData: FormData) {
  "use server";
  await requireAdmin();
  const supplierId = String(formData.get("supplier_id"));
  if (!supplierId) return;

  const admin = createSupabaseAdminClient();
  const { data: supplier } = await admin
    .from("suppliers")
    .select("id, name, website")
    .eq("id", supplierId)
    .maybeSingle();

  if (!supplier?.website) {
    redirect(`/admin/supplier/${supplierId}?ai=nodomain`);
  }

  let outcome = "ok";
  let added = 0;
  try {
    const { fabrics } = await extractFabricsFromWebsite({
      name: supplier.name,
      website: supplier.website,
    });

    const rows = fabrics.slice(0, 20).map((f) => ({
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

    if (rows.length > 0) {
      const { error } = await admin.from("fabrics").insert(rows);
      if (error) throw error;
    }
    added = rows.length;
    if (added === 0) outcome = "empty";
  } catch (e: any) {
    console.error("autofill fabrics failed", e?.message ?? e);
    outcome = "error";
  }

  revalidatePath(`/admin/supplier/${supplierId}`);
  redirect(`/admin/supplier/${supplierId}?ai=${outcome}&n=${added}`);
}

// ---------- Page ----------

export default async function AdminSupplierDetail({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { ai?: string; n?: string };
}) {
  await requireAdmin();
  const admin = createSupabaseAdminClient();

  const [{ data: supplier }, { data: fabrics }, { data: materials }] = await Promise.all([
    admin.from("suppliers").select("*").eq("id", params.id).maybeSingle(),
    admin.from("fabrics").select("*").eq("supplier_id", params.id).order("created_at"),
    admin.from("material_types").select("code, label").order("label"),
  ]);

  if (!supplier) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/admin" className="text-sm text-neutral-600 hover:underline">
          ← Späť na frontu
        </Link>
        <StatusBadge status={supplier.status} />
      </div>

      <AiBanner ai={searchParams.ai} n={searchParams.n} />

      <header className="rounded border bg-white p-4">
        <h1 className="text-2xl font-semibold">{supplier.name}</h1>
        <p className="mt-1 text-sm text-neutral-600">
          {[supplier.city, supplier.country, supplier.website].filter(Boolean).join(" · ")}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {supplier.status !== "published" && (
            <form action={setSupplierStatus}>
              <input type="hidden" name="id" value={supplier.id} />
              <input type="hidden" name="status" value="published" />
              <button className="rounded bg-emerald-600 px-3 py-1 text-xs text-white">Publikovať</button>
            </form>
          )}
          {supplier.status !== "rejected" && (
            <form action={setSupplierStatus}>
              <input type="hidden" name="id" value={supplier.id} />
              <input type="hidden" name="status" value="rejected" />
              <button className="rounded bg-neutral-200 px-3 py-1 text-xs">Zamietnuť</button>
            </form>
          )}
          {supplier.website && (
            <form action={autofillFabrics}>
              <input type="hidden" name="supplier_id" value={supplier.id} />
              <button className="rounded bg-indigo-600 px-3 py-1 text-xs text-white">
                Doplniť látky z webu (AI)
              </button>
            </form>
          )}
          {supplier.source_url && (
            <a href={supplier.source_url} target="_blank" rel="noreferrer" className="rounded border px-3 py-1 text-xs">
              Zdroj
            </a>
          )}
        </div>
        {supplier.website && (
          <p className="mt-2 text-xs text-neutral-500">
            AI načíta {supplier.website} a pokúsi sa vyplniť materiály, gramáž, MOQ a certifikáty. Vždy skontroluj výsledok.
          </p>
        )}
      </header>

      <section className="rounded border bg-white p-4">
        <h2 className="mb-3 font-medium">Pridať látku</h2>
        <FabricForm
          action={addFabric}
          supplierId={supplier.id}
          materials={materials ?? []}
          submitLabel="Pridať"
        />
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Existujúce látky ({fabrics?.length ?? 0})</h2>
        {(fabrics ?? []).length === 0 && (
          <p className="text-sm text-neutral-600">Zatiaľ žiadne. Pridaj prvú vyššie.</p>
        )}
        {(fabrics ?? []).map((f) => (
          <div key={f.id} className="rounded border bg-white p-4">
            <FabricForm
              action={updateFabric}
              supplierId={supplier.id}
              materials={materials ?? []}
              fabric={f}
              submitLabel="Uložiť zmeny"
            />
            <form action={deleteFabric} className="mt-3 border-t pt-3">
              <input type="hidden" name="id" value={f.id} />
              <input type="hidden" name="supplier_id" value={supplier.id} />
              <button className="text-xs text-red-600 hover:underline">Zmazať túto látku</button>
            </form>
          </div>
        ))}
      </section>
    </div>
  );
}

// ---------- Helpers ----------

function AiBanner({ ai, n }: { ai?: string; n?: string }) {
  if (!ai) return null;
  const map: Record<string, { cls: string; msg: string }> = {
    ok: {
      cls: "border-emerald-200 bg-emerald-50 text-emerald-800",
      msg: `AI doplnila ${n ?? 0} látok. Skontroluj a uprav ich nižšie.`,
    },
    empty: {
      cls: "border-amber-200 bg-amber-50 text-amber-800",
      msg: "AI na webe nenašla použiteľné informácie o látkach. Doplň ich ručne.",
    },
    nodomain: {
      cls: "border-amber-200 bg-amber-50 text-amber-800",
      msg: "Dodávateľ nemá vyplnený web, AI nemá z čoho čerpať.",
    },
    error: {
      cls: "border-red-200 bg-red-50 text-red-700",
      msg: "Extrakcia zlyhala. Skontroluj, či je nastavený ANTHROPIC_API_KEY, a skús znova.",
    },
  };
  const entry = map[ai];
  if (!entry) return null;
  return <div className={`rounded border p-3 text-sm ${entry.cls}`}>{entry.msg}</div>;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    new: "bg-amber-100 text-amber-800",
    published: "bg-emerald-100 text-emerald-800",
    rejected: "bg-neutral-200 text-neutral-700",
  };
  const labels: Record<string, string> = {
    new: "Na schválenie",
    published: "Publikované",
    rejected: "Zamietnuté",
  };
  return (
    <span className={`rounded px-2 py-1 text-xs ${colors[status] ?? ""}`}>
      {labels[status] ?? status}
    </span>
  );
}

type Fabric = {
  id: string;
  name: string | null;
  material_type: string[];
  composition: string | null;
  weight_gsm: number | null;
  width_cm: number | null;
  moq: number | null;
  moq_unit: string | null;
  certifications: string[];
  colors: string[];
};

const CERTS = ["OEKO-TEX", "GOTS", "GRS", "BCI", "RWS"];

function FabricForm({
  action,
  supplierId,
  materials,
  fabric,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  supplierId: string;
  materials: { code: string; label: string }[];
  fabric?: Fabric;
  submitLabel: string;
}) {
  return (
    <form action={action} className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <input type="hidden" name="supplier_id" value={supplierId} />
      {fabric && <input type="hidden" name="id" value={fabric.id} />}

      <label className="text-sm md:col-span-2">
        <span className="block text-neutral-600">Názov / kolekcia</span>
        <input
          name="name"
          defaultValue={fabric?.name ?? ""}
          className="mt-1 w-full rounded border px-3 py-2"
          placeholder="napr. Bavlnený popelín 140g"
        />
      </label>

      <label className="text-sm md:col-span-2">
        <span className="block text-neutral-600">Zloženie (free text)</span>
        <input
          name="composition"
          defaultValue={fabric?.composition ?? ""}
          className="mt-1 w-full rounded border px-3 py-2"
          placeholder="napr. 95% bavlna, 5% elastan"
        />
      </label>

      <label className="text-sm">
        <span className="block text-neutral-600">Gramáž (g/m²)</span>
        <input
          name="weight_gsm"
          type="number"
          min="0"
          defaultValue={fabric?.weight_gsm ?? ""}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </label>

      <label className="text-sm">
        <span className="block text-neutral-600">Šírka (cm)</span>
        <input
          name="width_cm"
          type="number"
          min="0"
          defaultValue={fabric?.width_cm ?? ""}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </label>

      <label className="text-sm">
        <span className="block text-neutral-600">MOQ</span>
        <input
          name="moq"
          type="number"
          min="0"
          defaultValue={fabric?.moq ?? ""}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </label>

      <label className="text-sm">
        <span className="block text-neutral-600">MOQ jednotka</span>
        <select name="moq_unit" defaultValue={fabric?.moq_unit ?? ""} className="mt-1 w-full rounded border px-3 py-2">
          <option value="">—</option>
          <option value="m">m</option>
          <option value="kg">kg</option>
        </select>
      </label>

      <fieldset className="text-sm md:col-span-2">
        <legend className="block text-neutral-600">Materiál</legend>
        <div className="mt-1 flex flex-wrap gap-3">
          {materials.map((m) => (
            <label key={m.code} className="inline-flex items-center gap-1">
              <input
                type="checkbox"
                name="material_type"
                value={m.code}
                defaultChecked={fabric?.material_type?.includes(m.code) ?? false}
              />
              <span>{m.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="text-sm md:col-span-2">
        <legend className="block text-neutral-600">Certifikáty</legend>
        <div className="mt-1 flex flex-wrap gap-3">
          {CERTS.map((c) => (
            <label key={c} className="inline-flex items-center gap-1">
              <input
                type="checkbox"
                name="certifications"
                value={c}
                defaultChecked={fabric?.certifications?.includes(c) ?? false}
              />
              <span>{c}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="text-sm md:col-span-2">
        <span className="block text-neutral-600">Farby (oddelené čiarkami)</span>
        <input
          name="colors"
          defaultValue={fabric?.colors?.join(", ") ?? ""}
          className="mt-1 w-full rounded border px-3 py-2"
          placeholder="biela, čierna, navy"
        />
      </label>

      <div className="md:col-span-2">
        <button className="rounded bg-neutral-900 px-4 py-2 text-sm text-white">{submitLabel}</button>
      </div>
    </form>
  );
}
