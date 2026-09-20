import { NextRequest, NextResponse } from "next/server";
import { readDb, updateDb } from "@/lib/store";
import { buildCompanyFromDomain, enrichCompanyContacts } from "@/lib/enrich-company";
import { computePriority } from "@/lib/priority";

/** Adds a company found via real-location search (OpenStreetMap). Requires a real website/domain from that listing - we never invent one. */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    domain?: string;
    city?: string;
    phone?: string;
  };
  const name = body.name?.trim();
  const domain = body.domain?.trim();
  if (!name || !domain) {
    return NextResponse.json(
      { error: "Ten wpis nie ma strony internetowej - dodaj go recznie w formularzu powyzej, gdy znajdziesz domene." },
      { status: 400 }
    );
  }

  const db = await readDb();
  if (db.companies.some((c) => c.domain === domain)) {
    return NextResponse.json({ error: "Ta firma jest juz na liscie" }, { status: 409 });
  }

  const company = await buildCompanyFromDomain(domain, name);
  company.city = body.city;
  company.phone = body.phone;
  const contacts = await enrichCompanyContacts(company, db.icp.targetTitles);
  const { level, reason } = computePriority(company, contacts, [], db.icp);
  company.priority = level;
  company.priorityReason = reason;
  company.lastVerifiedAt = new Date().toISOString();

  await updateDb((d) => {
    d.companies.push(company);
    d.contacts.push(...contacts);
  });

  return NextResponse.json(company, { status: 201 });
}
