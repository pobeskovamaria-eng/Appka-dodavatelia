import { notFound } from "next/navigation";
import Link from "next/link";
import { getSupplier } from "@/lib/db";
import { deleteSupplierAction } from "@/app/actions";
import {
  COMPANY_TYPES,
  STATUSES,
  RATINGS,
  CERTIFICATION_STATUSES,
  MATERIAL_VERIFICATIONS,
  labelOf,
} from "@/lib/constants";
import { RatingBadge, StatusChip, TriBadge, RiskBadge } from "@/components/StatusBadge";
import { EmailButton } from "@/components/EmailButton";
import { ratingLabel } from "@/lib/scoring";

export const dynamic = "force-dynamic";

export default function SupplierDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const s = getSupplier(params.id);
  if (!s) notFound();
  const score = s.scoreManual ?? s.scoreAuto;
  const risks: string[] = [];
  if (s.greenwashingRisk) risks.push("Greenwashing");
  if (s.retailRisk) risks.push("Retail predajca");
  if (s.dropshipRisk) risks.push("Dropshipping");
  if (s.fakeSilkRisk) risks.push("Nepravý hodváb");
  if (s.companyType === "retail") risks.push("Typ: retail");
  if (s.companyType === "marketplace") risks.push("Typ: marketplace");
  if (s.companyType === "znacka_hotovych_produktov")
    risks.push("Typ: značka hotových produktov");

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-semibold tracking-tight">{s.name}</h1>
            <RatingBadge rating={s.rating} score={score} />
            <StatusChip status={s.status} />
          </div>
          <div className="text-sm text-ink/60">
            {s.country || "—"}
            {s.city && ` · ${s.city}`}
            {s.companyType && ` · ${labelOf(COMPANY_TYPES, s.companyType)}`}
          </div>
          {s.website && (
            <a
              href={s.website}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-sky-700 hover:underline"
            >
              {s.website}
            </a>
          )}
        </div>
        <div className="flex gap-2">
          <Link href={`/suppliers/${s.id}/edit`} className="btn btn-primary">
            Upraviť
          </Link>
          <form action={deleteSupplierAction.bind(null, s.id)}>
            <button
              type="submit"
              className="btn btn-danger"
              onClick={(e) => {
                if (!confirm("Naozaj vymazať dodávateľa?")) e.preventDefault();
              }}
            >
              Vymazať
            </button>
          </form>
        </div>
      </div>

      {risks.length > 0 && (
        <div className="card border-orange-200 bg-orange-50">
          <div className="text-sm font-medium text-orange-900 mb-2">
            Označené riziká:
          </div>
          <div className="flex flex-wrap gap-2">
            {risks.map((r) => (
              <RiskBadge key={r}>{r}</RiskBadge>
            ))}
          </div>
        </div>
      )}

      {/* Skóre + hodnotenie */}
      <div className="card">
        <h2 className="section-title">Skóre a hodnotenie</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <Info label="Skóre">
            <div className="text-3xl font-semibold">{score}</div>
            <div className="text-xs text-ink/60">
              Auto: {s.scoreAuto}
              {s.scoreManual !== null && ` · Manuálne: ${s.scoreManual}`}
            </div>
          </Info>
          <Info label="Hodnotenie">{labelOf(RATINGS, s.rating)}</Info>
          <Info label="Stav preverenia">
            {s.status ? labelOf(STATUSES, s.status) : "—"}
          </Info>
        </div>
      </div>

      {/* Základné údaje */}
      <div className="card">
        <h2 className="section-title">Základné údaje</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <Info label="E-mail">
            {s.email ? (
              <a className="text-sky-700 hover:underline" href={`mailto:${s.email}`}>
                {s.email}
              </a>
            ) : (
              "—"
            )}
          </Info>
          <Info label="Telefón">{s.phone || "—"}</Info>
          <Info label="Kontaktný formulár">
            {s.contactForm ? (
              <a
                className="text-sky-700 hover:underline"
                href={s.contactForm}
                target="_blank"
                rel="noreferrer"
              >
                {s.contactForm}
              </a>
            ) : (
              "—"
            )}
          </Info>
          <Info label="Jazyk komunikácie">{s.language || "—"}</Info>
        </div>
        {s.contactNote && (
          <div className="mt-3 text-sm">
            <div className="text-xs text-ink/60">Poznámka ku kontaktu</div>
            <div>{s.contactNote}</div>
          </div>
        )}
      </div>

      {/* Materiály */}
      <div className="card">
        <h2 className="section-title">Materiály</h2>
        {s.materials.length === 0 ? (
          <p className="text-sm text-ink/50">Žiadne materiály.</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {s.materials.map((m, i) => (
              <li key={i} className="py-2 flex items-center justify-between">
                <span>{m.name}</span>
                <span
                  className={`text-xs rounded px-2 py-0.5 ${
                    m.verification === "overeny"
                      ? "bg-green-100 text-green-800"
                      : m.verification === "rizikovy"
                      ? "bg-orange-100 text-orange-800"
                      : m.verification === "nevhodny"
                      ? "bg-red-100 text-red-800"
                      : "bg-neutral-200 text-neutral-700"
                  }`}
                >
                  {labelOf(MATERIAL_VERIFICATIONS, m.verification)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Hodváb */}
      <div className="card">
        <h2 className="section-title">Hodváb</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <Info label="Morušový hodváb">
            <TriBadge value={s.offersMulberry} />
          </Info>
          <Info label="19 momme">
            <TriBadge value={s.momme19} />
          </Info>
          <Info label="22 momme">
            <TriBadge value={s.momme22} />
          </Info>
          <Info label="Iné momme">{s.otherMomme || "—"}</Info>
          <Info label="Väzba">{s.silkWeave || "—"}</Info>
          <Info label="Šírka">{s.silkWidth || "—"}</Info>
          <Info label="Zloženie">{s.silkComposition || "—"}</Info>
          <Info label="Vzorky">
            <TriBadge value={s.silkSamples} />
          </Info>
          <Info label="MOQ hodváb">{s.silkMOQ || "—"}</Info>
        </div>
        {s.silkNote && (
          <div className="mt-3 text-sm">
            <div className="text-xs text-ink/60">Poznámka k hodvábu</div>
            <div>{s.silkNote}</div>
          </div>
        )}
      </div>

      {/* Farbenie */}
      <div className="card">
        <h2 className="section-title">Farbenie a zákazková výroba</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <Info label="Ponúka farbenie">
            <TriBadge value={s.offersDyeing} />
          </Info>
          <Info label="Custom colors">
            <TriBadge value={s.customColors} />
          </Info>
          <Info label="Lab dip">
            <TriBadge value={s.labDip} />
          </Info>
          <Info label="Pantone matching">
            <TriBadge value={s.pantoneMatching} />
          </Info>
          <Info label="GOTS farbenie">
            <TriBadge value={s.gotsDyeing} />
          </Info>
          <Info label="REACH farbenie">
            <TriBadge value={s.reachDyeing} />
          </Info>
          <Info label="Custom production">
            <TriBadge value={s.customProduction} />
          </Info>
        </div>
        {s.dyeingNote && (
          <div className="mt-3 text-sm">
            <div className="text-xs text-ink/60">Poznámka k farbeniu</div>
            <div>{s.dyeingNote}</div>
          </div>
        )}
      </div>

      {/* Certifikácie */}
      <div className="card">
        <h2 className="section-title">Certifikácie</h2>
        {s.certifications.length === 0 ? (
          <p className="text-sm text-ink/50">Žiadne certifikácie.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {s.certifications.map((c, i) => (
              <li key={i} className="rounded border border-border p-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{c.name}</div>
                  <span
                    className={`text-xs rounded px-2 py-0.5 ${
                      c.status === "overene"
                        ? "bg-green-100 text-green-800"
                        : c.status === "nedoveryhodne"
                        ? "bg-red-100 text-red-800"
                        : c.status === "nejasne"
                        ? "bg-orange-100 text-orange-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {labelOf(CERTIFICATION_STATUSES, c.status)}
                  </span>
                </div>
                <div className="mt-1 text-xs text-ink/60 flex flex-wrap gap-x-4 gap-y-1">
                  <span>Na webe: {c.onWebsite ? "áno" : "nie"}</span>
                  <span>Overiteľná: {c.verifiable ? "áno" : "nie"}</span>
                  {c.verifiedDate && <span>Overené: {c.verifiedDate}</span>}
                  {c.proofUrl && (
                    <a
                      href={c.proofUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sky-700 hover:underline"
                    >
                      Odkaz na dôkaz
                    </a>
                  )}
                </div>
                {c.note && (
                  <div className="mt-1 text-sm text-ink/70">{c.note}</div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* B2B */}
      <div className="card">
        <h2 className="section-title">B2B údaje</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <Info label="B2B">
            <TriBadge value={s.b2b} />
          </Info>
          <Info label="Metráž">
            <TriBadge value={s.sellsMeter} />
          </Info>
          <Info label="Veľkoobchod">
            <TriBadge value={s.sellsWholesale} />
          </Info>
          <Info label="MOQ">{s.moq || "—"}</Info>
          <Info label="Vzorky">
            <TriBadge value={s.sendsSamples} />
          </Info>
          <Info label="Dodáva SK">
            <TriBadge value={s.shipsSlovakia} />
          </Info>
          <Info label="Dodáva EÚ">
            <TriBadge value={s.shipsEU} />
          </Info>
          <Info label="Cenník">
            <TriBadge value={s.priceListAvail} />
          </Info>
          <Info label="Opakovaná výroba">
            <TriBadge value={s.reorder} />
          </Info>
        </div>
        {s.b2bNote && (
          <div className="mt-3 text-sm">
            <div className="text-xs text-ink/60">Poznámka k B2B</div>
            <div>{s.b2bNote}</div>
          </div>
        )}
      </div>

      {/* Dôveryhodnosť */}
      <div className="card">
        <h2 className="section-title">Dôveryhodnosť firmy</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
          <BoolRow label="Jasne uvedená firma" v={s.hasCompanyInfo} />
          <BoolRow label="Adresa" v={s.hasAddress} />
          <BoolRow label="IČO / VAT" v={s.hasVAT} />
          <BoolRow label="Jasné kontakty" v={s.hasClearContact} />
          <BoolRow label="Technické listy" v={s.hasTechSheets} />
          <BoolRow label="Certifikáty na stiahnutie" v={s.hasCertDownload} />
          <BoolRow label="Uvádza krajinu výroby" v={s.countryOfMake} />
          <BoolRow label="Uvádza pôvod vlákien" v={s.fiberOrigin} />
          <BoolRow label="Pôsobí dôveryhodne" v={s.trustworthy} />
        </div>
      </div>

      {/* Poznámky */}
      <div className="card">
        <h2 className="section-title">Poznámky</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <NoteBlock title="Moje poznámky" text={s.notes} />
          <NoteBlock title="Otázky pre dodávateľa" text={s.questions} />
          <NoteBlock title="Odpoveď dodávateľa" text={s.reply} />
          <div>
            <div className="text-xs text-ink/60">Ďalší krok</div>
            <div>{s.nextStep || "—"}</div>
            <div className="text-xs text-ink/60 mt-2">Posledná kontrola</div>
            <div>{s.lastCheck || "—"}</div>
            <div className="text-xs text-ink/60 mt-2">Posledné kontaktovanie</div>
            <div>{s.lastContact || "—"}</div>
          </div>
        </div>
      </div>

      {/* E-mail */}
      <div className="card">
        <h2 className="section-title">Vygenerovať dopytový e-mail</h2>
        <EmailButton supplier={s} />
      </div>
    </div>
  );
}

function Info({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-xs text-ink/60">{label}</div>
      <div>{children}</div>
    </div>
  );
}

function BoolRow({ label, v }: { label: string; v: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-block w-2 h-2 rounded-full ${
          v ? "bg-green-500" : "bg-neutral-300"
        }`}
      />
      <span>{label}</span>
    </div>
  );
}

function NoteBlock({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <div className="text-xs text-ink/60 mb-1">{title}</div>
      {text ? (
        <div className="whitespace-pre-wrap">{text}</div>
      ) : (
        <div className="text-ink/40">—</div>
      )}
    </div>
  );
}
