import type {
  CompanyType,
  MaterialVerification,
  CertificationStatus,
  Status,
  Rating,
} from "./types";

export const COMPANY_TYPES: { value: CompanyType; label: string; risky?: boolean }[] = [
  { value: "vyrobca", label: "Výrobca" },
  { value: "tkacovna", label: "Tkáčovňa" },
  { value: "farbiaren", label: "Farbiareň" },
  { value: "velkoobchod", label: "Veľkoobchodný dodávateľ látok" },
  { value: "b2b_metraz", label: "B2B dodávateľ metráže" },
  { value: "agent", label: "Agent / sprostredkovateľ" },
  { value: "marketplace", label: "Marketplace", risky: true },
  { value: "retail", label: "Retail e-shop", risky: true },
  { value: "znacka_hotovych_produktov", label: "Značka hotových produktov", risky: true },
  { value: "neoverene", label: "Neoverené" },
];

export const STATUSES: { value: Status; label: string }[] = [
  { value: "novy_nalez", label: "Nový nález" },
  { value: "caka_na_preverenie", label: "Čaká na preverenie" },
  { value: "predbezne_vhodny", label: "Predbežne vhodný" },
  { value: "kontaktovany", label: "Kontaktovaný" },
  { value: "cakam_na_odpoved", label: "Čakám na odpoveď" },
  { value: "odpovedal", label: "Odpovedal" },
  { value: "vhodny", label: "Vhodný" },
  { value: "nevhodny", label: "Nevhodný" },
  { value: "vyradeny", label: "Vyradený" },
  { value: "shortlist", label: "Shortlist / obľúbený" },
];

export const RATINGS: { value: Rating; label: string }[] = [
  { value: "velmi_vhodny", label: "Veľmi vhodný" },
  { value: "vhodny", label: "Vhodný" },
  { value: "mozno_vhodny", label: "Možno vhodný" },
  { value: "nevhodny", label: "Nevhodný" },
  { value: "neohodnoteny", label: "Neohodnotený" },
];

export const TRI_STATES = [
  { value: "ano", label: "Áno" },
  { value: "nie", label: "Nie" },
  { value: "neoverene", label: "Neoverené" },
];

export const MATERIAL_OPTIONS = [
  { name: "Morušový hodváb / mulberry silk", trusted: true },
  { name: "Hodváb charmeuse", trusted: true },
  { name: "Hodváb satin weave", trusted: true },
  { name: "Hodváb crepe de chine", trusted: true },
  { name: "Hodváb habotai", trusted: true },
  { name: "100 % bavlna", trusted: true },
  { name: "Organická bavlna", trusted: true },
  { name: "TENCEL™", trusted: true },
  { name: "Lyocell", trusted: true },
  { name: "Modal", trusted: true },
  { name: "Bambusový lyocell", trusted: true },
  { name: "Bambusová viskóza", trusted: true },
  { name: "Ľan", trusted: true },
  { name: "Iné prírodné látky", trusted: true },
  { name: "Polyester", risky: true },
  { name: "Umelý satén", risky: true },
  { name: "Artificial silk / art silk", risky: true },
  { name: "Vegan silk", risky: true },
  { name: "Polyester satin", risky: true },
  { name: "Neoverené", neutral: true },
];

export const MATERIAL_VERIFICATIONS: { value: MaterialVerification; label: string }[] = [
  { value: "overeny", label: "Overený" },
  { value: "neovereny", label: "Neoverený" },
  { value: "rizikovy", label: "Rizikový" },
  { value: "nevhodny", label: "Nevhodný" },
];

export const CERTIFICATION_OPTIONS = [
  "GOTS",
  "OEKO-TEX Standard 100",
  "OEKO-TEX STeP",
  "OEKO-TEX Made in Green",
  "REACH",
  "FSC",
  "Lenzing TENCEL",
  "ISO 9001",
  "ISO 14001",
];

export const CERTIFICATION_STATUSES: { value: CertificationStatus; label: string }[] = [
  { value: "overene", label: "Overené" },
  { value: "uvedene_ale_neoverene", label: "Uvedené, ale neoverené" },
  { value: "nejasne", label: "Nejasné" },
  { value: "nedoveryhodne", label: "Nedôveryhodné" },
];

export const RISKY_KEYWORDS = [
  "artificial silk",
  "art silk",
  "vegan silk",
  "silk-like",
  "polyester satin",
  "satin polyester",
  "synthetic satin",
];

export const GREENWASHING_KEYWORDS = [
  "eco",
  "luxury",
  "natural",
  "sustainable",
  "premium",
  "green",
  "ethical",
];

export function labelOf<T extends { value: string; label: string }>(
  list: readonly T[],
  value: string
): string {
  return list.find((x) => x.value === value)?.label ?? value;
}
