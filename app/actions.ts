"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createSupplier,
  updateSupplier,
  deleteSupplier,
  importSuppliers,
} from "@/lib/db";
import type { SupplierInput, Supplier } from "@/lib/types";

function parseTri(v: FormDataEntryValue | null): "ano" | "nie" | "neoverene" | "" {
  const s = (v ?? "").toString();
  return s === "ano" || s === "nie" || s === "neoverene" ? s : "";
}

function parseBool(fd: FormData, key: string): boolean {
  return fd.get(key) === "on";
}

function parseStr(v: FormDataEntryValue | null): string {
  return (v ?? "").toString().trim();
}

function parseInputFromFormData(fd: FormData): SupplierInput {
  // materials and certifications come as JSON
  let materials: SupplierInput["materials"] = [];
  let certifications: SupplierInput["certifications"] = [];
  try {
    materials = JSON.parse(parseStr(fd.get("materials")) || "[]");
  } catch {}
  try {
    certifications = JSON.parse(parseStr(fd.get("certifications")) || "[]");
  } catch {}

  const scoreManualRaw = parseStr(fd.get("scoreManual"));
  const scoreManual = scoreManualRaw === "" ? null : Number(scoreManualRaw);

  return {
    name: parseStr(fd.get("name")),
    website: parseStr(fd.get("website")),
    country: parseStr(fd.get("country")),
    city: parseStr(fd.get("city")),
    email: parseStr(fd.get("email")),
    contactForm: parseStr(fd.get("contactForm")),
    phone: parseStr(fd.get("phone")),
    language: parseStr(fd.get("language")),
    contactNote: parseStr(fd.get("contactNote")),
    companyType: (parseStr(fd.get("companyType")) as SupplierInput["companyType"]) || "",
    materials,
    certifications,
    offersMulberry: parseTri(fd.get("offersMulberry")),
    momme19: parseTri(fd.get("momme19")),
    momme22: parseTri(fd.get("momme22")),
    otherMomme: parseStr(fd.get("otherMomme")),
    silkWeave: parseStr(fd.get("silkWeave")),
    silkWidth: parseStr(fd.get("silkWidth")),
    silkComposition: parseStr(fd.get("silkComposition")),
    silkSamples: parseTri(fd.get("silkSamples")),
    silkMOQ: parseStr(fd.get("silkMOQ")),
    silkNote: parseStr(fd.get("silkNote")),
    offersDyeing: parseTri(fd.get("offersDyeing")),
    customColors: parseTri(fd.get("customColors")),
    labDip: parseTri(fd.get("labDip")),
    pantoneMatching: parseTri(fd.get("pantoneMatching")),
    gotsDyeing: parseTri(fd.get("gotsDyeing")),
    reachDyeing: parseTri(fd.get("reachDyeing")),
    customProduction: parseTri(fd.get("customProduction")),
    dyeingNote: parseStr(fd.get("dyeingNote")),
    b2b: parseTri(fd.get("b2b")),
    sellsMeter: parseTri(fd.get("sellsMeter")),
    sellsWholesale: parseTri(fd.get("sellsWholesale")),
    moq: parseStr(fd.get("moq")),
    sendsSamples: parseTri(fd.get("sendsSamples")),
    shipsSlovakia: parseTri(fd.get("shipsSlovakia")),
    shipsEU: parseTri(fd.get("shipsEU")),
    priceListAvail: parseTri(fd.get("priceListAvail")),
    reorder: parseTri(fd.get("reorder")),
    b2bNote: parseStr(fd.get("b2bNote")),
    hasCompanyInfo: parseBool(fd, "hasCompanyInfo"),
    hasAddress: parseBool(fd, "hasAddress"),
    hasVAT: parseBool(fd, "hasVAT"),
    hasClearContact: parseBool(fd, "hasClearContact"),
    hasTechSheets: parseBool(fd, "hasTechSheets"),
    hasCertDownload: parseBool(fd, "hasCertDownload"),
    countryOfMake: parseBool(fd, "countryOfMake"),
    fiberOrigin: parseBool(fd, "fiberOrigin"),
    trustworthy: parseBool(fd, "trustworthy"),
    greenwashingRisk: parseBool(fd, "greenwashingRisk"),
    retailRisk: parseBool(fd, "retailRisk"),
    dropshipRisk: parseBool(fd, "dropshipRisk"),
    fakeSilkRisk: parseBool(fd, "fakeSilkRisk"),
    status: (parseStr(fd.get("status")) as SupplierInput["status"]) || "",
    scoreManual: Number.isFinite(scoreManual as number) ? (scoreManual as number) : null,
    rating: (parseStr(fd.get("rating")) as Supplier["rating"]) || "neohodnoteny",
    notes: parseStr(fd.get("notes")),
    questions: parseStr(fd.get("questions")),
    reply: parseStr(fd.get("reply")),
    nextStep: parseStr(fd.get("nextStep")),
    lastCheck: parseStr(fd.get("lastCheck")),
    lastContact: parseStr(fd.get("lastContact")),
  };
}

export async function createSupplierAction(fd: FormData) {
  const input = parseInputFromFormData(fd);
  if (!input.name || !input.website) {
    throw new Error("Názov firmy a webová stránka sú povinné polia.");
  }
  const s = createSupplier(input);
  revalidatePath("/");
  revalidatePath("/suppliers");
  redirect(`/suppliers/${s.id}`);
}

export async function updateSupplierAction(id: string, fd: FormData) {
  const input = parseInputFromFormData(fd);
  if (!input.name || !input.website) {
    throw new Error("Názov firmy a webová stránka sú povinné polia.");
  }
  updateSupplier(id, input);
  revalidatePath("/");
  revalidatePath("/suppliers");
  revalidatePath(`/suppliers/${id}`);
  redirect(`/suppliers/${id}`);
}

export async function deleteSupplierAction(id: string) {
  deleteSupplier(id);
  revalidatePath("/");
  revalidatePath("/suppliers");
  redirect("/suppliers");
}

export async function importSuppliersAction(fd: FormData) {
  const file = fd.get("file");
  if (!(file instanceof File)) throw new Error("Súbor nebol nahraný.");
  const text = await file.text();
  let items: Partial<Supplier>[] = [];
  if (file.name.toLowerCase().endsWith(".json")) {
    const parsed = JSON.parse(text);
    items = Array.isArray(parsed) ? parsed : [parsed];
  } else {
    throw new Error("Podporujeme len .json import. CSV stačí pre export.");
  }
  importSuppliers(items);
  revalidatePath("/");
  revalidatePath("/suppliers");
  redirect("/suppliers");
}
