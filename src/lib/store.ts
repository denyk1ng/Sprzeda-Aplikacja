import fs from "fs";
import path from "path";
import type { Db, IcpProfile } from "./types";

const DB_PATH = path.join(process.cwd(), "data", "db.json");

const DEFAULT_ICP: IcpProfile = {
  companyName: "Twoja firma",
  productDescription:
    "Opisz tutaj krotko, co sprzedajesz i jaki problem rozwiazujesz klientom.",
  valueProps: [
    "Skracamy czas wdrozenia o 40%",
    "Automatyzujemy powtarzalne procesy sprzedazowe",
  ],
  targetTitles: [
    "Head of Sales",
    "VP Sales",
    "Sales Director",
    "CEO",
    "COO",
    "Head of Growth",
    "Revenue Operations Manager",
  ],
  targetIndustries: ["SaaS", "E-commerce", "Fintech"],
};

function ensureDb(): Db {
  if (!fs.existsSync(DB_PATH)) {
    const initial: Db = {
      icp: DEFAULT_ICP,
      companies: [],
      contacts: [],
      signals: [],
      recommendations: [],
    };
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
  const raw = fs.readFileSync(DB_PATH, "utf-8");
  const parsed = JSON.parse(raw) as Partial<Db>;
  return {
    icp: parsed.icp ?? DEFAULT_ICP,
    companies: parsed.companies ?? [],
    contacts: parsed.contacts ?? [],
    signals: parsed.signals ?? [],
    recommendations: parsed.recommendations ?? [],
  };
}

function writeDb(db: Db) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

export function readDb(): Db {
  return ensureDb();
}

export function updateDb(mutator: (db: Db) => void): Db {
  const db = ensureDb();
  mutator(db);
  writeDb(db);
  return db;
}

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}
