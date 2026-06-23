import type { Supplier } from "./types";

export function generateEmail(s: Supplier, language: "sk" | "en" = "sk"): {
  subject: string;
  body: string;
} {
  if (language === "en") {
    return {
      subject: "Inquiry: wholesale supply of natural fabrics",
      body: `Hello,

I am looking for a reliable B2B supplier of high-quality natural fabrics for a premium textile product.

I am particularly interested in:
- 100% mulberry silk, ideally 19 momme or 22 momme,
- 100% cotton, ideally organic or certified,
- TENCEL™, lyocell or modal,
- bamboo fabric with transparent origin.

Could you please let me know:
1. Do you supply fabric by the meter or in larger quantities for production?
2. Do you offer 100% mulberry silk in 19 momme or 22 momme weight?
3. What is the minimum order quantity?
4. Do you offer dyeing, custom colors, lab dip or Pantone matching?
5. What certifications do your fabrics have?
6. Can you provide certificates or technical data sheets?
7. Do you send samples?
8. Do you ship to Slovakia / the EU?

I am not looking for polyester satin, artificial silk or finished products.

Thank you very much.

Best regards,
[meno]`,
    };
  }

  return {
    subject: "Dopyt na veľkoobchodnú dodávku prírodných látok",
    body: `Dobrý deň,

hľadám spoľahlivého B2B dodávateľa kvalitných prírodných látok pre prémiový textilný produkt.

Zaujímam sa najmä o:
- 100 % morušový hodváb, ideálne 19 momme alebo 22 momme,
- 100 % bavlnu, ideálne organickú alebo certifikovanú,
- TENCEL™, lyocell alebo modal,
- bambusovú látku s transparentným pôvodom.

Prosím o informáciu:
1. Dodávate látku ako metráž alebo vo väčšom množstve pre výrobu?
2. Ponúkate 100 % morušový hodváb v hrúbke 19 momme alebo 22 momme?
3. Aké je minimálne objednávkové množstvo?
4. Ponúkate farbenie, vlastné farby, lab dip alebo Pantone matching?
5. Aké certifikácie majú vaše látky?
6. Viete poskytnúť certifikáty alebo technické listy?
7. Zasielate vzorky?
8. Dodávate na Slovensko / do EÚ?

Nehľadám polyesterový satén, umelý hodváb ani hotové produkty.

Ďakujem pekne.

S pozdravom,
[meno]`,
  };
}

export function mailtoUrl(s: Supplier, language: "sk" | "en" = "sk"): string {
  const { subject, body } = generateEmail(s, language);
  const to = s.email ? encodeURIComponent(s.email) : "";
  const params = new URLSearchParams({
    subject,
    body,
  });
  return `mailto:${to}?${params.toString()}`;
}
