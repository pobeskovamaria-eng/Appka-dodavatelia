import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import type { Supplier, SupplierInput } from "./types";
import { calculateScore } from "./scoring";

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = path.join(DATA_DIR, "suppliers.db");

let _db: Database.Database | null = null;
function getDb(): Database.Database {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.exec(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      score INTEGER NOT NULL DEFAULT 0,
      name TEXT NOT NULL DEFAULT '',
      country TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
    CREATE INDEX IF NOT EXISTS idx_suppliers_country ON suppliers(country);
    CREATE INDEX IF NOT EXISTS idx_suppliers_score ON suppliers(score);
  `);
  return _db;
}

function defaultSupplier(): Supplier {
  return {
    id: "",
    name: "",
    website: "",
    country: "",
    city: "",
    email: "",
    contactForm: "",
    phone: "",
    language: "",
    contactNote: "",
    companyType: "",
    materials: [],
    certifications: [],
    offersMulberry: "",
    momme19: "",
    momme22: "",
    otherMomme: "",
    silkWeave: "",
    silkWidth: "",
    silkComposition: "",
    silkSamples: "",
    silkMOQ: "",
    silkNote: "",
    offersDyeing: "",
    customColors: "",
    labDip: "",
    pantoneMatching: "",
    gotsDyeing: "",
    reachDyeing: "",
    customProduction: "",
    dyeingNote: "",
    b2b: "",
    sellsMeter: "",
    sellsWholesale: "",
    moq: "",
    sendsSamples: "",
    shipsSlovakia: "",
    shipsEU: "",
    priceListAvail: "",
    reorder: "",
    b2bNote: "",
    hasCompanyInfo: false,
    hasAddress: false,
    hasVAT: false,
    hasClearContact: false,
    hasTechSheets: false,
    hasCertDownload: false,
    countryOfMake: false,
    fiberOrigin: false,
    trustworthy: false,
    greenwashingRisk: false,
    retailRisk: false,
    dropshipRisk: false,
    fakeSilkRisk: false,
    status: "",
    scoreAuto: 0,
    scoreManual: null,
    rating: "neohodnoteny",
    notes: "",
    questions: "",
    reply: "",
    nextStep: "",
    lastCheck: "",
    lastContact: "",
    createdAt: "",
    updatedAt: "",
  };
}

export function mergeWithDefaults(partial: Partial<Supplier>): Supplier {
  return { ...defaultSupplier(), ...partial };
}

export function listSuppliers(): Supplier[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT data FROM suppliers ORDER BY updated_at DESC")
    .all() as { data: string }[];
  return rows.map((r) => mergeWithDefaults(JSON.parse(r.data) as Supplier));
}

export function getSupplier(id: string): Supplier | null {
  const db = getDb();
  const row = db.prepare("SELECT data FROM suppliers WHERE id = ?").get(id) as
    | { data: string }
    | undefined;
  if (!row) return null;
  return mergeWithDefaults(JSON.parse(row.data) as Supplier);
}

export function createSupplier(input: SupplierInput): Supplier {
  const db = getDb();
  const now = new Date().toISOString();
  const id = randomUUID();
  const merged = mergeWithDefaults({ ...input, id, createdAt: now, updatedAt: now });
  merged.scoreAuto = calculateScore(merged);
  db.prepare(
    "INSERT INTO suppliers (id, data, score, name, country, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(
    id,
    JSON.stringify(merged),
    merged.scoreAuto,
    merged.name,
    merged.country,
    now,
    now
  );
  return merged;
}

export function updateSupplier(id: string, input: SupplierInput): Supplier | null {
  const db = getDb();
  const existing = getSupplier(id);
  if (!existing) return null;
  const now = new Date().toISOString();
  const merged = mergeWithDefaults({
    ...input,
    id,
    createdAt: existing.createdAt,
    updatedAt: now,
  });
  merged.scoreAuto = calculateScore(merged);
  db.prepare(
    "UPDATE suppliers SET data = ?, score = ?, name = ?, country = ?, updated_at = ? WHERE id = ?"
  ).run(JSON.stringify(merged), merged.scoreAuto, merged.name, merged.country, now, id);
  return merged;
}

export function deleteSupplier(id: string): boolean {
  const db = getDb();
  const res = db.prepare("DELETE FROM suppliers WHERE id = ?").run(id);
  return res.changes > 0;
}

export function importSuppliers(items: Partial<Supplier>[]): number {
  const db = getDb();
  let count = 0;
  const insert = db.prepare(
    "INSERT INTO suppliers (id, data, score, name, country, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  const tx = db.transaction((rows: Partial<Supplier>[]) => {
    for (const row of rows) {
      const now = new Date().toISOString();
      const id = row.id || randomUUID();
      const merged = mergeWithDefaults({
        ...row,
        id,
        createdAt: row.createdAt || now,
        updatedAt: now,
      });
      merged.scoreAuto = calculateScore(merged);
      insert.run(
        id,
        JSON.stringify(merged),
        merged.scoreAuto,
        merged.name,
        merged.country,
        merged.createdAt,
        now
      );
      count++;
    }
  });
  tx(items);
  return count;
}
