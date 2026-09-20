import { NextRequest, NextResponse } from "next/server";
import { newId, readDb, updateDb } from "@/lib/store";
import { enrichOrganization, findDecisionMakers } from "@/lib/apollo";
import { discoverContactsFromWebsite } from "@/lib/discovery";
import { demoContacts } from "@/lib/contact-utils";
import { findAndVerifyEmail } from "@/lib/snov";
import type { Company } from "@/lib/types";

export async function GET() {
  const db = readDb();
  return NextResponse.json(db.companies);
}

function normalizeDomain(input: string): string {
  return input
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
    .toLowerCase();
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { name?: string; domain?: string };
  const domainInput = body.domain?.trim();
  if (!domainInput) {
    return NextResponse.json({ error: "Podaj domene firmy" }, { status: 400 });
  }
  const domain = normalizeDomain(domainInput);
  const name = body.name?.trim() || domain;

  const db = readDb();
  if (db.companies.some((c) => c.domain === domain)) {
    return NextResponse.json(
      { error: "Ta firma jest juz na liscie" },
      { status: 409 }
    );
  }

  const orgInfo = await enrichOrganization(domain);

  const company: Company = {
    id: newId("co"),
    name,
    domain,
    industry: orgInfo.industry,
    employeeCount: orgInfo.employeeCount,
    apolloOrgId: orgInfo.apolloOrgId,
    createdAt: new Date().toISOString(),
    lastEnrichedAt: new Date().toISOString(),
  };

  // Waterfall: Apollo People Search (paid plans) -> our own website scraper
  // (free, no key) -> demo placeholders, so the app still returns *something*
  // useful when Apollo's contact search is plan-restricted.
  const contacts =
    (await findDecisionMakers(
      company.id,
      company.domain,
      company.apolloOrgId,
      db.icp.targetTitles
    )) ??
    (await discoverContactsFromWebsite(
      company.id,
      company.domain,
      db.icp.targetTitles
    )) ??
    demoContacts(company.id, company.domain, db.icp.targetTitles);

  for (const contact of contacts) {
    if (!contact.email || contact.emailStatus !== "verified") {
      const found = await findAndVerifyEmail(
        contact.firstName,
        contact.lastName,
        company.domain
      );
      contact.email = found.email;
      contact.emailStatus = found.status;
      contact.emailSource = found.source;
    }
  }

  updateDb((d) => {
    d.companies.push(company);
    d.contacts.push(...contacts);
  });

  return NextResponse.json(company, { status: 201 });
}
