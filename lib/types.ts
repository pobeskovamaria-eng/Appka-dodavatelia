export type TriState = "ano" | "nie" | "neoverene";

export type MaterialVerification = "overeny" | "neovereny" | "rizikovy" | "nevhodny";

export type CertificationStatus =
  | "overene"
  | "uvedene_ale_neoverene"
  | "nejasne"
  | "nedoveryhodne";

export interface MaterialEntry {
  name: string;
  verification: MaterialVerification;
}

export interface CertificationEntry {
  name: string;
  onWebsite: boolean;
  verifiable: boolean;
  proofUrl: string;
  verifiedDate: string; // ISO date
  note: string;
  status: CertificationStatus;
}

export type CompanyType =
  | "vyrobca"
  | "tkacovna"
  | "farbiaren"
  | "velkoobchod"
  | "b2b_metraz"
  | "agent"
  | "marketplace"
  | "retail"
  | "znacka_hotovych_produktov"
  | "neoverene";

export type Status =
  | "novy_nalez"
  | "caka_na_preverenie"
  | "predbezne_vhodny"
  | "kontaktovany"
  | "cakam_na_odpoved"
  | "odpovedal"
  | "vhodny"
  | "nevhodny"
  | "vyradeny"
  | "shortlist";

export type Rating =
  | "velmi_vhodny"
  | "vhodny"
  | "mozno_vhodny"
  | "nevhodny"
  | "neohodnoteny";

export interface Supplier {
  id: string;

  // Základné údaje
  name: string;
  website: string;
  country: string;
  city: string;
  email: string;
  contactForm: string;
  phone: string;
  language: string;
  contactNote: string;

  companyType: CompanyType | "";

  // Materiály a certifikácie
  materials: MaterialEntry[];
  certifications: CertificationEntry[];

  // Hodváb
  offersMulberry: TriState | "";
  momme19: TriState | "";
  momme22: TriState | "";
  otherMomme: string;
  silkWeave: string;
  silkWidth: string;
  silkComposition: string;
  silkSamples: TriState | "";
  silkMOQ: string;
  silkNote: string;

  // Farbenie
  offersDyeing: TriState | "";
  customColors: TriState | "";
  labDip: TriState | "";
  pantoneMatching: TriState | "";
  gotsDyeing: TriState | "";
  reachDyeing: TriState | "";
  customProduction: TriState | "";
  dyeingNote: string;

  // B2B
  b2b: TriState | "";
  sellsMeter: TriState | "";
  sellsWholesale: TriState | "";
  moq: string;
  sendsSamples: TriState | "";
  shipsSlovakia: TriState | "";
  shipsEU: TriState | "";
  priceListAvail: TriState | "";
  reorder: TriState | "";
  b2bNote: string;

  // Dôveryhodnosť
  hasCompanyInfo: boolean;
  hasAddress: boolean;
  hasVAT: boolean;
  hasClearContact: boolean;
  hasTechSheets: boolean;
  hasCertDownload: boolean;
  countryOfMake: boolean;
  fiberOrigin: boolean;
  trustworthy: boolean;
  greenwashingRisk: boolean;
  retailRisk: boolean;
  dropshipRisk: boolean;
  fakeSilkRisk: boolean;

  // Stav a hodnotenie
  status: Status | "";
  scoreAuto: number;
  scoreManual: number | null;
  rating: Rating;

  // Poznámky
  notes: string;
  questions: string;
  reply: string;
  nextStep: string;
  lastCheck: string;
  lastContact: string;

  createdAt: string;
  updatedAt: string;
}

export type SupplierInput = Omit<
  Supplier,
  "id" | "createdAt" | "updatedAt" | "scoreAuto"
>;
