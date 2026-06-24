import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SearchParams = {
  q?: string;
  country?: string;
  material?: string;
  cert?: string;
};

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = createSupabaseServerClient();

  let query = supabase
    .from("suppliers")
    .select("id, name, slug, country, city, description, website, fabrics!inner(material_type, certifications)")
    .eq("status", "published")
    .order("name", { ascending: true })
    .limit(100);

  if (searchParams.q) {
    query = query.ilike("name", `%${searchParams.q}%`);
  }
  if (searchParams.country) {
    query = query.eq("country", searchParams.country);
  }
  if (searchParams.material) {
    query = query.contains("fabrics.material_type", [searchParams.material]);
  }
  if (searchParams.cert) {
    query = query.contains("fabrics.certifications", [searchParams.cert]);
  }

  const { data: suppliers, error } = await query;

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold">Katalóg dodávateľov</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Výrobcovia a veľkoobchody látok v SK, CZ, PL. Filtre nižšie.
        </p>
      </section>

      <Filters current={searchParams} />

      {error && (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Chyba pri načítaní: {error.message}
        </p>
      )}

      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {(suppliers ?? []).map((s) => (
          <li key={s.id} className="rounded border bg-white p-4">
            <Link href={`/supplier/${s.slug}`} className="font-medium hover:underline">
              {s.name}
            </Link>
            <p className="text-xs text-neutral-500">
              {[s.city, s.country].filter(Boolean).join(", ")}
            </p>
            {s.description && (
              <p className="mt-2 line-clamp-3 text-sm text-neutral-700">{s.description}</p>
            )}
          </li>
        ))}
      </ul>

      {!error && (suppliers ?? []).length === 0 && (
        <p className="text-sm text-neutral-600">Žiadne výsledky pre zvolené filtre.</p>
      )}
    </div>
  );
}

function Filters({ current }: { current: SearchParams }) {
  return (
    <form method="get" className="grid grid-cols-1 gap-3 rounded border bg-white p-4 md:grid-cols-4">
      <input
        name="q"
        defaultValue={current.q ?? ""}
        placeholder="Hľadať podľa názvu…"
        className="rounded border px-3 py-2 text-sm"
      />
      <select name="country" defaultValue={current.country ?? ""} className="rounded border px-3 py-2 text-sm">
        <option value="">Všetky krajiny</option>
        <option value="SK">Slovensko</option>
        <option value="CZ">Česko</option>
        <option value="PL">Poľsko</option>
        <option value="IT">Taliansko</option>
        <option value="DE">Nemecko</option>
        <option value="AT">Rakúsko</option>
        <option value="FR">Francúzsko</option>
        <option value="ES">Španielsko</option>
        <option value="PT">Portugalsko</option>
      </select>
      <select name="material" defaultValue={current.material ?? ""} className="rounded border px-3 py-2 text-sm">
        <option value="">Všetky materiály</option>
        <option value="cotton">Bavlna</option>
        <option value="linen">Ľan</option>
        <option value="wool">Vlna</option>
        <option value="silk">Hodváb</option>
        <option value="viscose">Viskóza</option>
      </select>
      <select name="cert" defaultValue={current.cert ?? ""} className="rounded border px-3 py-2 text-sm">
        <option value="">Všetky certifikáty</option>
        <option value="OEKO-TEX">OEKO-TEX</option>
        <option value="GOTS">GOTS</option>
        <option value="GRS">GRS</option>
      </select>
      <div className="md:col-span-4">
        <button type="submit" className="rounded bg-neutral-900 px-4 py-2 text-sm text-white">
          Filtrovať
        </button>
      </div>
    </form>
  );
}
