// Normalizácia surového záznamu z Apify na riadok do `suppliers`.
// Sem patrí: čistenie domén, mapovanie krajiny na ISO, slugifikácia, dedup kľúč.

export type RawSupplier = Record<string, unknown>;

export type NormalizedSupplier = {
  name: string;
  slug: string;
  website: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  description: string | null;
  source: string;
  source_url: string | null;
  raw: RawSupplier;
};

const COUNTRY_MAP: Record<string, string> = {
  slovakia: "SK", slovensko: "SK", sk: "SK",
  czechia: "CZ", czechrepublic: "CZ", cesko: "CZ", "českárepublika": "CZ", cz: "CZ",
  poland: "PL", polsko: "PL", polska: "PL", pl: "PL",
  italy: "IT", italia: "IT", taliansko: "IT", włochy: "IT", it: "IT",
  germany: "DE", deutschland: "DE", nemecko: "DE", de: "DE",
  austria: "AT", rakusko: "AT", "rakúsko": "AT", at: "AT",
  france: "FR", francúzsko: "FR", francuzsko: "FR", fr: "FR",
  spain: "ES", "španielsko": "ES", espana: "ES", "españa": "ES", es: "ES",
  portugal: "PT", portugalsko: "PT", pt: "PT",
};

export function cleanDomain(input: unknown): string | null {
  if (typeof input !== "string") return null;
  try {
    const url = new URL(input.trim().startsWith("http") ? input.trim() : `https://${input.trim()}`);
    return url.hostname.replace(/^www\./, "").toLowerCase() || null;
  } catch {
    return null;
  }
}

export function normalizeCountry(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const key = input.toLowerCase().replace(/\s+/g, "");
  if (COUNTRY_MAP[key]) return COUNTRY_MAP[key];
  if (/^[a-z]{2}$/i.test(input.trim())) return input.trim().toUpperCase();
  return null;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

function pickString(obj: RawSupplier, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

// Mapuje typický Google Maps Apify dataset item. Pre iné zdroje doplň ďalšie pickString kľúče.
export function normalizeSupplier(
  raw: RawSupplier,
  source: string = "apify_gmaps"
): NormalizedSupplier | null {
  const name = pickString(raw, ["title", "name"]);
  if (!name) return null;

  const website = cleanDomain(pickString(raw, ["website", "url", "domain"]));
  const country = normalizeCountry(pickString(raw, ["countryCode", "country"]));

  return {
    name,
    slug: slugify(name),
    website,
    email: pickString(raw, ["email", "emails"]),
    phone: pickString(raw, ["phone", "phoneNumber"]),
    country,
    city: pickString(raw, ["city", "addressCity"]),
    description: pickString(raw, ["description", "about"]),
    source,
    source_url: pickString(raw, ["url", "googleMapsUrl", "placeUrl"]),
    raw,
  };
}
