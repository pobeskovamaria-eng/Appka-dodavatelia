import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SupplierDetail({ params }: { params: { slug: string } }) {
  const supabase = createSupabaseServerClient();

  const { data: supplier } = await supabase
    .from("suppliers")
    .select("*, fabrics(*)")
    .eq("slug", params.slug)
    .eq("status", "published")
    .maybeSingle();

  if (!supplier) notFound();

  return (
    <article className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{supplier.name}</h1>
        <p className="text-sm text-neutral-600">
          {[supplier.city, supplier.country].filter(Boolean).join(", ")}
        </p>
      </header>

      <section className="rounded border bg-white p-4">
        <h2 className="mb-2 font-medium">Kontakt</h2>
        <dl className="grid grid-cols-1 gap-y-1 text-sm md:grid-cols-2">
          {supplier.website && (
            <>
              <dt className="text-neutral-500">Web</dt>
              <dd>
                <a className="underline" href={`https://${supplier.website}`} target="_blank" rel="noreferrer">
                  {supplier.website}
                </a>
              </dd>
            </>
          )}
          {supplier.email && (
            <>
              <dt className="text-neutral-500">Email</dt>
              <dd>{supplier.email}</dd>
            </>
          )}
          {supplier.phone && (
            <>
              <dt className="text-neutral-500">Telefón</dt>
              <dd>{supplier.phone}</dd>
            </>
          )}
        </dl>
      </section>

      {supplier.description && (
        <section className="rounded border bg-white p-4">
          <h2 className="mb-2 font-medium">O firme</h2>
          <p className="whitespace-pre-line text-sm text-neutral-800">{supplier.description}</p>
        </section>
      )}

      <section className="rounded border bg-white p-4">
        <h2 className="mb-2 font-medium">Ponuka látok</h2>
        {(!supplier.fabrics || supplier.fabrics.length === 0) ? (
          <p className="text-sm text-neutral-600">Detaily látok zatiaľ neboli doplnené.</p>
        ) : (
          <ul className="space-y-3">
            {supplier.fabrics.map((f: any) => (
              <li key={f.id} className="rounded border p-3">
                <div className="font-medium">{f.name ?? "(bez názvu)"}</div>
                <div className="text-sm text-neutral-700">
                  {f.composition && <div>Zloženie: {f.composition}</div>}
                  {f.weight_gsm && <div>Gramáž: {f.weight_gsm} g/m²</div>}
                  {f.width_cm && <div>Šírka: {f.width_cm} cm</div>}
                  {f.moq && <div>MOQ: {f.moq} {f.moq_unit ?? ""}</div>}
                  {f.certifications?.length > 0 && <div>Certifikáty: {f.certifications.join(", ")}</div>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}
