"use client";

import { useState, useMemo } from "react";
import type {
  Supplier,
  MaterialEntry,
  CertificationEntry,
  TriState,
} from "@/lib/types";
import {
  COMPANY_TYPES,
  STATUSES,
  RATINGS,
  TRI_STATES,
  MATERIAL_OPTIONS,
  MATERIAL_VERIFICATIONS,
  CERTIFICATION_OPTIONS,
  CERTIFICATION_STATUSES,
} from "@/lib/constants";
import { calculateScore, ratingFromScore, ratingLabel } from "@/lib/scoring";

interface Props {
  initial: Supplier;
  submitLabel: string;
  action: (fd: FormData) => void;
}

export function SupplierForm({ initial, submitLabel, action }: Props) {
  const [supplier, setSupplier] = useState<Supplier>(initial);

  const set = <K extends keyof Supplier>(key: K, value: Supplier[K]) => {
    setSupplier((p) => ({ ...p, [key]: value }));
  };

  const liveScore = useMemo(() => calculateScore(supplier), [supplier]);
  const suggestedRating = ratingFromScore(liveScore);

  function addMaterial() {
    set("materials", [
      ...supplier.materials,
      { name: "", verification: "neovereny" },
    ]);
  }
  function updateMaterial(i: number, patch: Partial<MaterialEntry>) {
    const next = [...supplier.materials];
    next[i] = { ...next[i], ...patch };
    set("materials", next);
  }
  function removeMaterial(i: number) {
    set(
      "materials",
      supplier.materials.filter((_, idx) => idx !== i)
    );
  }

  function addCert() {
    set("certifications", [
      ...supplier.certifications,
      {
        name: "",
        onWebsite: false,
        verifiable: false,
        proofUrl: "",
        verifiedDate: "",
        note: "",
        status: "uvedene_ale_neoverene",
      },
    ]);
  }
  function updateCert(i: number, patch: Partial<CertificationEntry>) {
    const next = [...supplier.certifications];
    next[i] = { ...next[i], ...patch };
    set("certifications", next);
  }
  function removeCert(i: number) {
    set(
      "certifications",
      supplier.certifications.filter((_, idx) => idx !== i)
    );
  }

  return (
    <form action={action} className="space-y-5">
      {/* Hidden serialized payloads */}
      <input
        type="hidden"
        name="materials"
        value={JSON.stringify(supplier.materials)}
      />
      <input
        type="hidden"
        name="certifications"
        value={JSON.stringify(supplier.certifications)}
      />

      {/* Sekcia: Základné údaje */}
      <Section title="Základné údaje">
        <Grid>
          <Field label="Názov firmy *" required>
            <input
              name="name"
              type="text"
              required
              value={supplier.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </Field>
          <Field label="Webová stránka *" required>
            <input
              name="website"
              type="url"
              required
              placeholder="https://..."
              value={supplier.website}
              onChange={(e) => set("website", e.target.value)}
            />
          </Field>
          <Field label="Krajina">
            <input
              name="country"
              type="text"
              value={supplier.country}
              onChange={(e) => set("country", e.target.value)}
            />
          </Field>
          <Field label="Mesto / región">
            <input
              name="city"
              type="text"
              value={supplier.city}
              onChange={(e) => set("city", e.target.value)}
            />
          </Field>
          <Field label="Typ firmy">
            <select
              name="companyType"
              value={supplier.companyType}
              onChange={(e) =>
                set("companyType", e.target.value as Supplier["companyType"])
              }
            >
              <option value="">— vyber —</option>
              {COMPANY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                  {t.risky ? " (rizikové)" : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Jazyk komunikácie">
            <input
              name="language"
              type="text"
              placeholder="SK, EN, IT..."
              value={supplier.language}
              onChange={(e) => set("language", e.target.value)}
            />
          </Field>
          <Field label="E-mail">
            <input
              name="email"
              type="email"
              value={supplier.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </Field>
          <Field label="Kontaktný formulár (URL)">
            <input
              name="contactForm"
              type="url"
              value={supplier.contactForm}
              onChange={(e) => set("contactForm", e.target.value)}
            />
          </Field>
          <Field label="Telefón">
            <input
              name="phone"
              type="tel"
              value={supplier.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </Field>
        </Grid>
        <Field label="Poznámka ku kontaktu">
          <textarea
            name="contactNote"
            value={supplier.contactNote}
            onChange={(e) => set("contactNote", e.target.value)}
          />
        </Field>
      </Section>

      {/* Sekcia: Materiály */}
      <Section title="Materiály">
        <p className="text-sm text-ink/60 mb-2">
          Pridaj materiál, ktorý dodávateľ ponúka. Pri každom označ overenie.
          Rizikové materiály ako artificial silk, polyester satin alebo umelý
          satén nikdy neoznačuj ako „overený" bez dôkazu o zložení.
        </p>
        <div className="space-y-2">
          {supplier.materials.map((m, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-7">
                <label>Materiál</label>
                <input
                  list="material-options"
                  type="text"
                  value={m.name}
                  onChange={(e) => updateMaterial(i, { name: e.target.value })}
                  placeholder="napr. Morušový hodváb"
                />
              </div>
              <div className="col-span-4">
                <label>Overenie</label>
                <select
                  value={m.verification}
                  onChange={(e) =>
                    updateMaterial(i, {
                      verification: e.target.value as MaterialEntry["verification"],
                    })
                  }
                >
                  {MATERIAL_VERIFICATIONS.map((v) => (
                    <option key={v.value} value={v.value}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-1">
                <button
                  type="button"
                  className="btn btn-danger w-full"
                  onClick={() => removeMaterial(i)}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
        <datalist id="material-options">
          {MATERIAL_OPTIONS.map((o) => (
            <option key={o.name} value={o.name} />
          ))}
        </datalist>
        <button type="button" className="btn mt-3" onClick={addMaterial}>
          + Pridať materiál
        </button>
      </Section>

      {/* Sekcia: Hodváb */}
      <Section title="Hodváb">
        <Grid>
          <TriField
            label="Ponúka morušový hodváb"
            name="offersMulberry"
            value={supplier.offersMulberry}
            onChange={(v) => set("offersMulberry", v)}
          />
          <TriField
            label="19 momme"
            name="momme19"
            value={supplier.momme19}
            onChange={(v) => set("momme19", v)}
          />
          <TriField
            label="22 momme"
            name="momme22"
            value={supplier.momme22}
            onChange={(v) => set("momme22", v)}
          />
          <Field label="Iné momme hodnoty">
            <input
              name="otherMomme"
              type="text"
              placeholder="napr. 25, 30..."
              value={supplier.otherMomme}
              onChange={(e) => set("otherMomme", e.target.value)}
            />
          </Field>
          <Field label="Typ väzby">
            <input
              name="silkWeave"
              type="text"
              placeholder="charmeuse, satin, crepe..."
              value={supplier.silkWeave}
              onChange={(e) => set("silkWeave", e.target.value)}
            />
          </Field>
          <Field label="Šírka látky">
            <input
              name="silkWidth"
              type="text"
              placeholder="napr. 114 cm"
              value={supplier.silkWidth}
              onChange={(e) => set("silkWidth", e.target.value)}
            />
          </Field>
          <Field label="Zloženie">
            <input
              name="silkComposition"
              type="text"
              placeholder="napr. 100 % mulberry silk"
              value={supplier.silkComposition}
              onChange={(e) => set("silkComposition", e.target.value)}
            />
          </Field>
          <TriField
            label="Dostupnosť vzoriek"
            name="silkSamples"
            value={supplier.silkSamples}
            onChange={(v) => set("silkSamples", v)}
          />
          <Field label="MOQ pre hodváb">
            <input
              name="silkMOQ"
              type="text"
              value={supplier.silkMOQ}
              onChange={(e) => set("silkMOQ", e.target.value)}
            />
          </Field>
        </Grid>
        <Field label="Poznámka k hodvábu">
          <textarea
            name="silkNote"
            value={supplier.silkNote}
            onChange={(e) => set("silkNote", e.target.value)}
          />
        </Field>
      </Section>

      {/* Sekcia: Farbenie */}
      <Section title="Farbenie a zákazková výroba">
        <Grid>
          <TriField
            label="Ponúka farbenie"
            name="offersDyeing"
            value={supplier.offersDyeing}
            onChange={(v) => set("offersDyeing", v)}
          />
          <TriField
            label="Custom colors"
            name="customColors"
            value={supplier.customColors}
            onChange={(v) => set("customColors", v)}
          />
          <TriField
            label="Lab dip"
            name="labDip"
            value={supplier.labDip}
            onChange={(v) => set("labDip", v)}
          />
          <TriField
            label="Pantone matching"
            name="pantoneMatching"
            value={supplier.pantoneMatching}
            onChange={(v) => set("pantoneMatching", v)}
          />
          <TriField
            label="GOTS farbenie"
            name="gotsDyeing"
            value={supplier.gotsDyeing}
            onChange={(v) => set("gotsDyeing", v)}
          />
          <TriField
            label="REACH compliant farbenie"
            name="reachDyeing"
            value={supplier.reachDyeing}
            onChange={(v) => set("reachDyeing", v)}
          />
          <TriField
            label="Vlastná výroba na objednávku"
            name="customProduction"
            value={supplier.customProduction}
            onChange={(v) => set("customProduction", v)}
          />
        </Grid>
        <Field label="Poznámka k farbeniu">
          <textarea
            name="dyeingNote"
            value={supplier.dyeingNote}
            onChange={(e) => set("dyeingNote", e.target.value)}
          />
        </Field>
      </Section>

      {/* Sekcia: Certifikácie */}
      <Section title="Certifikácie">
        <p className="text-sm text-ink/60 mb-2">
          Certifikácie nie sú automaticky pravdivé. Pri každej označ stav,
          ulož odkaz na dôkaz a dátum overenia.
        </p>
        <div className="space-y-3">
          {supplier.certifications.map((c, i) => (
            <div key={i} className="rounded border border-border p-3 bg-paper">
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-5">
                  <label>Certifikácia</label>
                  <input
                    list="cert-options"
                    type="text"
                    value={c.name}
                    onChange={(e) => updateCert(i, { name: e.target.value })}
                  />
                </div>
                <div className="col-span-6">
                  <label>Stav</label>
                  <select
                    value={c.status}
                    onChange={(e) =>
                      updateCert(i, {
                        status: e.target.value as CertificationEntry["status"],
                      })
                    }
                  >
                    {CERTIFICATION_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-1">
                  <label>&nbsp;</label>
                  <button
                    type="button"
                    className="btn btn-danger w-full"
                    onClick={() => removeCert(i)}
                  >
                    ×
                  </button>
                </div>
                <div className="col-span-5">
                  <label>Odkaz na dôkaz</label>
                  <input
                    type="url"
                    value={c.proofUrl}
                    onChange={(e) =>
                      updateCert(i, { proofUrl: e.target.value })
                    }
                    placeholder="https://..."
                  />
                </div>
                <div className="col-span-3">
                  <label>Dátum overenia</label>
                  <input
                    type="date"
                    value={c.verifiedDate}
                    onChange={(e) =>
                      updateCert(i, { verifiedDate: e.target.value })
                    }
                  />
                </div>
                <div className="col-span-4 flex items-end gap-3 text-sm">
                  <label className="inline-flex items-center gap-1.5 mb-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={c.onWebsite}
                      onChange={(e) =>
                        updateCert(i, { onWebsite: e.target.checked })
                      }
                    />
                    Uvedená na webe
                  </label>
                  <label className="inline-flex items-center gap-1.5 mb-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={c.verifiable}
                      onChange={(e) =>
                        updateCert(i, { verifiable: e.target.checked })
                      }
                    />
                    Overiteľná v databáze
                  </label>
                </div>
                <div className="col-span-12">
                  <label>Poznámka</label>
                  <textarea
                    value={c.note}
                    onChange={(e) => updateCert(i, { note: e.target.value })}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <datalist id="cert-options">
          {CERTIFICATION_OPTIONS.map((o) => (
            <option key={o} value={o} />
          ))}
        </datalist>
        <button type="button" className="btn mt-3" onClick={addCert}>
          + Pridať certifikáciu
        </button>
      </Section>

      {/* Sekcia: B2B */}
      <Section title="B2B údaje">
        <Grid>
          <TriField
            label="Dodáva B2B"
            name="b2b"
            value={supplier.b2b}
            onChange={(v) => set("b2b", v)}
          />
          <TriField
            label="Predáva metráž"
            name="sellsMeter"
            value={supplier.sellsMeter}
            onChange={(v) => set("sellsMeter", v)}
          />
          <TriField
            label="Predáva veľkoobchodne"
            name="sellsWholesale"
            value={supplier.sellsWholesale}
            onChange={(v) => set("sellsWholesale", v)}
          />
          <Field label="MOQ">
            <input
              name="moq"
              type="text"
              value={supplier.moq}
              onChange={(e) => set("moq", e.target.value)}
            />
          </Field>
          <TriField
            label="Zasiela vzorky"
            name="sendsSamples"
            value={supplier.sendsSamples}
            onChange={(v) => set("sendsSamples", v)}
          />
          <TriField
            label="Dodáva na Slovensko"
            name="shipsSlovakia"
            value={supplier.shipsSlovakia}
            onChange={(v) => set("shipsSlovakia", v)}
          />
          <TriField
            label="Dodáva do EÚ"
            name="shipsEU"
            value={supplier.shipsEU}
            onChange={(v) => set("shipsEU", v)}
          />
          <TriField
            label="Dostupný cenník"
            name="priceListAvail"
            value={supplier.priceListAvail}
            onChange={(v) => set("priceListAvail", v)}
          />
          <TriField
            label="Možnosť opakovanej výroby"
            name="reorder"
            value={supplier.reorder}
            onChange={(v) => set("reorder", v)}
          />
        </Grid>
        <Field label="Poznámka k B2B spolupráci">
          <textarea
            name="b2bNote"
            value={supplier.b2bNote}
            onChange={(e) => set("b2bNote", e.target.value)}
          />
        </Field>
      </Section>

      {/* Sekcia: Dôveryhodnosť */}
      <Section title="Overenie dôveryhodnosti a riziká">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
          <CheckField
            label="Má jasne uvedenú firmu"
            name="hasCompanyInfo"
            checked={supplier.hasCompanyInfo}
            onChange={(v) => set("hasCompanyInfo", v)}
          />
          <CheckField
            label="Má adresu"
            name="hasAddress"
            checked={supplier.hasAddress}
            onChange={(v) => set("hasAddress", v)}
          />
          <CheckField
            label="Má IČO / VAT / reg. údaje"
            name="hasVAT"
            checked={supplier.hasVAT}
            onChange={(v) => set("hasVAT", v)}
          />
          <CheckField
            label="Má jasné kontakty"
            name="hasClearContact"
            checked={supplier.hasClearContact}
            onChange={(v) => set("hasClearContact", v)}
          />
          <CheckField
            label="Má technické listy"
            name="hasTechSheets"
            checked={supplier.hasTechSheets}
            onChange={(v) => set("hasTechSheets", v)}
          />
          <CheckField
            label="Má certifikáty na stiahnutie"
            name="hasCertDownload"
            checked={supplier.hasCertDownload}
            onChange={(v) => set("hasCertDownload", v)}
          />
          <CheckField
            label="Uvádza krajinu výroby"
            name="countryOfMake"
            checked={supplier.countryOfMake}
            onChange={(v) => set("countryOfMake", v)}
          />
          <CheckField
            label="Uvádza pôvod vlákien"
            name="fiberOrigin"
            checked={supplier.fiberOrigin}
            onChange={(v) => set("fiberOrigin", v)}
          />
          <CheckField
            label="Pôsobí dôveryhodne"
            name="trustworthy"
            checked={supplier.trustworthy}
            onChange={(v) => set("trustworthy", v)}
          />
        </div>
        <h4 className="text-sm font-medium mt-4 mb-2 text-ink/80">Riziká</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          <CheckField
            label="Riziko greenwashingu"
            name="greenwashingRisk"
            checked={supplier.greenwashingRisk}
            onChange={(v) => set("greenwashingRisk", v)}
          />
          <CheckField
            label="Riziko retail predajcu"
            name="retailRisk"
            checked={supplier.retailRisk}
            onChange={(v) => set("retailRisk", v)}
          />
          <CheckField
            label="Riziko dropshippingu"
            name="dropshipRisk"
            checked={supplier.dropshipRisk}
            onChange={(v) => set("dropshipRisk", v)}
          />
          <CheckField
            label="Riziko nepravého hodvábu"
            name="fakeSilkRisk"
            checked={supplier.fakeSilkRisk}
            onChange={(v) => set("fakeSilkRisk", v)}
          />
        </div>
      </Section>

      {/* Sekcia: Hodnotenie */}
      <Section title="Stav, skóre a hodnotenie">
        <Grid>
          <Field label="Stav preverenia">
            <select
              name="status"
              value={supplier.status}
              onChange={(e) =>
                set("status", e.target.value as Supplier["status"])
              }
            >
              <option value="">— vyber —</option>
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Hodnotenie">
            <select
              name="rating"
              value={supplier.rating}
              onChange={(e) =>
                set("rating", e.target.value as Supplier["rating"])
              }
            >
              {RATINGS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-ink/50 mt-1">
              Návrh podľa skóre: <strong>{ratingLabel(suggestedRating)}</strong>
            </p>
          </Field>
          <Field label="Manuálne skóre (0–100, prázdne = použiť automatické)">
            <input
              name="scoreManual"
              type="number"
              min={0}
              max={100}
              value={supplier.scoreManual === null ? "" : supplier.scoreManual}
              onChange={(e) =>
                set(
                  "scoreManual",
                  e.target.value === "" ? null : Number(e.target.value)
                )
              }
            />
          </Field>
        </Grid>
        <div className="mt-2 text-sm text-ink/60">
          Automatický prepočet skóre: <strong>{liveScore}</strong> /100 (vypočíta sa
          aj pri uložení).
        </div>
      </Section>

      {/* Sekcia: Poznámky */}
      <Section title="Poznámky a kontaktovanie">
        <Field label="Moje poznámky">
          <textarea
            name="notes"
            value={supplier.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </Field>
        <Field label="Otázky pre dodávateľa">
          <textarea
            name="questions"
            value={supplier.questions}
            onChange={(e) => set("questions", e.target.value)}
          />
        </Field>
        <Field label="Odpoveď dodávateľa">
          <textarea
            name="reply"
            value={supplier.reply}
            onChange={(e) => set("reply", e.target.value)}
          />
        </Field>
        <Grid>
          <Field label="Ďalší krok">
            <input
              name="nextStep"
              type="text"
              value={supplier.nextStep}
              onChange={(e) => set("nextStep", e.target.value)}
            />
          </Field>
          <Field label="Dátum poslednej kontroly">
            <input
              name="lastCheck"
              type="date"
              value={supplier.lastCheck}
              onChange={(e) => set("lastCheck", e.target.value)}
            />
          </Field>
          <Field label="Dátum posledného kontaktovania">
            <input
              name="lastContact"
              type="date"
              value={supplier.lastContact}
              onChange={(e) => set("lastContact", e.target.value)}
            />
          </Field>
        </Grid>
      </Section>

      <div className="flex justify-end gap-3 sticky bottom-0 bg-paper py-3">
        <a href="/suppliers" className="btn">
          Zrušiť
        </a>
        <button type="submit" className="btn btn-primary">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card">
      <h3 className="section-title">{title}</h3>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-3 gap-3">{children}</div>;
}

function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div>
      <label>{label}</label>
      {children}
    </div>
  );
}

function TriField({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: string;
  value: TriState | "";
  onChange: (v: TriState | "") => void;
}) {
  return (
    <div>
      <label>{label}</label>
      <select
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value as TriState | "")}
      >
        <option value="">— vyber —</option>
        {TRI_STATES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function CheckField({
  label,
  name,
  checked,
  onChange,
}: {
  label: string;
  name: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer mb-0">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-border"
      />
      <span>{label}</span>
    </label>
  );
}
