import fs from "fs";
import path from "path";
import { Redis } from "@upstash/redis";
import type { Db, IcpProfile } from "./types";

const DB_PATH = path.join(process.cwd(), "data", "db.json");
const REDIS_KEY = "prospecting-copilot:db";

const DEFAULT_ICP: IcpProfile = {
  companyName: "PIRSB - Polski Instytut Rozwoju Strategii Biznesowych",
  productDescription:
    "Bezplatna sesja diagnostyczna Mapa Wzrostu - pokazujemy wlascicielowi/zarzadowi firmy konkretne dzwignie wzrostu (rynek i strategia, maszyna wzrostu, czlowiek) oraz szkolenia z AI dla firm z dofinansowaniem unijnym.",
  valueProps: [
    "Bezplatna sesja diagnostyczna Mapa Wzrostu - konkretny plan wzrostu oparty o dane, nie domysly",
    "Szkolenia z AI z dofinansowaniem - realny koszt wdrozenia blisko zera",
    "Podejscie oparte o wzor Wartosc = Zysk x Mnoznik + Majatek, nie ogolniki",
  ],
  targetTitles: [
    "Prezes",
    "CEO",
    "Wlasciciel",
    "Wspolwlasciciel",
    "Dyrektor Zarzadzajacy",
    "Dyrektor Generalny",
    "Czlonek Zarzadu",
  ],
  // Celowo szerokie/puste - branza nie jest ograniczeniem (odp. #2 w specyfikacji).
  targetIndustries: [],
  cities: [],
};

function emptyDb(): Db {
  return {
    icp: DEFAULT_ICP,
    companies: [],
    contacts: [],
    signals: [],
    recommendations: [],
  };
}

function fillDefaults(parsed: Partial<Db> | null | undefined): Db {
  return {
    icp: parsed?.icp ? { ...DEFAULT_ICP, ...parsed.icp } : DEFAULT_ICP,
    companies: parsed?.companies ?? [],
    contacts: parsed?.contacts ?? [],
    signals: parsed?.signals ?? [],
    recommendations: parsed?.recommendations ?? [],
  };
}

function hasRedis(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

let redisClient: Redis | null = null;
function getRedis(): Redis {
  if (!redisClient) redisClient = Redis.fromEnv();
  return redisClient;
}

// --- File-backed storage (local dev default; data/db.json is gitignored) ---

function readFileDb(): Db {
  if (!fs.existsSync(DB_PATH)) {
    const initial = emptyDb();
    writeFileDb(initial);
    return initial;
  }
  const raw = fs.readFileSync(DB_PATH, "utf-8");
  return fillDefaults(JSON.parse(raw) as Partial<Db>);
}

function writeFileDb(db: Db) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// --- Public API ---
// Persistent storage that survives restarts/redeploys on serverless hosting:
// Upstash Redis (holding the whole Db as one JSON blob) when configured,
// otherwise a local JSON file for zero-setup local development.
//
// Note: like the file-backed version before it, this does a read-modify-
// write without distributed locking, so two requests updating the db at
// the exact same instant could race. Fine for the single-user scale this
// app targets; a real multi-user deployment would want row-level storage.

export async function readDb(): Promise<Db> {
  if (hasRedis()) {
    const parsed = await getRedis().get<Partial<Db>>(REDIS_KEY);
    return fillDefaults(parsed);
  }
  return readFileDb();
}

export async function updateDb(mutator: (db: Db) => void): Promise<Db> {
  const db = await readDb();
  mutator(db);
  if (hasRedis()) {
    await getRedis().set(REDIS_KEY, db);
  } else {
    writeFileDb(db);
  }
  return db;
}

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}
