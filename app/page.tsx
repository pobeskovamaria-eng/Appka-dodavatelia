import Link from "next/link";
import { listSuppliers } from "@/lib/db";
import { RatingBadge, StatusChip } from "@/components/StatusBadge";
import { labelOf, COMPANY_TYPES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const suppliers = listSuppliers();
  const total = suppliers.length;

  const byRating = {
    velmi_vhodny: 0,
    vhodny: 0,
    mozno_vhodny: 0,
    nevhodny: 0,
    neohodnoteny: 0,
  } as Record<string, number>;
  suppliers.forEach((s) => {
    byRating[s.rating] = (byRating[s.rating] || 0) + 1;
  });

  const shortlist = suppliers.filter((s) => s.status === "shortlist");
  const waitingReply = suppliers.filter((s) => s.status === "cakam_na_odpoved");
  const toContact = suppliers
    .filter(
      (s) =>
        s.status === "predbezne_vhodny" ||
        s.status === "novy_nalez" ||
        s.status === "caka_na_preverenie"
    )
    .sort(
      (a, b) =>
        (b.scoreManual ?? b.scoreAuto) - (a.scoreManual ?? a.scoreAuto)
    )
    .slice(0, 8);

  const top = [...suppliers]
    .sort(
      (a, b) =>
        (b.scoreManual ?? b.scoreAuto) - (a.scoreManual ?? a.scoreAuto)
    )
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Prehľad</h1>
          <p className="text-sm text-ink/60 mt-1">
            Osobná databáza overovaných dodávateľov látok.
          </p>
        </div>
      </div>

      {/* Statistiky */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="Spolu" value={total} />
        <Stat
          label="Veľmi vhodní"
          value={byRating.velmi_vhodny}
          color="text-green-700"
        />
        <Stat label="Vhodní" value={byRating.vhodny} color="text-sky-700" />
        <Stat
          label="Možno vhodní"
          value={byRating.mozno_vhodny}
          color="text-yellow-700"
        />
        <Stat
          label="Nevhodní"
          value={byRating.nevhodny}
          color="text-red-700"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Top kandidáti podľa skóre" empty="Zatiaľ žiadni dodávatelia.">
          {top.length > 0 && (
            <ul className="divide-y divide-border">
              {top.map((s) => (
                <li key={s.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/suppliers/${s.id}`}
                      className="font-medium hover:underline truncate block"
                    >
                      {s.name}
                    </Link>
                    <div className="text-xs text-ink/60">
                      {s.country || "—"}
                      {s.companyType && ` · ${labelOf(COMPANY_TYPES, s.companyType)}`}
                    </div>
                  </div>
                  <RatingBadge
                    rating={s.rating}
                    score={s.scoreManual ?? s.scoreAuto}
                  />
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel
          title="Na kontaktovanie"
          empty="Žiadne čakajúce kontakty."
        >
          {toContact.length > 0 && (
            <ul className="divide-y divide-border">
              {toContact.map((s) => (
                <li
                  key={s.id}
                  className="py-2.5 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/suppliers/${s.id}`}
                      className="font-medium hover:underline truncate block"
                    >
                      {s.name}
                    </Link>
                    <div className="text-xs text-ink/60">{s.country || "—"}</div>
                  </div>
                  <StatusChip status={s.status} />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Shortlist" empty="Nič v shortliste.">
          {shortlist.length > 0 && (
            <ul className="divide-y divide-border">
              {shortlist.map((s) => (
                <li
                  key={s.id}
                  className="py-2.5 flex items-center justify-between gap-3"
                >
                  <Link
                    href={`/suppliers/${s.id}`}
                    className="font-medium hover:underline truncate"
                  >
                    {s.name}
                  </Link>
                  <RatingBadge rating={s.rating} score={s.scoreManual ?? s.scoreAuto} />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Čakám na odpoveď" empty="Žiaden dodávateľ.">
          {waitingReply.length > 0 && (
            <ul className="divide-y divide-border">
              {waitingReply.map((s) => (
                <li
                  key={s.id}
                  className="py-2.5 flex items-center justify-between gap-3"
                >
                  <Link
                    href={`/suppliers/${s.id}`}
                    className="font-medium hover:underline truncate"
                  >
                    {s.name}
                  </Link>
                  <span className="text-xs text-ink/60">
                    {s.lastContact || "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="flex gap-3">
        <Link href="/suppliers" className="btn">
          Otvoriť celý zoznam
        </Link>
        <Link href="/suppliers/new" className="btn btn-primary">
          + Pridať dodávateľa
        </Link>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="card">
      <div className="text-xs text-ink/60">{label}</div>
      <div className={`text-2xl font-semibold mt-1 ${color ?? ""}`}>{value}</div>
    </div>
  );
}

function Panel({
  title,
  children,
  empty,
}: {
  title: string;
  children: React.ReactNode;
  empty: string;
}) {
  const hasChildren =
    Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <div className="card">
      <h2 className="section-title">{title}</h2>
      {hasChildren ? children : <p className="text-sm text-ink/50">{empty}</p>}
    </div>
  );
}
