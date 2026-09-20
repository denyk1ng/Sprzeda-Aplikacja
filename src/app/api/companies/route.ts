import { NextRequest, NextResponse } from "next/server";
import { readDb, updateDb } from "@/lib/store";
import {
  buildCompanyFromDomain,
  enrichCompanyContacts,
  normalizeDomain,
} from "@/lib/enrich-company";
import { computePriority } from "@/lib/priority";

export async function GET() {
  const db = readDb();
  return NextResponse.json(db.companies);
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { name?: string; domain?: string };
  const domainInput = body.domain?.trim();
  if (!domainInput) {
    return NextResponse.json({ error: "Podaj domene firmy" }, { status: 400 });
  }
  const domain = normalizeDomain(domainInput);

  const db = readDb();
  if (db.companies.some((c) => c.domain === domain)) {
    return NextResponse.json(
      { error: "Ta firma jest juz na liscie" },
      { status: 409 }
    );
  }

  const company = await buildCompanyFromDomain(domain, body.name);
  const contacts = await enrichCompanyContacts(company, db.icp.targetTitles);
  const { level, reason } = computePriority(company, contacts, []);
  company.priority = level;
  company.priorityReason = reason;
  company.lastVerifiedAt = new Date().toISOString();

  updateDb((d) => {
    d.companies.push(company);
    d.contacts.push(...contacts);
  });

  return NextResponse.json(company, { status: 201 });
}
