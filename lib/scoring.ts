import type { Supplier, Rating } from "./types";

// max 100 bodov:
//   materiály 25, certifikácie 20, B2B 15, farbenie 15,
//   transparentnosť 10, krajina/dôveryhodnosť 10, vzorky/MOQ/kontakt 5
export function calculateScore(s: Supplier): number {
  let score = 0;

  // Materiály (max 25)
  const goodMaterials = s.materials.filter((m) => m.verification === "overeny").length;
  const riskyMaterials = s.materials.filter(
    (m) => m.verification === "rizikovy" || m.verification === "nevhodny"
  ).length;
  score += Math.min(25, goodMaterials * 6);
  score -= Math.min(15, riskyMaterials * 5);

  // Certifikácie (max 20)
  const verifiedCerts = s.certifications.filter((c) => c.status === "overene").length;
  const claimedCerts = s.certifications.filter(
    (c) => c.status === "uvedene_ale_neoverene"
  ).length;
  const badCerts = s.certifications.filter((c) => c.status === "nedoveryhodne").length;
  score += Math.min(20, verifiedCerts * 5 + claimedCerts * 2);
  score -= badCerts * 5;

  // B2B vhodnosť (max 15)
  let b2bScore = 0;
  if (s.b2b === "ano") b2bScore += 5;
  if (s.sellsMeter === "ano") b2bScore += 3;
  if (s.sellsWholesale === "ano") b2bScore += 3;
  if (s.shipsEU === "ano") b2bScore += 2;
  if (s.shipsSlovakia === "ano") b2bScore += 2;
  score += Math.min(15, b2bScore);

  // Farbenie a custom (max 15)
  let dyeScore = 0;
  if (s.offersDyeing === "ano") dyeScore += 4;
  if (s.customColors === "ano") dyeScore += 3;
  if (s.labDip === "ano") dyeScore += 3;
  if (s.pantoneMatching === "ano") dyeScore += 3;
  if (s.gotsDyeing === "ano") dyeScore += 1;
  if (s.reachDyeing === "ano") dyeScore += 1;
  score += Math.min(15, dyeScore);

  // Transparentnosť firmy (max 10)
  let transparencyScore = 0;
  if (s.hasCompanyInfo) transparencyScore += 2;
  if (s.hasAddress) transparencyScore += 2;
  if (s.hasVAT) transparencyScore += 2;
  if (s.hasClearContact) transparencyScore += 1;
  if (s.hasTechSheets) transparencyScore += 1;
  if (s.hasCertDownload) transparencyScore += 1;
  if (s.countryOfMake) transparencyScore += 0.5;
  if (s.fiberOrigin) transparencyScore += 0.5;
  score += Math.min(10, transparencyScore);

  // Krajina / dôveryhodnosť (max 10)
  let trustScore = 0;
  if (s.trustworthy) trustScore += 5;
  // Riziká: každé znižuje skóre
  if (s.greenwashingRisk) trustScore -= 3;
  if (s.retailRisk) trustScore -= 4;
  if (s.dropshipRisk) trustScore -= 5;
  if (s.fakeSilkRisk) trustScore -= 5;

  // Typ firmy: rizikové typy znižujú
  if (
    s.companyType === "retail" ||
    s.companyType === "marketplace" ||
    s.companyType === "znacka_hotovych_produktov"
  ) {
    trustScore -= 5;
  } else if (
    s.companyType === "vyrobca" ||
    s.companyType === "tkacovna" ||
    s.companyType === "farbiaren"
  ) {
    trustScore += 5;
  }
  score += Math.max(-10, Math.min(10, trustScore));

  // Vzorky, MOQ a kontakt (max 5)
  let contactScore = 0;
  if (s.sendsSamples === "ano") contactScore += 2;
  if (s.moq.trim()) contactScore += 1;
  if (s.email.trim() || s.contactForm.trim()) contactScore += 1;
  if (s.priceListAvail === "ano") contactScore += 1;
  score += Math.min(5, contactScore);

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function ratingFromScore(score: number): Rating {
  if (score >= 85) return "velmi_vhodny";
  if (score >= 70) return "vhodny";
  if (score >= 50) return "mozno_vhodny";
  return "nevhodny";
}

export function ratingLabel(rating: Rating): string {
  switch (rating) {
    case "velmi_vhodny":
      return "Veľmi vhodný";
    case "vhodny":
      return "Vhodný";
    case "mozno_vhodny":
      return "Možno vhodný";
    case "nevhodny":
      return "Nevhodný";
    default:
      return "Neohodnotený";
  }
}
