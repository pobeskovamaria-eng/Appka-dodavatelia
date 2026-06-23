"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Supplier } from "@/lib/types";
import {
  COMPANY_TYPES,
  STATUSES,
  RATINGS,
  labelOf,
} from "@/lib/constants";
import { RatingBadge, StatusChip } from "./StatusBadge";

type SortKey = "score" | "name" | "country" | "rating" | "lastCheck" | "updated";
type SortDir = "asc" | "desc";

export function SuppliersList({ suppliers }: { suppliers: Supplier[] }) {
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("");
  const [companyType, setCompanyType] = useState("");
  const [rating, setRating] = useState("");
  const [status, setStatus] = useState("");
  const [scoreMin, setScoreMin] = useState("");
  const [scoreMax, setScoreMax] = useState("");
  const [mulberry, setMulberry] = useState("");
  const [momme19, setMomme19] = useState("");
  const [momme22, setMomme22] = useState("");
  const [cotton, setCotton] = useState(false);
  const [organicCotton, setOrganicCotton] = useState(false);
  const [tencel, setTencel] = useState(false);
  const [bamboo, setBamboo] = useState(false);
  const [dyeing, setDyeing] = useState("");
  const [customColors, setCustomColors] = useState("");
  const [gots, setGots] = useState(false);
  const [oekoTex, setOekoTex] = useState(false);
  const [reach, setReach] = useState(false);
  const [lenzing, setLenzing] = useState(false);
  const [certVerified, setCertVerified] = useState("");
  const [b2b, setB2b] = useState("");
  const [shipsSK, setShipsSK] = useState("");
  const [samples, setSamples] = useState("");
  const [risky, setRisky] = useState("");
  const [excludeRemoved, setExcludeRemoved] = useState(true);
  const [shortlistOnly, setShortlistOnly] = useState(false);

  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const countries = useMemo(() => {
    const set = new Set<string>();
    suppliers.forEach((s) => s.country && set.add(s.country));
    return Array.from(set).sort();
  }, [suppliers]);

  const filtered = useMemo(() => {
    return suppliers.filter((s) => {
      if (q) {
        const hay = [
          s.name,
          s.country,
          s.city,
          s.website,
          s.notes,
          s.materials.map((m) => m.name).join(" "),
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      if (country && s.country !== country) return false;
      if (companyType && s.companyType !== companyType) return false;
      if (rating && s.rating !== rating) return false;
      if (status && s.status !== status) return false;
      const score = s.scoreManual ?? s.scoreAuto;
      if (scoreMin && score < Number(scoreMin)) return false;
      if (scoreMax && score > Number(scoreMax)) return false;
      if (mulberry && s.offersMulberry !== mulberry) return false;
      if (momme19 && s.momme19 !== momme19) return false;
      if (momme22 && s.momme22 !== momme22) return false;

      const matNames = s.materials.map((m) => m.name.toLowerCase()).join("|");
      if (cotton && !matNames.includes("bavlna")) return false;
      if (organicCotton && !matNames.includes("organická bavlna".toLowerCase()))
        return false;
      if (tencel && !matNames.match(/tencel|lyocell|modal/)) return false;
      if (bamboo && !matNames.includes("bambus")) return false;

      if (dyeing && s.offersDyeing !== dyeing) return false;
      if (customColors && s.customColors !== customColors) return false;

      const certNames = s.certifications.map((c) => c.name.toLowerCase()).join("|");
      if (gots && !certNames.includes("gots")) return false;
      if (oekoTex && !certNames.includes("oeko-tex")) return false;
      if (reach && !certNames.includes("reach")) return false;
      if (lenzing && !certNames.includes("lenzing")) return false;

      if (certVerified === "ano") {
        const hasVerified = s.certifications.some((c) => c.status === "overene");
        if (!hasVerified) return false;
      }
      if (certVerified === "nie") {
        const hasVerified = s.certifications.some((c) => c.status === "overene");
        if (hasVerified) return false;
      }

      if (b2b && s.b2b !== b2b) return false;
      if (shipsSK && s.shipsSlovakia !== shipsSK) return false;
      if (samples && s.sendsSamples !== samples) return false;

      const isRisky =
        s.greenwashingRisk ||
        s.retailRisk ||
        s.dropshipRisk ||
        s.fakeSilkRisk ||
        s.companyType === "retail" ||
        s.companyType === "marketplace" ||
        s.companyType === "znacka_hotovych_produktov";
      if (risky === "ano" && !isRisky) return false;
      if (risky === "nie" && isRisky) return false;

      if (excludeRemoved && s.status === "vyradeny") return false;
      if (shortlistOnly && s.status !== "shortlist") return false;

      return true;
    });
  }, [
    suppliers,
    q,
    country,
    companyType,
    rating,
    status,
    scoreMin,
    scoreMax,
    mulberry,
    momme19,
    momme22,
    cotton,
    organicCotton,
    tencel,
    bamboo,
    dyeing,
    customColors,
    gots,
    oekoTex,
    reach,
    lenzing,
    certVerified,
    b2b,
    shipsSK,
    samples,
    risky,
    excludeRemoved,
    shortlistOnly,
  ]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let av: string | number = "";
      let bv: string | number = "";
      switch (sortKey) {
        case "score":
          av = a.scoreManual ?? a.scoreAuto;
          bv = b.scoreManual ?? b.scoreAuto;
          break;
        case "name":
          av = a.name.toLowerCase();
          bv = b.name.toLowerCase();
          break;
        case "country":
          av = a.country.toLowerCase();
          bv = b.country.toLowerCase();
          break;
        case "rating":
          av = a.rating;
          bv = b.rating;
          break;
        case "lastCheck":
          av = a.lastCheck;
          bv = b.lastCheck;
          break;
        case "updated":
          av = a.updatedAt;
          bv = b.updatedAt;
          break;
      }
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(k);
      setSortDir("desc");
    }
  }

  function clearAll() {
    setQ("");
    setCountry("");
    setCompanyType("");
    setRating("");
    setStatus("");
    setScoreMin("");
    setScoreMax("");
    setMulberry("");
    setMomme19("");
    setMomme22("");
    setCotton(false);
    setOrganicCotton(false);
    setTencel(false);
    setBamboo(false);
    setDyeing("");
    setCustomColors("");
    setGots(false);
    setOekoTex(false);
    setReach(false);
    setLenzing(false);
    setCertVerified("");
    setB2b("");
    setShipsSK("");
    setSamples("");
    setRisky("");
    setShortlistOnly(false);
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-title mb-0 border-0 p-0">Filtre</h2>
          <div className="flex gap-2">
            <button type="button" className="btn" onClick={clearAll}>
              Vymazať filtre
            </button>
            <a href="/api/export?format=csv" className="btn">
              Export CSV
            </a>
            <a href="/api/export?format=json" className="btn">
              Export JSON
            </a>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <div>
            <label>Vyhľadávanie</label>
            <input
              type="text"
              placeholder="názov, web, krajina, poznámka..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div>
            <label>Krajina</label>
            <select value={country} onChange={(e) => setCountry(e.target.value)}>
              <option value="">Všetky</option>
              {countries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Typ firmy</label>
            <select
              value={companyType}
              onChange={(e) => setCompanyType(e.target.value)}
            >
              <option value="">Všetky</option>
              {COMPANY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Hodnotenie</label>
            <select value={rating} onChange={(e) => setRating(e.target.value)}>
              <option value="">Všetky</option>
              {RATINGS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Stav preverenia</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Všetky</option>
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Skóre od</label>
            <input
              type="number"
              min={0}
              max={100}
              value={scoreMin}
              onChange={(e) => setScoreMin(e.target.value)}
            />
          </div>
          <div>
            <label>Skóre do</label>
            <input
              type="number"
              min={0}
              max={100}
              value={scoreMax}
              onChange={(e) => setScoreMax(e.target.value)}
            />
          </div>
          <div>
            <label>Morušový hodváb</label>
            <select value={mulberry} onChange={(e) => setMulberry(e.target.value)}>
              <option value="">Všetky</option>
              <option value="ano">Áno</option>
              <option value="nie">Nie</option>
              <option value="neoverene">Neoverené</option>
            </select>
          </div>
          <div>
            <label>19 momme</label>
            <select value={momme19} onChange={(e) => setMomme19(e.target.value)}>
              <option value="">Všetky</option>
              <option value="ano">Áno</option>
              <option value="nie">Nie</option>
              <option value="neoverene">Neoverené</option>
            </select>
          </div>
          <div>
            <label>22 momme</label>
            <select value={momme22} onChange={(e) => setMomme22(e.target.value)}>
              <option value="">Všetky</option>
              <option value="ano">Áno</option>
              <option value="nie">Nie</option>
              <option value="neoverene">Neoverené</option>
            </select>
          </div>
          <div>
            <label>Farbenie</label>
            <select value={dyeing} onChange={(e) => setDyeing(e.target.value)}>
              <option value="">Všetky</option>
              <option value="ano">Áno</option>
              <option value="nie">Nie</option>
              <option value="neoverene">Neoverené</option>
            </select>
          </div>
          <div>
            <label>Custom colors</label>
            <select
              value={customColors}
              onChange={(e) => setCustomColors(e.target.value)}
            >
              <option value="">Všetky</option>
              <option value="ano">Áno</option>
              <option value="nie">Nie</option>
              <option value="neoverene">Neoverené</option>
            </select>
          </div>
          <div>
            <label>B2B</label>
            <select value={b2b} onChange={(e) => setB2b(e.target.value)}>
              <option value="">Všetky</option>
              <option value="ano">Áno</option>
              <option value="nie">Nie</option>
              <option value="neoverene">Neoverené</option>
            </select>
          </div>
          <div>
            <label>Dodáva na Slovensko</label>
            <select value={shipsSK} onChange={(e) => setShipsSK(e.target.value)}>
              <option value="">Všetky</option>
              <option value="ano">Áno</option>
              <option value="nie">Nie</option>
              <option value="neoverene">Neoverené</option>
            </select>
          </div>
          <div>
            <label>Zasiela vzorky</label>
            <select value={samples} onChange={(e) => setSamples(e.target.value)}>
              <option value="">Všetky</option>
              <option value="ano">Áno</option>
              <option value="nie">Nie</option>
              <option value="neoverene">Neoverené</option>
            </select>
          </div>
          <div>
            <label>Certifikácie overené</label>
            <select
              value={certVerified}
              onChange={(e) => setCertVerified(e.target.value)}
            >
              <option value="">Všetky</option>
              <option value="ano">Áno, aspoň jedna</option>
              <option value="nie">Nie, žiadna overená</option>
            </select>
          </div>
          <div>
            <label>Rizikový</label>
            <select value={risky} onChange={(e) => setRisky(e.target.value)}>
              <option value="">Všetky</option>
              <option value="nie">Bez rizík</option>
              <option value="ano">Rizikové</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <Checkbox label="100 % bavlna" checked={cotton} onChange={setCotton} />
          <Checkbox
            label="Organická bavlna"
            checked={organicCotton}
            onChange={setOrganicCotton}
          />
          <Checkbox
            label="TENCEL / lyocell / modal"
            checked={tencel}
            onChange={setTencel}
          />
          <Checkbox label="Bambus" checked={bamboo} onChange={setBamboo} />
          <span className="text-neutral-400">|</span>
          <Checkbox label="GOTS" checked={gots} onChange={setGots} />
          <Checkbox label="OEKO-TEX" checked={oekoTex} onChange={setOekoTex} />
          <Checkbox label="REACH" checked={reach} onChange={setReach} />
          <Checkbox
            label="Lenzing TENCEL"
            checked={lenzing}
            onChange={setLenzing}
          />
          <span className="text-neutral-400">|</span>
          <Checkbox
            label="Vylúčiť vyradených"
            checked={excludeRemoved}
            onChange={setExcludeRemoved}
          />
          <Checkbox
            label="Iba shortlist"
            checked={shortlistOnly}
            onChange={setShortlistOnly}
          />
        </div>
      </div>

      <div className="card overflow-x-auto p-0">
        <div className="px-5 pt-4 pb-2 text-sm text-ink/60">
          Zobrazujem {sorted.length} z {suppliers.length} dodávateľov.
        </div>
        <table className="data">
          <thead>
            <tr>
              <th>
                <SortBtn label="Názov" k="name" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
              </th>
              <th>
                <SortBtn label="Krajina" k="country" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
              </th>
              <th>Typ firmy</th>
              <th>Materiály</th>
              <th>Hodváb</th>
              <th>Farbenie</th>
              <th>Certifikácie</th>
              <th>B2B</th>
              <th>
                <SortBtn label="Skóre" k="score" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
              </th>
              <th>
                <SortBtn label="Hodnotenie" k="rating" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
              </th>
              <th>Stav</th>
              <th>
                <SortBtn label="Posl. kontrola" k="lastCheck" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
              </th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s) => {
              const score = s.scoreManual ?? s.scoreAuto;
              const mainMats = s.materials.slice(0, 3).map((m) => m.name).join(", ");
              const certNames = s.certifications
                .filter((c) => c.status === "overene")
                .map((c) => c.name)
                .join(", ");
              const silk =
                s.momme19 === "ano" || s.momme22 === "ano"
                  ? [s.momme19 === "ano" ? "19" : "", s.momme22 === "ano" ? "22" : ""]
                      .filter(Boolean)
                      .join("/") + " momme"
                  : s.offersMulberry === "ano"
                  ? "Mulberry"
                  : "—";
              return (
                <tr key={s.id}>
                  <td className="font-medium">
                    <Link href={`/suppliers/${s.id}`} className="hover:underline">
                      {s.name}
                    </Link>
                    {s.website && (
                      <div className="text-xs text-ink/50 truncate max-w-[200px]">
                        {s.website.replace(/^https?:\/\//, "")}
                      </div>
                    )}
                  </td>
                  <td>{s.country || "—"}</td>
                  <td className="text-xs">
                    {s.companyType
                      ? labelOf(COMPANY_TYPES, s.companyType)
                      : "—"}
                  </td>
                  <td className="text-xs max-w-[200px]">{mainMats || "—"}</td>
                  <td className="text-xs">{silk}</td>
                  <td className="text-xs">
                    {s.offersDyeing === "ano" ? "Áno" : s.offersDyeing === "nie" ? "Nie" : "—"}
                    {s.pantoneMatching === "ano" && (
                      <span className="ml-1 text-ink/60">/Pantone</span>
                    )}
                  </td>
                  <td className="text-xs max-w-[180px]">{certNames || "—"}</td>
                  <td className="text-xs">
                    {s.b2b === "ano" ? "Áno" : s.b2b === "nie" ? "Nie" : "—"}
                  </td>
                  <td className="font-medium">{score}</td>
                  <td>
                    <RatingBadge rating={s.rating} />
                  </td>
                  <td>
                    <StatusChip status={s.status} />
                  </td>
                  <td className="text-xs">{s.lastCheck || "—"}</td>
                  <td className="text-right whitespace-nowrap">
                    <Link href={`/suppliers/${s.id}`} className="text-sm hover:underline">
                      Detail
                    </Link>
                    <span className="mx-1 text-ink/30">·</span>
                    <Link
                      href={`/suppliers/${s.id}/edit`}
                      className="text-sm hover:underline"
                    >
                      Upraviť
                    </Link>
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td
                  colSpan={13}
                  className="text-center text-ink/50 py-8 text-sm"
                >
                  Žiadny dodávateľ nevyhovuje filtru.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-1.5 mb-0 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-border"
      />
      <span>{label}</span>
    </label>
  );
}

function SortBtn({
  label,
  k,
  sortKey,
  sortDir,
  onClick,
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onClick: (k: SortKey) => void;
}) {
  const active = sortKey === k;
  return (
    <button
      type="button"
      onClick={() => onClick(k)}
      className={`inline-flex items-center gap-1 ${active ? "text-ink" : ""}`}
    >
      {label}
      {active && <span>{sortDir === "asc" ? "↑" : "↓"}</span>}
    </button>
  );
}
