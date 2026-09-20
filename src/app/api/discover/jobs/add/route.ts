import { NextRequest, NextResponse } from "next/server";
import { readDb, updateDb } from "@/lib/store";
import { guessDomain } from "@/lib/job-signals";
import { buildCompanyFromDomain, enrichCompanyContacts } from "@/lib/enrich-company";
import { computePriority } from "@/lib/priority";
import type { Signal } from "@/lib/types";

/**
 * Turns a discovered hiring-lead (company name only, no domain) into a full
 * account: guesses + verifies the domain, then runs the same enrichment
 * waterfall as a manual add, and seeds a job_posting signal from the role
 * that surfaced it so the priority score and outreach angle have something
 * concrete to point at.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    companyName?: string;
    roleTitle?: string;
  };
  const companyName = body.companyName?.trim();
  if (!companyName) {
    return NextResponse.json({ error: "Podaj nazwe firmy" }, { status: 400 });
  }

  const db = await readDb();
  if (db.companies.some((c) => c.name.toLowerCase() === companyName.toLowerCase())) {
    return NextResponse.json({ error: "Ta firma jest juz na liscie" }, { status: 409 });
  }

  const domain = await guessDomain(companyName);
  if (!domain) {
    return NextResponse.json(
      {
        error:
          "Nie udalo sie automatycznie odgadnac domeny tej firmy - dodaj ja recznie w formularzu powyzej, wklejajac domene.",
      },
      { status: 422 }
    );
  }
  if (db.companies.some((c) => c.domain === domain)) {
    return NextResponse.json({ error: "Ta firma jest juz na liscie" }, { status: 409 });
  }

  const company = await buildCompanyFromDomain(domain, companyName);
  const contacts = await enrichCompanyContacts(company, db.icp.targetTitles);

  const signals: Signal[] = body.roleTitle
    ? [
        {
          id: `sig_${company.id}_seed`,
          companyId: company.id,
          type: "job_posting",
          title: `Nowa rekrutacja: ${body.roleTitle}`,
          description: "Wykryte przez auto-wyszukiwanie ofert pracy (nofluffjobs.com).",
          source: "nofluffjobs",
          detectedAt: new Date().toISOString(),
        },
      ]
    : [];

  const { level, reason } = computePriority(company, contacts, signals, db.icp);
  company.priority = level;
  company.priorityReason = reason;
  company.lastVerifiedAt = new Date().toISOString();
  company.lastSignalsRefreshAt = new Date().toISOString();

  await updateDb((d) => {
    d.companies.push(company);
    d.contacts.push(...contacts);
    d.signals.push(...signals);
  });

  return NextResponse.json(company, { status: 201 });
}
